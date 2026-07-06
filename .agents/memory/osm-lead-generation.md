---
name: OSM-based lead generation (no API key)
description: How the Super Computer admin "Lead Generator" fetches business leads from OpenStreetMap without a paid API key, and the performance constraint that shaped the design.
---

The admin Lead Generator feature (state + category -> business name/address/phone) uses free OpenStreetMap data (Nominatim for geocoding a state to a bbox, Overpass API for querying named nodes) instead of Google Places, since the user wanted no paid API key.

**Constraint:** Overpass API times out (remark: "Query timed out") when running a `name~"regex"` search across an entire Indian state's bounding box in one query — the area is too large to scan in the ~25-30s Overpass allows.

**How it's solved:** The state bbox is split into a grid of small tiles (~0.6 degree each) and queried in concurrent batches (5 at a time), stopping once enough new leads are found or a time budget is hit. A per (state, category) tile-scan cursor is persisted in Firebase (`lead_scan_cursor/...`) so each subsequent "Generate" click resumes from new tiles instead of rescanning the same area — this is also what guarantees leads are never duplicated across generate calls (combined with checking existing `leads/{osmId}` keys before returning/saving).

**Why this matters:** Any future change to this feature (e.g. supporting city-level or all-India search) must keep the tiling + cursor approach, or Overpass requests will time out again on large areas.
