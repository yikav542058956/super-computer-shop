import { Router } from "express";
import { logger } from "../lib/logger";

const cashfreeRouter = Router();

// ── Firebase payment config cache ────────────────────────────
const FIREBASE_DB_URL = "https://super-computer-c6a99-default-rtdb.firebaseio.com";

interface PaymentConfig {
  gatewayEnabled: boolean;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  upiId: string;
}

let configCache: PaymentConfig | null = null;
let cacheExpiry = 0; // epoch ms

async function getPaymentConfig(): Promise<PaymentConfig> {
  // Return from cache if fresh (60s)
  if (configCache && Date.now() < cacheExpiry) return configCache;

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/settings/payment.json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as Partial<PaymentConfig> | null;
      if (data) {
        configCache = {
          gatewayEnabled: data.gatewayEnabled !== false,
          cashfreeAppId: data.cashfreeAppId || process.env.CASHFREE_APP_ID || "",
          cashfreeSecretKey: data.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY || "",
          upiId: data.upiId || "",
        };
        cacheExpiry = Date.now() + 60_000; // 60s cache
        return configCache;
      }
    }
  } catch (err) {
    logger.warn({ err }, "Firebase payment config fetch failed — falling back to env vars");
  }

  // Fallback to env vars
  return {
    gatewayEnabled: true,
    cashfreeAppId: process.env.CASHFREE_APP_ID || "",
    cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY || "",
    upiId: "",
  };
}

// ── POST /api/cashfree/create-order ──────────────────────────
cashfreeRouter.post("/cashfree/create-order", async (req: any, res: any) => {
  const { firebaseOrderId, amount, customerName, customerPhone, customerEmail, returnUrl } = req.body;

  // Get config from Firebase (with env-var fallback)
  const config = await getPaymentConfig();

  if (!config.gatewayEnabled) {
    return res.status(503).json({
      error: "Payment gateway is currently disabled. Please use UPI manual payment.",
      upiId: config.upiId,
    });
  }

  const APP_ID = config.cashfreeAppId;
  const SECRET_KEY = config.cashfreeSecretKey;

  if (!APP_ID || !SECRET_KEY) {
    return res.status(500).json({ error: "Cashfree keys not configured. Please update them in Admin > Settings > Payment." });
  }

  if (!firebaseOrderId || !amount || amount <= 0) {
    return res.status(400).json({ error: "orderId and amount are required" });
  }

  const cfOrderId = `SC${Date.now()}`;

  const orderPayload = {
    order_id: cfOrderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: firebaseOrderId.slice(0, 50),
      customer_name: customerName || "Customer",
      customer_email: customerEmail || "customer@supercomputer.in",
      customer_phone: (customerPhone || "9999999999").replace(/\D/g, "").slice(-10),
    },
    order_meta: {
      return_url: returnUrl || `https://supercomputer.in/checkout/done?firebase_order=${firebaseOrderId}`,
      notify_url: "",
    },
  };

  try {
    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": APP_ID,
        "x-client-secret": SECRET_KEY,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      logger.error({ data }, "Cashfree order creation failed");
      return res.status(400).json({ error: data.message || "Cashfree order creation failed" });
    }

    return res.json({
      paymentSessionId: data.payment_session_id,
      cashfreeOrderId: data.order_id,
    });
  } catch (err) {
    logger.error({ err }, "Cashfree API call failed");
    return res.status(500).json({ error: "Failed to create payment order" });
  }
});

export default cashfreeRouter;
