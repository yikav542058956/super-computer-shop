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

  const { phone, otp, device_id } = req.query;
  if (!phone || !otp || !device_id) {
    res.status(400).json({ status: 400, message: "phone, otp, device_id required" });
    return;
  }

  try {
    const params = new URLSearchParams({
      useremail: phone,
      otp,
      device_id,
      mydeviceid: "",
      mydeviceid2: "",
    });
    const url = `${BASE_URL}/otpverify?${params.toString()}`;
    const upstream = await fetch(url, { method: "GET", headers: COMMON_HEADERS });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("otpverify upstream error:", err);
    res.status(502).json({ status: 502, message: "Upstream request failed" });
  }
}
