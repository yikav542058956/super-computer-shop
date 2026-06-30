import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import {
  Package, MapPin, Heart, Settings, User, ChevronRight, CheckCircle2,
  Truck, Home, ShoppingBag, Clock, XCircle, RotateCcw, Loader2,
  Download, ShoppingCart, Star,
} from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";

/* ─── Constants ─────────────────────────────────────────────── */
const ORDER_STEPS = [
  { status: "pending",          label: "Order Placed",      Icon: ShoppingBag,  description: "Your order has been placed." },
  { status: "confirmed",        label: "Order Confirmed",   Icon: CheckCircle2, description: "Seller has processed your order." },
  { status: "shipped",          label: "Shipped",           Icon: Package,      description: "Your item has been shipped." },
  { status: "out-for-delivery", label: "Out for Delivery",  Icon: Truck,        description: "Your item is out for delivery." },
  { status: "delivered",        label: "Delivered",         Icon: Home,         description: "Your item has been delivered." },
];

const STATUS_ORDER = ["pending", "confirmed", "shipped", "out-for-delivery", "delivered"];

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
  pending:           { label: "Pending",          pill: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  confirmed:         { label: "Confirmed",         pill: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  shipped:           { label: "Shipped",           pill: "bg-violet-500/15 text-violet-400 border border-violet-500/30" },
  "out-for-delivery":{ label: "Out for Delivery",  pill: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
  delivered:         { label: "Delivered",         pill: "bg-green-500/15 text-green-400 border border-green-500/30" },
  cancelled:         { label: "Cancelled",         pill: "bg-red-500/15 text-red-400 border border-red-500/30" },
  returned:          { label: "Returned",          pill: "bg-slate-500/15 text-slate-400 border border-slate-500/30" },
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

/* ─── Order Tracking Timeline ────────────────────────────────── */
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
          <div className="h-10 w-10 rounded-full bg-red-500/15 border-2 border-red-500/50 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="pt-1.5">
            <p className="font-bold text-red-400 capitalize">{currentStatus}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {historyMap[currentStatus]?.[0] && formatDateTime(historyMap[currentStatus][0].timestamp)}
            </p>
          </div>
        </div>
      ) : (
        ORDER_STEPS.map((step, idx) => {
          const isDone = currentIdx >= idx;
          const isCurrent = currentIdx === idx;
          const isLast = idx === ORDER_STEPS.length - 1;
          const Icon = step.Icon;
          const stepHistory = historyMap[step.status] || [];
          const stepTime = stepHistory[0]?.timestamp;

          return (
            <div key={step.status} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  isDone
                    ? isCurrent
                      ? "bg-green-500 border-green-500 text-black shadow-lg shadow-green-500/30"
                      : "bg-green-500/20 border-green-500/60 text-green-400"
                    : "bg-white/5 border-white/15 text-slate-600"
                }`}>
                  {isDone && !isCurrent ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-10 mt-1 ${isDone && currentIdx > idx ? "bg-green-500/50" : "bg-white/10"}`} />
                )}
              </div>
              <div className={`pb-4 pt-1.5 flex-1 ${!isDone ? "opacity-40" : ""}`}>
                <p className={`font-bold text-sm ${isCurrent ? "text-green-400" : isDone ? "text-white" : "text-slate-500"}`}>
                  {step.label}
                  {stepTime && <span className="text-xs font-normal text-slate-500 ml-2">{formatDate(stepTime)}</span>}
                </p>
                {isDone && stepHistory.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {stepHistory.map((h: any, i: number) => (
                      <div key={i} className="text-xs text-slate-500">
                        {h.note && <p className="text-slate-400">{h.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {!isDone && (
                  <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Nav Tab Button ─────────────────────────────────────────── */
function NavTab({ value, active, Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-green-500/15 border border-green-500/30 text-green-400"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Profile() {
  const { currentUser, userData } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    if (userData) {
      setProfileForm({ name: userData.name || "", phone: userData.phone || "" });
    }
  }, [userData]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) {
        const userOrders = Object.entries(snap.val())
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((o) => o.userId === currentUser.uid)
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
      await update(ref(db, `users/${currentUser.uid}`), profileForm);
      toast.success("Profile updated! ✓");
    } catch {
      toast.error("Profile update karne mein error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReorder = (order: any) => {
    order.items?.forEach((item: any) => {
      addToCart({ productId: item.productId, name: item.name, price: item.price, qty: item.qty, image: item.image });
    });
    toast.success(`${order.items?.length} items cart mein add ho gaye! 🛒`);
    setSelectedOrder(null);
  };

  const avatarLetter = userData?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U";

  const tabs = [
    { value: "orders",    Icon: Package,  label: "My Orders" },
    { value: "addresses", Icon: MapPin,   label: "Addresses" },
    { value: "wishlist",  Icon: Heart,    label: "Wishlist" },
    { value: "settings",  Icon: Settings, label: "Account Settings" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-[#0D1117]">
        <div className="container mx-auto px-4 py-8 max-w-6xl">

          {/* Profile Header */}
          <div className="flex items-center gap-5 mb-8 p-5 bg-[#161B22]/80 backdrop-blur-sm border border-white/8 rounded-2xl">
            <div className="h-16 w-16 bg-green-500/15 border-2 border-green-500/30 rounded-2xl flex items-center justify-center text-green-400 text-2xl font-black shrink-0">
              {avatarLetter}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{userData?.name || "My Account"}</h1>
              <p className="text-slate-400 text-sm">{currentUser?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                  {orders.length} Orders
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">

            {/* Sidebar Nav */}
            <div className="md:w-52 shrink-0">
              <div className="bg-[#161B22]/80 backdrop-blur-sm border border-white/8 rounded-2xl p-3 space-y-1">
                {tabs.map(({ value, Icon, label }) => (
                  <NavTab key={value} value={value} active={activeTab === value} Icon={Icon} label={label} onClick={() => setActiveTab(value)} />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">

              {/* ── Orders Tab ── */}
              {activeTab === "orders" && (
                <div>
                  <h2 className="text-lg font-black text-white mb-4">My Orders</h2>
                  {orders.length === 0 ? (
                    <div className="text-center py-16 bg-[#161B22]/80 border border-white/8 rounded-2xl border-dashed">
                      <Package className="h-14 w-14 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-400 font-semibold mb-1">No orders yet</p>
                      <p className="text-slate-600 text-sm mb-6">Aapke placed orders yahan dikhenge</p>
                      <Link href="/products">
                        <Button className="bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl">Start Shopping</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="bg-[#161B22]/80 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-green-500/30 transition-all group"
                          >
                            {/* Order header */}
                            <div className="px-5 py-3.5 border-b border-white/5 bg-white/3 flex justify-between items-center gap-3 flex-wrap">
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Order ID</p>
                                <p className="font-mono font-bold text-sm text-slate-300">#{order.id.slice(-10).toUpperCase()}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Placed On</p>
                                  <p className="text-sm font-semibold text-white">{formatDate(order.createdAt)}</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-green-400 transition-colors" />
                              </div>
                            </div>

                            {/* Order body */}
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                {/* Item thumbnails */}
                                <div className="flex gap-2 flex-wrap">
                                  {order.items?.slice(0, 3).map((item: any, idx: number) => (
                                    <div key={idx} className="h-14 w-14 bg-[#F0F2F5] rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                                      <img src={item.image} alt={item.name} className="h-12 w-12 object-contain" />
                                    </div>
                                  ))}
                                  {order.items?.length > 3 && (
                                    <div className="h-14 w-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm font-bold text-slate-400">
                                      +{order.items.length - 3}
                                    </div>
                                  )}
                                </div>

                                {/* Price + status */}
                                <div className="text-right shrink-0">
                                  <p className="font-black text-white text-lg">{formatINR(order.finalAmount)}</p>
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold mt-1 ${cfg.pill}`}>
                                    {cfg.label}
                                  </span>
                                </div>
                              </div>

                              {/* Item names */}
                              <p className="text-sm text-slate-500 line-clamp-1">
                                {order.items?.map((i: any) => i.name).join(", ")}
                              </p>

                              {/* Delivered banner */}
                              {order.orderStatus === "delivered" && (
                                <div className="mt-3 flex items-center justify-between">
                                  <p className="text-xs text-green-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Delivered
                                  </p>
                                  <span className="text-xs text-slate-500">Tap to reorder →</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Addresses Tab ── */}
              {activeTab === "addresses" && (
                <div className="bg-[#161B22]/80 border border-white/8 rounded-2xl p-6">
                  <h2 className="text-lg font-black text-white mb-4">My Addresses</h2>
                  <div className="text-center py-8">
                    <MapPin className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm mb-4">Saved addresses yahan dikhenge</p>
                    <Button variant="outline" className="border-white/15 text-slate-300 hover:bg-white/5">
                      <MapPin className="mr-2 h-4 w-4" /> Add New Address
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Wishlist Tab ── */}
              {activeTab === "wishlist" && (
                <div className="bg-[#161B22]/80 border border-white/8 rounded-2xl p-6">
                  <h2 className="text-lg font-black text-white mb-4">My Wishlist</h2>
                  <div className="text-center py-8">
                    <Heart className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm mb-4">Wishlist items yahan dikhenge</p>
                    <Link href="/products">
                      <Button variant="outline" className="border-white/15 text-slate-300 hover:bg-white/5">Browse Products</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* ── Settings Tab ── */}
              {activeTab === "settings" && (
                <div className="bg-[#161B22]/80 border border-white/8 rounded-2xl p-6">
                  <h2 className="text-lg font-black text-white mb-6">Profile Information</h2>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-sm">Full Name</Label>
                      <Input
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                        className="bg-[#0D1117] border-white/10 text-white focus:border-green-500/50 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-sm">Email</Label>
                      <Input
                        value={currentUser?.email || ""}
                        disabled
                        className="bg-white/5 border-white/10 text-slate-500 rounded-xl cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-sm">Phone Number</Label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 XXXXX XXXXX"
                        className="bg-[#0D1117] border-white/10 text-white focus:border-green-500/50 rounded-xl"
                      />
                    </div>
                    <Button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl gap-2"
                    >
                      {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Order Detail Dialog ── */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-[#161B22] border-white/15 text-white rounded-3xl">
          {selectedOrder && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/8 sticky top-0 bg-[#161B22] z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-white text-lg">Order Details</DialogTitle>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">#{selectedOrder.id.toUpperCase()}</p>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shrink-0 ${STATUS_CONFIG[selectedOrder.orderStatus]?.pill || "bg-slate-500/15 text-slate-400 border border-slate-500/30"}`}>
                    {STATUS_CONFIG[selectedOrder.orderStatus]?.label || selectedOrder.orderStatus}
                  </span>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-6">

                {/* Tracking */}
                <div>
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-green-400" />Order Tracking
                  </h3>
                  <OrderTrackingTimeline order={selectedOrder} />
                </div>

                {/* Items */}
                <div className="border-t border-white/8 pt-5">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-green-400" />Items Ordered
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 items-center p-3 bg-white/5 border border-white/8 rounded-xl">
                        <div className="h-16 w-16 bg-[#F0F2F5] rounded-xl flex items-center justify-center shrink-0">
                          <img src={item.image} alt={item.name} className="h-14 w-14 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm leading-snug">{item.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Qty: {item.qty}</p>
                        </div>
                        <p className="font-bold text-white shrink-0">{formatINR(item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery */}
                {selectedOrder.address && (
                  <div className="border-t border-white/8 pt-5">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-green-400" />Delivery Address
                    </h3>
                    <div className="bg-white/5 border border-white/8 rounded-xl p-4 text-sm">
                      <p className="font-semibold text-white">{selectedOrder.address.name}</p>
                      <p className="text-slate-400 mt-1">{selectedOrder.address.street}</p>
                      <p className="text-slate-400">{selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.pincode}</p>
                      <p className="text-slate-400 mt-1">{selectedOrder.address.phone}</p>
                    </div>
                  </div>
                )}

                {/* Price Details */}
                <div className="border-t border-white/8 pt-5">
                  <h3 className="font-bold text-white mb-3 text-sm">Price Details</h3>
                  <div className="space-y-2 text-sm bg-white/5 border border-white/8 rounded-xl p-4">
                    <div className="flex justify-between text-slate-400">
                      <span>Listing Price</span>
                      <span>{formatINR(selectedOrder.totalAmount)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Coupon Discount</span>
                        <span>−{formatINR(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>Delivery Charges</span>
                      <span className="text-green-400">{selectedOrder.deliveryCharge > 0 ? formatINR(selectedOrder.deliveryCharge) : "FREE"}</span>
                    </div>
                    <div className="flex justify-between font-black text-white text-base border-t border-white/8 pt-2 mt-2">
                      <span>Total Amount</span>
                      <span className="text-green-400">{formatINR(selectedOrder.finalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Payment Method</span>
                      <span className="font-semibold capitalize">{selectedOrder.paymentMethod === "cod" ? "Cash on Delivery" : selectedOrder.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-white/8 pt-4 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-white/15 text-slate-300 hover:bg-white/5 rounded-xl gap-2"
                    onClick={() => toast.info("Invoice feature coming soon")}
                  >
                    <Download className="h-4 w-4" />Invoice
                  </Button>

                  {/* Reorder button — shown for delivered orders */}
                  {selectedOrder.orderStatus === "delivered" && (
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl gap-2"
                      onClick={() => handleReorder(selectedOrder)}
                    >
                      <ShoppingCart className="h-4 w-4" />Reorder
                    </Button>
                  )}

                  {/* Write Review */}
                  {selectedOrder.orderStatus === "delivered" && (
                    <Link href={`/products/${selectedOrder.items?.[0]?.productId}#reviews`}>
                      <Button variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 rounded-xl gap-2">
                        <Star className="h-4 w-4" />Write Review
                      </Button>
                    </Link>
                  )}

                  {(selectedOrder.orderStatus === "pending" || selectedOrder.orderStatus === "confirmed") && (
                    <Button
                      variant="destructive"
                      className="rounded-xl gap-2 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                      onClick={() => toast.info("Cancel karne ke liye support se contact karein")}
                    >
                      <XCircle className="h-4 w-4" />Cancel
                    </Button>
                  )}

                  {selectedOrder.orderStatus === "delivered" && (
                    <Button
                      variant="outline"
                      className="border-white/15 text-slate-300 hover:bg-white/5 rounded-xl gap-2"
                      onClick={() => toast.info("Return request submit ho gaya")}
                    >
                      <RotateCcw className="h-4 w-4" />Return
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
