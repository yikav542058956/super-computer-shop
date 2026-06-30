import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartTotal } = useCart();
  const [coupon, setCoupon] = useState("");

  if (cart.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto bg-white p-8 rounded-xl border shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Link href="/products">
              <Button className="w-full">Start Shopping</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div key={item.productId} className="flex gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <img src={item.image} alt={item.name} className="w-24 h-24 object-contain bg-slate-50 rounded-md" />
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-primary font-bold">₹{item.price.toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQty(item.productId, item.qty - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-medium">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => updateQty(item.productId, item.qty + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="font-semibold text-slate-700">
                      Total: ₹{(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-6 rounded-xl border shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="mb-6 flex gap-2">
              <Input 
                placeholder="Coupon code" 
                value={coupon} 
                onChange={(e) => setCoupon(e.target.value)} 
              />
              <Button variant="outline">Apply</Button>
            </div>
            
            <Link href="/checkout">
              <Button className="w-full text-lg h-12">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}