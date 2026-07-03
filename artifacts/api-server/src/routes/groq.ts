import { Router } from "express";

const router = Router();

router.post("/generate-description", async (req, res) => {
  const { name, brand, category, price, discountPrice, specs } = req.body as {
    name: string;
    brand?: string;
    category?: string;
    price?: string;
    discountPrice?: string;
    specs?: Record<string, string>;
  };

  if (!name) {
    res.status(400).json({ error: "Product name is required" });
    return;
  }

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "Groq API key not configured" });
    return;
  }

  const specsText = specs && Object.keys(specs).length > 0
    ? Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "";

  const prompt = `You are a product copywriter for a laptop/computer store called Super Computer, located in Kasganj Road, Mirehachi, Etah, UP. Write an engaging, detailed product description in English for the following product.

Product Details:
- Name: ${name}
${brand ? `- Brand: ${brand}` : ""}
${category ? `- Category: ${category}` : ""}
${discountPrice ? `- Price: ₹${Number(discountPrice).toLocaleString("en-IN")}` : price ? `- Price: ₹${Number(price).toLocaleString("en-IN")}` : ""}
${specsText ? `- Specifications: ${specsText}` : ""}

Write 3-4 paragraphs covering: key features and performance highlights, who it's ideal for, build quality and design, and value for money. Be enthusiastic and persuasive but factually accurate. Do NOT include any headings, bullet points, or markdown — only plain flowing text paragraphs separated by line breaks. Do NOT mention the store name.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: `Groq API error: ${err}` });
      return;
    }

    const data = await response.json() as any;
    const description = data.choices?.[0]?.message?.content?.trim() || "";
    res.json({ description });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
