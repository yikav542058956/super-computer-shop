import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const FIREBASE_DB_URL = "https://super-computer-c6a99-default-rtdb.firebaseio.com";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "SuperComputerLeadGen/1.0 (admin lead generation tool)";

const TILE_DEG = 0.6;
const MAX_TILES_PER_REQUEST = 60;
const TIME_BUDGET_MS = 28000;
const TILE_BATCH_SIZE = 5;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

type Bbox = [number, number, number, number]; // south, west, north, east

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function buildAddress(tags: Record<string, string> = {}): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return tags["addr:full"] || "";
}

async function geocodeState(state: string): Promise<Bbox> {
  const url = `${NOMINATIM_URL}?state=${encodeURIComponent(state)}&country=India&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Geocoding failed for state: " + state);
  const data = (await res.json()) as any[];
  if (!data.length || !data[0].boundingbox) throw new Error("State not found: " + state);
  const [south, north, west, east] = (data[0].boundingbox as string[]).map(Number);
  return [south, west, north, east];
}

function buildTiles(bbox: Bbox): Bbox[] {
  const [south, west, north, east] = bbox;
  const tiles: Bbox[] = [];
  for (let lat = south; lat < north; lat += TILE_DEG) {
    for (let lon = west; lon < east; lon += TILE_DEG) {
      tiles.push([lat, lon, Math.min(lat + TILE_DEG, north), Math.min(lon + TILE_DEG, east)]);
    }
  }
  return tiles;
}

async function queryTile(tile: Bbox, nameRegex: string, primaryKeyword: string): Promise<OverpassElement[]> {
  const [south, west, north, east] = tile;
  const bboxStr = `${south},${west},${north},${east}`;
  const query = `
    [out:json][timeout:15];
    (
      node["name"~"${nameRegex}",i](${bboxStr});
      node["shop"~"${primaryKeyword}",i](${bboxStr});
    );
    out center tags 80;
  `;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": USER_AGENT },
      body: query,
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements: OverpassElement[] };
    return data.elements || [];
  } catch (err) {
    logger.warn({ err, tile }, "leads: tile query failed, skipping");
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.post("/leads/generate", async (req, res) => {
  const { state, category, count } = req.body as { state?: string; category?: string; count?: number };
  if (!state || !category) {
    res.status(400).json({ error: "State aur category dono zaroori hain" });
    return;
  }
  const wanted = Math.min(Math.max(Number(count) || 20, 1), 100);
  const startTime = Date.now();

  try {
    const bbox = await geocodeState(state);
    const tiles = buildTiles(bbox);

    const keywords = category
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 1);
    const primaryKeyword = (keywords[0] || category).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") || primaryKeyword;

    // Rotate the tile scan order so repeated "generate" clicks sweep new areas of the state each time.
    const cursorKey = `lead_scan_cursor/${slugify(state)}_${slugify(category)}`;
    const cursorRes = await fetch(`${FIREBASE_DB_URL}/${cursorKey}.json`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const cursorStart = cursorRes && cursorRes.ok ? Number((await cursorRes.json()) || 0) % tiles.length : 0;
    const orderedTiles = [...tiles.slice(cursorStart), ...tiles.slice(0, cursorStart)];

    // Fetch existing + previously-deleted lead ids so we never re-generate the same business twice,
    // even if the admin deleted it from the list before.
    const [existingRes, deletedRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/leads.json?shallow=true`, { signal: AbortSignal.timeout(10000) }),
      fetch(`${FIREBASE_DB_URL}/leads_excluded_ids.json?shallow=true`, { signal: AbortSignal.timeout(10000) }).catch(() => null),
    ]);
    const existingKeys: Record<string, boolean> = existingRes.ok
      ? ((await existingRes.json()) as Record<string, boolean> | null) || {}
      : {};
    const excludedKeys: Record<string, boolean> = deletedRes && deletedRes.ok
      ? ((await deletedRes.json()) as Record<string, boolean> | null) || {}
      : {};
    Object.assign(existingKeys, excludedKeys);

    const newLeads: Record<string, any> = {};
    const returned: any[] = [];
    let tilesScanned = 0;
    let totalMatched = 0;

    for (let i = 0; i < orderedTiles.length; i += TILE_BATCH_SIZE) {
      if (returned.length >= wanted) break;
      if (tilesScanned >= MAX_TILES_PER_REQUEST) break;
      if (Date.now() - startTime > TIME_BUDGET_MS) break;

      const batch = orderedTiles.slice(i, i + TILE_BATCH_SIZE);
      tilesScanned += batch.length;
      const batchResults = await Promise.all(batch.map((tile) => queryTile(tile, nameRegex, primaryKeyword)));

      for (const elements of batchResults) {
        for (const el of elements) {
          const tags = el.tags || {};
          const name = tags.name;
          if (!name) continue;
          totalMatched++;
          const leadId = `osm_${el.type}_${el.id}`;
          if (existingKeys[leadId] || newLeads[leadId]) continue; // never repeat a lead already generated

          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          const address = buildAddress(tags) || [tags["addr:city"], state].filter(Boolean).join(", ") || state;
          const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "";

          const lead = {
            name,
            address,
            phone,
            category,
            state,
            lat: lat ?? null,
            lon: lon ?? null,
            createdAt: Date.now(),
          };
          newLeads[leadId] = lead;
          returned.push({ id: leadId, ...lead });
          if (returned.length >= wanted) break;
        }
        if (returned.length >= wanted) break;
      }
      await sleep(200); // be polite to the free public Overpass instance between batches
    }

    const nextCursor = (cursorStart + tilesScanned) % tiles.length;
    await fetch(`${FIREBASE_DB_URL}/${cursorKey}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextCursor),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});

    if (Object.keys(newLeads).length > 0) {
      const writeRes = await fetch(`${FIREBASE_DB_URL}/leads.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeads),
        signal: AbortSignal.timeout(10000),
      });
      if (!writeRes.ok) {
        logger.warn({ status: writeRes.status }, "Failed to save leads to Firebase");
      }
    }

    const areaExhausted = tilesScanned >= tiles.length && returned.length < wanted;

    res.json({
      leads: returned,
      newCount: returned.length,
      tilesScanned,
      totalTiles: tiles.length,
      message:
        returned.length === 0
          ? "Is state/category ke liye abhi koi naya (non-duplicate) lead nahi mila. Thodi der baad ya alag category try karein."
          : returned.length < wanted
            ? `${returned.length} naye unique leads mile.${areaExhausted ? " Poora state scan ho gaya — is category ke saare available leads mil chuke hain." : " Baaki ke liye dubara Generate dabayein."}`
            : `${returned.length} naye unique leads mil gaye!`,
    });
  } catch (err: any) {
    logger.error({ err }, "leads/generate failed");
    res.status(502).json({ error: err?.message || "Lead generation failed. Thodi der baad try karein." });
  }
});

export default router;
