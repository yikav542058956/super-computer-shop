export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { firebaseOrderId, amount, customerName, customerPhone, customerEmail, returnUrl } = req.body;

  const APP_ID = process.env.CASHFREE_APP_ID;
  const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;

  if (!APP_ID || !SECRET_KEY) {
    return res.status(500).json({ error: "Cashfree keys not configured" });
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

    const data = await response.json();

    if (!response.ok) {
      console.error("Cashfree order creation failed:", data);
      return res.status(400).json({ error: data.message || "Cashfree order creation failed" });
    }

    return res.json({
      paymentSessionId: data.payment_session_id,
      cashfreeOrderId: data.order_id,
    });
  } catch (err) {
    console.error("Cashfree API call failed:", err);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
}
