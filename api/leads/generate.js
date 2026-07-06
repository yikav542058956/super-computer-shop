/**
 * Vercel Serverless Function: POST /api/leads/generate
 * OSM-based lead generation — mirrors artifacts/api-server/src/routes/leads.ts
 */

const FIREBASE_DB_URL = "https://super-computer-c6a99-default-rtdb.firebaseio.com";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "SuperComputerLeadGen/1.0 (admin lead generation tool)";

const TILE_DEG = 0.6;
const MAX_TILES_PER_REQUEST = 60;
const TIME_BUDGET_MS = 28000;
const TILE_BATCH_SIZE = 5;

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function buildAddress(tags = {}) {
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

async function geocodeState(state) {
  const url = `${NOMINATIM_URL}?state=${encodeURIComponent(state)}&country=India&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Geocoding failed for state: " + state);
  const data = await res.json();
  if (!data.length || !data[0].boundingbox) throw new Error("State not found: " + state);
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return [south, west, north, east];
}

function buildTiles(bbox) {
  const [south, west, north, east] = bbox;
  const tiles = [];
  for (let lat = south; lat < north; lat += TILE_DEG) {
    for (let lon = west; lon < east; lon += TILE_DEG) {
      tiles.push([lat, lon, Math.min(lat + TILE_DEG, north), Math.min(lon + TILE_DEG, east)]);
    }
  }
  return tiles;
}

async function queryTile(tile, nameRegex, primaryKeyword) {
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
    const data = await res.json();
    return data.elements || [];
  } catch {
    return [];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { state, category, count } = req.body || {};
  if (!state || !category) {
    return res.status(400).json({ error: "State aur category dono zaroori hain" });
  }

  const wanted = Math.min(Math.max(Number(count) || 20, 1), 100);
  const startTime = Date.now();

  try {
    const bbox = await geocodeState(state);
    const tiles = buildTiles(bbox);

    const keywords = category.split(/[\s,]+/).map((k) => k.trim()).filter((k) => k.length > 1);
    const primaryKeyword = (keywords[0] || category).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") || primaryKeyword;

    const cursorKey = `lead_scan_cursor/${slugify(state)}_${slugify(category)}`;
    const cursorRes = await fetch(`${FIREBASE_DB_URL}/${cursorKey}.json`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const cursorStart = cursorRes && cursorRes.ok ? Number((await cursorRes.json()) || 0) % tiles.length : 0;
    const orderedTiles = [...tiles.slice(cursorStart), ...tiles.slice(0, cursorStart)];

    const [existingRes, deletedRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/leads.json?shallow=true`, { signal: AbortSignal.timeout(10000) }),
      fetch(`${FIREBASE_DB_URL}/leads_excluded_ids.json?shallow=true`, { signal: AbortSignal.timeout(10000) }).catch(() => null),
    ]);
    const existingKeys = existingRes.ok ? ((await existingRes.json()) || {}) : {};
    const excludedKeys = deletedRes && deletedRes.ok ? ((await deletedRes.json()) || {}) : {};
    Object.assign(existingKeys, excludedKeys);

    const newLeads = {};
    const returned = [];
    let tilesScanned = 0;

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

          const address = buildAddress(tags);
          const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "";
          if (!address || !phone) continue;

          const leadId = `osm_${el.type}_${el.id}`;
          if (existingKeys[leadId] || newLeads[leadId]) continue;

          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;

          const lead = { name, address, phone, category, state, lat: lat ?? null, lon: lon ?? null, createdAt: Date.now() };
          newLeads[leadId] = lead;
          returned.push({ id: leadId, ...lead });
          if (returned.length >= wanted) break;
        }
        if (returned.length >= wanted) break;
      }
      await sleep(200);
    }

    const nextCursor = (cursorStart + tilesScanned) % tiles.length;
    await fetch(`${FIREBASE_DB_URL}/${cursorKey}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextCursor),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});

    if (Object.keys(newLeads).length > 0) {
      await fetch(`${FIREBASE_DB_URL}/leads.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeads),
        signal: AbortSignal.timeout(10000),
      });
    }

    const areaExhausted = tilesScanned >= tiles.length && returned.length < wanted;
    return res.json({
      leads: returned,
      newCount: returned.length,
      message:
        returned.length === 0
          ? "Is state/category ke liye koi naya lead nahi mila."
          : returned.length < wanted
          ? `${returned.length} naye unique leads mile.${areaExhausted ? " Poora state scan ho gaya." : ""}`
          : `${returned.length} naye unique leads mil gaye!`,
    });
  } catch (err) {
    console.error("leads/generate failed:", err);
    return res.status(502).json({ error: err?.message || "Lead generation failed." });
  }
}
