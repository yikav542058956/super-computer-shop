import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, MapPin, Heart, Settings, User } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  const { currentUser, userData } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser) {
      const ordersRef = ref(db, 'orders');
      const unsubscribe = onValue(ordersRef, (snap) => {
        if (snap.exists()) {
          const allOrders = snap.val();
          const userOrders = Object.entries(allOrders)
            .map(([id, val]: any) => ({ id, ...val }))
            .filter(order => order.userId === currentUser.uid)
            .sort((a, b) => b.createdAt - a.createdAt);
          setOrders(userOrders);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
            {userData?.name?.charAt(0) || <User />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userData?.name || "User Profile"}</h1>
            <p className="text-slate-500">{currentUser?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="orders" className="flex flex-col md:flex-row gap-8">
          <TabsList className="flex flex-col h-auto w-full md:w-64 bg-transparent space-y-2 items-start justify-start p-0">
            <TabsTrigger value="orders" className="w-full justify-start px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg border border-transparent data-[state=active]:border-slate-200">
              <Package className="mr-2 h-5 w-5" /> My Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" className="w-full justify-start px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg border border-transparent data-[state=active]:border-slate-200">
              <MapPin className="mr-2 h-5 w-5" /> Addresses
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="w-full justify-start px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg border border-transparent data-[state=active]:border-slate-200">
              <Heart className="mr-2 h-5 w-5" /> Wishlist
            </TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg border border-transparent data-[state=active]:border-slate-200">
              <Settings className="mr-2 h-5 w-5" /> Account Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1">
            <TabsContent value="orders" className="mt-0">
              <h2 className="text-xl font-bold mb-6">Order History</h2>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No orders found.</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <Card key={order.id} className="overflow-hidden">
                      <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Order #{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-sm text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{order.finalAmount.toLocaleString()}</p>
                          <span className="inline-block px-2 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-full mt-1 uppercase">
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="p-4 flex gap-4 items-center">
                              <img src={item.image} alt={item.name} className="w-16 h-16 object-contain bg-slate-100 rounded" />
                              <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-slate-500">Qty: {item.qty} × ₹{item.price.toLocaleString()}</p>
                              </div>
                              <Button variant="outline" size="sm">Write Review</Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input defaultValue={userData?.name || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue={currentUser?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input defaultValue={userData?.phone || ""} />
                  </div>
                  <Button onClick={() => toast.success("Profile updated")}>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="addresses" className="mt-0">
               <Card>
                <CardHeader>
                  <CardTitle>My Addresses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-500 mb-4">You have not saved any addresses yet.</p>
                  <Button variant="outline"><MapPin className="mr-2 h-4 w-4" /> Add New Address</Button>
                </CardContent>
               </Card>
            </TabsContent>
            
            <TabsContent value="wishlist" className="mt-0">
               <Card>
                <CardHeader>
                  <CardTitle>My Wishlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Your wishlist is empty.</p>
                    <Link href="/products"><Button className="mt-4" variant="outline">Browse Products</Button></Link>
                  </div>
                </CardContent>
               </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}