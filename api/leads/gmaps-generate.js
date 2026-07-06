/**
 * Vercel Serverless Function: POST /api/leads/gmaps-generate
 * Google Maps JSPB scraper — mirrors artifacts/api-server/src/routes/gmaps.ts
 */

const FIREBASE_DB_URL = "https://super-computer-c6a99-default-rtdb.firebaseio.com";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function safeStr(v) {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function safeNum(v) {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function deepGet(obj, ...path) {
  let cur = obj;
  for (const idx of path) {
    if (!Array.isArray(cur) || cur.length <= idx) return undefined;
    cur = cur[idx];
  }
  return cur;
}

function sanitizeUrl(raw) {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {}
  return undefined;
}

/**
 * Parse business listings from Google Maps JSPB response embedded in the HTML.
 *
 * The Google Maps page embeds APP_INITIALIZATION_STATE as a JSON array.
 * Element [3][2] is the JSPB payload string. Inside that, listings are at [0][1].
 * Each listing's place sub-array is at [14] with:
 *   [11]       – name
 *   [2][0]     – address
 *   [178][0][0]– phone
 *   [7][0]     – website
 *   [4][7]     – rating
 *   [4][8]     – review count
 */
function parseGoogleMapsJSPB(html, category, city) {
  const patterns = [
    /APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]+?\]);\s*window\./,
    /window\.APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]+?\]);\s*window\./,
    /APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]{20,}\??\])\s*;/,
  ];

  let rootData = null;
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

  if (!rootData || !Array.isArray(rootData)) return [];

  const innerStr = deepGet(rootData, 3, 2);
  if (typeof innerStr !== "string" || innerStr.length < 50) return [];

  let inner;
  try {
    inner = JSON.parse(innerStr);
  } catch {
    return [];
  }

  const listings = deepGet(inner, 0, 1);
  if (!Array.isArray(listings) || listings.length === 0) return [];

  const results = [];

  for (const item of listings) {
    try {
      const place = deepGet(item, 14);
      if (!Array.isArray(place) || place.length < 12) continue;

      const name = safeStr(deepGet(place, 11));
      if (!name) continue;

      const address =
        safeStr(deepGet(place, 2, 0)) ||
        safeStr(deepGet(place, 18)) ||
        "";

      const phone =
        safeStr(deepGet(place, 178, 0, 0)) ||
        safeStr(deepGet(place, 178, 0, 3)) ||
        "";

      const rawWebsite = safeStr(deepGet(place, 7, 0));
      const website = sanitizeUrl(rawWebsite);

      const rating = safeNum(deepGet(place, 4, 7));
      const reviews = safeNum(deepGet(place, 4, 8));

      const fp = slugify(name) + "__" + slugify(address || city);
      const id = `gmaps_fp_${fp}`;

      results.push({ id, name, address, phone, website, rating, reviews, category, city, source: "google_maps", createdAt: Date.now() });
    } catch {
      continue;
    }
  }

  return results;
}

async function fetchGoogleMapsLeads(category, city) {
  const searchTerm = `${category} ${city} India`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;

  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(22000),
  });

  if (!res.ok) throw new Error(`Google Maps returned HTTP ${res.status}`);

  const html = await res.text();
  return parseGoogleMapsJSPB(html, category, city);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { city, category, count } = req.body || {};
  if (!city?.trim() || !category?.trim()) {
    return res.status(400).json({ error: "City aur category dono zaroori hain" });
  }

  const wanted = Math.min(Math.max(Number(count) || 20, 1), 50);

  try {
    const [existingRes, deletedRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/leads.json?shallow=true`, { signal: AbortSignal.timeout(10000) }),
      fetch(`${FIREBASE_DB_URL}/leads_excluded_ids.json?shallow=true`, { signal: AbortSignal.timeout(10000) }).catch(() => null),
    ]);

    const existingKeys = existingRes.ok ? ((await existingRes.json()) || {}) : {};
    const excludedKeys =
      deletedRes && deletedRes.ok ? ((await deletedRes.json()) || {}) : {};

    const rawLeads = await fetchGoogleMapsLeads(category.trim(), city.trim());

    if (rawLeads.length === 0) {
      return res.json({
        leads: [],
        newCount: 0,
        message: `"${category} ${city}" ke liye Google Maps se result nahi aaya. Thodi der baad ya alag category try karein.`,
      });
    }

    const seenIds = new Set();
    const newLeads = {};
    const returned = [];

    for (const lead of rawLeads) {
      if (returned.length >= wanted) break;
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
        state: lead.city,
        source: "google_maps",
        createdAt: lead.createdAt,
      };

      newLeads[lead.id] = savedLead;
      returned.push({ id: lead.id, ...savedLead });
    }

    if (Object.keys(newLeads).length > 0) {
      const writeRes = await fetch(`${FIREBASE_DB_URL}/leads.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeads),
        signal: AbortSignal.timeout(10000),
      });
      if (!writeRes.ok) {
        return res.status(502).json({ error: "Leads Firebase mein save nahi ho sake." });
      }
    }

    return res.json({
      leads: returned,
      newCount: returned.length,
      message:
        returned.length === 0
          ? `"${category} ${city}" ke liye pehle se saved leads hain. Alag category try karein.`
          : `${returned.length} naye leads mile Google Maps se — "${category}" in "${city}"!`,
    });
  } catch (err) {
    console.error("leads/gmaps-generate failed:", err);
    return res.status(502).json({
      error: err?.message || "Google Maps se data fetch nahi ho saka. Thodi der baad try karein.",
    });
  }
}
