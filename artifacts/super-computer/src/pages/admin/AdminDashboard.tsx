import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  Package, Users, ShoppingCart, IndianRupee, TrendingUp, Clock,
  CheckCircle, XCircle, AlertCircle, Calendar, AlertTriangle,
  Download, FileText,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { Link } from "wouter";
import jsPDF from "jspdf";

type Period = "today" | "week" | "month" | "year" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year",  label: "This Year" },
  { key: "all",   label: "All Time" },
];

function inPeriod(ts: number, period: Period): boolean {
  const now = new Date();
  const d = new Date(ts);
  if (period === "all") return true;
  if (period === "today") {
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (period === "week") {
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return d >= startOfWeek;
  }
  if (period === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (period === "year") {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

function StatCard({ icon: Icon, label, value, color, bg, sub }: {
  icon: any; label: string; value: string; color: string; bg: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg }}>
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

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function downloadLedgerEntryPDF(entry: any) {
  const doc = new jsPDF({ unit: "mm", format: "a6" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, W, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("SUPER COMPUTER", W / 2, 10, { align: "center" });
  doc.setFontSize(7);
  doc.text("Due Amount Reminder", W / 2, 15, { align: "center" });

  let y = 24;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Bill No: ${entry.billNo || "—"}`, 8, y);
  doc.text(`Date: ${new Date(entry.createdAt).toLocaleDateString("en-IN")}`, W - 8, y, { align: "right" });
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Customer: ${entry.customerName}`, 8, y); y += 5;
  doc.text(`Phone: ${entry.phone || "—"}`, 8, y); y += 5;
  if (entry.address) { doc.text(`Address: ${entry.address}`, 8, y); y += 5; }
  y += 2;

  doc.setFillColor(254, 242, 242);
  doc.rect(6, y, W - 12, 22, "F");
  doc.setTextColor(180, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("OUTSTANDING AMOUNT", W / 2, y + 6, { align: "center" });
  doc.setFontSize(16);
  doc.text(formatINR(entry.amount), W / 2, y + 15, { align: "center" });
  y += 26;

  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Product: ${entry.productName || "—"}`, 8, y); y += 5;
  doc.text(`Original Total: ${formatINR(entry.originalTotal)}`, 8, y); y += 5;
  doc.text(`Amount Paid: ${formatINR(entry.amountPaid || 0)}`, 8, y); y += 5;
  if (entry.dueDate) {
    doc.text(`Due Date: ${new Date(entry.dueDate).toLocaleDateString("en-IN")}`, 8, y); y += 5;
  }
  y += 4;

  doc.setFillColor(245, 243, 255);
  doc.rect(0, doc.internal.pageSize.getHeight() - 14, W, 14, "F");
  doc.setTextColor(124, 58, 237);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Please clear the due amount at Super Computer store. Thank you!", W / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });

  doc.save(`Due_${entry.customerName.replace(/\s+/g, "_")}_${entry.billNo || "bill"}.pdf`);
}

function downloadAllDuesPDF(entries: any[]) {
  if (!entries.length) return;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 10;

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SUPER COMPUTER — Due Amounts Report", W / 2, 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · Total Entries: ${entries.length}`, W / 2, 19, { align: "center" });
  y = 28;

  // Table header
  doc.setFillColor(80, 50, 180);
  doc.rect(6, y, W - 12, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Customer", 10, y + 5);
  doc.text("Phone", W * 0.35, y + 5);
  doc.text("Bill No", W * 0.55, y + 5);
  doc.text("Due Amount", W * 0.72, y + 5);
  doc.text("Due Date", W - 10, y + 5, { align: "right" });
  y += 10;

  let totalDue = 0;
  entries.forEach((e, i) => {
    if (i % 2 === 0) { doc.setFillColor(250, 248, 255); doc.rect(6, y - 2, W - 12, 8, "F"); }
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text((e.customerName || "").slice(0, 22), 10, y + 3);
    doc.text(e.phone || "—", W * 0.35, y + 3);
    doc.text(e.billNo || "—", W * 0.55, y + 3);

    const days = daysUntil(e.dueDate);
    if (days !== null && days < 0) doc.setTextColor(200, 50, 50);
    else if (days !== null && days <= 3) doc.setTextColor(220, 100, 0);
    else doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text(formatINR(e.amount), W * 0.72, y + 3);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(e.dueDate ? new Date(e.dueDate).toLocaleDateString("en-IN") : "—", W - 10, y + 3, { align: "right" });
    totalDue += Number(e.amount) || 0;
    y += 8;

    if (y > 270) { doc.addPage(); y = 10; }
  });

  y += 4;
  doc.setFillColor(124, 58, 237);
  doc.rect(6, y, W - 12, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL DUE AMOUNT", W * 0.5, y + 5);
  doc.text(formatINR(totalDue), W - 10, y + 5, { align: "right" });

  doc.save(`SuperComputer_DueReport_${new Date().toISOString().split("T")[0]}.pdf`);
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("all");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onValue(ref(db, "products"), (snap) => {
      if (snap.exists()) {
        setAllProducts(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
      } else setAllProducts([]);
      setLoading(false);
    }));

    unsubs.push(onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) {
        setAllOrders(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
      } else setAllOrders([]);
    }));

    unsubs.push(onValue(ref(db, "users"), (snap) => {
      setCustomerCount(snap.exists() ? Object.keys(snap.val()).length : 0);
    }));

    unsubs.push(onValue(ref(db, "ledger"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, v]: any) => ({ id, ...v }))
          .filter((e: any) => e.status !== "cleared")
          .sort((a: any, b: any) => {
            // Sort: overdue first, then upcoming, then no date
            const da = daysUntil(a.dueDate);
            const db2 = daysUntil(b.dueDate);
            if (da === null && db2 === null) return b.createdAt - a.createdAt;
            if (da === null) return 1;
            if (db2 === null) return -1;
            return da - db2;
          });
        setLedgerEntries(list);
      } else setLedgerEntries([]);
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  const filteredOrders = useMemo(() =>
    allOrders.filter(o => inPeriod(o.createdAt || 0, period)),
    [allOrders, period]
  );

  const stats = useMemo(() => {
    const revenue = filteredOrders
      .filter(o => o.paymentStatus === "paid")
      .reduce((s, o) => s + (Number(o.finalAmount) || 0), 0);
    const pending = filteredOrders.filter(o => ["pending", "payment_pending"].includes(o.orderStatus)).length;
    return { orders: filteredOrders.length, revenue, pending };
  }, [filteredOrders]);

  const recentOrders = useMemo(() =>
    [...filteredOrders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6),
    [filteredOrders]
  );

  const recentProducts = useMemo(() =>
    [...allProducts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5),
    [allProducts]
  );

  const totalDue = useMemo(() =>
    ledgerEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [ledgerEntries]
  );

  const overdueCount = useMemo(() =>
    ledgerEntries.filter(e => { const d = daysUntil(e.dueDate); return d !== null && d < 0; }).length,
    [ledgerEntries]
  );

  const dueSoonCount = useMemo(() =>
    ledgerEntries.filter(e => { const d = daysUntil(e.dueDate); return d !== null && d >= 0 && d <= 3; }).length,
    [ledgerEntries]
  );

  const periodLabel = PERIODS.find(p => p.key === period)?.label || "All Time";

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
          <Calendar className="h-4 w-4 text-slate-400 ml-1.5 shrink-0" />
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === p.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} label={`Revenue (${periodLabel})`}  value={formatINR(stats.revenue)}     color="#16a34a" bg="#dcfce7" sub="Paid orders only" />
        <StatCard icon={ShoppingCart} label={`Orders (${periodLabel})`}  value={String(stats.orders)}          color="#3B82F6" bg="#dbeafe" sub={stats.pending > 0 ? `${stats.pending} pending` : "All fulfilled"} />
        <StatCard icon={Package}      label="Total Products"              value={String(allProducts.length)}    color="#8B5CF6" bg="#ede9fe" sub="Active listings" />
        <StatCard icon={Users}        label="Customers"                   value={String(customerCount)}         color="#F59E0B" bg="#fef3c7" sub="Registered users" />
      </div>

      {/* Due Amounts Alert Bar */}
      {ledgerEntries.length > 0 && (
        <div className={`mb-5 rounded-2xl p-4 flex items-center gap-4 ${
          overdueCount > 0 ? "bg-red-50 border-2 border-red-200" : dueSoonCount > 0 ? "bg-amber-50 border-2 border-amber-200" : "bg-orange-50 border border-orange-200"
        }`}>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
            overdueCount > 0 ? "bg-red-100" : "bg-amber-100"
          }`}>
            <AlertTriangle className={`h-6 w-6 ${overdueCount > 0 ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
              {overdueCount > 0
                ? `${overdueCount} Overdue Payment${overdueCount > 1 ? "s" : ""}!`
                : dueSoonCount > 0
                ? `${dueSoonCount} Payment${dueSoonCount > 1 ? "s" : ""} Due in 3 Days`
                : `${ledgerEntries.length} Pending Due Amount${ledgerEntries.length > 1 ? "s" : ""}`
              }
            </p>
            <p className={`text-xs mt-0.5 ${overdueCount > 0 ? "text-red-600" : "text-amber-600"}`}>
              Total Pending: {formatINR(totalDue)} · {ledgerEntries.length} customer{ledgerEntries.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => downloadAllDuesPDF(ledgerEntries)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              overdueCount > 0
                ? "bg-red-200 text-red-800 hover:bg-red-300"
                : "bg-amber-200 text-amber-800 hover:bg-amber-300"
            }`}
          >
            <Download className="h-3.5 w-3.5" /> All PDF
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Orders */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">
                Recent Orders
                <span className="ml-2 text-xs font-normal text-slate-400">({periodLabel})</span>
              </h2>
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
                  <p className="text-sm font-medium">No orders for {periodLabel.toLowerCase()}</p>
                </div>
              ) : (
                recentOrders.map((order) => {
                  const statusKey = order.orderStatus || order.status || "pending";
                  const st = ORDER_STATUS_STYLE[statusKey] || ORDER_STATUS_STYLE.pending;
                  const Icon = st.icon;
                  return (
                    <div key={order.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                        <Icon className="h-4 w-4" style={{ color: st.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {order.address?.name || order.customerName || order.userName || "Customer"}
                          </p>
                          {order.source === "offline" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 shrink-0">🏪 Offline</span>
                          )}
                          {order.dueAmount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">⚠ Due</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{timeAgo(order.createdAt)}</p>
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

          {/* Due Amounts Ledger */}
          {ledgerEntries.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900">Due Amounts (Ledger)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Total: {formatINR(totalDue)} · {ledgerEntries.length} pending</p>
                </div>
                <button
                  onClick={() => downloadAllDuesPDF(ledgerEntries)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> All PDF
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {ledgerEntries.slice(0, 8).map((entry) => {
                  const days = daysUntil(entry.dueDate);
                  const isOverdue = days !== null && days < 0;
                  const isDueSoon = days !== null && days >= 0 && days <= 3;
                  return (
                    <div key={entry.id} className={`px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${isOverdue ? "bg-red-50/50" : isDueSoon ? "bg-amber-50/50" : ""}`}>
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isOverdue ? "bg-red-100" : isDueSoon ? "bg-amber-100" : "bg-orange-100"
                      }`}>
                        <FileText className={`h-4 w-4 ${isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-orange-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{entry.customerName}</p>
                        <p className="text-xs text-slate-400">
                          {entry.phone && `${entry.phone} · `}
                          {entry.billNo && `Bill: ${entry.billNo}`}
                          {entry.dueDate && (
                            <span className={`ml-1 font-semibold ${
                              isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-500"
                            }`}>
                              {isOverdue
                                ? `⚠ Overdue by ${Math.abs(days!)} day${Math.abs(days!) > 1 ? "s" : ""}`
                                : days === 0
                                ? "⚠ Due today!"
                                : `Due in ${days ?? "?"} day${(days ?? 0) > 1 ? "s" : ""} (${new Date(entry.dueDate).toLocaleDateString("en-IN")})`
                              }
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-black ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                            {formatINR(entry.amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadLedgerEntryPDF(entry)}
                          className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-purple-100 flex items-center justify-center text-slate-400 hover:text-purple-600 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {ledgerEntries.length > 8 && (
                  <div className="px-5 py-3 text-xs text-slate-400 text-center">
                    +{ledgerEntries.length - 8} more entries · {formatINR(totalDue)} total due
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Pending Alert */}
          {stats.pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-800 text-sm">{stats.pending} Pending Order{stats.pending > 1 ? "s" : ""}</p>
                <p className="text-xs text-amber-600 mt-0.5">{periodLabel} · Need attention</p>
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
                { label: "Add Product",    href: "/admin/products",      color: "#16a34a", bg: "#dcfce7" },
                { label: "Offline Sale",   href: "/admin/offline-sale",  color: "#EA580C", bg: "#FFF7ED" },
                { label: "View Orders",    href: "/admin/orders",        color: "#3B82F6", bg: "#dbeafe" },
                { label: "Settings",       href: "/admin/settings",      color: "#F59E0B", bg: "#fef3c7" },
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
