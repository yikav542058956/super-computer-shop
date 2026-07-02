import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Package, ShoppingBag, Info, Truck } from "lucide-react";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { formatINR } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";

export default function CheckoutDone() {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart() as any;
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [orderId, setOrderId] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [storeUpi, setStoreUpi] = useState("supercomputer@upi");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const firebaseOrder = params.get("firebase_order");
    const cfOrderId = params.get("order_id");

    if (!firebaseOrder) {
      setStatus("failed");
      return;
    }

    setOrderId(firebaseOrder);

    // Load store UPI
    get(ref(db, "settings/storeUpi")).then((snap) => {
      if (snap.exists()) setStoreUpi(snap.val());
    });

    // Verify payment status with Cashfree
    const verifyPayment = async () => {
      try {
        // Check order in Firebase
        const orderSnap = await get(ref(db, `orders/${firebaseOrder}`));
        if (!orderSnap.exists()) {
          setStatus("failed");
          return;
        }
        const order = orderSnap.val();
        setOrderData(order);

        // If order already confirmed, mark success
        if (order.paymentStatus === "paid") {
          clearCart();
          setStatus("success");
          return;
        }

        // Verify with Cashfree API via our backend
        if (cfOrderId) {
          const res = await fetch(`/api/cashfree/verify-payment?cashfree_order_id=${cfOrderId}&firebase_order_id=${firebaseOrder}`);
          const data = await res.json();
          if (data.paid) {
            clearCart();
            setStatus("success");
          } else {
            setStatus("failed");
          }
        } else {
          // No Cashfree order ID — assume success if Cashfree redirected back
          clearCart();
          setStatus("success");
        }
      } catch {
        setStatus("failed");
      }
    };

    verifyPayment();
  }, []);

  const copyUpi = () => {
    navigator.clipboard.writeText(storeUpi).then(() => {});
  };

  if (status === "loading") {
    return (
      <Layout noNav>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Verifying your payment…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (status === "failed") {
    return (
      <Layout noNav>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-5">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-slate-500 text-sm mb-6">
              Payment was not completed. Your order has been cancelled.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setLocation("/cart")} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl h-11 gap-2">
                <ShoppingBag className="h-4 w-4" /> Return to Cart
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")} className="w-full border-gray-200 rounded-xl h-11">
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // success
  return (
    <Layout noNav>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
            <div className="relative h-24 w-24 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Order Confirmed! 🎉</h2>
          <p className="text-slate-500 text-sm mb-1">Payment received. Thank you for shopping with Super Computer.</p>
          {orderId && (
            <p className="text-xs text-slate-400 mb-6 font-mono">Order ID: {orderId.slice(-8).toUpperCase()}</p>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left space-y-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-blue-400" />
              <p className="font-semibold text-gray-900 text-sm">Estimated Delivery: 3–5 business days</p>
            </div>
            {orderData?.finalAmount && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                <p className="text-xl font-black text-green-700">{formatINR(orderData.finalAmount)}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Order confirmation will be sent to your registered contact
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => setLocation("/orders")} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl h-11 gap-2">
              <Package className="h-4 w-4" /> Track My Order
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="w-full border-gray-200 rounded-xl h-11">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
