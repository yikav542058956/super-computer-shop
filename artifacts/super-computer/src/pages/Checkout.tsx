import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  CheckCircle2, Banknote, MapPin, Package,
  ShoppingBag, ChevronRight, Loader2, Truck, Shield,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

/* ─── Step indicator ─────────────────────────────────────────── */
const STEPS = ["Address", "Review", "Confirm"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const num = idx + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all ${
                done   ? "bg-green-500 border-green-500 text-black"
                : active ? "bg-green-500/15 border-green-500 text-green-400 shadow-lg shadow-green-500/20"
                : "bg-white/5 border-white/15 text-slate-600"
              }`}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : num}
              </div>
              <p className={`text-[10px] font-semibold ${active ? "text-green-400" : done ? "text-white" : "text-slate-600"}`}>{label}</p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mb-5 mx-1 ${step > num ? "bg-green-500" : "bg-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Glass Card ─────────────────────────────────────────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#161B22]/80 backdrop-blur-sm border border-white/8 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

/* ─── Input Field ─────────────────────────────────────────────── */
function DarkInput({ label, value, onChange, placeholder, required }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400 text-sm">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</Label>
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="bg-[#0D1117] border-white/10 text-white placeholder-slate-600 focus:border-green-500/50 rounded-xl h-11"
      />
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");

  const [address, setAddress] = useState({
    name: "", phone: "", street: "", city: "", state: "", pincode: "",
  });

  useEffect(() => {
    if (userData) {
      setAddress((a) => ({
        ...a,
        name: userData.name || a.name,
        phone: userData.phone || a.phone,
      }));
    }
  }, [userData]);

  useEffect(() => {
    if (cart.length === 0 && step !== 3) setLocation("/cart");
  }, [cart, setLocation, step]);

  const placeOrder = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const orderRef = push(ref(db, "orders"));
      await set(orderRef, {
        userId: currentUser.uid,
        items: cart,
        totalAmount: cartTotal,
        discount: 0,
        deliveryCharge: 0,
        finalAmount: cartTotal,
        address,
        paymentMethod: "cod",
        paymentStatus: "pending",
        orderStatus: "confirmed",
        statusHistory: [{ status: "confirmed", timestamp: Date.now(), note: "Order placed successfully" }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setOrderId(orderRef.key as string);
      clearCart();
      setStep(3);
      toast.success("Order placed! 🎉");
    } catch {
      toast.error("Order place karne mein error aaya");
    } finally {
      setLoading(false);
    }
  };

  const isAddressValid = address.name && address.phone && address.street && address.city && address.pincode;

  /* ── Success Screen ── */
  if (step === 3 && orderId) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center">
            {/* Animated success ring */}
            <div className="relative mx-auto mb-6 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
              <div className="relative h-24 w-24 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-400" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Order Confirmed! 🎉</h2>
            <p className="text-slate-400 text-sm mb-2">
              Thank you for shopping with Super Computer
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Order ID: <span className="font-mono text-slate-300">{orderId}</span>
            </p>

            <div className="bg-[#161B22]/80 border border-white/8 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/8">
                <Banknote className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Cash on Delivery</p>
                  <p className="text-slate-500 text-xs">Delivery ke time payment karein</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Estimated Delivery</p>
                  <p className="text-slate-500 text-xs">3–5 business days</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setLocation("/profile")}
                className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl h-11 gap-2"
              >
                <Package className="h-4 w-4" />Track My Order
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/products")}
                className="w-full border-white/15 text-slate-300 hover:bg-white/5 rounded-xl h-11"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0D1117]">
        <div className="container mx-auto px-4 py-8 max-w-5xl">

          {/* Header */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-semibold">Checkout</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-6">Checkout</h1>

          <StepBar step={step} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Steps ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Step 1: Address */}
              {step === 1 && (
                <GlassCard className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-400" />
                    </div>
                    <h2 className="text-lg font-black text-white">Delivery Address</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DarkInput label="Full Name" value={address.name} onChange={(e: any) => setAddress({ ...address, name: e.target.value })} required />
                    <DarkInput label="Phone Number" value={address.phone} onChange={(e: any) => setAddress({ ...address, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" required />
                    <div className="sm:col-span-2">
                      <DarkInput label="Street / Area / Mohalla" value={address.street} onChange={(e: any) => setAddress({ ...address, street: e.target.value })} placeholder="Gali number, landmark..." required />
                    </div>
                    <DarkInput label="City" value={address.city} onChange={(e: any) => setAddress({ ...address, city: e.target.value })} required />
                    <DarkInput label="State" value={address.state} onChange={(e: any) => setAddress({ ...address, state: e.target.value })} placeholder="Uttar Pradesh" />
                    <DarkInput label="Pincode" value={address.pincode} onChange={(e: any) => setAddress({ ...address, pincode: e.target.value })} placeholder="207001" required />
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!isAddressValid}
                    className="mt-6 w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-black rounded-xl h-11 gap-2 disabled:opacity-50"
                  >
                    Review Order <ChevronRight className="h-4 w-4" />
                  </Button>
                </GlassCard>
              )}

              {/* Step 2: Review & Confirm */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Address summary */}
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-400" />
                        <h3 className="font-bold text-white text-sm">Delivery To</h3>
                      </div>
                      <button onClick={() => setStep(1)} className="text-xs text-green-400 hover:text-green-300 font-semibold">Edit</button>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-sm">
                      <p className="font-semibold text-white">{address.name}</p>
                      <p className="text-slate-400 mt-0.5">{address.street}, {address.city}</p>
                      {address.state && <p className="text-slate-400">{address.state} – {address.pincode}</p>}
                      <p className="text-slate-400 mt-0.5">{address.phone}</p>
                    </div>
                  </GlassCard>

                  {/* Payment — COD only */}
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Banknote className="h-4 w-4 text-green-400" />
                      <h3 className="font-bold text-white text-sm">Payment Method</h3>
                    </div>
                    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                      <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">Cash on Delivery</p>
                        <p className="text-slate-400 text-xs">Delivery ke time cash dein — ekdum safe</p>
                      </div>
                      <div className="h-5 w-5 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Shield className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      100% safe & secure — pehle product dekho, phir payment karo
                    </div>
                  </GlassCard>

                  {/* CTA */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="border-white/15 text-slate-300 hover:bg-white/5 rounded-xl h-11"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={placeOrder}
                      disabled={loading}
                      className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black rounded-xl h-11 gap-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all hover:scale-[1.01]"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Placing Order...</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4" />Place Order — {formatINR(cartTotal)}</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="lg:col-span-1">
              <GlassCard className="p-5 sticky top-20">
                <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-green-400" />
                  Order Summary
                </h3>

                {/* Items */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1 mb-4">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex gap-3 items-center">
                      <div className="h-12 w-12 bg-[#F0F2F5] rounded-xl shrink-0 flex items-center justify-center">
                        <img src={item.image} alt={item.name} className="h-10 w-10 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-xs line-clamp-1">{item.name}</p>
                        <p className="text-slate-500 text-xs">Qty: {item.qty}</p>
                      </div>
                      <p className="font-bold text-white text-xs shrink-0">{formatINR(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="border-t border-white/8 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                    <span>{formatINR(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Delivery</span>
                    <span className="text-green-400 font-semibold">FREE</span>
                  </div>
                  <div className="border-t border-white/8 pt-2.5 flex justify-between font-black text-white text-base">
                    <span>Total</span>
                    <span className="text-green-400">{formatINR(cartTotal)}</span>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="mt-4 space-y-2">
                  {[
                    { Icon: Shield, text: "100% Safe & Genuine" },
                    { Icon: Truck,  text: "Free Delivery" },
                    { Icon: Banknote, text: "Pay on Delivery" },
                  ].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
