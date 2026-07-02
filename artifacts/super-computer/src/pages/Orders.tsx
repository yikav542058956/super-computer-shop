import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import {
  ChevronLeft, ChevronRight, Package, Search, X,
  ShoppingBag, CheckCircle2, Truck, Home, XCircle, RotateCcw,
  Clock, Star, MessageCircle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

function formatDate(ts: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:            { label: "Pending",          color: "#F59E0B", bg: "#F59E0B15", icon: Clock },
  confirmed:          { label: "Confirmed",         color: "#3B82F6", bg: "#3B82F615", icon: CheckCircle2 },
  shipped:            { label: "Shipped",           color: "#8B5CF6", bg: "#8B5CF615", icon: Package },
  "out-for-delivery": { label: "Out for Delivery",  color: "#F97316", bg: "#F9731615", icon: Truck },
  delivered:          { label: "Delivered",         color: "#22C55E", bg: "#22C55E15", icon: Home },
  cancelled:          { label: "Cancelled",         color: "#EF4444", bg: "#EF444415", icon: XCircle },
  returned:           { label: "Returned",          color: "#64748B", bg: "#64748B15", icon: RotateCcw },
};

const STATUS_ORDER = ["pending", "confirmed", "shipped", "out-for-delivery", "delivered"];

const FILTERS = [
  { key: "all",       label: "All" },
  { key: "active",    label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

/* ─── Order Tracking ──────────────────────────────────────────── */
function OrderTracking({ order }: { order: any }) {
  const steps = [
    { status: "pending",          label: "Order Placed",     Icon: ShoppingBag },
    { status: "confirmed",        label: "Confirmed",        Icon: CheckCircle2 },
    { status: "shipped",          label: "Shipped",          Icon: Package },
    { status: "out-for-delivery", label: "Out for Delivery", Icon: Truck },
    { status: "delivered",        label: "Delivered",        Icon: Home },
  ];
  const current = order.orderStatus;
  const isCancelled = current === "cancelled" || current === "returned";
  const currentIdx = STATUS_ORDER.indexOf(current);
  const historyMap: Record<string, any[]> = {};
  if (order.statusHistory) {
    const hist = Array.isArray(order.statusHistory) ? order.statusHistory : Object.values(order.statusHistory);
    (hist as any[]).forEach((h: any) => {
      if (!historyMap[h.status]) historyMap[h.status] = [];
      historyMap[h.status].push(h);
    });
  }

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "#EF444415", border: "2px solid rgba(239,68,68,0.4)" }}>
          <XCircle size={20} style={{ color: "#EF4444" }} />
        </div>
        <div>
          <p className="font-bold text-sm capitalize" style={{ color: "#EF4444" }}>{current}</p>
          <p className="text-xs text-slate-500 mt-0.5">{historyMap[current]?.[0]?.timestamp ? formatDateTime(historyMap[current][0].timestamp) : ""}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const done = currentIdx >= idx;
        const active = currentIdx === idx;
        const last = idx === steps.length - 1;
        const Icon = step.Icon;
        const ts = historyMap[step.status]?.[0]?.timestamp;
        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all ${
                active ? "border-green-500 bg-green-500 text-black shadow-lg shadow-green-500/30" :
                done ? "border-green-500/50 bg-green-500/15 text-green-400" :
                "border-gray-100 bg-gray-50 text-slate-700"
              }`}>
                <Icon size={16} />
              </div>
              {!last && <div className={`w-0.5 h-8 mt-1 ${done && currentIdx > idx ? "bg-green-500/40" : "bg-gray-200"}`} />}
            </div>
            <div className={`pb-3 pt-1.5 flex-1 ${!done ? "opacity-40" : ""}`}>
              <p className={`text-sm font-bold ${active ? "text-green-400" : done ? "text-green-800" : "text-gray-400"}`}>{step.label}</p>
              {ts && <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(ts)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Order Detail Sheet ──────────────────────────────────────── */
function OrderDetail({ order, onClose }: { order: any; onClose: () => void }) {
  const sc = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
  const StatusIcon = sc.icon;
  return (
    <motion.div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#f8fafc" }}
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "#e2e8f0" }}>
        <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full"
          style={{ background: "rgba(0,0,0,0.05)" }}>
          <ChevronLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">Order #{order.id?.slice(-6).toUpperCase()}</h1>
        <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ color: sc.color, background: sc.bg }}>
          {sc.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Items */}
        <div className="p-4 space-y-3">
          {(order.items || []).map((item: any, idx: number) => (
            <Link key={idx} href={`/products/${item.productId || item.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#F8FAFC" }}>
                  <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: "#22C55E" }}>{formatINR(item.price * item.quantity)}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Tracking */}
        <div className="mx-4 mb-4 p-4 rounded-2xl" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Order Tracking</h3>
          <OrderTracking order={order} />
        </div>

        {/* Delivery Address */}
        {order.deliveryAddress && (
          <div className="mx-4 mb-4 p-4 rounded-2xl" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Delivery Address</h3>
            <p className="text-sm font-semibold text-gray-800">{order.deliveryAddress.name}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {order.deliveryAddress.address}, {order.deliveryAddress.city}, {order.deliveryAddress.state} – {order.deliveryAddress.pincode}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{order.deliveryAddress.phone}</p>
          </div>
        )}

        {/* Price Details */}
        <div className="mx-4 mb-4 p-4 rounded-2xl" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Price Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="text-gray-900">{formatINR(order.subtotal || order.total)}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span className="text-slate-400">Discount</span><span style={{ color: "#22C55E" }}>-{formatINR(order.discount)}</span></div>}
            {order.deliveryCharge > 0 && <div className="flex justify-between"><span className="text-slate-400">Delivery</span><span className="text-gray-900">{formatINR(order.deliveryCharge)}</span></div>}
            <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: "#e2e8f0" }}>
              <span className="text-gray-900">Total Paid</span>
              <span style={{ color: "#22C55E" }}>{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mx-4 mb-8 flex gap-2">
          <a href="https://wa.me/919761809960" target="_blank" rel="noreferrer"
            className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: "#25D36620", border: "1px solid #25D36640", color: "#25D366" }}>
            <MessageCircle size={17} />
            WhatsApp Support
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Order Card ──────────────────────────────────────────────── */
function OrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  const sc = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
  const item = order.items?.[0];
  const StatusIcon = sc.icon;
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.98 }}
      className="w-full flex items-start gap-3 p-4 rounded-2xl text-left active:bg-gray-50 transition-colors"
      style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
      <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#F8FAFC" }}>
        {item?.image ? (
          <img src={item.image} alt="" className="h-full w-full object-contain p-1" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package size={24} className="text-slate-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{item?.name || "Order"}</p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 flex items-center gap-1"
            style={{ color: sc.color, background: sc.bg }}>
            <StatusIcon size={10} />
            {sc.label}
          </span>
        </div>
        {order.items?.length > 1 && (
          <p className="text-xs text-slate-500 mt-0.5">+{order.items.length - 1} more item{order.items.length > 2 ? "s" : ""}</p>
        )}
        <p className="text-sm font-bold mt-2" style={{ color: "#22C55E" }}>{formatINR(order.total)}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(order.createdAt)} · #{order.id?.slice(-6).toUpperCase()}</p>
      </div>
      <ChevronRight size={16} className="text-slate-600 mt-1 flex-shrink-0" />
    </motion.button>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function Orders() {
  const { currentUser, isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const unsub = onValue(ref(db, "orders"), snap => {
      setLoading(false);
      if (!snap.exists()) { setOrders([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .filter((o: any) => o.userId === currentUser.uid)
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      setOrders(list);
    });
    return () => unsub();
  }, [currentUser]);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === "active") list = list.filter(o => !["delivered", "cancelled", "returned"].includes(o.orderStatus));
    else if (filter === "delivered") list = list.filter(o => o.orderStatus === "delivered");
    else if (filter === "cancelled") list = list.filter(o => ["cancelled", "returned"].includes(o.orderStatus));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.items?.some((i: any) => i.name?.toLowerCase().includes(q)) ||
        o.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#f8fafc" }}>
        <Package size={48} className="text-slate-600" />
        <p className="text-gray-900 font-bold">Login to view orders</p>
        <button onClick={() => setLocation("/")} className="h-12 px-8 rounded-2xl font-bold text-sm"
          style={{ background: "#22C55E", color: "#000" }}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>

      {/* Header */}
      <div className="sticky top-0 z-50 border-b" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => window.history.back()}
            className="h-9 w-9 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(0,0,0,0.05)" }}>
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1">My Orders</h1>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by product or order ID..."
              className="w-full h-10 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none"
              style={{ background: "#f1f5f9", paddingLeft: 38, paddingRight: search ? 36 : 12, border: "1px solid #e2e8f0" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-slate-500" />
            </button>}
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="h-8 px-4 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all"
              style={filter === f.key
                ? { background: "#22C55E", color: "#000" }
                : { background: "#f1f5f9", color: "#64748B", border: "1px solid #e2e8f0" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#f1f5f9" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Package size={48} className="text-slate-700" />
            <p className="font-bold text-slate-500">{search ? "No orders found" : "No orders yet"}</p>
            {!search && <button onClick={() => setLocation("/")}
              className="h-10 px-6 rounded-xl text-sm font-bold" style={{ background: "#22C55E", color: "#000" }}>
              Shop Now
            </button>}
          </div>
        ) : filtered.map(order => (
          <OrderCard key={order.id} order={order} onClick={() => setSelected(order)} />
        ))}
      </div>

      {/* Order Detail */}
      <AnimatePresence>
        {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
