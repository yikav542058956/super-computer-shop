import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import {
  IndianRupee, ShoppingCart, TrendingUp, Package, Calendar, Loader2,
  Users, AlertCircle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

type DateFilter = "today" | "yesterday" | "week" | "month" | "custom" | "all";

function getRange(filter: DateFilter, from: string, to: string): [number, number] | null {
  const now = new Date();
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  if (filter === "today") return [sod(now), eod(now)];
  if (filter === "yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); return [sod(y), eod(y)]; }
  if (filter === "week") { const w = new Date(now); w.setDate(now.getDate() - 6); return [sod(w), eod(now)]; }
  if (filter === "month") { return [sod(new Date(now.getFullYear(), now.getMonth(), 1)), eod(now)]; }
  if (filter === "custom" && from && to) return [new Date(from).getTime(), eod(new Date(to))];
  return null;
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function groupByDay(items: any[], getTs: (x: any) => number, getValue: (x: any) => number, days: number, endMs?: number) {
  const end = endMs ?? Date.now();
  const result: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end - i * 86400000);
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const sod = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const eod = sod + 86400000 - 1;
    const value = items.filter(x => getTs(x) >= sod && getTs(x) <= eod).reduce((s, x) => s + getValue(x), 0);
    result.push({ date: label, value });
  }
  return result;
}

export default function AdminReports() {
  const [orders, setOrders] = useState<any[]>([]);
  const [localSales, setLocalSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const u1 = onValue(ref(db, "orders"), snap => {
      setOrders(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : []);
      setLoading(false);
    });
    const u2 = onValue(ref(db, "local_sales"), snap => {
      setLocalSales(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : []);
    });
    return () => { u1(); u2(); };
  }, []);

  const range = useMemo(() => getRange(dateFilter, customFrom, customTo), [dateFilter, customFrom, customTo]);

  const filteredOrders = useMemo(() => {
    if (!range) return orders;
    return orders.filter(o => { const ts = o.createdAt || 0; return ts >= range[0] && ts <= range[1]; });
  }, [orders, range]);

  const filteredSales = useMemo(() => {
    if (!range) return localSales;
    return localSales.filter(s => { const ts = s.createdAt || 0; return ts >= range[0] && ts <= range[1]; });
  }, [localSales, range]);

  const stats = useMemo(() => {
    const onlineRevenue = filteredOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.finalAmount || 0), 0);
    const offlineRevenue = filteredSales.reduce((s, x) => s + (x.totalSaleValue || 0), 0);
    const totalRevenue = onlineRevenue + offlineRevenue;
    const pendingOrders = filteredOrders.filter(o => ["pending", "payment_pending"].includes(o.orderStatus)).length;
    const totalDue = filteredSales.reduce((s, x) => s + Math.max(0, x.dueAmount || 0), 0);
    const avgOrderValue = filteredOrders.length > 0 ? (filteredOrders.reduce((s, o) => s + (o.finalAmount || 0), 0) / filteredOrders.length) : 0;
    return { onlineRevenue, offlineRevenue, totalRevenue, pendingOrders, totalDue, avgOrderValue };
  }, [filteredOrders, filteredSales]);

  // Chart data anchored correctly to the selected period
  const revenueChartData = useMemo(() => {
    let chartDays = 30;
    let endMs = Date.now();
    if (dateFilter === "today") { chartDays = 1; }
    else if (dateFilter === "yesterday") { chartDays = 1; endMs = Date.now() - 86400000; }
    else if (dateFilter === "week") { chartDays = 7; }
    else if (dateFilter === "month") { chartDays = 30; }
    else if (dateFilter === "custom" && customFrom && customTo) {
      const toMs = new Date(customTo).getTime() + 86400000 - 1;
      const fromMs = new Date(customFrom).getTime();
      chartDays = Math.max(1, Math.ceil((toMs - fromMs) / 86400000));
      endMs = toMs;
    }
    const orderData = groupByDay(filteredOrders.filter(o => o.paymentStatus === "paid"), o => o.createdAt, o => o.finalAmount || 0, chartDays, endMs);
    const salesData = groupByDay(filteredSales, s => s.createdAt, s => s.totalSaleValue || 0, chartDays, endMs);
    return orderData.map((d, i) => ({
      date: d.date,
      "Online Orders": d.value,
      "Local Sales": salesData[i]?.value || 0,
    }));
  }, [filteredOrders, filteredSales, dateFilter, customFrom, customTo]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const s = o.orderStatus || "pending";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <AdminLayout>
      {/* Header + Date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          {DATE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setDateFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === f.key ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {f.label}
            </button>
          ))}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 text-xs w-36 px-2" />
              <span className="text-slate-400 text-xs">→</span>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 text-xs w-36 px-2" />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(stats.totalRevenue)} sub="Online + local sales" color="bg-green-100 text-green-600" />
            <StatCard icon={ShoppingCart} label="Online Orders" value={filteredOrders.length} sub={`Revenue: ${formatINR(stats.onlineRevenue)}`} color="bg-blue-100 text-blue-600" />
            <StatCard icon={Package} label="Local Sales" value={filteredSales.length} sub={`Revenue: ${formatINR(stats.offlineRevenue)}`} color="bg-purple-100 text-purple-600" />
            <StatCard icon={TrendingUp} label="Avg Order Value" value={formatINR(stats.avgOrderValue)} sub="Online orders" color="bg-cyan-100 text-cyan-600" />
            <StatCard icon={AlertCircle} label="Pending Orders" value={stats.pendingOrders} sub="Need attention" color="bg-amber-100 text-amber-600" />
            <StatCard icon={Users} label="Outstanding Dues" value={formatINR(stats.totalDue)} sub="From local sales" color="bg-red-100 text-red-600" />
          </div>

          {/* Revenue Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base font-bold">Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLocal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <Tooltip formatter={(v: any) => formatINR(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="Online Orders" stroke="#3b82f6" fill="url(#colorOnline)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Local Sales" stroke="#8b5cf6" fill="url(#colorLocal)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Orders by Status */}
          {ordersByStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByStatus} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}
