import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Package, Users, ShoppingCart, IndianRupee, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { Link } from "wouter";

function StatCard({ icon: Icon, label, value, color, bg, sub }: {
  icon: any; label: string; value: string; color: string; bg: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0`} style={{ background: bg }}>
        <Icon className="h-7 w-7" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const ORDER_STATUS_STYLE: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending:    { color: "#F59E0B", bg: "#FEF3C7", icon: Clock,        label: "Pending" },
  confirmed:  { color: "#3B82F6", bg: "#DBEAFE", icon: CheckCircle,  label: "Confirmed" },
  processing: { color: "#8B5CF6", bg: "#EDE9FE", icon: AlertCircle,  label: "Processing" },
  shipped:    { color: "#06B6D4", bg: "#CFFAFE", icon: TrendingUp,   label: "Shipped" },
  delivered:  { color: "#10B981", bg: "#D1FAE5", icon: CheckCircle,  label: "Delivered" },
  cancelled:  { color: "#EF4444", bg: "#FEE2E2", icon: XCircle,      label: "Cancelled" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, revenue: 0, pendingOrders: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onValue(ref(db, "products"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
        setStats(s => ({ ...s, products: list.length }));
        setRecentProducts(
          list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5)
        );
      } else {
        setStats(s => ({ ...s, products: 0 }));
        setRecentProducts([]);
      }
      setLoading(false);
    }));

    unsubs.push(onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
        const revenue = list.reduce((sum: number, o: any) => sum + (Number(o.finalAmount) || 0), 0);
        const pending = list.filter((o: any) => o.status === "pending" || !o.status).length;
        setStats(s => ({ ...s, orders: list.length, revenue, pendingOrders: pending }));
        setRecentOrders(
          list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6)
        );
      } else {
        setStats(s => ({ ...s, orders: 0, revenue: 0, pendingOrders: 0 }));
        setRecentOrders([]);
      }
    }));

    unsubs.push(onValue(ref(db, "users"), (snap) => {
      setStats(s => ({ ...s, customers: snap.exists() ? Object.keys(snap.val()).length : 0 }));
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back! Here's what's happening.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} label="Total Revenue"  value={formatINR(stats.revenue)}    color="#16a34a" bg="#dcfce7" sub="All time orders" />
        <StatCard icon={ShoppingCart} label="Total Orders"  value={String(stats.orders)}         color="#3B82F6" bg="#dbeafe" sub={stats.pendingOrders > 0 ? `${stats.pendingOrders} pending` : "All fulfilled"} />
        <StatCard icon={Package}      label="Products"      value={String(stats.products)}        color="#8B5CF6" bg="#ede9fe" sub="Active listings" />
        <StatCard icon={Users}        label="Customers"     value={String(stats.customers)}       color="#F59E0B" bg="#fef3c7" sub="Registered users" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Orders */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Orders</h2>
            <Link href="/admin/orders">
              <span className="text-xs font-semibold text-green-600 hover:underline cursor-pointer">View All →</span>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No orders yet</p>
              </div>
            ) : (
              recentOrders.map((order) => {
                const st = ORDER_STATUS_STYLE[order.status] || ORDER_STATUS_STYLE.pending;
                const Icon = st.icon;
                return (
                  <div key={order.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                      <Icon className="h-4 w-4" style={{ color: st.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {order.customerName || order.userName || "Customer"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {order.items?.length || 1} item{(order.items?.length || 1) !== 1 ? "s" : ""} · {order.phone || ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">{formatINR(order.finalAmount || order.totalAmount || 0)}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Pending Alert */}
          {stats.pendingOrders > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-800 text-sm">{stats.pendingOrders} Pending Order{stats.pendingOrders > 1 ? "s" : ""}</p>
                <p className="text-xs text-amber-600 mt-0.5">Need your attention</p>
              </div>
              <Link href="/admin/orders">
                <button className="text-xs font-bold text-amber-700 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors">
                  Review
                </button>
              </Link>
            </div>
          )}

          {/* Recent Products */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Recent Products</h2>
              <Link href="/admin/products">
                <span className="text-xs font-semibold text-green-600 hover:underline cursor-pointer">View All →</span>
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : recentProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Package className="h-9 w-9 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No products yet</p>
                </div>
              ) : (
                recentProducts.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                        : <Package className="h-5 w-5 text-slate-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-green-600 font-bold">{formatINR(p.discountPrice || p.price || 0)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      p.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {p.status || "active"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-sm font-bold text-slate-700 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Add Product", href: "/admin/products", color: "#16a34a", bg: "#dcfce7" },
                { label: "View Orders", href: "/admin/orders",   color: "#3B82F6", bg: "#dbeafe" },
                { label: "Add Banner",  href: "/admin/banners",  color: "#8B5CF6", bg: "#ede9fe" },
                { label: "Settings",    href: "/admin/settings", color: "#F59E0B", bg: "#fef3c7" },
              ].map(({ label, href, color, bg }) => (
                <Link key={href} href={href}>
                  <button className="w-full text-xs font-bold py-2.5 rounded-xl transition-colors"
                    style={{ background: bg, color }}>
                    {label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
