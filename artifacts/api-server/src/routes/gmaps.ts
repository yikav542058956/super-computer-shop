import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const FIREBASE_DB_URL = "https://super-computer-c6a99-default-rtdb.firebaseio.com";
const PLACES_API_URL  = "https://places.googleapis.com/v1/places:searchText";

// Fields to request from Places API (New) — billed per field mask
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
].join(",");

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

/**
 * Fetch business listings via Google Places API (New) — Text Search.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */
async function fetchGoogleMapsLeads(category: string, city: string): Promise<GmapsLead[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY secret not set");

  const textQuery = `${category} in ${city}, India`;

  const res = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en",
      regionCode: "IN",
      maxResultCount: 20,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    logger.error({ status: res.status, errText }, "Places API error");
    throw new Error(`Google Places API returned HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { places?: any[] };
  const places = data.places ?? [];

  return places.map((p: any) => {
    const name    = p.displayName?.text ?? "";
    const address = p.formattedAddress ?? "";
    const fp      = slugify(name) + "__" + slugify(address || city);

    return {
      id:       `gmaps_fp_${fp}`,
      name,
      address,
      phone:    p.nationalPhoneNumber ?? "",
      website:  p.websiteUri ?? undefined,
      rating:   typeof p.rating === "number" ? p.rating : undefined,
      reviews:  typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
      category,
      city,
      source:   "google_maps" as const,
      createdAt: Date.now(),
    };
  }).filter(l => l.name); // drop empty-name entries
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
        message: `"${category} ${city}" ke liye Google Maps se result nahi aaya. Alag category try karein.`,
      });
      return;
    }

    const seenIds  = new Set<string>();
    const newLeads: Record<string, object> = {};
    const returned: object[] = [];

    for (const lead of rawLeads) {
      if (returned.length >= wanted) break;
      if (seenIds.has(lead.id)) continue;
      if (existingKeys[lead.id] || excludedKeys[lead.id]) continue;
      seenIds.add(lead.id);

      const savedLead = {
        name:      lead.name,
        address:   lead.address,
        phone:     lead.phone,
        website:   lead.website ?? "",
        rating:    lead.rating  ?? null,
        reviews:   lead.reviews ?? null,
        category:  lead.category,
        city:      lead.city,
        state:     lead.city,   // backward-compat with OSM leads
        source:    "google_maps" as const,
        createdAt: lead.createdAt,
      };

      newLeads[lead.id] = savedLead;
      returned.push({ id: lead.id, ...savedLead });
    }

    // Persist to Firebase
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
      leads:    returned,
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
