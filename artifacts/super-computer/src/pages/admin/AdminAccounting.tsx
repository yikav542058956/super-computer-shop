import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Plus, TrendingUp, TrendingDown,
  IndianRupee, Loader2, ChevronRight, AlertCircle, BookOpen,
  ShoppingBag, Calendar, Package, CheckCircle, Clock, X, Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Date filter helpers ─── */
type DateFilter = "all" | "today" | "yesterday" | "custom";

function getDateRange(filter: DateFilter, customFrom: string, customTo: string): [number, number] | null {
  const now = new Date();
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  if (filter === "today") return [sod(now), eod(now)];
  if (filter === "yesterday") {
    const y = new Date(now); y.setDate(now.getDate() - 1);
    return [sod(y), eod(y)];
  }
  if (filter === "custom" && customFrom && customTo) return [new Date(customFrom).getTime(), eod(new Date(customTo))];
  return null;
}

function inRange(ts: number, range: [number, number] | null): boolean {
  if (!range) return true;
  return ts >= range[0] && ts <= range[1];
}

/* ─── Normalize offline order ─── */
function normalizeOfflineOrder(order: any) {
  const n = (v: any, fallback = 0): number => { const x = Number(v); return isFinite(x) ? x : fallback; };
  const parseDue = (v: any): number | null => {
    if (v == null) return null;
    const num = Number(v);
    if (isFinite(num) && num > 1_000_000_000) return num;
    const d = new Date(v); return isNaN(d.getTime()) ? null : d.getTime();
  };
  if (order.customer) {
    const total = n(order.grandTotal ?? order.finalAmount);
    const paid = order.amountPaid != null ? n(order.amountPaid) : order.paymentStatus === "paid" ? total : 0;
    const due = Math.max(0, n(order.dueAmount ?? (total - paid)));
    return {
      id: order.id, _fromOrder: true,
      clientName: String(order.customer?.name ?? "Unknown"),
      clientPhone: String(order.customer?.phone ?? ""),
      productName: String(order.item?.name ?? ""),
      productBrand: String(order.item?.brand ?? ""),
      qty: Math.max(1, n(order.item?.qty, 1)),
      totalSaleValue: total, amountPaid: paid, dueAmount: due,
      dueDate: parseDue(order.dueDate), notes: String(order.notes ?? ""),
      createdAt: n(order.createdAt, Date.now()),
    };
  }
  const items: any[] = Array.isArray(order.items) ? order.items : Object.values(order.items ?? {});
  const first = items[0] ?? {};
  const total = n(order.finalAmount ?? order.grandTotal);
  const hasBeenUpdated = order.updatedAt != null && order.updatedAt !== order.createdAt;
  const paid = hasBeenUpdated && order.amountPaid != null ? n(order.amountPaid) : order.paidAmount != null ? n(order.paidAmount) : order.amountPaid != null ? n(order.amountPaid) : order.paymentStatus === "refunded" ? 0 : total - n(order.refundAmount);
  const due = order.dueAmount != null ? Math.max(0, n(order.dueAmount)) : Math.max(0, total - paid);
  return {
    id: order.id, _fromOrder: true,
    clientName: String(order.address?.name ?? "Unknown"),
    clientPhone: String(order.address?.phone ?? ""),
    productName: String(first.name ?? ""),
    productBrand: String(first.brand ?? ""),
    qty: Math.max(1, n(first.qty, 1)),
    totalSaleValue: total, amountPaid: paid, dueAmount: due,
    dueDate: parseDue(order.dueDate), notes: String(order.notes ?? ""),
    createdAt: n(order.createdAt, Date.now()),
  };
}

/* ─── Client account (grouped view) ─── */
interface ClientAccount {
  key: string; // normalized name+phone
  name: string;
  phone: string;
  sales: any[];       // all sales (local + offline order)
  payments: any[];    // manual payment entries from ledger
  totalSaleValue: number;
  totalPaid: number;
  totalDue: number;
}

function buildClientKey(name: string, phone: string): string {
  return `${name.toLowerCase().trim()}|${phone.trim()}`;
}

/* ─── Stat card ─── */
function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

/* ─── Date filter bar ─── */
function DateFilterBar({
  filter, setFilter, customFrom, setCustomFrom, customTo, setCustomTo,
}: {
  filter: DateFilter; setFilter: (f: DateFilter) => void;
  customFrom: string; setCustomFrom: (v: string) => void;
  customTo: string; setCustomTo: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center mb-4">
      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      {(["all", "today", "yesterday", "custom"] as DateFilter[]).map(f => (
        <button key={f} onClick={() => setFilter(f)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {f === "all" ? "All Time" : f === "today" ? "Today" : f === "yesterday" ? "Yesterday" : "Custom Date"}
        </button>
      ))}
      {filter === "custom" && (
        <>
          <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 text-xs w-36 px-2" />
          <span className="text-slate-400 text-xs">→</span>
          <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 text-xs w-36 px-2" />
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function AdminAccounting() {
  /* ── Data ── */
  const [localSalesRaw, setLocalSalesRaw] = useState<any[]>([]);
  const [ordersRaw, setOrdersRaw] = useState<any[]>([]);
  const [ledgerRaw, setLedgerRaw] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  /* ── Filters ── */
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");

  /* ── UI state ── */
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null);
  const [payDialog, setPayDialog] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [showKhata, setShowKhata] = useState(false);

  /* ── Load on mount ── */
  useEffect(() => {
    setLoading(true);
    const u1 = onValue(ref(db, "local_sales"), snap => {
      setLocalSalesRaw(snap.exists()
        ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }))
        : []);
      setLoading(false);
    });
    const u2 = onValue(ref(db, "orders"), snap => {
      setOrdersRaw(snap.exists()
        ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }))
        : []);
    });
    const u3 = onValue(ref(db, "ledger_payments"), snap => {
      setLedgerRaw(snap.exists() ? snap.val() : {});
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  /* ── Merge all sales ── */
  const allSales = useMemo(() => {
    const offlineOrders = ordersRaw
      .filter(o => o.source === "offline")
      .map(normalizeOfflineOrder);
    const localIds = new Set(localSalesRaw.map(s => s.id));
    const uniqueOffline = offlineOrders.filter(o => !localIds.has(o.id));
    return [...localSalesRaw, ...uniqueOffline].sort((a, b) => b.createdAt - a.createdAt);
  }, [localSalesRaw, ordersRaw]);

  /* ── Apply date filter ── */
  const range = useMemo(() => getDateRange(dateFilter, customFrom, customTo), [dateFilter, customFrom, customTo]);

  const filteredSales = useMemo(() => {
    return allSales.filter(s => inRange(s.createdAt || 0, range));
  }, [allSales, range]);

  /* ── Build client accounts from filtered sales ── */
  const clientAccounts = useMemo(() => {
    const map = new Map<string, ClientAccount>();

    // Group filtered sales by client
    filteredSales.forEach(sale => {
      const key = buildClientKey(sale.clientName || "Unknown", sale.clientPhone || "");
      if (!map.has(key)) {
        map.set(key, {
          key, name: sale.clientName || "Unknown", phone: sale.clientPhone || "",
          sales: [], payments: [], totalSaleValue: 0, totalPaid: 0, totalDue: 0,
        });
      }
      const acc = map.get(key)!;
      acc.sales.push(sale);
      acc.totalSaleValue += sale.totalSaleValue || 0;
      acc.totalPaid += sale.amountPaid || 0;
      acc.totalDue += Math.max(0, sale.dueAmount || 0);
    });

    // Attach manual payment entries
    Object.entries(ledgerRaw).forEach(([key, entries]: any) => {
      if (map.has(key)) {
        const acc = map.get(key)!;
        const payEntries = Object.entries(entries).map(([id, v]: any) => ({ id, ...v }));
        acc.payments = payEntries.sort((a: any, b: any) => b.createdAt - a.createdAt);
        // Subtract manual payments from due
        const extraReceived = payEntries.filter((e: any) => e.type !== "refund").reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const extraRefunded = payEntries.filter((e: any) => e.type === "refund").reduce((s: number, e: any) => s + (e.amount || 0), 0);
        acc.totalPaid += extraReceived;
        acc.totalDue = Math.max(0, acc.totalDue - extraReceived) + extraRefunded;
      }
    });

    let accounts = Array.from(map.values());

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      accounts = accounts.filter(a =>
        a.name.toLowerCase().includes(q) || a.phone.includes(q)
      );
    }

    // Sort: dues first (largest first), then alphabetically
    accounts.sort((a, b) => {
      if (a.totalDue > 0 && b.totalDue === 0) return -1;
      if (a.totalDue === 0 && b.totalDue > 0) return 1;
      if (a.totalDue !== b.totalDue) return b.totalDue - a.totalDue;
      return a.name.localeCompare(b.name);
    });

    return accounts;
  }, [filteredSales, ledgerRaw, search]);

  /* ── Summary stats (all time, not date-filtered) ── */
  const totalDueAll = useMemo(() => allSales.reduce((s, x) => s + Math.max(0, x.dueAmount || 0), 0), [allSales]);
  const customersWithDue = useMemo(() => {
    const seen = new Set<string>();
    allSales.filter(s => (s.dueAmount || 0) > 0).forEach(s => seen.add(buildClientKey(s.clientName || "", s.clientPhone || "")));
    return seen.size;
  }, [allSales]);
  const totalRevenue = useMemo(() => allSales.reduce((s, x) => s + (x.totalSaleValue || 0), 0), [allSales]);

  /* ── Record payment in individual sale ── */
  const recordSalePayment = async (saleId: string, isFromOrder: boolean, currentDue: number, currentPaid: number) => {
    const payment = Math.min(Number(payAmount), currentDue);
    if (!payment || payment <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      const path = isFromOrder ? `orders/${saleId}` : `local_sales/${saleId}`;
      const newPaid = currentPaid + payment;
      const newDue = Math.max(0, currentDue - payment);
      await update(ref(db, path), {
        amountPaid: newPaid, paidAmount: newPaid,
        dueAmount: newDue, paymentStatus: newDue === 0 ? "paid" : "partial",
        updatedAt: Date.now(),
      });
      toast.success(`Payment of ${formatINR(payment)} recorded!`);
      setPayDialog(false); setPayAmount(""); setPayNote("");
      // Refresh selected account
      setSelectedAccount(null);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally { setPaying(false); }
  };

  /* ── Record a manual payment against the whole client account ── */
  const recordAccountPayment = async () => {
    if (!selectedAccount) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      // Find the sale with the largest due and reduce it
      const salesWithDue = [...selectedAccount.sales]
        .filter(s => (s.dueAmount || 0) > 0)
        .sort((a, b) => (b.dueAmount || 0) - (a.dueAmount || 0));

      let remaining = amount;
      for (const sale of salesWithDue) {
        if (remaining <= 0) break;
        const apply = Math.min(remaining, sale.dueAmount || 0);
        const newPaid = (sale.amountPaid || 0) + apply;
        const newDue = Math.max(0, (sale.dueAmount || 0) - apply);
        const path = sale._fromOrder ? `orders/${sale.id}` : `local_sales/${sale.id}`;
        await update(ref(db, path), {
          amountPaid: newPaid, paidAmount: newPaid,
          dueAmount: newDue, paymentStatus: newDue === 0 ? "paid" : "partial",
          updatedAt: Date.now(),
        });
        remaining -= apply;
      }

      // Also save a payment entry for history
      const entryRef = push(ref(db, `ledger_payments/${selectedAccount.key}`));
      await set(entryRef, {
        amount, note: payNote.trim() || "Payment received",
        createdAt: Date.now(), date: Date.now(),
      });

      toast.success(`${formatINR(amount)} payment recorded for ${selectedAccount.name}!`);
      setPayDialog(false); setPayAmount(""); setPayNote("");
      setSelectedAccount(null);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally { setPaying(false); }
  };

  /* ── Record admin refund to customer ── */
  const recordAdminRefund = async () => {
    if (!selectedAccount) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setRefunding(true);
    try {
      const entryRef = push(ref(db, `ledger_payments/${selectedAccount.key}`));
      await set(entryRef, {
        amount, note: refundNote.trim() || "Refund to customer",
        type: "refund",
        createdAt: Date.now(), date: Date.now(),
      });
      toast.success(`Refund of ${formatINR(amount)} recorded for ${selectedAccount.name}!`);
      setRefundDialog(false); setRefundAmount(""); setRefundNote("");
      setSelectedAccount(null);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally { setRefunding(false); }
  };

  /* ── Delete a manual payment/refund entry from the ledger ── */
  const deletePaymentEntry = async (entryId: string) => {
    if (!selectedAccount) return;
    if (!window.confirm("Delete this ledger entry? This cannot be undone.")) return;
    try {
      await remove(ref(db, `ledger_payments/${selectedAccount.key}/${entryId}`));
      toast.success("Ledger entry deleted");
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  /* ── Delete a sale entry (local sale or offline order) ── */
  const deleteSaleEntry = async (sale: any) => {
    if (!window.confirm(`Delete this sale (${sale.productName || "Product"} - ${formatINR(sale.totalSaleValue)})? This cannot be undone.`)) return;
    try {
      const path = sale._fromOrder ? `orders/${sale.id}` : `local_sales/${sale.id}`;
      await remove(ref(db, path));
      toast.success("Sale entry deleted");
      setSelectedAccount(null);
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  /* ── Delete entire client's ledger (all manual payment/refund entries) ── */
  const deleteClientLedger = async () => {
    if (!selectedAccount) return;
    if (!window.confirm(`Delete ALL ledger entries for ${selectedAccount.name}? Sales themselves will not be removed. This cannot be undone.`)) return;
    try {
      await remove(ref(db, `ledger_payments/${selectedAccount.key}`));
      toast.success("Client ledger cleared");
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  /* ── Auto-open client from URL params ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientName = params.get("client");
    const clientPhone = params.get("phone");
    if (clientName && clientAccounts.length > 0) {
      // Try to match by key (name+phone) first for precision, fall back to name-only
      let acc: typeof clientAccounts[0] | undefined;
      if (clientPhone) {
        const key = buildClientKey(clientName, clientPhone);
        acc = clientAccounts.find(a => a.key === key);
      }
      if (!acc) acc = clientAccounts.find(a => a.name.toLowerCase() === clientName.toLowerCase());
      if (acc) { setSelectedAccount(acc); window.history.replaceState({}, "", window.location.pathname); }
    }
  }, [clientAccounts]);

  /* ── Selected account's full sale history (all time, not filtered) ── */
  const selectedFullSales = useMemo(() => {
    if (!selectedAccount) return [];
    return allSales
      .filter(s => buildClientKey(s.clientName || "", s.clientPhone || "") === selectedAccount.key)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedAccount, allSales]);

  const selectedPayments = useMemo(() => {
    if (!selectedAccount) return [];
    const entries = ledgerRaw[selectedAccount.key] || {};
    return Object.entries(entries)
      .map(([id, v]: any) => ({ id, ...v }))
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
  }, [selectedAccount, ledgerRaw]);

  const selectedManualReceived = useMemo(() =>
    selectedPayments.filter((e: any) => e.type !== "refund").reduce((s: number, e: any) => s + (e.amount || 0), 0),
    [selectedPayments]
  );
  const selectedAdminRefunded = useMemo(() =>
    selectedPayments.filter((e: any) => e.type === "refund").reduce((s: number, e: any) => s + (e.amount || 0), 0),
    [selectedPayments]
  );
  const selectedTotalDue = useMemo(() => {
    const salesDue = selectedFullSales.reduce((s, x) => s + Math.max(0, x.dueAmount || 0), 0);
    return Math.max(0, salesDue - selectedManualReceived) + selectedAdminRefunded;
  }, [selectedFullSales, selectedManualReceived, selectedAdminRefunded]);
  const selectedTotalPaid = useMemo(() => {
    const salePaid = selectedFullSales.reduce((s, x) => s + (x.amountPaid || 0), 0);
    return salePaid + selectedManualReceived;
  }, [selectedFullSales, selectedManualReceived]);
  const selectedTotalValue = useMemo(() => selectedFullSales.reduce((s, x) => s + (x.totalSaleValue || 0), 0), [selectedFullSales]);

  /* ── Khata book unified timeline ── */
  const khataEntries = useMemo(() => {
    const entries: { date: number; desc: string; dr: number; cr: number; type: string }[] = [];
    selectedFullSales.forEach(sale => {
      entries.push({ date: sale.createdAt, desc: `Sold: ${sale.productName || "Product"}`, dr: sale.totalSaleValue || 0, cr: 0, type: "sale" });
      if ((sale.amountPaid || 0) > 0) {
        entries.push({ date: sale.createdAt + 1, desc: `Advance (${sale.productName || "Product"})`, dr: 0, cr: sale.amountPaid || 0, type: "initial" });
      }
    });
    selectedPayments.forEach((p: any) => {
      if (p.type === "refund") {
        entries.push({ date: p.date || p.createdAt, desc: p.note || "Refund to customer", dr: p.amount || 0, cr: 0, type: "refund" });
      } else {
        entries.push({ date: p.date || p.createdAt, desc: p.note || "Payment received", dr: 0, cr: p.amount || 0, type: "payment" });
      }
    });
    entries.sort((a, b) => a.date - b.date);
    let bal = 0;
    return entries.map(e => { bal += e.dr - e.cr; return { ...e, balance: bal }; });
  }, [selectedFullSales, selectedPayments]);

  return (
    <AdminLayout>
      {/* ── Summary Stats (all-time) ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon={AlertCircle} label="Total Outstanding" value={formatINR(totalDueAll)} color="bg-red-100 text-red-600" />
        <StatCard icon={BookOpen} label="Customers with Due" value={customersWithDue} color="bg-amber-100 text-amber-600" />
        <StatCard icon={ShoppingBag} label="Total Revenue" value={formatINR(totalRevenue)} color="bg-blue-100 text-blue-600" />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Ledger</h1>
      </div>

      {/* ── Date Filter ── */}
      <DateFilterBar
        filter={dateFilter} setFilter={setDateFilter}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
      />

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search by client name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* ── Results info ── */}
      {dateFilter !== "all" && (
        <p className="text-xs text-slate-500 mb-3">
          Showing {clientAccounts.length} client{clientAccounts.length !== 1 ? "s" : ""} with transactions in selected period
        </p>
      )}

      {/* ── Client List ── */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
      ) : clientAccounts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed">
          <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No client accounts found</p>
          <p className="text-slate-400 text-sm mt-1">
            {dateFilter !== "all" ? "No transactions in the selected period" : "Record a sale to create a client account"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientAccounts.map(acc => (
            <div key={acc.key}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all
                ${acc.totalDue > 0 ? "border-l-4 border-l-red-400" : "border-l-4 border-l-green-400"}`}
              onClick={() => setSelectedAccount(acc)}
            >
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm flex-shrink-0">
                {acc.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{acc.name}</p>
                <p className="text-xs text-slate-500">
                  {acc.phone && `📞 ${acc.phone} · `}
                  {acc.sales.length} sale{acc.sales.length !== 1 ? "s" : ""} · {formatINR(acc.totalSaleValue)} total
                </p>
                {acc.totalDue > 0 && (
                  <p className="text-xs text-red-500 font-semibold mt-0.5">⚠ Balance Due: {formatINR(acc.totalDue)}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {acc.totalDue > 0 ? (
                  <div>
                    <p className="text-xs text-red-500 font-semibold">Outstanding</p>
                    <p className="font-black text-red-600">{formatINR(acc.totalDue)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-green-500 font-semibold">Settled ✓</p>
                    <p className="font-black text-green-600">₹0 Due</p>
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* ══════════ CUSTOMER LEDGER DIALOG ══════════ */}
      <Dialog open={!!selectedAccount} onOpenChange={o => !o && setSelectedAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                {selectedAccount?.name.charAt(0).toUpperCase()}
              </div>
              {selectedAccount?.name} — Ledger
              {selectedAccount?.phone && <span className="text-sm font-normal text-slate-500">({selectedAccount.phone})</span>}
            </DialogTitle>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-5">
              {/* ── Summary ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 font-semibold">Total Sale</p>
                  <p className="font-black text-blue-700 text-lg">{formatINR(selectedTotalValue)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-500 font-semibold">Total Paid</p>
                  <p className="font-black text-green-700 text-lg">{formatINR(selectedTotalPaid)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${selectedTotalDue > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <p className={`text-xs font-semibold ${selectedTotalDue > 0 ? "text-red-500" : "text-green-500"}`}>
                    {selectedTotalDue > 0 ? "Balance Due" : "Fully Settled"}
                  </p>
                  <p className={`font-black text-lg ${selectedTotalDue > 0 ? "text-red-700" : "text-green-700"}`}>
                    {selectedTotalDue > 0 ? formatINR(selectedTotalDue) : "✓"}
                  </p>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex gap-2">
                {selectedTotalDue > 0 && (
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => { setPayAmount(""); setPayNote(""); setPayDialog(true); }}
                  >
                    <IndianRupee className="h-4 w-4" /> Record Payment
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => { setRefundAmount(""); setRefundNote(""); setRefundDialog(true); }}
                >
                  <TrendingDown className="h-4 w-4" /> Refund to Customer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 text-xs ${showKhata ? "bg-slate-100" : ""}`}
                  onClick={() => setShowKhata(v => !v)}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Khata Book
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={deleteClientLedger}
                  title="Delete all manual payment/refund entries for this client"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Ledger
                </Button>
              </div>

              {/* ── Purchase History ── */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Purchase History
                </p>
                {selectedFullSales.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No purchases found.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedFullSales.map(sale => {
                      const dueTs = sale.dueDate ? Number(sale.dueDate) : null;
                      const isOverdue = dueTs && dueTs < Date.now();
                      return (
                        <div key={sale.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border ${(sale.dueAmount || 0) > 0 ? "bg-orange-50/60 border-orange-100" : "bg-green-50/60 border-green-100"}`}
                        >
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${(sale.dueAmount || 0) > 0 ? "bg-orange-100" : "bg-green-100"}`}>
                            <ShoppingBag className={`h-4 w-4 ${(sale.dueAmount || 0) > 0 ? "text-orange-600" : "text-green-600"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800 truncate">{sale.productName || "Product"}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              {sale.qty > 1 && ` · Qty: ${sale.qty}`}
                            </p>
                            {dueTs && (sale.dueAmount || 0) > 0 && (
                              <p className={`text-xs mt-0.5 flex items-center gap-1 font-semibold ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                                <Clock className="h-3 w-3" />
                                Due by: {new Date(dueTs).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                {isOverdue && " ⚠ Overdue!"}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-800">{formatINR(sale.totalSaleValue)}</p>
                            <p className="text-xs text-green-700">Paid: {formatINR(sale.amountPaid || 0)}</p>
                            {(sale.dueAmount || 0) > 0 && (
                              <p className="text-xs font-bold text-red-600">Due: {formatINR(sale.dueAmount)}</p>
                            )}
                            {(sale.dueAmount || 0) === 0 && (
                              <p className="text-xs font-bold text-green-600">✓ Paid</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteSaleEntry(sale)}
                            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete this sale"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Khata Book Timeline ── */}
              {showKhata && khataEntries.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> Khata Book (Full Ledger)
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Date</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Vivaran</th>
                          <th className="text-right px-3 py-2 text-red-500 font-semibold">Udhar (दिया)</th>
                          <th className="text-right px-3 py-2 text-green-600 font-semibold">Jama (मिला)</th>
                          <th className="text-right px-3 py-2 text-slate-600 font-semibold">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {khataEntries.map((e, i) => (
                          <tr key={i} className={e.type === "refund" ? "bg-blue-50" : e.type === "sale" ? "bg-orange-50/40" : "bg-green-50/40"}>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                              {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </td>
                            <td className="px-3 py-2 text-slate-700 max-w-[140px] truncate">{e.desc}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-600">{e.dr > 0 ? formatINR(e.dr) : "—"}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-700">{e.cr > 0 ? formatINR(e.cr) : "—"}</td>
                            <td className={`px-3 py-2 text-right font-black ${e.balance > 0 ? "text-red-600" : e.balance < 0 ? "text-blue-700" : "text-green-700"}`}>
                              {e.balance > 0 ? formatINR(e.balance) : e.balance < 0 ? `-${formatINR(Math.abs(e.balance))}` : "✓ 0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 px-1">
                    🔴 Udhar = we gave / sold · 🟢 Jama = they paid us · 🔵 Blue = refund we gave back
                  </p>
                </div>
              )}

              {/* ── Payment History ── */}
              {selectedPayments.length > 0 && !showKhata && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5" /> Payment / Refund History
                  </p>
                  <div className="space-y-2">
                    {selectedPayments.map((entry: any) => {
                      const isRefund = entry.type === "refund";
                      return (
                        <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isRefund ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"}`}>
                          <TrendingDown className={`h-4 w-4 shrink-0 ${isRefund ? "text-blue-600 rotate-180" : "text-green-600"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${isRefund ? "text-blue-800" : "text-green-800"}`}>{entry.note || (isRefund ? "Refund to customer" : "Payment received")}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(entry.date || entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              {isRefund && <span className="ml-2 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">Refund</span>}
                            </p>
                          </div>
                          <p className={`font-black shrink-0 ${isRefund ? "text-blue-700" : "text-green-700"}`}>{formatINR(entry.amount)}</p>
                          <button
                            onClick={() => deletePaymentEntry(entry.id)}
                            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete this entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedAccount(null); setShowKhata(false); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ RECORD REFUND DIALOG ══════════ */}
      <Dialog open={refundDialog} onOpenChange={o => { if (!o) { setRefundDialog(false); setRefundAmount(""); setRefundNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              Refund to Customer — {selectedAccount?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
              Record money you are giving <strong>back</strong> to the customer (returns, excess refund, etc.)
            </div>
            <div>
              <Label>Amount Refunded (₹) *</Label>
              <Input
                type="number" min="0" className="mt-1" placeholder="e.g. 2000"
                value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                rows={2} className="mt-1"
                placeholder="e.g. Product returned, excess payment refund..."
                value={refundNote} onChange={e => setRefundNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRefundDialog(false); setRefundAmount(""); setRefundNote(""); }}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={recordAdminRefund}
              disabled={refunding || !refundAmount || Number(refundAmount) <= 0}
            >
              {refunding ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</> : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ RECORD PAYMENT DIALOG ══════════ */}
      <Dialog open={payDialog} onOpenChange={o => { if (!o) { setPayDialog(false); setPayAmount(""); setPayNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-green-600" />
              Record Payment — {selectedAccount?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Current due */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-red-700">Current Balance Due</span>
              <span className="font-black text-red-700 text-lg">{formatINR(selectedTotalDue)}</span>
            </div>
            <div>
              <Label>Amount Received (₹) *</Label>
              <Input
                type="number" min="0" max={selectedTotalDue}
                className="mt-1" placeholder={`Max: ${selectedTotalDue}`}
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                rows={2} className="mt-1"
                placeholder="e.g. Cash received, UPI transfer, partial payment..."
                value={payNote} onChange={e => setPayNote(e.target.value)}
              />
            </div>
            {payAmount && Number(payAmount) > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Receiving</span>
                  <span className="font-bold text-green-700">{formatINR(Number(payAmount))}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-600">Remaining after</span>
                  <span className={`font-bold ${Math.max(0, selectedTotalDue - Number(payAmount)) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatINR(Math.max(0, selectedTotalDue - Number(payAmount)))}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayDialog(false); setPayAmount(""); setPayNote(""); }}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={recordAccountPayment}
              disabled={paying || !payAmount || Number(payAmount) <= 0}
            >
              {paying ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</> : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
