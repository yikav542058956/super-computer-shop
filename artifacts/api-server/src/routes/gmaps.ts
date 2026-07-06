import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const FIREBASE_DB_URL = "https://super-computer-c6a99-default-rtdb.firebaseio.com";

// Browser-like headers so Google doesn't block the request
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

interface GmapsLead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category: string;
  city: string;
  source: "google_maps";
  createdAt: number;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function safeStr(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function safeNum(v: unknown): number | undefined {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

/** Safely traverse nested arrays using integer indices. Returns undefined on any miss. */
function deepGet(obj: unknown, ...path: number[]): unknown {
  let cur: any = obj;
  for (const idx of path) {
    if (!Array.isArray(cur) || cur.length <= idx) return undefined;
    cur = cur[idx];
  }
  return cur;
}

/** Sanitize website URL — only allow http/https to prevent javascript: injection */
function sanitizeUrl(raw: string): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    // not a valid URL
  }
  return undefined;
}

/**
 * Parse business listings from Google Maps JSPB (JSON Protocol Buffers) response.
 *
 * Google Maps embeds search-result data as APP_INITIALIZATION_STATE in the HTML.
 * The outer value is a 4-element array; element [3][2] is a JSON string containing
 * the actual JSPB payload. Inside that, listings live at [0][1].
 *
 * Each listing has a "place" sub-array at index [14] with well-known fields:
 *   [11]       – name (string)
 *   [2][0]     – primary address line (string)
 *   [18]       – secondary address (string)
 *   [178][0][0]– phone (string)
 *   [7][0]     – website (string)
 *   [4][7]     – rating (number)
 *   [4][8]     – review count (number)
 *
 * These offsets come from community reverse-engineering of the JSPB wire format.
 * If Google changes the format this returns an empty array (safe failure mode).
 */
function parseGoogleMapsJSPB(html: string, category: string, city: string): GmapsLead[] {
  // Extract APP_INITIALIZATION_STATE JSON array from the page HTML
  const patterns = [
    /APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]+?\]);\s*window\./,
    /window\.APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]+?\]);\s*window\./,
    /APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]{20,}\??\])\s*;/,
  ];

  let rootData: unknown = null;
  for (const pat of patterns) {
    const m = html.match(pat);
    if (!m) continue;
    try {
      rootData = JSON.parse(m[1]);
      break;
    } catch {
      continue;
    }
  }

  if (!rootData || !Array.isArray(rootData)) {
    logger.warn("gmaps: could not extract APP_INITIALIZATION_STATE from HTML");
    return [];
  }

  // rootData[3][2] is the inner JSPB payload as a JSON string
  const innerStr = deepGet(rootData, 3, 2);
  if (typeof innerStr !== "string" || innerStr.length < 50) {
    logger.warn("gmaps: inner JSPB payload missing or too short");
    return [];
  }

  let inner: unknown;
  try {
    inner = JSON.parse(innerStr);
  } catch {
    logger.warn("gmaps: failed to JSON-parse inner JSPB payload");
    return [];
  }

  // Listings array at inner[0][1]
  const listings = deepGet(inner, 0, 1);
  if (!Array.isArray(listings) || listings.length === 0) {
    logger.warn("gmaps: no listings found at inner[0][1]");
    return [];
  }

  const results: GmapsLead[] = [];

  for (const item of listings as unknown[]) {
    try {
      const place = deepGet(item, 14);
      // Schema guard: place must be an array with at least 12 elements
      if (!Array.isArray(place) || place.length < 12) continue;

      const name = safeStr(deepGet(place, 11));
      if (!name) continue; // skip listings with no name — data is incomplete

      const address =
        safeStr(deepGet(place, 2, 0)) ||
        safeStr(deepGet(place, 18)) ||
        "";

      // Phone can appear at a few alternate paths in different payload versions
      const phone =
        safeStr(deepGet(place, 178, 0, 0)) ||
        safeStr(deepGet(place, 178, 0, 3)) ||
        "";

      const rawWebsite = safeStr(deepGet(place, 7, 0));
      const website = sanitizeUrl(rawWebsite);

      const rating = safeNum(deepGet(place, 4, 7));
      const reviews = safeNum(deepGet(place, 4, 8));

      // Stable fingerprint: name + normalised address to distinguish same-name businesses
      const fp = slugify(name) + "__" + slugify(address || city);
      const id = `gmaps_fp_${fp}`;

      results.push({
        id,
        name,
        address,
        phone,
        website,
        rating,
        reviews,
        category,
        city,
        source: "google_maps",
        createdAt: Date.now(),
      });
    } catch (err) {
      logger.warn({ err }, "gmaps: error parsing single listing, skipping");
      continue;
    }
  }

  return results;
}

/**
 * Fetch and parse Google Maps search results for a given category + city.
 */
async function fetchGoogleMapsLeads(category: string, city: string): Promise<GmapsLead[]> {
  const searchTerm = `${category} ${city} India`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;

  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(22000),
  });

  if (!res.ok) {
    throw new Error(`Google Maps returned HTTP ${res.status}`);
  }

  const html = await res.text();
  return parseGoogleMapsJSPB(html, category, city);
}

// POST /api/leads/gmaps-generate
router.post("/leads/gmaps-generate", async (req, res) => {
  const { city, category, count } = req.body as { city?: string; category?: string; count?: number };

  if (!city?.trim() || !category?.trim()) {
    res.status(400).json({ error: "City aur category dono zaroori hain" });
    return;
  }

  const wanted = Math.min(Math.max(Number(count) || 20, 1), 50);

  try {
    // Fetch existing and excluded lead IDs so we never re-save the same business
    const [existingRes, deletedRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/leads.json?shallow=true`, { signal: AbortSignal.timeout(10000) }),
      fetch(`${FIREBASE_DB_URL}/leads_excluded_ids.json?shallow=true`, { signal: AbortSignal.timeout(10000) }).catch(() => null),
    ]);

    const existingKeys: Record<string, boolean> = existingRes.ok
      ? ((await existingRes.json()) as Record<string, boolean> | null) ?? {}
      : {};
    const excludedKeys: Record<string, boolean> =
      deletedRes && deletedRes.ok
        ? ((await deletedRes.json()) as Record<string, boolean> | null) ?? {}
        : {};

    const rawLeads = await fetchGoogleMapsLeads(category.trim(), city.trim());

    if (rawLeads.length === 0) {
      res.json({
        leads: [],
        newCount: 0,
        message: `"${category} ${city}" ke liye Google Maps se result nahi aaya. Thodi der baad ya alag category try karein (jaise "computer institute" ya "coaching centre").`,
      });
      return;
    }

    const seenIds = new Set<string>();
    const newLeads: Record<string, object> = {};
    const returned: object[] = [];

    for (const lead of rawLeads) {
      if (returned.length >= wanted) break;
      // Skip duplicates within this batch, and against existing + excluded keys
      if (seenIds.has(lead.id)) continue;
      if (existingKeys[lead.id] || excludedKeys[lead.id]) continue;
      seenIds.add(lead.id);

      const savedLead = {
        name: lead.name,
        address: lead.address,
        phone: lead.phone,
        website: lead.website ?? "",
        rating: lead.rating ?? null,
        reviews: lead.reviews ?? null,
        category: lead.category,
        city: lead.city,
        state: lead.city,   // kept for backwards-compat with OSM leads
        source: "google_maps" as const,
        createdAt: lead.createdAt,
      };

      newLeads[lead.id] = savedLead;
      returned.push({ id: lead.id, ...savedLead });
    }

    // Persist to Firebase — treat write failure as a real error
    if (Object.keys(newLeads).length > 0) {
      const writeRes = await fetch(`${FIREBASE_DB_URL}/leads.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeads),
        signal: AbortSignal.timeout(10000),
      });
      if (!writeRes.ok) {
        logger.error({ status: writeRes.status }, "gmaps: Firebase PATCH failed");
        res.status(502).json({ error: "Leads Firebase mein save nahi ho sake. Thodi der baad try karein." });
        return;
      }
    }

    res.json({
      leads: returned,
      newCount: returned.length,
      message:
        returned.length === 0
          ? `"${category} ${city}" ke liye pehle se saved leads hain ya naya result nahi mila. Alag category try karein.`
          : `${returned.length} naye leads mile Google Maps se — "${category}" in "${city}"!`,
    });
  } catch (err: any) {
    logger.error({ err }, "leads/gmaps-generate failed");
    res.status(502).json({
      error: err?.message || "Google Maps se data fetch nahi ho saka. Thodi der baad try karein.",
    });
  }
});

export default router;
