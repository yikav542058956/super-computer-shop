import { Router } from "express";

const router = Router();

const BASE_URL = "https://rozgarapinew.teachx.in/get";
const COMMON_HEADERS: Record<string, string> = {
  "auth-key": "appxapi",
  "client-service": "Appx",
  "source": "website",
  "device-type": "",
  "origin": "https://www.rojgarwithankit.co.in",
  "referer": "https://www.rojgarwithankit.co.in/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
};

router.get("/proxy/sendotp", async (req, res) => {
  const { phone } = req.query as { phone?: string };
  if (!phone || !/^\d{10}$/.test(phone)) {
    res.status(400).json({ status: 400, message: "Valid 10-digit phone required" });
    return;
  }
  try {
    const url = `${BASE_URL}/sendotp?phone=${encodeURIComponent(phone)}`;
    const upstream = await fetch(url, {
      method: "GET",
      headers: COMMON_HEADERS,
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error(err, "proxy/sendotp upstream error");
    res.status(502).json({ status: 502, message: "Upstream request failed" });
  }
});

router.get("/proxy/otpverify", async (req, res) => {
  const { phone, otp, device_id } = req.query as {
    phone?: string;
    otp?: string;
    device_id?: string;
  };
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
    const upstream = await fetch(url, {
      method: "GET",
      headers: COMMON_HEADERS,
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error(err, "proxy/otpverify upstream error");
    res.status(502).json({ status: 502, message: "Upstream request failed" });
  }
});

export default router;
