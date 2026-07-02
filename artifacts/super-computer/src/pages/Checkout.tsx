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
  CheckCircle2, Banknote, MapPin, Package, ShoppingBag,
  Loader2, Truck, Shield, Smartphone, CreditCard,
  Copy, AlertCircle, Info, Zap, ArrowLeft, ChevronRight,
  Tag,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

const GST_RATE = 0.18;

/* ─── Step indicator (Flipkart style) ─── */
function StepBar({ step }: { step: number }) {
  const steps = [
    { n: 1, label: "ADDRESS" },
    { n: 2, label: "ORDER SUMMARY" },
    { n: 3, label: "PAYMENT" },
  ];
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-0">
        {steps.map(({ n, label }, i) => {
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="flex items-center">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                  done ? "bg-green-500 border-green-500 text-white"
                  : active ? "border-green-500 text-green-600 bg-white"
                  : "border-gray-300 text-gray-400 bg-white"
                }`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <span className={`text-xs font-black tracking-wider hidden sm:block ${
                  active ? "text-green-600" : done ? "text-gray-700" : "text-gray-400"
                }`}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 sm:w-16 ${step > n ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Price panel (right sidebar, Flipkart style) ─── */
function PricePanel({
  cart, subtotal, discountAmt, coupon, gstAmount, deliveryCharge, finalAmount,
  step, paymentMethod, advanceAmount, storeUpi,
  onContinue, onPlaceCod, onPayOnline, loading, cfLoading,
}: any) {
  const savings = discountAmt;
  return (
    <div className="bg-white border border-gray-200 rounded-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-black text-gray-500 tracking-wide uppercase">Price Details</h3>
      </div>
      <div className="px-4 py-4 space-y-3 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>Price ({cart.reduce((s: number, i: any) => s + i.qty, 0)} item{cart.reduce((s: number, i: any) => s + i.qty, 0) > 1 ? "s" : ""})</span>
          <span>{formatINR(subtotal)}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between text-green-600 font-semibold">
            <span>Discount {coupon?.code ? `(${coupon.code})` : ""}</span>
            <span>− {formatINR(discountAmt)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-700">
          <span>GST (18%)</span>
          <span>{formatINR(gstAmount)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Delivery Charges</span>
          <span className={deliveryCharge === 0 ? "text-green-600 font-semibold" : ""}>
            {deliveryCharge === 0 ? "FREE" : formatINR(deliveryCharge)}
          </span>
        </div>
        <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-black text-gray-900 text-base">
          <span>Total Amount</span>
          <span>{formatINR(finalAmount)}</span>
        </div>
        {savings > 0 && (
          <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-xs font-semibold text-green-700">
            You will save {formatINR(savings)} on this order
          </div>
        )}
      </div>

      {/* CTA button */}
      <div className="px-4 pb-4">
        {step === 1 && (
          <button
            onClick={onContinue}
            className="w-full bg-[#FB641B] hover:bg-[#e5591a] text-white font-black py-3 rounded text-sm tracking-wide transition-colors"
          >
            CONTINUE
          </button>
        )}
        {step === 2 && (
          <button
            onClick={onContinue}
            className="w-full bg-[#FB641B] hover:bg-[#e5591a] text-white font-black py-3 rounded text-sm tracking-wide transition-colors"
          >
            CONTINUE
          </button>
        )}
        {step === 3 && paymentMethod === "cod" && (
          <button
            onClick={onPlaceCod}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-black py-3 rounded text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Placing...</> : <>PLACE ORDER — {formatINR(finalAmount)}</>}
          </button>
        )}
        {step === 3 && paymentMethod === "online" && (
          <button
            onClick={onPayOnline}
            disabled={cfLoading}
            className="w-full text-white font-black py-3 rounded text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: cfLoading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
          >
            {cfLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Redirecting to Cashfree...</>
              : <><Zap className="h-4 w-4" />PAY NOW — {formatINR(finalAmount)}</>}
          </button>
        )}
      </div>

      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
        {[
          { Icon: Shield, text: "Safe and secure payments. Easy returns. 100% Authentic products." },
          { Icon: Truck, text: "Free Delivery on orders above ₹50,000" },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-start gap-2 text-xs text-gray-500">
            <Icon className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Checkout() {
  const { cart, cartTotal, clearCart, coupon, discount } = useCart() as any;
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cfLoading, setCfLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("online");
  const [storeUpi, setStoreUpi] = useState("supercomputer@upi");
  const [deliveryZones, setDeliveryZones] = useState({
    localDistricts: "Kasganj, Etah, Kannauj, Aliganj, Soron, Patiyali, Ganj Dundwara",
    localCharge: 0,
    otherCharge: 499,
  });
  const [address, setAddress] = useState({
    name: "", phone: "", street: "", city: "", state: "", pincode: "",
  });

  useEffect(() => {
    get(ref(db, "settings/storeUpi")).then((s) => { if (s.exists()) setStoreUpi(s.val()); });
    get(ref(db, "settings/deliveryZones")).then((s) => {
      if (s.exists()) {
        const z = s.val();
        setDeliveryZones({
          localDistricts: z.localDistricts || deliveryZones.localDistricts,
          localCharge: z.localCharge ?? 0,
          otherCharge: z.otherCharge ?? 499,
        });
      }
    });
  }, []);

  useEffect(() => {
    if (userData) setAddress((a) => ({ ...a, name: userData.name || a.name, phone: userData.phone || a.phone }));
  }, [userData]);

  useEffect(() => {
    if (cart.length === 0 && step !== 4) setLocation("/cart");
  }, [cart, setLocation, step]);

  /* ── Calculations ── */
  const subtotal = cartTotal;
  const discountAmt = discount || 0;
  const afterDiscount = subtotal - discountAmt;
  const gstAmount = Math.round(afterDiscount * GST_RATE);

  const isLocalDistrict = (city: string) => {
    if (!city.trim()) return false;
    const n = city.toLowerCase().trim();
    return deliveryZones.localDistricts.split(",").some(d => n.includes(d.toLowerCase().trim()) || d.toLowerCase().trim().includes(n));
  };

  const deliveryCharge = afterDiscount >= 50000 ? 0
    : isLocalDistrict(address.city) ? deliveryZones.localCharge
    : address.city ? deliveryZones.otherCharge : deliveryZones.otherCharge;

  const finalAmount = afterDiscount + gstAmount + deliveryCharge;
  const advanceAmount = Math.round(finalAmount * 0.5);

  const isAddressValid = address.name && address.phone && address.street && address.city && address.pincode;

  /* ── Firebase order ── */
  const createFirebaseOrder = async (paymentStatus = "pending") => {
    const orderRef = push(ref(db, "orders"));
    await set(orderRef, {
      userId: currentUser?.uid || "guest",
      userName: address.name, userPhone: address.phone,
      items: cart, subtotal, discountAmount: discountAmt,
      couponCode: coupon?.code || null, gstAmount, gstRate: GST_RATE,
      deliveryCharge, finalAmount,
      advanceAmount: paymentMethod === "cod" ? advanceAmount : finalAmount,
      paidAmount: 0, remainingAmount: finalAmount, address, paymentMethod, paymentStatus,
      advanceReceived: false,
      orderStatus: paymentMethod === "online" ? "payment_pending" : "pending",
      statusHistory: [{
        status: paymentMethod === "online" ? "payment_pending" : "pending",
        timestamp: Date.now(),
        note: paymentMethod === "online" ? "Online payment via Cashfree" : "COD order — advance pending",
      }],
      createdAt: Date.now(), updatedAt: Date.now(), notes: "",
    });
    return orderRef.key as string;
  };

  /* ── COD ── */
  const placeCodOrder = async () => {
    if (!currentUser) { toast.error("Please login first"); return; }
    setLoading(true);
    try {
      const id = await createFirebaseOrder("pending");
      setOrderId(id); clearCart(); setStep(4);
    } catch { toast.error("Order place karne mein error aaya"); }
    finally { setLoading(false); }
  };

  /* ── Cashfree ── */
  const launchCashfree = async () => {
    if (!currentUser) { toast.error("Please login first"); return; }
    setCfLoading(true);
    try {
      const newOrderId = await createFirebaseOrder("payment_pending");
      setOrderId(newOrderId);

      const baseUrl = window.location.origin;
      const res = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseOrderId: newOrderId,
          amount: finalAmount,
          customerName: address.name,
          customerPhone: address.phone,
          customerEmail: currentUser.email || "customer@supercomputer.in",
          returnUrl: `${baseUrl}/checkout/done?firebase_order=${newOrderId}`,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        toast.error(data.error || "Payment session create nahi hua");
        setCfLoading(false);
        return;
      }

      clearCart();
      // Direct redirect — most reliable, no SDK required
      window.location.href = `https://payments.cashfree.com/order/#${data.paymentSessionId}`;
    } catch (err: any) {
      console.error("Cashfree error:", err);
      toast.error(err?.message || "Payment error. Please try again.");
      setCfLoading(false);
    }
  };

  const copyUpi = () => navigator.clipboard.writeText(storeUpi).then(() => toast.success("UPI ID copied!"));

  /* ── Step 4: COD Success ── */
  if (step === 4 && orderId) {
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
            <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed! 🎉</h2>
            <p className="text-slate-500 text-sm mb-1">Super Computer pe shopping ka shukriya!</p>
            <p className="text-xs text-slate-400 mb-6 font-mono">Order ID: {orderId.slice(-8).toUpperCase()}</p>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 text-sm">50% Advance Bhejni Hogi</p>
                  <p className="text-slate-500 text-xs mt-0.5">Order confirm karne ke liye {formatINR(advanceAmount)} abhi bhejein</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">UPI ID pe bhejein:</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-gray-900 text-lg">{storeUpi}</p>
                  <button onClick={copyUpi} className="p-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 transition-colors">
                    <Copy className="h-4 w-4 text-amber-600" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Amount: <span className="font-bold text-amber-700">{formatINR(advanceAmount)}</span></p>
                <p className="text-xs text-slate-500">Delivery pe remaining: <span className="font-bold">{formatINR(finalAmount - advanceAmount)}</span></p>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />Payment screenshot WhatsApp karein — order jaldi confirm hoga
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <Truck className="h-5 w-5 text-blue-400" />
                <p className="font-semibold text-gray-900 text-sm">Estimated Delivery: 3–5 working days</p>
              </div>
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

  /* ── Main Checkout ── */
  return (
    <Layout noNav>
      <div className="min-h-screen bg-[#F1F3F6]">

        {/* Top bar */}
        <div className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
            <button onClick={() => setLocation("/cart")}
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100 transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4 text-gray-700" />
            </button>
            <span className="font-black text-base tracking-tight text-gray-900">SUPER</span>
            <span className="font-black text-base tracking-tight -ml-2" style={{ color: "#16a34a" }}>COMPUTER</span>
            <div className="h-5 w-px bg-gray-200 mx-1" />
            <span className="text-sm text-gray-500 font-medium">Secure Checkout</span>
            <Shield className="h-4 w-4 text-green-500 ml-1" />
          </div>
          <StepBar step={step} />
        </div>

        <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ───── LEFT CONTENT ───── */}
          <div className="lg:col-span-2 space-y-3">

            {/* ── STEP 1: Address ── */}
            {step === 1 && (
              <div className="bg-white border border-gray-200 rounded-sm p-5">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="font-black text-gray-900 text-base tracking-wide uppercase">Delivery Address</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Full Name", key: "name", placeholder: "Aapka naam", required: true },
                    { label: "Phone Number", key: "phone", placeholder: "+91 XXXXX XXXXX", required: true },
                  ].map(({ label, key, placeholder, required }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                      </Label>
                      <Input
                        value={(address as any)[key]}
                        onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="bg-gray-50 border-gray-200 rounded h-10 text-sm focus:border-green-500"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Street / Area / Mohalla <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      placeholder="Gali number, landmark, area..."
                      className="bg-gray-50 border-gray-200 rounded h-10 text-sm focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      City / District <span className="text-red-500">*</span>
                    </Label>
                    <input
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="Kasganj, Etah, Agra..."
                      className="w-full h-10 px-3 rounded text-gray-900 text-sm outline-none bg-gray-50 border border-gray-200 focus:border-green-500"
                    />
                    {address.city && (
                      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded w-fit mt-1 ${
                        afterDiscount >= 50000 || (isLocalDistrict(address.city) && deliveryZones.localCharge === 0)
                          ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                      }`}>
                        <Truck className="h-3 w-3" />
                        {afterDiscount >= 50000 ? "Free Delivery (₹50k+)"
                          : isLocalDistrict(address.city) && deliveryZones.localCharge === 0 ? "Free Local Delivery"
                          : isLocalDistrict(address.city) ? `₹${deliveryZones.localCharge} Local Delivery`
                          : `₹${deliveryZones.otherCharge} Delivery`}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</Label>
                    <Input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="Uttar Pradesh" className="bg-gray-50 border-gray-200 rounded h-10 text-sm focus:border-green-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Pincode <span className="text-red-500">*</span>
                    </Label>
                    <Input value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      placeholder="207001" className="bg-gray-50 border-gray-200 rounded h-10 text-sm focus:border-green-500" />
                  </div>
                </div>
                <button
                  onClick={() => { if (isAddressValid) setStep(2); }}
                  disabled={!isAddressValid}
                  className="mt-5 bg-[#FB641B] hover:bg-[#e5591a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black px-10 py-3 rounded text-sm tracking-wide transition-colors"
                >
                  SAVE AND CONTINUE
                </button>
              </div>
            )}

            {/* ── STEP 1 collapsed summary (visible in step 2/3) ── */}
            {step > 1 && (
              <div className="bg-white border border-gray-200 rounded-sm">
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-wide">ADDRESS</span>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide">
                    Change
                  </button>
                </div>
                <div className="px-5 pb-3 text-sm text-gray-700">
                  <span className="font-bold">{address.name}</span>
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-semibold uppercase">HOME</span>
                  <p className="text-gray-500 text-xs mt-1">{address.street}, {address.city}{address.state ? `, ${address.state}` : ""} {address.pincode}</p>
                  <p className="text-gray-500 text-xs">{address.phone}</p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Order Summary ── */}
            {step === 2 && (
              <div className="bg-white border border-gray-200 rounded-sm">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
                    <ShoppingBag className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="font-black text-gray-900 text-sm tracking-wide uppercase">Order Summary</h2>
                </div>

                {/* Products */}
                <div className="divide-y divide-gray-50">
                  {cart.map((item: any) => (
                    <div key={item.productId} className="px-5 py-4 flex gap-4">
                      <div className="h-20 w-20 shrink-0 bg-gray-50 border border-gray-100 rounded flex items-center justify-center">
                        <img src={item.image} alt={item.name} className="h-16 w-16 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                        {item.brand && <p className="text-xs text-gray-400 mt-0.5">{item.brand}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">Qty: <span className="font-bold text-gray-700">{item.qty}</span></span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-black text-gray-900 text-base">{formatINR(item.price * item.qty)}</span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-xs text-gray-400 line-through">{formatINR(item.originalPrice * item.qty)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery info */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Truck className="h-4 w-4 text-green-500" />
                    <span>
                      {deliveryCharge === 0
                        ? <span className="font-semibold text-green-600">Free Delivery</span>
                        : <span>Delivery: <span className="font-semibold">{formatINR(deliveryCharge)}</span></span>}
                      {" "}· Expected: 3–5 working days
                    </span>
                  </div>
                </div>

                {/* Open box delivery */}
                <div className="px-5 py-3 border-t border-gray-100">
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <Package className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><span className="font-bold text-gray-700">Open Box Delivery</span> — Delivery agent box kholega taaki aap product check kar sakein delivery pe.</span>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <button
                    onClick={() => setStep(3)}
                    className="mt-2 bg-[#FB641B] hover:bg-[#e5591a] text-white font-black px-10 py-3 rounded text-sm tracking-wide transition-colors"
                  >
                    CONTINUE TO PAYMENT
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 collapsed (visible in step 3) ── */}
            {step > 2 && (
              <div className="bg-white border border-gray-200 rounded-sm">
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-wide">ORDER SUMMARY</span>
                  </div>
                  <button onClick={() => setStep(2)} className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide">
                    Change
                  </button>
                </div>
                <div className="px-5 pb-3 text-xs text-gray-500">
                  {cart.length} item{cart.length > 1 ? "s" : ""} · Total: <span className="font-bold text-gray-700">{formatINR(finalAmount)}</span>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 3 && (
              <div className="bg-white border border-gray-200 rounded-sm">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="font-black text-gray-900 text-sm tracking-wide uppercase">Payment</h2>
                </div>

                <div className="p-5 space-y-3">

                  {/* Online / Cashfree */}
                  <button
                    onClick={() => setPaymentMethod("online")}
                    className={`w-full flex items-start gap-4 p-4 rounded border-2 transition-all text-left ${
                      paymentMethod === "online" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === "online" ? "border-blue-500" : "border-gray-300"
                    }`}>
                      {paymentMethod === "online" && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Smartphone className="h-5 w-5 text-blue-600" />
                        <span className="font-black text-gray-900 text-sm">Pay Online</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">UPI / Cards / NetBanking</span>
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" /> Instant Confirm
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Powered by Cashfree · 100% Secure</p>
                      {paymentMethod === "online" && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-xs font-bold text-blue-800">Total Payable</p>
                          <p className="text-xl font-black text-blue-700">{formatINR(finalAmount)}</p>
                          <p className="text-xs text-gray-500 mt-1">Order instantly confirmed after payment</p>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* COD */}
                  <button
                    onClick={() => setPaymentMethod("cod")}
                    className={`w-full flex items-start gap-4 p-4 rounded border-2 transition-all text-left ${
                      paymentMethod === "cod" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === "cod" ? "border-green-500" : "border-gray-300"
                    }`}>
                      {paymentMethod === "cod" && <div className="h-2.5 w-2.5 rounded-full bg-green-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        <span className="font-black text-gray-900 text-sm">Cash on Delivery</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">50% Advance</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Delivery pe remaining payment karein</p>
                      {paymentMethod === "cod" && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
                          <p className="text-xs font-bold text-amber-800">Advance (abhi bhejein): <span className="text-base font-black">{formatINR(advanceAmount)}</span></p>
                          <p className="text-xs text-gray-500">Delivery pe: {formatINR(finalAmount - advanceAmount)}</p>
                          <p className="text-xs text-amber-700 font-semibold">UPI: {storeUpi}</p>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Mobile pay button */}
                <div className="px-5 pb-5 lg:hidden">
                  {paymentMethod === "cod" ? (
                    <button onClick={placeCodOrder} disabled={loading}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-black py-3 rounded text-sm tracking-wide flex items-center justify-center gap-2">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Placing...</> : <>PLACE ORDER — {formatINR(finalAmount)}</>}
                    </button>
                  ) : (
                    <button onClick={launchCashfree} disabled={cfLoading}
                      className="w-full text-white font-black py-3 rounded text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: cfLoading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                      {cfLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Redirecting to Cashfree...</>
                        : <><Zap className="h-4 w-4" />PAY NOW — {formatINR(finalAmount)}</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ───── RIGHT: Price Panel ───── */}
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <PricePanel
                cart={cart}
                subtotal={subtotal}
                discountAmt={discountAmt}
                coupon={coupon}
                gstAmount={gstAmount}
                deliveryCharge={deliveryCharge}
                finalAmount={finalAmount}
                step={step}
                paymentMethod={paymentMethod}
                advanceAmount={advanceAmount}
                storeUpi={storeUpi}
                onContinue={() => {
                  if (step === 1 && isAddressValid) setStep(2);
                  else if (step === 2) setStep(3);
                }}
                onPlaceCod={placeCodOrder}
                onPayOnline={launchCashfree}
                loading={loading}
                cfLoading={cfLoading}
              />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
