import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  CheckCircle2, Banknote, MapPin, Package,
  ShoppingBag, ChevronRight, Loader2, Truck, Shield,
  Smartphone, CreditCard, Copy, AlertCircle, Info,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

const GST_RATE = 0.18;
const STEPS = ["Address", "Payment", "Review", "Done"];

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
                done ? "bg-green-500 border-green-500 text-black"
                : active ? "bg-green-500/15 border-green-500 text-green-600 shadow-lg shadow-green-500/20"
                : "bg-gray-100 border-gray-200 text-gray-400"
              }`}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : num}
              </div>
              <p className={`text-[10px] font-semibold ${active ? "text-green-600" : done ? "text-gray-900" : "text-slate-400"}`}>{label}</p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mb-5 mx-1 ${step > num ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-100 rounded-2xl ${className}`}>{children}</div>;
}

function DarkInput({ label, value, onChange, placeholder, required }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-600 text-sm">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <Input value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-500/50 rounded-xl h-11" />
    </div>
  );
}

export default function Checkout() {
  const { cart, cartTotal, clearCart, coupon, discount } = useCart() as any;
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [storeUpi, setStoreUpi] = useState("supercomputer@upi");

  const [address, setAddress] = useState({
    name: "", phone: "", street: "", city: "", state: "", pincode: "",
  });

  useEffect(() => {
    get(ref(db, "settings/storeUpi")).then((snap) => {
      if (snap.exists()) setStoreUpi(snap.val());
    });
  }, []);

  useEffect(() => {
    if (userData) {
      setAddress((a) => ({ ...a, name: userData.name || a.name, phone: userData.phone || a.phone }));
    }
  }, [userData]);

  useEffect(() => {
    if (cart.length === 0 && step !== 4) setLocation("/cart");
  }, [cart, setLocation, step]);

  const subtotal = cartTotal;
  const discountAmt = discount || 0;
  const afterDiscount = subtotal - discountAmt;
  const gstAmount = Math.round(afterDiscount * GST_RATE);
  const deliveryCharge = afterDiscount >= 50000 ? 0 : 499;
  const finalAmount = afterDiscount + gstAmount + deliveryCharge;
  const advanceAmount = Math.round(finalAmount * 0.5);

  const placeOrder = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const orderRef = push(ref(db, "orders"));
      await set(orderRef, {
        userId: currentUser.uid,
        userName: address.name,
        userPhone: address.phone,
        items: cart,
        subtotal,
        discountAmount: discountAmt,
        couponCode: coupon?.code || null,
        gstAmount,
        gstRate: GST_RATE,
        deliveryCharge,
        finalAmount,
        advanceAmount: paymentMethod === "cod" ? advanceAmount : finalAmount,
        paidAmount: paymentMethod === "online" ? 0 : 0,
        remainingAmount: finalAmount,
        address,
        paymentMethod,
        paymentStatus: "pending",
        advanceReceived: false,
        orderStatus: paymentMethod === "online" ? "payment_pending" : "pending",
        statusHistory: [{
          status: paymentMethod === "online" ? "payment_pending" : "pending",
          timestamp: Date.now(),
          note: paymentMethod === "online" ? "Online payment pending verification" : "COD order placed — advance payment pending",
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: "",
      });
      setOrderId(orderRef.key as string);
      clearCart();
      setStep(4);
    } catch {
      toast.error("Order place karne mein error aaya");
    } finally {
      setLoading(false);
    }
  };

  const isAddressValid = address.name && address.phone && address.street && address.city && address.pincode;

  const copyUpi = () => {
    navigator.clipboard.writeText(storeUpi).then(() => toast.success("UPI ID copy ho gaya!"));
  };

  /* ── Step 4: Success ── */
  if (step === 4 && orderId) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="relative mx-auto mb-6 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
              <div className="relative h-24 w-24 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed! 🎉</h2>
            <p className="text-slate-500 text-sm mb-1">Thank you for shopping with Super Computer</p>
            <p className="text-xs text-slate-400 mb-6 font-mono">Order ID: {orderId.slice(-8).toUpperCase()}</p>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left space-y-4">
              {paymentMethod === "cod" ? (
                <>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Advance Payment Required</p>
                      <p className="text-slate-500 text-xs mt-0.5">50% advance — {formatINR(advanceAmount)} — abhi bhejni hogi</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">UPI ID pe bhejo</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-gray-900 text-lg">{storeUpi}</p>
                      <button onClick={copyUpi} className="p-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 transition-colors">
                        <Copy className="h-4 w-4 text-amber-600" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Amount: <span className="font-bold text-amber-700">{formatINR(advanceAmount)}</span></p>
                    <p className="text-xs text-slate-500">Remaining on delivery: <span className="font-bold">{formatINR(finalAmount - advanceAmount)}</span></p>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Payment screenshot WhatsApp karo — order jaldi confirm hoga
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Full Payment Pending</p>
                      <p className="text-slate-500 text-xs mt-0.5">Total — {formatINR(finalAmount)} — online bhejni hogi</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">UPI ID pe full payment bhejo</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-gray-900 text-lg">{storeUpi}</p>
                      <button onClick={copyUpi} className="p-2 rounded-lg bg-white border border-blue-200 hover:bg-blue-100 transition-colors">
                        <Copy className="h-4 w-4 text-blue-600" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Total: <span className="font-bold text-blue-700">{formatINR(finalAmount)}</span></p>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Payment screenshot WhatsApp karo — order confirm hoga
                  </p>
                </>
              )}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <Truck className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Estimated Delivery: 3–5 business days</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => setLocation("/orders")} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl h-11 gap-2">
                <Package className="h-4 w-4" /> Track My Order
              </Button>
              <Button variant="outline" onClick={() => setLocation("/products")} className="w-full border-gray-200 rounded-xl h-11">
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-900 font-semibold">Checkout</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-6">Checkout</h1>
          <StepBar step={step} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">

              {/* Step 1: Address */}
              {step === 1 && (
                <GlassCard className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-500" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900">Delivery Address</h2>
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
                  <Button onClick={() => setStep(2)} disabled={!isAddressValid}
                    className="mt-6 w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-black rounded-xl h-11 gap-2 disabled:opacity-50">
                    Select Payment <ChevronRight className="h-4 w-4" />
                  </Button>
                </GlassCard>
              )}

              {/* Step 2: Payment Method */}
              {step === 2 && (
                <GlassCard className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-8 w-8 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-green-500" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900">Payment Method</h2>
                  </div>

                  <div className="space-y-3">
                    {/* COD Option */}
                    <button
                      onClick={() => setPaymentMethod("cod")}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        paymentMethod === "cod" ? "border-green-500 bg-green-500/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "cod" ? "border-green-500" : "border-gray-300"}`}>
                        {paymentMethod === "cod" && <div className="h-2.5 w-2.5 rounded-full bg-green-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5 text-green-500" />
                          <p className="font-black text-gray-900">Cash on Delivery</p>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">50% Advance</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">Delivery ke time remaining payment karein</p>
                        {paymentMethod === "cod" && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                            <p className="text-xs font-bold text-amber-800">Advance required (abhi bhejni hogi):</p>
                            <p className="text-xl font-black text-amber-700">{formatINR(advanceAmount)}</p>
                            <p className="text-xs text-slate-500">Remaining on delivery: {formatINR(finalAmount - advanceAmount)}</p>
                            <p className="text-xs text-amber-700 font-semibold mt-2">UPI: {storeUpi}</p>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Online Option */}
                    <button
                      onClick={() => setPaymentMethod("online")}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        paymentMethod === "online" ? "border-blue-500 bg-blue-500/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "online" ? "border-blue-500" : "border-gray-300"}`}>
                        {paymentMethod === "online" && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-blue-500" />
                          <p className="font-black text-gray-900">Online Payment (UPI / Bank Transfer)</p>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Full Prepaid</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">UPI se full payment karein — order jaldi confirm</p>
                        {paymentMethod === "online" && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
                            <p className="text-xs font-bold text-blue-800">Full payment (abhi bhejni hogi):</p>
                            <p className="text-xl font-black text-blue-700">{formatINR(finalAmount)}</p>
                            <p className="text-xs text-blue-700 font-semibold mt-2">UPI: {storeUpi}</p>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(1)} className="border-gray-200 rounded-xl h-11">Back</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black rounded-xl h-11 gap-2">
                      Review Order <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </GlassCard>
              )}

              {/* Step 3: Review & Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <h3 className="font-bold text-gray-900 text-sm">Delivery To</h3>
                      </div>
                      <button onClick={() => setStep(1)} className="text-xs text-green-600 font-semibold hover:underline">Edit</button>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm">
                      <p className="font-semibold text-gray-800">{address.name}</p>
                      <p className="text-slate-500 mt-0.5">{address.street}, {address.city}</p>
                      {address.state && <p className="text-slate-500">{address.state} – {address.pincode}</p>}
                      <p className="text-slate-500 mt-0.5">{address.phone}</p>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-500" />
                        <h3 className="font-bold text-gray-900 text-sm">Payment</h3>
                      </div>
                      <button onClick={() => setStep(2)} className="text-xs text-green-600 font-semibold hover:underline">Edit</button>
                    </div>
                    <div className={`flex items-center gap-3 rounded-xl p-3 ${paymentMethod === "cod" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
                      {paymentMethod === "cod" ? <Banknote className="h-5 w-5 text-green-600" /> : <Smartphone className="h-5 w-5 text-blue-600" />}
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{paymentMethod === "cod" ? "Cash on Delivery (50% Advance)" : "Online Payment (Full Prepaid)"}</p>
                        <p className="text-xs text-slate-500">{paymentMethod === "cod" ? `Advance: ${formatINR(advanceAmount)} • On delivery: ${formatINR(finalAmount - advanceAmount)}` : `Pay ${formatINR(finalAmount)} via UPI: ${storeUpi}`}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="border-gray-200 rounded-xl h-11">Back</Button>
                    <Button onClick={placeOrder} disabled={loading}
                      className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black rounded-xl h-11 gap-2 shadow-lg shadow-green-500/25">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Placing...</> : <><CheckCircle2 className="h-4 w-4" />Place Order — {formatINR(finalAmount)}</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <GlassCard className="p-5 sticky top-20">
                <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-green-500" /> Order Summary
                </h3>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
                  {cart.map((item: any) => (
                    <div key={item.productId} className="flex gap-3 items-center">
                      <div className="h-12 w-12 bg-[#F0F2F5] rounded-xl shrink-0 flex items-center justify-center">
                        <img src={item.image} alt={item.name} className="h-10 w-10 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-xs line-clamp-1">{item.name}</p>
                        <p className="text-slate-500 text-xs">Qty: {item.qty}</p>
                      </div>
                      <p className="font-bold text-gray-900 text-xs shrink-0">{formatINR(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal ({cart.reduce((s: number, i: any) => s + i.qty, 0)} items)</span>
                    <span>{formatINR(subtotal)}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Discount {coupon?.code ? `(${coupon.code})` : ""}</span>
                      <span>− {formatINR(discountAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>GST (18%)</span>
                    <span>{formatINR(gstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery</span>
                    <span className={deliveryCharge === 0 ? "text-green-500 font-semibold" : ""}>{deliveryCharge === 0 ? "FREE" : formatINR(deliveryCharge)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-gray-900 text-base">
                    <span>Total</span>
                    <span className="text-green-600">{formatINR(finalAmount)}</span>
                  </div>
                  {paymentMethod === "cod" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-amber-800">
                        <span>Advance (50%) — Pay Now</span>
                        <span>{formatINR(advanceAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>On Delivery</span>
                        <span>{formatINR(finalAmount - advanceAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {[{ Icon: Shield, text: "100% Safe & Genuine" }, { Icon: Truck, text: "Free Delivery above ₹50k" }].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon className="h-3.5 w-3.5 text-green-500 shrink-0" />{text}
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
