import { Router } from "express";

const router = Router();
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL   = "llama-3.3-70b-versatile";

function apiKey(): string {
  const k = process.env["GROQ_API_KEY"];
  if (!k) throw new Error("GROQ_API_KEY not configured");
  return k;
}

async function groqChat(model: string, messages: any[], maxTokens = 1024): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  if (!res.ok) throw new Error(await res.text());
  const d: any = await res.json();
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

function extractJSON(raw: string): any {
  // Try fenced block first, then bare JSON
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fence ? fence[1] : raw).trim();

  // Find the outermost balanced { } block
  let start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in AI response");
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("Malformed JSON in AI response");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    // Last resort: strip common issues and retry
    const cleaned = text.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned);
  }
}

/* ── 1. Generate description ──────────────────────────────────── */
router.post("/generate-description", async (req, res) => {
  const { name, brand, category, price, discountPrice, specs } = req.body as any;
  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const specsText = specs && Object.keys(specs).length
    ? Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(", ") : "";

  const prompt = `You are a product copywriter for a laptop/computer store. Write an engaging, detailed English product description for:
- Name: ${name}
${brand ? `- Brand: ${brand}` : ""}
${category ? `- Category: ${category}` : ""}
${discountPrice ? `- Price: ₹${Number(discountPrice).toLocaleString("en-IN")}` : price ? `- Price: ₹${Number(price).toLocaleString("en-IN")}` : ""}
${specsText ? `- Specs: ${specsText}` : ""}

Write 3-4 plain text paragraphs (no headings, bullets, or markdown). Cover: performance, ideal users, build quality, value for money.`;

  try {
    const description = await groqChat(TEXT_MODEL, [{ role: "user", content: prompt }], 600);
    res.json({ description });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

/* ── 2. Scan bill / photo → extract product details ───────────── */
router.post("/scan-bill", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64: string; mimeType?: string;
  };
  if (!imageBase64) { res.status(400).json({ error: "imageBase64 required" }); return; }

  const prompt = `You are an AI assistant helping a laptop/computer store admin. Analyze this bill, invoice, box label, or product photo and extract all product details.

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "name": "Full product name with model number",
  "brand": "Brand name",
  "category": "Laptops | Gaming Laptops | Accessories | Other",
  "model": "Model number/SKU",
  "mrp": "MRP price as number (no currency symbol)",
  "specs": {
    "Processor": "...",
    "RAM": "...",
    "Storage": "...",
    "Display": "...",
    "Graphics": "...",
    "Battery": "...",
    "OS": "...",
    "Weight": "..."
  },
  "confidence": "high | medium | low",
  "notes": "Any important notes or unclear fields"
}

Only include spec keys that are clearly visible. Return JSON only, no explanation.`;

  try {
    const raw = await groqChat(VISION_MODEL, [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: "text", text: prompt },
      ],
    }], 800);
    const extracted = extractJSON(raw);
    res.json({ extracted, raw });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

/* ── 3. Auto-fetch specs + MRP from device name/model ─────────── */
router.post("/fetch-specs", async (req, res) => {
  const { name, brand, model } = req.body as { name: string; brand?: string; model?: string };
  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const prompt = `You are a laptop/computer product database. For the following device, provide accurate technical specifications and typical Indian market MRP.

Device: ${name}${brand ? ` | Brand: ${brand}` : ""}${model ? ` | Model: ${model}` : ""}

Return ONLY a valid JSON object:
{
  "name": "Corrected full product name",
  "brand": "Brand name",
  "category": "Laptops | Gaming Laptops | Accessories",
  "mrp": <typical Indian MRP as integer, no symbol>,
  "specs": {
    "Processor": "Full processor name",
    "RAM": "e.g. 16GB DDR5",
    "Storage": "e.g. 512GB SSD NVMe",
    "Display": "e.g. 15.6 inch FHD IPS 144Hz",
    "Graphics": "e.g. NVIDIA RTX 4060 8GB",
    "Battery": "e.g. 72Wh, up to 8 hours",
    "OS": "e.g. Windows 11 Home",
    "Weight": "e.g. 1.8 kg",
    "Ports": "e.g. 2x USB-A, 1x USB-C, HDMI, SD card",
    "Wireless": "e.g. Wi-Fi 6E, Bluetooth 5.3"
  },
  "confidence": "high | medium | low",
  "note": "Mention if specs are approximate or model variant may differ"
}

Base specs on publicly known specifications for this exact model. If unsure, set confidence to low. Return JSON only.`;

  try {
    const raw = await groqChat(TEXT_MODEL, [{ role: "user", content: prompt }], 700);
    const data = extractJSON(raw);
    res.json(data);
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

export default router;
