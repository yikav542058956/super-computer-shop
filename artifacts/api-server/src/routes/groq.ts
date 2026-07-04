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

/* ── 4. Admin AI Chat assistant ──────────────────────────────── */
router.post("/admin-ai", async (req, res) => {
  // Basic guard: require a custom header set by the frontend (defense-in-depth against open abuse)
  const token = req.headers["x-admin-ai-token"];
  const expected = process.env["SESSION_SECRET"] || "super-computer-admin";
  if (token !== expected) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { messages, context } = req.body as { messages: any[]; context?: any };
  if (!messages || !Array.isArray(messages)) { res.status(400).json({ error: "messages required" }); return; }

  const systemPrompt = `You are an intelligent admin assistant for "Super Computer" — a laptop and computer store in India.
You help the store admin via voice or text commands. You understand Hindi-English mixed (Hinglish) commands.

You can help with these actions (return JSON):
1. add_product — collect name, brand, price, category, specs and add a product
2. create_sale — record an offline sale (collect customer name, phone, product, amount)
3. navigate — go to a page in the admin panel
4. fetch_info — explain data or answer a question
5. revert — undo the last action (if revertable)
6. none — just answer conversationally

Context available:
${context ? JSON.stringify(context, null, 2) : "No context provided"}

IMPORTANT: Always respond with a JSON object in this format:
{
  "message": "The conversational response shown to the admin (in the same language they used — Hindi/English/Hinglish)",
  "action": "none" | "add_product" | "create_sale" | "navigate" | "fetch_info" | "revert",
  "data": { /* action-specific data if action is not none */ },
  "needsMoreInfo": true | false,
  "nextQuestion": "If you need more info, what to ask next"
}

For add_product action, data should be: { name, brand, category, price, specs: {} }
For create_sale action, data should be: { customerName, phone, address, productName, amount, qty, paymentMethod, gstRate }
For navigate action, data should be: { path: "/admin/products" | "/admin/orders" | "/admin/offline-sale" | "/admin/dashboard" | ... }

Extract information from the conversation. Ask one question at a time. Be concise and friendly.
If the admin says "add HP product" — ask which HP model. Then fetch specs automatically.
If they say "revert" or "wapas karo" — suggest reverting the last action.
Always respond in the same language mix the admin used.`;

  try {
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    const raw = await groqChat(TEXT_MODEL, allMessages, 500);
    const parsed = extractJSON(raw);
    res.json(parsed);
  } catch (e: any) {
    res.status(502).json({ error: e.message, message: "Sorry, AI error occurred. Please try again.", action: "none", needsMoreInfo: false });
  }
});

/* ── 4. Generate a realistic customer review text ─────────────── */
router.post("/generate-review", async (req, res) => {
  const { name, brand, category, rating } = req.body as any;
  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const tone =
    rating >= 4 ? "positive and enthusiastic" :
    rating === 3 ? "neutral, noting a few minor concerns" :
    "critical, pointing out specific drawbacks";

  const prompt = `Write a realistic ${tone} customer review for the product below in 2–4 natural sentences. Sound like a real Indian buyer — mention specific things like performance, battery, build quality, delivery speed, or value for money. Avoid generic phrases. Write in fluent English only.

Product: ${name}${brand ? ` by ${brand}` : ""}${category ? ` (${category})` : ""}
Rating: ${rating}/5 stars

Return ONLY the review text. No quotes, no labels, no markdown.`;

  try {
    const text = await groqChat(TEXT_MODEL, [{ role: "user", content: prompt }], 220);
    res.json({ text });
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

export default router;
