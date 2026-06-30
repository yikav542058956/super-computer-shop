import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Banknote, Landmark } from "lucide-react";

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");

  const [address, setAddress] = useState({
    name: userData?.name || "",
    phone: userData?.phone || "",
    street: "",
    city: "",
    state: "",
    pincode: ""
  });

  const [paymentMethod, setPaymentMethod] = useState("card");

  useEffect(() => {
    if (cart.length === 0 && step !== 4) {
      setLocation("/cart");
    }
  }, [cart, setLocation, step]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const placeOrder = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const orderRef = push(ref(db, 'orders'));
      const newOrder = {
        userId: currentUser.uid,
        items: cart,
        totalAmount: cartTotal,
        discount: 0,
        deliveryCharge: 0,
        finalAmount: cartTotal,
        address,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
        orderStatus: "confirmed",
        statusHistory: [{ status: "confirmed", timestamp: Date.now(), note: "Order placed" }],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await set(orderRef, newOrder);
      setOrderId(orderRef.key as string);
      clearCart();
      setStep(4);
      toast.success("Order placed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 4) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <div className="bg-white p-8 rounded-xl border shadow-sm flex flex-col items-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
            <p className="text-slate-500 mb-6">Thank you for your purchase. Your order ID is <span className="font-mono font-medium text-slate-900">{orderId}</span></p>
            <Button onClick={() => setLocation("/profile")} className="w-full">View My Orders</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded"></div>
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all rounded`} style={{ width: `${(step - 1) * 50}%` }}></div>
          
          {[1, 2, 3].map((num) => (
            <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${step >= num ? 'bg-primary border-primary text-primary-foreground' : 'bg-white border-slate-200 text-slate-400'}`}>
              {num}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {step === 1 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={address.name} onChange={e => setAddress({...address, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Street Address</Label>
                      <Input value={address.street} onChange={e => setAddress({...address, street: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={address.city} onChange={e => setAddress({...address, city: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input value={address.state} onChange={e => setAddress({...address, state: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      <Input value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value})} required />
                    </div>
                  </div>
                  <Button onClick={handleNext} className="mt-6 w-full md:w-auto" disabled={!address.name || !address.street || !address.city || !address.pincode}>
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                    <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : ''}`} onClick={() => setPaymentMethod('card')}>
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1"><CreditCard className="h-5 w-5 text-slate-500" /> Credit / Debit Card</Label>
                    </div>
                    <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'upi' ? 'border-primary bg-primary/5' : ''}`} onClick={() => setPaymentMethod('upi')}>
                      <RadioGroupItem value="upi" id="upi" />
                      <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer flex-1"><Landmark className="h-5 w-5 text-slate-500" /> UPI</Label>
                    </div>
                    <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : ''}`} onClick={() => setPaymentMethod('cod')}>
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1"><Banknote className="h-5 w-5 text-slate-500" /> Cash on Delivery</Label>
                    </div>
                  </RadioGroup>
                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" onClick={handleBack}>Back</Button>
                    <Button onClick={handleNext}>Review Order</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Shipping To</h2>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Edit</Button>
                    </div>
                    <p className="font-medium">{address.name}</p>
                    <p className="text-slate-500 text-sm">{address.street}, {address.city}, {address.state} {address.pincode}</p>
                    <p className="text-slate-500 text-sm mt-1">{address.phone}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Payment Method</h2>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Edit</Button>
                    </div>
                    <p className="font-medium uppercase">{paymentMethod}</p>
                  </CardContent>
                </Card>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button onClick={placeOrder} className="flex-1" disabled={loading}>
                    {loading ? "Processing..." : "Place Order"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-4">Order Summary</h3>
                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.productId} className="flex gap-3 text-sm">
                      <img src={item.image} alt={item.name} className="h-12 w-12 object-contain bg-slate-50 rounded" />
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{item.name}</p>
                        <p className="text-slate-500">Qty: {item.qty}</p>
                      </div>
                      <p className="font-medium">₹{(item.price * item.qty).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}