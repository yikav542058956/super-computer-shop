import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, ArrowRight, Tag, CheckCircle, XCircle, Loader2, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { ref, query, orderByChild, equalTo, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

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
      if (!snap.exists()) {
        toast.error("Invalid coupon code");
        setValidating(false);
        return;
      }
      const entries = Object.entries(snap.val());
      const [, couponData] = entries[0] as [string, any];

      if (!couponData.isActive) { toast.error("This coupon is not active"); setValidating(false); return; }
      if (couponData.expiryDate && new Date(couponData.expiryDate) < new Date()) { toast.error("This coupon has expired"); setValidating(false); return; }
      if (couponData.minOrderValue && cartTotal < couponData.minOrderValue) {
        toast.error(`Minimum order value for this coupon is ${formatINR(couponData.minOrderValue)}`);
        setValidating(false);
        return;
      }
      if (couponData.maxUses && (couponData.usedCount || 0) >= couponData.maxUses) {
        toast.error("This coupon has reached its usage limit");
        setValidating(false);
        return;
      }

      const discount =
        couponData.discountType === "percentage"
          ? Math.round((cartTotal * couponData.discountValue) / 100)
          : Math.min(couponData.discountValue, cartTotal);

      setApplied({
        code,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        discount,
      });

      localStorage.setItem("appliedCoupon", JSON.stringify({ code, discountType: couponData.discountType, discountValue: couponData.discountValue, discount }));
      toast.success(`Coupon applied! You save ${formatINR(discount)}`);
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setValidating(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCouponCode("");
    localStorage.removeItem("appliedCoupon");
    toast.info("Coupon removed");
  };

  if (cart.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto bg-white p-10 rounded-2xl border shadow-sm">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-7">Looks like you haven't added anything yet. Start browsing our collection!</p>
            <Link href="/products">
              <Button className="w-full h-12 text-base">Browse Products</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart <span className="text-slate-400 text-lg font-normal">({cart.length} {cart.length === 1 ? "item" : "items"})</span></h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div key={item.productId} className="flex gap-4 bg-white p-5 rounded-xl border shadow-sm">
                <Link href={`/products/${item.productId}`}>
                  <img src={item.image} alt={item.name} className="w-24 h-24 object-contain bg-slate-50 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" />
                </Link>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between gap-2">
                    <div>
                      <Link href={`/products/${item.productId}`}>
                        <h3 className="font-semibold text-slate-800 hover:text-primary cursor-pointer transition-colors leading-snug">{item.name}</h3>
                      </Link>
                      <p className="text-primary font-bold mt-1">{formatINR(item.price)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.productId)}
                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 flex-shrink-0"
                      data-testid={`remove-item-${item.productId}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none border-r"
                        onClick={() => updateQty(item.productId, item.qty - 1)}
                        data-testid={`qty-dec-${item.productId}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-10 text-center font-semibold text-sm">{item.qty}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none border-l"
                        onClick={() => updateQty(item.productId, item.qty + 1)}
                        data-testid={`qty-inc-${item.productId}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="font-bold text-slate-800">{formatINR(item.price * item.qty)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Coupon Code</h2>
              {applied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-mono font-bold text-green-700 text-sm">{applied.code}</p>
                      <p className="text-xs text-green-600">Saving {formatINR(discountAmount)}</p>
                    </div>
                  </div>
                  <button onClick={removeCoupon} className="text-slate-400 hover:text-red-500 transition-colors">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    className="font-mono uppercase"
                    data-testid="input-coupon"
                  />
                  <Button variant="outline" onClick={applyCoupon} disabled={validating} data-testid="button-apply-coupon">
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <h2 className="text-lg font-bold mb-4">Price Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span>{formatINR(cartTotal)}</span>
                </div>
                {applied && discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon Discount ({applied.code})</span>
                    <span>−{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  {DELIVERY_CHARGE === 0 ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <span>{formatINR(DELIVERY_CHARGE)}</span>
                  )}
                </div>
                {DELIVERY_CHARGE === 0 && (
                  <p className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">Free delivery on orders above ₹50,000</p>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatINR(finalTotal)}</span>
                </div>
              </div>

              {applied && discountAmount > 0 && (
                <div className="mt-3 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
                  You're saving {formatINR(discountAmount)} on this order!
                </div>
              )}

              <Link href="/checkout">
                <Button
                  className="w-full text-base h-12 mt-5"
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
