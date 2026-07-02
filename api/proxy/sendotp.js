const BASE_URL = "https://rozgarapinew.teachx.in/get";
const COMMON_HEADERS = {
  "auth-key": "appxapi",
  "client-service": "Appx",
  "source": "website",
  "device-type": "",
  "origin": "https://www.rojgarwithankit.co.in",
  "referer": "https://www.rojgarwithankit.co.in/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { phone } = req.query;
  if (!phone || !/^\d{10}$/.test(phone)) {
    res.status(400).json({ status: 400, message: "Valid 10-digit phone required" });
    return;
  }

  try {
    const url = `${BASE_URL}/sendotp?phone=${encodeURIComponent(phone)}`;
    const upstream = await fetch(url, { method: "GET", headers: COMMON_HEADERS });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("sendotp upstream error:", err);
    res.status(502).json({ status: 502, message: "Upstream request failed" });
  }
}
