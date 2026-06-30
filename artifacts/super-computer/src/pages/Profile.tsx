import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import {
  Package, MapPin, Heart, Settings, User, ChevronRight, CheckCircle2,
  Circle, Truck, Home, ShoppingBag, Clock, XCircle, RotateCcw, Loader2, Download
} from "lucide-react";
import { Link } from "wouter";

const ORDER_STEPS = [
  { status: "pending", label: "Order Placed", icon: ShoppingBag, description: "Your order has been placed." },
  { status: "confirmed", label: "Order Confirmed", icon: CheckCircle2, description: "Seller has processed your order." },
  { status: "shipped", label: "Shipped", icon: Package, description: "Your item has been shipped." },
  { status: "out-for-delivery", label: "Out for Delivery", icon: Truck, description: "Your item is out for delivery." },
  { status: "delivered", label: "Delivered", icon: Home, description: "Your item has been delivered." },
];

const STATUS_ORDER = ["pending", "confirmed", "shipped", "out-for-delivery", "delivered"];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50 text-blue-700" },
  shipped: { label: "Shipped", color: "text-violet-600", bg: "bg-violet-50 text-violet-700" },
  "out-for-delivery": { label: "Out for Delivery", color: "text-orange-600", bg: "bg-orange-50 text-orange-700" },
  delivered: { label: "Delivered", color: "text-green-600", bg: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50 text-red-700" },
  returned: { label: "Returned", color: "text-slate-600", bg: "bg-slate-100 text-slate-700" },
};

function formatDateTime(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) +
    " – " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(ts: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function OrderTrackingTimeline({ order }: { order: any }) {
  const currentStatus = order.orderStatus;
  const isCancelled = currentStatus === "cancelled" || currentStatus === "returned";
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  const historyMap: Record<string, any[]> = {};
  if (order.statusHistory) {
    const hist = Array.isArray(order.statusHistory) ? order.statusHistory : Object.values(order.statusHistory);
    hist.forEach((h: any) => {
      if (!historyMap[h.status]) historyMap[h.status] = [];
      historyMap[h.status].push(h);
    });
  }

  return (
    <div className="space-y-0">
      {isCancelled ? (
        <div className="flex items-start gap-4 py-4">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="pt-1.5">
            <p className="font-bold text-red-600 capitalize">{currentStatus}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {historyMap[currentStatus]?.[0] && formatDateTime(historyMap[currentStatus][0].timestamp)}
            </p>
            {historyMap[currentStatus]?.[0]?.note && (
              <p className="text-sm text-slate-600 mt-1">{historyMap[currentStatus][0].note}</p>
            )}
          </div>
        </div>
      ) : (
        ORDER_STEPS.map((step, idx) => {
          const isDone = currentIdx >= idx;
          const isCurrent = currentIdx === idx;
          const isLast = idx === ORDER_STEPS.length - 1;
          const Icon = step.icon;
          const stepHistory = historyMap[step.status] || [];
          const stepTime = stepHistory[0]?.timestamp;

          return (
            <div key={step.status} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all
                  ${isDone
                    ? isCurrent
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/30"
                      : "bg-green-500 border-green-500 text-white"
                    : "bg-white border-slate-200 text-slate-300"
                  }`}>
                  {isDone && !isCurrent ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-10 mt-1 ${isDone && currentIdx > idx ? "bg-green-400" : "bg-slate-200"}`} />
                )}
              </div>
              <div className={`pb-4 pt-1.5 flex-1 ${!isDone ? "opacity-40" : ""}`}>
                <p className={`font-bold ${isCurrent ? "text-primary" : isDone ? "text-green-700" : "text-slate-400"}`}>
                  {step.label}
                  {stepTime && <span className="text-xs font-normal text-slate-400 ml-2">{formatDate(stepTime)}</span>}
                </p>
                {isDone && stepHistory.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {stepHistory.map((h: any, i: number) => (
                      <div key={i} className="text-sm text-slate-500">
                        <span className="text-slate-400">{formatDateTime(h.timestamp)}</span>
                        {h.note && <p className="text-slate-600">{h.note}</p>}
                      </div>
                    ))}
                    {stepHistory.length === 0 && (
                      <p className="text-sm text-slate-500">{step.description}</p>
                    )}
                  </div>
                )}
                {!isDone && !isCurrent && (
                  <p className="text-sm text-slate-400 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function Profile() {
  const { currentUser, userData } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (userData) {
      setProfileForm({ name: userData.name || "", phone: userData.phone || "" });
    }
  }, [userData]);

  useEffect(() => {
    if (!currentUser) return;
    const ordersRef = ref(db, "orders");
    const unsubscribe = onValue(ordersRef, (snap) => {
      if (snap.exists()) {
        const allOrders = snap.val();
        const userOrders = Object.entries(allOrders)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((order) => order.userId === currentUser.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setOrders(userOrders);

        if (selectedOrder) {
          const updated = userOrders.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const saveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      await update(ref(db, `users/${currentUser.uid}`), { name: profileForm.name, phone: profileForm.phone });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold">
            {userData?.name?.charAt(0)?.toUpperCase() || <User className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userData?.name || "My Account"}</h1>
            <p className="text-slate-500 text-sm">{currentUser?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="orders" className="flex flex-col md:flex-row gap-8">
          <TabsList className="flex flex-col h-auto w-full md:w-56 bg-white border rounded-xl shadow-sm p-2 space-y-1 items-start justify-start">
            <TabsTrigger value="orders" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <Package className="mr-2 h-4 w-4" /> My Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <MapPin className="mr-2 h-4 w-4" /> Addresses
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <Heart className="mr-2 h-4 w-4" /> Wishlist
            </TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
              <Settings className="mr-2 h-4 w-4" /> Account Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1">
            <TabsContent value="orders" className="mt-0">
              <h2 className="text-xl font-bold mb-5">My Orders</h2>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed">
                    <Package className="h-14 w-14 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium mb-1">No orders yet</p>
                    <p className="text-slate-400 text-sm mb-5">Your placed orders will appear here</p>
                    <Link href="/products"><Button>Start Shopping</Button></Link>
                  </div>
                ) : (
                  orders.map((order) => {
                    const statusCfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="px-5 py-4 border-b bg-slate-50 flex justify-between items-center">
                          <div>
                            <p className="text-xs text-slate-400">ORDER ID</p>
                            <p className="font-mono font-bold text-sm text-slate-800">#{order.id.slice(-10).toUpperCase()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-slate-400">PLACED ON</p>
                              <p className="text-sm font-medium">{formatDate(order.createdAt)}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex gap-3 flex-wrap">
                              {order.items?.slice(0, 3).map((item: any, idx: number) => (
                                <img key={idx} src={item.image} alt={item.name} className="h-14 w-14 object-contain bg-slate-50 rounded-lg border" />
                              ))}
                              {order.items?.length > 3 && (
                                <div className="h-14 w-14 bg-slate-100 rounded-lg border flex items-center justify-center text-sm font-bold text-slate-500">
                                  +{order.items.length - 3}
                                </div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-lg">{formatINR(order.finalAmount)}</p>
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${statusCfg.bg}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-slate-600">
                            {order.items?.map((item: any, idx: number) => (
                              <span key={idx}>{item.name}{idx < order.items.length - 1 ? ", " : ""}</span>
                            ))}
                          </div>
                          {order.orderStatus === "delivered" && (
                            <p className="text-xs text-green-600 font-medium mt-2">
                              Delivered on {formatDate(
                                order.statusHistory
                                  ? (Array.isArray(order.statusHistory)
                                    ? order.statusHistory
                                    : Object.values(order.statusHistory)
                                  ).find((h: any) => h.status === "delivered")?.timestamp || order.createdAt
                                  : order.createdAt
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <Card>
                <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={currentUser?.email || ""} disabled className="bg-slate-50" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone Number</Label>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <Button onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="addresses" className="mt-0">
              <Card>
                <CardHeader><CardTitle>My Addresses</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-slate-500 mb-4">Saved addresses will appear here.</p>
                  <Button variant="outline"><MapPin className="mr-2 h-4 w-4" /> Add New Address</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wishlist" className="mt-0">
              <Card>
                <CardHeader><CardTitle>My Wishlist</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Your wishlist is empty.</p>
                    <Link href="/products"><Button className="mt-4" variant="outline">Browse Products</Button></Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            {selectedOrder && (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-lg">Order Details</DialogTitle>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">#{selectedOrder.id.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[selectedOrder.orderStatus]?.bg || "bg-slate-100 text-slate-700"}`}>
                        {STATUS_CONFIG[selectedOrder.orderStatus]?.label || selectedOrder.orderStatus}
                      </span>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                  {/* Order Tracking */}
                  <div>
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Order Tracking</h3>
                    <OrderTrackingTimeline order={selectedOrder} />
                  </div>

                  {/* Items */}
                  <div className="border-t pt-5">
                    <h3 className="font-bold mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Items Ordered</h3>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 items-center p-3 bg-slate-50 rounded-xl">
                          <img src={item.image} alt={item.name} className="h-16 w-16 object-contain bg-white rounded-lg border" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm leading-snug">{item.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Qty: {item.qty}</p>
                          </div>
                          <p className="font-bold text-slate-800">{formatINR(item.price * item.qty)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Details */}
                  {selectedOrder.address && (
                    <div className="border-t pt-5">
                      <h3 className="font-bold mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Delivery Details</h3>
                      <div className="bg-slate-50 rounded-xl p-4 text-sm">
                        <p className="font-semibold">{selectedOrder.address.name}</p>
                        <p className="text-slate-600 mt-1">{selectedOrder.address.street}</p>
                        <p className="text-slate-600">{selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.pincode}</p>
                        <p className="text-slate-600 mt-1">{selectedOrder.address.phone}</p>
                      </div>
                    </div>
                  )}

                  {/* Price Details */}
                  <div className="border-t pt-5">
                    <h3 className="font-bold mb-3">Price Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Listing Price</span>
                        <span>{formatINR(selectedOrder.totalAmount)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Coupon Discount</span>
                          <span>−{formatINR(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery Charges</span>
                        <span>{selectedOrder.deliveryCharge > 0 ? formatINR(selectedOrder.deliveryCharge) : "Free"}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                        <span>Total Amount</span>
                        <span>{formatINR(selectedOrder.finalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Payment Method</span>
                        <span className="font-medium capitalize">{selectedOrder.paymentMethod === "cod" ? "Cash on Delivery" : selectedOrder.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => toast.info("Invoice download coming soon")}>
                      <Download className="h-4 w-4 mr-2" />Download Invoice
                    </Button>
                    {(selectedOrder.orderStatus === "pending" || selectedOrder.orderStatus === "confirmed") && (
                      <Button variant="destructive" className="flex-1" onClick={() => toast.info("To cancel, contact support")}>
                        <XCircle className="h-4 w-4 mr-2" />Cancel Order
                      </Button>
                    )}
                    {selectedOrder.orderStatus === "delivered" && (
                      <Button variant="outline" className="flex-1" onClick={() => toast.info("Return request submitted")}>
                        <RotateCcw className="h-4 w-4 mr-2" />Return Order
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
