import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { ref, query, orderByChild, equalTo, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Plus, Minus, ArrowRight, Tag, CheckCircle,
  XCircle, Loader2, ShoppingCart, MessageCircle, Package,
  Truck, Shield, ChevronRight,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";

interface AppliedCoupon {
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  discount: number;
}

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartTotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);
  const [, navigate] = useLocation();

  const DELIVERY_CHARGE = cartTotal >= 50000 ? 0 : 499;

  const discountAmount = applied
    ? applied.discountType === "percentage"
      ? Math.round((cartTotal * applied.discountValue) / 100)
      : Math.min(applied.discountValue, cartTotal)
    : 0;

  const finalTotal = cartTotal - discountAmount + DELIVERY_CHARGE;

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { toast.error("Enter a coupon code"); return; }
    setValidating(true);
    try {
      const couponsRef = query(ref(db, "coupons"), orderByChild("code"), equalTo(code));
      const snap = await get(couponsRef);
      if (!snap.exists()) { toast.error("Invalid coupon code"); setValidating(false); return; }
      const [, couponData] = Object.entries(snap.val())[0] as [string, any];
      if (!couponData.isActive) { toast.error("This coupon is not active"); setValidating(false); return; }
      if (couponData.expiryDate && new Date(couponData.expiryDate) < new Date()) { toast.error("Coupon expired"); setValidating(false); return; }
      if (couponData.minOrderValue && cartTotal < couponData.minOrderValue) {
        toast.error(`Min. order ${formatINR(couponData.minOrderValue)} required`);
        setValidating(false); return;
      }
      const disc = couponData.discountType === "percentage"
        ? Math.round((cartTotal * couponData.discountValue) / 100)
        : Math.min(couponData.discountValue, cartTotal);
      setApplied({ code, discountType: couponData.discountType, discountValue: couponData.discountValue, discount: disc });
      localStorage.setItem("appliedCoupon", JSON.stringify({ code, discountType: couponData.discountType, discountValue: couponData.discountValue, discount: disc }));
      toast.success(`Coupon applied! You save ${formatINR(disc)}`);
    } catch { toast.error("Failed to validate coupon"); }
    finally { setValidating(false); }
  };

  const removeCoupon = () => { setApplied(null); setCouponCode(""); localStorage.removeItem("appliedCoupon"); };

  const handleWhatsAppOrder = () => {
    const items = cart.map(i => `• ${i.name} x${i.qty} — ${formatINR(i.price * i.qty)}`).join("\n");
    const msg = `Hi! I want to place an order:\n\n${items}\n\nTotal: ${formatINR(finalTotal)}\n\nPlease confirm my order.`;
    window.open(`https://wa.me/919761809960?text=${encodeURIComponent(msg)}`, "_blank");
  };

  /* ── Empty state ── */
  if (cart.length === 0) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4 bg-[#0B0F19]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-xs"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.2)" }}>
              <ShoppingCart size={36} style={{ color: "#22C55E" }} />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Your cart is empty</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Add laptops you love and they'll appear here.
            </p>
            <Link href="/products">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2"
                style={{ background: "#22C55E" }}>
                <Package size={16} /> Browse Laptops
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#0B0F19] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-4">

        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-white">
            My Cart <span className="text-slate-500 text-sm font-medium">({cart.length} item{cart.length > 1 ? "s" : ""})</span>
          </h1>
          <span className="text-[11px] text-slate-400 font-medium">
            Total: <span className="text-[#22C55E] font-bold">{formatINR(finalTotal)}</span>
          </span>
        </div>

        {/* Cart items */}
        <div className="space-y-3">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, height: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl p-3 flex gap-3"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Image */}
                <Link href={`/products/${item.productId}`}>
                  <div className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer"
                    style={{ background: "#F8FAFC" }}>
                    <img src={item.image} alt={item.name}
                      className="w-full h-full object-contain p-1"
                      onError={e => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/80?text=Laptop"; }} />
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <Link href={`/products/${item.productId}`}>
                      <p className="text-white font-semibold text-[13px] leading-snug line-clamp-2 cursor-pointer hover:text-[#22C55E] transition-colors">
                        {item.name}
                      </p>
                    </Link>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => removeFromCart(item.productId)}
                      className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "rgba(239,68,68,0.1)" }}
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </motion.button>
                  </div>

                  <p className="text-[#22C55E] font-black text-sm mt-1">{formatINR(item.price)}</p>

                  {/* Qty + subtotal */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center rounded-xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <button
                        onClick={() => updateQty(item.productId, item.qty - 1)}
                        className="h-8 w-8 flex items-center justify-center transition-colors hover:bg-white/10"
                      >
                        <Minus size={13} className="text-white" />
                      </button>
                      <span className="w-8 text-center text-white font-bold text-sm">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.qty + 1)}
                        className="h-8 w-8 flex items-center justify-center transition-colors hover:bg-white/10"
                      >
                        <Plus size={13} className="text-white" />
                      </button>
                    </div>
                    <span className="text-white font-bold text-sm">{formatINR(item.price * item.qty)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Delivery notice */}
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <Truck size={16} style={{ color: "#22C55E" }} className="flex-shrink-0" />
          <p className="text-sm text-slate-300">
            {DELIVERY_CHARGE === 0
              ? <span><span className="text-[#22C55E] font-bold">Free delivery</span> on your order!</span>
              : <span>Add {formatINR(50000 - cartTotal)} more for <span className="text-[#22C55E] font-bold">free delivery</span></span>
            }
          </p>
        </div>

        {/* Coupon */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2">
            <Tag size={15} style={{ color: "#22C55E" }} />
            <p className="text-white font-bold text-sm">Coupon Code</p>
          </div>
          {applied ? (
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} style={{ color: "#22C55E" }} />
                <div>
                  <p className="font-mono font-bold text-[#22C55E] text-sm">{applied.code}</p>
                  <p className="text-xs text-slate-400">Saving {formatINR(discountAmount)}</p>
                </div>
              </div>
              <button onClick={removeCoupon}>
                <XCircle size={16} className="text-slate-500 hover:text-red-400 transition-colors" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && applyCoupon()}
                className="flex-1 h-10 px-3 rounded-xl text-sm font-mono font-medium text-white placeholder-slate-500 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button onClick={applyCoupon} disabled={validating}
                className="h-10 px-4 rounded-xl text-sm font-bold text-black flex items-center gap-1.5 disabled:opacity-60"
                style={{ background: "#22C55E" }}>
                {validating ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-white font-bold text-sm flex items-center gap-2">
            <Shield size={15} style={{ color: "#22C55E" }} /> Price Details
          </p>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} item{cart.reduce((s, i) => s + i.qty, 0) > 1 ? "s" : ""})</span>
              <span className="text-white">{formatINR(cartTotal)}</span>
            </div>

            {applied && discountAmount > 0 && (
              <div className="flex justify-between" style={{ color: "#22C55E" }}>
                <span>Coupon ({applied.code})</span>
                <span>−{formatINR(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-400">
              <span>Delivery</span>
              {DELIVERY_CHARGE === 0
                ? <span style={{ color: "#22C55E" }} className="font-semibold">Free</span>
                : <span className="text-white">{formatINR(DELIVERY_CHARGE)}</span>}
            </div>

            <div className="border-t pt-2.5 flex justify-between font-black text-base"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span className="text-white">Total</span>
              <span style={{ color: "#22C55E" }}>{formatINR(finalTotal)}</span>
            </div>
          </div>

          {applied && discountAmount > 0 && (
            <div className="rounded-xl px-3 py-2 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.08)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.15)" }}>
              🎉 You're saving {formatINR(discountAmount)} on this order!
            </div>
          )}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield, label: "Secure Payment" },
            { icon: Truck, label: "Fast Delivery" },
            { icon: Package, label: "Easy Returns" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-center"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon size={18} style={{ color: "#22C55E" }} />
              <p className="text-[10px] text-slate-400 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      </div>{/* end bg wrapper */}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-[10000] p-4 pb-safe"
        style={{ background: "#0B0F19", borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom,0px))" }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          {/* WhatsApp order */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleWhatsAppOrder}
            className="h-12 px-4 rounded-2xl font-bold text-white text-sm flex items-center gap-2 flex-shrink-0"
            style={{ background: "#25D366" }}
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">WhatsApp</span>
          </motion.button>

          {/* Checkout */}
          <Link href="/checkout" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-2xl font-black text-black text-sm flex items-center justify-center gap-2"
              style={{ background: "#22C55E" }}
            >
              Proceed to Checkout <ArrowRight size={16} />
            </motion.button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
