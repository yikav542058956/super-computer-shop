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
  const token = req.headers["x-admin-ai-token"];
  if (token !== "sc-admin-ai-2026") { res.status(401).json({ error: "Unauthorized" }); return; }

  const { messages, context } = req.body as { messages: any[]; context?: any };
  if (!messages || !Array.isArray(messages)) { res.status(400).json({ error: "messages required" }); return; }

  // Serialize due entries into a readable summary for the AI
  const dueEntries: any[] = context?.dues?.entries || [];
  const duesSummary = dueEntries.length === 0
    ? "Abhi koi due nahi hai."
    : dueEntries.map((d: any, i: number) =>
        `${i + 1}. ${d.customer} — ₹${d.amount}${d.phone ? ` — Phone: ${d.phone}` : ""}${d.dueDate ? ` — Due: ${d.dueDate}` : ""}${d.isOverdue ? " ⚠️ OVERDUE" : ""}${d.billNo ? ` — Bill: ${d.billNo}` : ""}`
      ).join("\n");

  const systemPrompt = `You are an intelligent admin assistant for "Super Computer" — a laptop and computer store in India.
You help the store admin via voice or text (Hindi/English/Hinglish) commands.

## Store Stats
- Total Orders: ${context?.stats?.totalOrders ?? "?"}
- Total Products: ${context?.stats?.totalProducts ?? "?"}
- Total Revenue: ₹${context?.stats?.totalRevenue ?? "?"}

## Due / Ledger Summary
Total outstanding: ₹${context?.dues?.total ?? 0} across ${context?.dues?.count ?? 0} customers (${context?.dues?.overdueCount ?? 0} overdue)

${duesSummary}

## Admin Panel Routes
- Dashboard: /admin/dashboard
- Products: /admin/products
- Orders: /admin/orders
- Offline Sale: /admin/offline-sale

## Your Capabilities
You can do the following actions. Return JSON always.

1. **none** — just answer conversationally, explain data, summarize dues etc.
2. **add_product** — add a product to catalog
3. **create_sale** — record an offline in-store sale
4. **navigate** — go to a page
5. **revert** — undo the last action
6. **send_whatsapp** — generate WhatsApp reminder links for due customers

## IMPORTANT — WhatsApp Reminders
When admin asks to remind a customer, message them, or send due notice:
- Include "whatsappLinks" array in your response
- Each entry: { phone, customerName, message }
- The message should be a polite Hindi/Hinglish reminder about the due, with store name "Super Computer", amount, and bill number if available
- Example message: "Namaste [Name] ji, Super Computer ki taraf se yaad dilana chahte hain ki aapka ₹X due hai (Bill: SC-XXXXX). Jaldi payment karein. Shukriya!"
- You can generate links for ONE customer or ALL overdue customers at once

## Response Format (STRICT JSON — no extra text)
{
  "message": "Conversational reply to admin (Hindi/Hinglish/English matching their tone). Be brief, warm, helpful.",
  "action": "none" | "add_product" | "create_sale" | "navigate" | "revert",
  "data": { /* action payload — see below */ },
  "whatsappLinks": [ { "phone": "9876543210", "customerName": "Ramesh", "message": "..." } ] | [],
  "needsMoreInfo": true | false
}

Action payloads:
- add_product: { name, brand, category, price, specs: {} }
- create_sale: { customerName, phone, address, productName, amount, qty, paymentMethod, gstRate }
- navigate: { path }
- revert: {}

Rules:
- Always respond in the same language the admin used (Hinglish is fine)
- Ask one question at a time when info is missing
- Be concise — this is a voice assistant, keep replies under 60 words when possible
- If asked about dues, list them clearly with amounts and overdue status
- If admin says "remind all" or "sabko message karo" — generate WhatsApp links for ALL overdue/pending customers`;

  try {
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    // Self-test greeting — AI introduces itself with live store data
    const isInit = messages.length === 1 && messages[0].content === "__SELFTEST__";
    if (isInit) {
      const ctx = req.body.context as any;
      const dueCount = ctx?.dues?.count ?? 0;
      const overdueCount = ctx?.dues?.overdueCount ?? 0;
      const totalDue = ctx?.dues?.total ?? 0;
      const greeting = dueCount > 0
        ? `Namaste! 👋 Main hoon Super Computer AI.\n\n📊 Store summary:\n• ${ctx?.stats?.totalOrders ?? 0} orders, ${ctx?.stats?.totalProducts ?? 0} products\n• 💰 ${dueCount} customers ka due pending — कुल ₹${totalDue.toLocaleString("en-IN")}${overdueCount > 0 ? ` (${overdueCount} overdue ⚠️)` : ""}\n\nBoliye ya mic se poochiye — kya karna hai?`
        : `Namaste! 👋 Main hoon Super Computer AI.\n\n📊 Store: ${ctx?.stats?.totalOrders ?? 0} orders, ${ctx?.stats?.totalProducts ?? 0} products. Koi due nahi abhi ✅\n\nBoliye — product add, sale record, ya kuch aur?`;
      res.json({ message: greeting, action: "none", whatsappLinks: [], needsMoreInfo: false });
      return;
    }

    const raw = await groqChat(TEXT_MODEL, allMessages, 700);
    const parsed = extractJSON(raw);
    res.json(parsed);
  } catch (e: any) {
    res.status(502).json({ error: e.message, message: "Sorry, AI error hua. Dobara try karo.", action: "none", needsMoreInfo: false });
  }
});

/* ── 4. Verify UPI payment screenshot ─────────────────────────── */
router.post("/verify-payment", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", expectedAmount, orderId } = req.body as {
    imageBase64: string; mimeType?: string; expectedAmount: number; orderId?: string;
  };
  if (!imageBase64) { res.status(400).json({ error: "imageBase64 required" }); return; }
  if (!expectedAmount) { res.status(400).json({ error: "expectedAmount required" }); return; }

  const nowIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const prompt = `You are a payment verification AI for an Indian e-commerce store (Super Computer).

Analyze this UPI/banking app payment screenshot and answer:
1. Is this a real successful payment screenshot from a legitimate payment app (PhonePe, GPay, Paytm, BHIM, bank app, etc.)?
2. What is the exact amount shown as paid/debited?
3. What time does the screenshot show for the transaction?

Verification rules:
- Expected amount: ₹${expectedAmount} (accept within ₹2 rounding difference)
- Current IST time: ${nowIST}
- Payment must be within the last 60 minutes
- Must show a SUCCESS/PAID/COMPLETED status (not pending, not failed)
- Must look like a genuine transaction screen (not a photo of a photo, not edited)

Return ONLY valid JSON (no markdown):
{"isValid":true/false,"detectedAmount":number_or_null,"detectedTime":"string_or_null","reason":"1-2 sentence explanation","confidence":"high/medium/low"}`;

  try {
    const raw = await groqChat(VISION_MODEL, [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ], 300);
    const result = extractJSON(raw);
    res.json(result);
  } catch (e: any) {
    res.status(502).json({ error: e.message, isValid: false, reason: "AI verification failed. Please try again." });
  }
});

/* ── 5. Generate a realistic customer review text ─────────────── */
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

/* ── 6. OCR: Handwritten exam paper photo → formatted text ───── */
/* ── General-purpose OCR ─────────────────────────────────────────────────── */
router.post("/ocr", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", lang = "auto" } = req.body as {
    imageBase64: string; mimeType?: string; lang?: "auto" | "hindi" | "english";
  };
  if (!imageBase64) { res.status(400).json({ error: "imageBase64 required" }); return; }

  const langHint =
    lang === "hindi"   ? "The image likely contains Hindi (Devanagari) text. Prioritise Hindi OCR." :
    lang === "english" ? "The image likely contains English text. Prioritise English OCR." :
                         "The image may contain Hindi, English, or both — detect automatically.";

  const prompt = `You are an expert OCR assistant. ${langHint}

Extract ALL visible text from this image exactly as it appears.

Rules:
1. Preserve line breaks, spacing, and layout as closely as possible.
2. For handwriting: include your best guess; mark unclear words as [unclear].
3. For printed/typed text: reproduce it verbatim.
4. Include text from all regions — headers, footers, tables, captions, watermarks.
5. Do NOT translate. Keep the original language.
6. If the image has no readable text, reply with exactly: NO_TEXT_FOUND
7. If the image is too blurry to read, reply with exactly: IMAGE_TOO_BLURRY

Return ONLY the extracted text. No explanations, no commentary.`;

  try {
    const text = await groqChat(VISION_MODEL, [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: "text", text: prompt },
      ],
    }], 3000);

    const t = (text || "").trim().toUpperCase();
    if (!text || t === "NO_TEXT_FOUND" || t.startsWith("NO_TEXT") || t.startsWith("NO TEXT")) {
      res.json({ text: "", warning: "Is photo mein koi text nahi mila." });
    } else if (t === "IMAGE_TOO_BLURRY" || t.startsWith("IMAGE_TOO_BLUR") || t.startsWith("IMAGE TOO BLUR") || t.startsWith("TOO BLURRY")) {
      res.json({ text: "", warning: "Photo blur hai — thodi clear photo upload karo." });
    } else {
      res.json({ text: text.trim(), chars: text.trim().length });
    }
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

/* ── Exam-paper OCR ──────────────────────────────────────────────────────── */
router.post("/ocr-paper", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64: string; mimeType?: string;
  };
  if (!imageBase64) { res.status(400).json({ error: "imageBase64 required" }); return; }

  const prompt = `You are an expert OCR assistant specializing in handwritten exam papers.

Extract ALL text from this handwritten exam paper image. Follow these rules:
1. Preserve the original structure — questions numbered, sub-questions lettered (a, b, c)
2. Keep headings, instructions, and marks allocations
3. If text is unclear/blurry, mark it as [unclear] but still include your best guess
4. Format as clean plain text — no markdown, no bullets (unless the original uses them)
5. Separate sections with blank lines
6. Include ALL text visible: title, subject, time, total marks, instructions, questions

If the image is too blurry or unreadable, respond with exactly: "ERROR: Image too blurry. Please re-upload a clearer photo."

Return ONLY the extracted text. No explanations, no commentary.`;

  try {
    const text = await groqChat(VISION_MODEL, [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: "text", text: prompt },
      ],
    }], 2000);

    if (!text || text.trim().length < 10) {
      res.json({ text: "", warning: "No text detected. Please type the paper content manually." });
    } else if (text.startsWith("ERROR:")) {
      res.json({ text: "", warning: text.replace("ERROR:", "").trim() });
    } else {
      res.json({ text: text.trim() });
    }
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

export default router;
