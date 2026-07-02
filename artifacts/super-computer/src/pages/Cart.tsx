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
  XCircle, Loader2, ShoppingCart, Package,
  Truck, Shield, ChevronRight,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path fillRule="evenodd" clipRule="evenodd"
        d="M34.2 13.7C31.8 11.3 28.6 10 25.2 10C18.1 10 12.4 15.7 12.4 22.8C12.4 25.1 13 27.3 14.2 29.2L12 36L19.1 33.9C20.9 34.9 23 35.5 25.2 35.5C32.3 35.5 38 29.8 38 22.7C38 19.3 36.6 16.1 34.2 13.7ZM25.2 33.3C23.2 33.3 21.3 32.8 19.6 31.8L19.2 31.6L15.1 32.7L16.3 28.7L16 28.3C14.9 26.5 14.3 24.4 14.3 22.2C14.3 16.5 19 11.8 24.7 11.8C27.5 11.8 30.1 12.9 32 14.9C33.9 16.8 35 19.4 35 22.2C35.3 28.3 30.9 33.3 25.2 33.3ZM30.9 25.1C30.6 24.9 29.1 24.2 28.8 24.1C28.5 24 28.3 23.9 28.1 24.2C27.9 24.5 27.3 25.2 27.2 25.4C27 25.6 26.9 25.6 26.6 25.5C26.3 25.3 25.3 25 24.1 23.9C23.2 23.1 22.6 22.1 22.4 21.8C22.2 21.5 22.4 21.3 22.5 21.1C22.7 21 22.8 20.8 23 20.6C23.1 20.4 23.2 20.3 23.3 20.1C23.4 19.9 23.4 19.7 23.3 19.6C23.2 19.4 22.6 17.9 22.3 17.3C22 16.7 21.8 16.8 21.6 16.8H21C20.8 16.8 20.5 16.9 20.2 17.2C20 17.5 19.2 18.2 19.2 19.7C19.2 21.2 20.2 22.6 20.4 22.9C20.6 23.1 22.6 26.1 25.6 27.4C26.3 27.7 26.9 27.9 27.4 28C28.1 28.2 28.7 28.2 29.2 28.1C29.8 28 30.9 27.4 31.2 26.7C31.4 26 31.4 25.4 31.3 25.3C31.2 25.2 31.1 25.2 30.9 25.1Z"
        fill="white" />
    </svg>
  );
}

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
        <div className="min-h-[70vh] flex items-center justify-center px-4 bg-gray-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-xs"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 bg-green-50 border-2 border-green-100">
              <ShoppingCart size={36} className="text-green-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Add laptops you love and they'll appear here.
            </p>
            <Link href="/products">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400">
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
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-6 pb-28 max-w-5xl">

          {/* Header */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-gray-900 font-semibold">My Cart</span>
            <span className="text-slate-400">({cart.length} item{cart.length > 1 ? "s" : ""})</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Items ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Delivery notice */}
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-green-50 border border-green-200">
                <Truck size={16} className="text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  {DELIVERY_CHARGE === 0
                    ? <span><span className="font-bold">Free delivery</span> on your order! 🎉</span>
                    : <span>Add <span className="font-bold">{formatINR(50000 - cartTotal)}</span> more for <span className="font-bold text-green-700">free delivery</span></span>
                  }
                </p>
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
                      className="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 shadow-sm"
                    >
                      {/* Image */}
                      <Link href={`/products/${item.productId}`}>
                        <div className="w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer bg-gray-50 border border-gray-100">
                          <img src={item.image} alt={item.name}
                            className="w-full h-full object-contain p-2"
                            onError={e => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/80?text=Laptop"; }} />
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/products/${item.productId}`}>
                            <p className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-green-600 transition-colors">
                              {item.name}
                            </p>
                          </Link>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => removeFromCart(item.productId)}
                            className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </motion.button>
                        </div>

                        <p className="text-green-600 font-black text-base mt-1">{formatINR(item.price)}</p>

                        {/* Qty + subtotal */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <button
                              onClick={() => updateQty(item.productId, item.qty - 1)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                              <Minus size={13} className="text-gray-600" />
                            </button>
                            <span className="w-9 text-center text-gray-900 font-bold text-sm">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.productId, item.qty + 1)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                              <Plus size={13} className="text-gray-600" />
                            </button>
                          </div>
                          <span className="text-gray-900 font-bold text-sm">{formatINR(item.price * item.qty)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={15} className="text-green-600" />
                  <p className="text-gray-900 font-bold text-sm">Coupon Code</p>
                </div>
                {applied ? (
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-green-600" />
                      <div>
                        <p className="font-mono font-bold text-green-700 text-sm">{applied.code}</p>
                        <p className="text-xs text-slate-500">Saving {formatINR(discountAmount)}</p>
                      </div>
                    </div>
                    <button onClick={removeCoupon}>
                      <XCircle size={16} className="text-slate-400 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === "Enter" && applyCoupon()}
                      className="flex-1 h-10 px-3 rounded-xl text-sm font-mono font-medium text-gray-900 placeholder-slate-400 outline-none bg-gray-50 border border-gray-200 focus:border-green-400"
                    />
                    <button onClick={applyCoupon} disabled={validating}
                      className="h-10 px-4 rounded-xl text-sm font-bold text-black bg-green-500 hover:bg-green-400 flex items-center gap-1.5 disabled:opacity-60 transition-colors">
                      {validating ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                    </button>
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
                  <div key={label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-center bg-white border border-gray-100 shadow-sm">
                    <Icon size={18} className="text-green-500" />
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Summary ── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm sticky top-20">
                <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-green-500" /> Price Details
                </h3>

                <div className="space-y-2.5 text-sm mb-4">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} item{cart.reduce((s, i) => s + i.qty, 0) > 1 ? "s" : ""})</span>
                    <span className="text-gray-900 font-semibold">{formatINR(cartTotal)}</span>
                  </div>

                  {applied && discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Coupon ({applied.code})</span>
                      <span>−{formatINR(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500">
                    <span>Delivery</span>
                    {DELIVERY_CHARGE === 0
                      ? <span className="text-green-600 font-semibold">Free</span>
                      : <span className="text-gray-900 font-semibold">{formatINR(DELIVERY_CHARGE)}</span>}
                  </div>

                  <div className="border-t border-gray-100 pt-2.5 flex justify-between font-black text-base">
                    <span className="text-gray-900">Total</span>
                    <span className="text-green-600">{formatINR(finalTotal)}</span>
                  </div>
                </div>

                {applied && discountAmount > 0 && (
                  <div className="rounded-xl px-3 py-2 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 mb-4">
                    🎉 You're saving {formatINR(discountAmount)} on this order!
                  </div>
                )}

                {/* Checkout button */}
                <Link href="/checkout" className="block">
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-2xl font-black text-black text-sm flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 shadow-lg shadow-green-500/25 transition-colors"
                  >
                    Proceed to Checkout <ArrowRight size={16} />
                  </motion.button>
                </Link>

                {/* WhatsApp order */}
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleWhatsAppOrder}
                  className="mt-3 w-full h-11 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-colors"
                  style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
                >
                  <WhatsAppIcon size={20} />
                  Order via WhatsApp
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
