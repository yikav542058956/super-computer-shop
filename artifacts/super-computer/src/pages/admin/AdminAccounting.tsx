import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue, push, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Download, Plus, TrendingUp, TrendingDown, Printer,
  IndianRupee, Users, Loader2, ChevronRight, AlertCircle, BookOpen,
  ShoppingBag, Receipt, Calendar, Phone, MapPin, Tag, Package,
  CheckCircle, FileText, Clock,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
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

/* ─── Invoice Print ─────────────────────────────────────── */
function printSaleInvoice(sale: any) {
  const invoiceNo = `SC-${sale.id?.slice(-6).toUpperCase() || Date.now()}`;
  const date = new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const dueDate = sale.dueDate ? new Date(sale.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const discountLine = sale.discountType === "percent"
    ? `${sale.discountValue}% off MRP`
    : `Flat ₹${Number(sale.discountValue).toLocaleString("en-IN")} off MRP`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoiceNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;}
    .logo{font-size:22px;font-weight:900;color:#2563eb;letter-spacing:-0.5px;}
    .sub{font-size:11px;color:#666;margin-top:2px;}
    .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;}
    .inv-title{font-size:28px;font-weight:900;color:#1e293b;letter-spacing:-1px;}
    .inv-meta{font-size:12px;color:#555;margin-top:6px;line-height:1.8;}
    .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
    .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    thead tr{background:#1e293b;color:#fff;}
    th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
    td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;}
    tr:last-child td{border-bottom:none;}
    .totals{margin-left:auto;width:280px;}
    .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;}
    .total-row.big{font-weight:900;font-size:16px;border-top:2px solid #1e293b;padding-top:10px;margin-top:4px;}
    .total-row.green{color:#16a34a;}
    .total-row.red{color:#dc2626;}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
    .badge-green{background:#dcfce7;color:#16a34a;}
    .badge-red{background:#fee2e2;color:#dc2626;}
    .badge-amber{background:#fef9c3;color:#b45309;}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;}
    @media print{body{padding:16px;}}
  </style></head><body>
  <div class="inv-header">
    <div>
      <div class="logo">⚡ Super Computer</div>
      <div class="sub">Mirehachi, Kasganj Road, Distt. Etah</div>
      <div class="sub">📞 +91 9761809960 | info@supercomputer.in</div>
    </div>
    <div style="text-align:right">
      <div class="inv-title">INVOICE</div>
      <div class="inv-meta">
        <strong>Invoice No:</strong> ${invoiceNo}<br>
        <strong>Date:</strong> ${date}<br>
        <strong>Type:</strong> Local Sale
      </div>
    </div>
  </div>

  <div class="grid2">
    <div class="box">
      <div class="section-label">Bill To</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${sale.clientName}</div>
      ${sale.clientPhone ? `<div>📞 ${sale.clientPhone}</div>` : ""}
      ${sale.clientAddress ? `<div style="color:#555;margin-top:4px;">📍 ${sale.clientAddress}</div>` : ""}
    </div>
    <div class="box">
      <div class="section-label">Payment Summary</div>
      <div class="total-row"><span>Total Sale Value</span><span><strong>${formatINR(sale.totalSaleValue)}</strong></span></div>
      <div class="total-row green"><span>Amount Paid</span><span>${formatINR(sale.amountPaid)}</span></div>
      ${sale.dueAmount > 0 ? `<div class="total-row red"><span>Balance Due</span><span>${formatINR(sale.dueAmount)}</span></div>` : ""}
      ${sale.dueDate && sale.dueAmount > 0 ? `<div class="total-row"><span>Due Date</span><span><strong>${dueDate}</strong></span></div>` : ""}
      <div style="margin-top:8px;">
        <span class="badge ${sale.dueAmount <= 0 ? "badge-green" : "badge-amber"}">${sale.dueAmount <= 0 ? "✓ PAID" : "PARTIAL PAYMENT"}</span>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Product</th><th>MRP</th><th>Discount</th><th>Sell Price</th><th>Qty</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>${sale.productName}</strong>${sale.productBrand ? `<br><span style="font-size:11px;color:#666;">${sale.productBrand}</span>` : ""}</td>
        <td>${formatINR(sale.mrp)}</td>
        <td><span class="badge badge-amber">${discountLine}</span></td>
        <td><strong>${formatINR(sale.sellPrice)}</strong></td>
        <td>${sale.qty}</td>
        <td><strong>${formatINR(sale.totalSaleValue)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>MRP × ${sale.qty}</span><span>${formatINR(sale.mrp * sale.qty)}</span></div>
    <div class="total-row red"><span>Total Discount</span><span>− ${formatINR(sale.mrp * sale.qty - sale.totalSaleValue)}</span></div>
    <div class="total-row big"><span>Sale Total</span><span>${formatINR(sale.totalSaleValue)}</span></div>
    <div class="total-row green"><span>Received</span><span>${formatINR(sale.amountPaid)}</span></div>
    ${sale.dueAmount > 0 ? `<div class="total-row red"><span>Balance Due</span><span>${formatINR(sale.dueAmount)}</span></div>` : ""}
  </div>

  ${sale.notes ? `<div class="box" style="margin-top:16px;"><div class="section-label">Notes</div><div>${sale.notes}</div></div>` : ""}

  <div class="footer">
    Thank you for your business! | Super Computer — Authorized Reseller<br>
    This is a computer-generated invoice.
  </div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/* ─── Normalize offline order into local-sale shape ────── */
function normalizeOfflineOrder(order: any) {
  const n = (v: any, fallback = 0): number => {
    const x = Number(v);
    return isFinite(x) ? x : fallback;
  };

  // ── AdminOfflineSale format (has order.customer + order.item) ──
  if (order.customer) {
    const total   = n(order.grandTotal ?? order.finalAmount);
    // Prefer explicit amountPaid; fall back to paidAmount; fall back to total if paymentStatus=paid
    const paid    = order.amountPaid != null
      ? n(order.amountPaid)
      : order.paidAmount != null
        ? n(order.paidAmount)
        : order.paymentStatus === "paid" ? total : 0;
    // Due must be consistent with total and paid; never go negative
    const due     = order.dueAmount != null
      ? Math.max(0, n(order.dueAmount))
      : Math.max(0, total - paid);
    return {
      id:           order.id,
      _fromOrder:   true,
      billNo:       order.billNo ?? null,
      clientName:   String(order.customer?.name  ?? "Unknown"),
      clientPhone:  String(order.customer?.phone ?? ""),
      clientAddress:String(order.customer?.address ?? ""),
      productName:  String(order.item?.name  ?? ""),
      productBrand: String(order.item?.brand ?? ""),
      qty:          Math.max(1, n(order.item?.qty, 1)),
      mrp:          total,
      sellPrice:    total,
      totalSaleValue: total,
      amountPaid:   paid,
      dueAmount:    due,
      dueDate:      order.dueDate ?? null,
      discountType: "flat"  as const,
      discountValue: 0,
      discountAmount: 0,
      notes:        String(order.notes ?? ""),
      paymentMethod:String(order.paymentMethod ?? ""),
      createdAt:    n(order.createdAt, Date.now()),
    };
  }

  // ── Legacy AdminOrders format (has order.address + order.items[]) ──
  const items: any[] = Array.isArray(order.items) ? order.items : Object.values(order.items ?? {});
  const first  = items[0] ?? {};
  const total  = n(order.finalAmount);
  // Legacy records were always marked paid=delivered; honour paidAmount/refundAmount if present
  const refund = n(order.refundAmount);
  const paid   = order.paidAmount != null
    ? n(order.paidAmount)
    : order.paymentStatus === "refunded" ? 0 : total - refund;
  const due    = Math.max(0, total - paid - refund);
  return {
    id:           order.id,
    _fromOrder:   true,
    billNo:       null,
    clientName:   String(order.address?.name ?? "Unknown"),
    clientPhone:  String(order.address?.phone ?? ""),
    clientAddress:String(order.address?.address ?? order.address?.city ?? ""),
    productName:  String(first.name ?? ""),
    productBrand: String(first.brand ?? ""),
    qty:          Math.max(1, n(first.qty, 1)),
    mrp:          total,
    sellPrice:    total,
    totalSaleValue: total,
    amountPaid:   paid,
    dueAmount:    due,
    dueDate:      null,
    discountType: "flat"  as const,
    discountValue: 0,
    discountAmount: 0,
    notes:        String(order.notes ?? ""),
    paymentMethod:String(order.paymentMethod ?? ""),
    createdAt:    n(order.createdAt, Date.now()),
  };
}

/* ─── Default sale form ─────────────────────────────────── */
const defaultSaleForm = {
  clientName: "", clientPhone: "", clientAddress: "",
  productId: "", productName: "", productBrand: "", mrp: 0,
  qty: "1",
  discountType: "percent" as "percent" | "flat",
  discountValue: "0",
  amountPaid: "",
  dueDate: "",
  notes: "",
};

/* ─── Main Component ────────────────────────────────────── */
export default function AdminAccounting() {
  const [tab, setTab] = useState<"ledger" | "sales">("ledger");

  /* Ledger state */
  const [ledger, setLedger] = useState<Record<string, any>>({});
  const [customers, setCustomers] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ customerId: "", type: "debit", amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [adding, setAdding] = useState(false);

  /* Local sales state */
  const [products, setProducts] = useState<Record<string, any>>({});
  const [localSales, setLocalSales] = useState<any[]>([]);
  const [saleDialog, setSaleDialog] = useState(false);
  const [saleForm, setSaleForm] = useState(defaultSaleForm);
  const [savingSale, setSavingSale] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [salesSearch, setSalesSearch] = useState("");

  useEffect(() => {
    const unsub1 = onValue(ref(db, "ledger"), (snap) => {
      setLedger(snap.exists() ? snap.val() : {});
      setLoading(false);
    });
    const unsub2 = onValue(ref(db, "users"), (snap) => {
      if (snap.exists()) setCustomers(snap.val());
    });
    const unsub3 = onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) setOrders(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
      else setOrders([]);
    });
    const unsub4 = onValue(ref(db, "products"), (snap) => {
      if (snap.exists()) setProducts(snap.val());
    });
    const unsub5 = onValue(ref(db, "local_sales"), (snap) => {
      if (snap.exists()) {
        setLocalSales(
          Object.entries(snap.val())
            .map(([id, v]: any) => ({ id, ...v }))
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      } else {
        setLocalSales([]);
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  /* ── Ledger derived data ── */
  const customerList = useMemo(() => {
    return Object.entries(customers).map(([uid, data]: any) => {
      const cLedger = ledger[uid] || {};
      const entries = Object.values(cLedger) as any[];
      const totalDebit = entries.filter((e) => e.type === "debit").reduce((s, e) => s + (e.amount || 0), 0);
      const totalCredit = entries.filter((e) => e.type === "credit").reduce((s, e) => s + (e.amount || 0), 0);
      const balance = totalDebit - totalCredit;
      const cOrders = orders.filter((o) => o.userId === uid);
      return {
        uid, name: data.name || data.displayName || "Unknown", phone: data.phone || "",
        email: data.email || "", totalDebit, totalCredit, balance,
        ordersCount: cOrders.length,
        totalOrderValue: cOrders.reduce((s: number, o: any) => s + (o.finalAmount || 0), 0),
        entries,
      };
    }).filter((c) => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
    });
  }, [customers, ledger, orders, search]);

  const totalUdhar = customerList.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalAdvance = customerList.filter((c) => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);
  const outstandingCount = customerList.filter((c) => c.balance > 0).length;

  /* ── Merge local_sales + offline orders into one list ── */
  const allLocalSales = useMemo(() => {
    const offlineOrders = orders
      .filter((o) => o.source === "offline")
      .map(normalizeOfflineOrder);
    // Deduplicate: local_sales should take precedence; offline orders add extras
    const localIds = new Set(localSales.map((s) => s.id));
    const uniqueOffline = offlineOrders.filter((o) => !localIds.has(o.id));
    return [...localSales, ...uniqueOffline].sort((a, b) => b.createdAt - a.createdAt);
  }, [localSales, orders]);

  /* ── Local sales derived ── */
  const filteredSales = useMemo(() => {
    const q = salesSearch.toLowerCase();
    if (!q) return allLocalSales;
    return allLocalSales.filter(
      (s) =>
        s.clientName?.toLowerCase().includes(q) ||
        s.clientPhone?.includes(q) ||
        s.productName?.toLowerCase().includes(q)
    );
  }, [allLocalSales, salesSearch]);

  const totalSaleRevenue = allLocalSales.reduce((s, sale) => s + (sale.totalSaleValue || 0), 0);
  const totalDueFromSales = allLocalSales.reduce((s, sale) => s + (Math.max(sale.dueAmount || 0, 0)), 0);
  const totalCollected = allLocalSales.reduce((s, sale) => s + (sale.amountPaid || 0), 0);

  /* ── Sale form calculations ── */
  const selectedProduct = products[saleForm.productId];
  const qty = Math.max(1, parseInt(saleForm.qty) || 1);
  const mrp = saleForm.mrp || 0;
  const discountVal = parseFloat(saleForm.discountValue) || 0;
  const discountAmount = saleForm.discountType === "percent"
    ? Math.round(mrp * discountVal / 100)
    : discountVal;
  const sellPrice = Math.max(0, mrp - discountAmount);
  const totalSaleValue = sellPrice * qty;
  const amountPaid = parseFloat(saleForm.amountPaid) || 0;
  const dueAmount = totalSaleValue - amountPaid;
  const discountPercent = mrp > 0 ? ((discountAmount / mrp) * 100).toFixed(1) : "0";

  /* ── Select product ── */
  const handleProductSelect = (pid: string) => {
    const p = products[pid];
    if (!p) return;
    setSaleForm((f) => ({
      ...f,
      productId: pid,
      productName: p.name || "",
      productBrand: p.brand || "",
      mrp: p.price || 0,
    }));
  };

  /* ── Save local sale ── */
  const saveSale = async () => {
    if (!saleForm.clientName.trim()) { toast.error("Client name is required"); return; }
    if (!saleForm.productId) { toast.error("Please select a product"); return; }
    if (qty < 1) { toast.error("Quantity must be at least 1"); return; }
    if (amountPaid < 0) { toast.error("Amount paid cannot be negative"); return; }

    setSavingSale(true);
    try {
      const saleRef = push(ref(db, "local_sales"));
      const saleData = {
        clientName: saleForm.clientName.trim(),
        clientPhone: saleForm.clientPhone.trim(),
        clientAddress: saleForm.clientAddress.trim(),
        productId: saleForm.productId,
        productName: saleForm.productName,
        productBrand: saleForm.productBrand,
        mrp,
        qty,
        discountType: saleForm.discountType,
        discountValue: discountVal,
        discountAmount,
        sellPrice,
        totalSaleValue,
        amountPaid,
        dueAmount: Math.max(0, dueAmount),
        dueDate: saleForm.dueDate ? new Date(saleForm.dueDate).getTime() : null,
        notes: saleForm.notes.trim(),
        createdAt: Date.now(),
      };
      await set(saleRef, saleData);

      toast.success("Local sale recorded successfully!");
      setSaleDialog(false);
      setSaleForm(defaultSaleForm);

      /* open print invoice immediately */
      setTimeout(() => printSaleInvoice({ id: saleRef.key, ...saleData }), 300);
    } catch {
      toast.error("Failed to save sale");
    } finally {
      setSavingSale(false);
    }
  };

  /* ── Ledger add entry ── */
  const addEntry = async () => {
    if (!addForm.customerId || !addForm.amount || Number(addForm.amount) <= 0) {
      toast.error("Please select a customer and enter an amount"); return;
    }
    setAdding(true);
    try {
      const entryRef = push(ref(db, `ledger/${addForm.customerId}`));
      await set(entryRef, {
        type: addForm.type,
        amount: Number(addForm.amount),
        note: addForm.note,
        date: new Date(addForm.date).getTime(),
        createdAt: Date.now(),
      });
      toast.success(`${addForm.type === "debit" ? "Debit" : "Payment"} entry added!`);
      setAddDialog(false);
      setAddForm({ customerId: "", type: "debit", amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
    } catch { toast.error("Failed to add entry"); }
    finally { setAdding(false); }
  };

  const exportCSV = () => {
    const rows = [
      ["Customer", "Phone", "Email", "Total Outstanding (Dr)", "Total Paid (Cr)", "Net Balance", "Orders", "Order Value"],
      ...customerList.map((c) => [c.name, c.phone, c.email, c.totalDebit, c.totalCredit, c.balance, c.ordersCount, c.totalOrderValue]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `accounting_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully!");
  };

  const customerLedgerEntries = selectedCustomer
    ? (Object.entries(ledger[selectedCustomer.uid] || {}) as any[])
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  return (
    <AdminLayout>
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={AlertCircle} label="Total Outstanding" value={formatINR(totalUdhar)} color="bg-red-100 text-red-600" />
        <StatCard icon={Users} label="Customers with Due" value={outstandingCount} color="bg-amber-100 text-amber-600" />
        <StatCard icon={ShoppingBag} label="Local Sales Revenue" value={formatINR(totalSaleRevenue)} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Receipt} label="Due from Local Sales" value={formatINR(totalDueFromSales)} color="bg-orange-100 text-orange-600" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("ledger")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === "ledger" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Ledger</span>
        </button>
        <button
          onClick={() => setTab("sales")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === "sales" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Local Sales {allLocalSales.length > 0 && <span className="bg-primary/10 text-primary text-xs px-1.5 rounded-full">{allLocalSales.length}</span>}</span>
        </button>
      </div>

      {/* ══════════════════════════ LEDGER TAB ══════════════════════════ */}
      {tab === "ledger" && (
        <>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Customer Ledger</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
              <Button size="sm" onClick={() => setAddDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Entry</Button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
          ) : customerList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed">
              <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No customers found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customerList.map((c) => (
                <div key={c.uid}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all ${c.balance > 0 ? "border-l-4 border-l-red-400" : c.balance < 0 ? "border-l-4 border-l-green-400" : ""}`}
                  onClick={() => setSelectedCustomer(c)}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm flex-shrink-0">
                    {c.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone} • {c.ordersCount} orders • {formatINR(c.totalOrderValue)} total</p>
                  </div>
                  <div className="text-right shrink-0">
                    {c.balance > 0 ? (
                      <div>
                        <p className="text-xs text-red-500 font-semibold">Outstanding (Due)</p>
                        <p className="font-black text-red-600">{formatINR(c.balance)}</p>
                      </div>
                    ) : c.balance < 0 ? (
                      <div>
                        <p className="text-xs text-green-500 font-semibold">Advance</p>
                        <p className="font-black text-green-600">{formatINR(Math.abs(c.balance))}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-semibold">Settled ✓</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════ LOCAL SALES TAB ══════════════════════════ */}
      {tab === "sales" && (
        <>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h1 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Local Sales</h1>
            <Button size="sm" onClick={() => setSaleDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Record Sale</Button>
          </div>

          {/* Sales stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-500 font-semibold">Total Sales</p>
              <p className="font-black text-blue-700 text-lg">{allLocalSales.length}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <p className="text-xs text-green-500 font-semibold">Collected</p>
              <p className="font-black text-green-700 text-lg">{formatINR(totalCollected)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500 font-semibold">Due Pending</p>
              <p className="font-black text-red-700 text-lg">{formatINR(totalDueFromSales)}</p>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by client name, phone, or product..." value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)} className="pl-10" />
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed">
              <ShoppingBag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold mb-1">No local sales yet</p>
              <p className="text-slate-400 text-sm">Click "Record Sale" to add your first local sale</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSales.map((sale) => (
                <div key={sale.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all ${sale.dueAmount > 0 ? "border-l-4 border-l-orange-400" : "border-l-4 border-l-green-400"}`}
                  onClick={() => setSelectedSale(sale)}
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{sale.clientName}</p>
                    <p className="text-xs text-slate-500 truncate">{sale.productName} × {sale.qty} • {new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    {sale.clientPhone && <p className="text-xs text-slate-400">📞 {sale.clientPhone}</p>}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-black text-slate-900">{formatINR(sale.totalSaleValue)}</p>
                    {sale.dueAmount > 0 ? (
                      <p className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Due: {formatINR(sale.dueAmount)}</p>
                    ) : (
                      <p className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Paid ✓</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════ DIALOGS ══════════════════════════ */}

      {/* Customer Ledger Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedCustomer?.name} — Ledger
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-500 font-semibold">Total Debit (Outstanding)</p>
                  <p className="font-black text-red-700 text-lg">{formatINR(selectedCustomer.totalDebit)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-500 font-semibold">Total Credit (Paid)</p>
                  <p className="font-black text-green-700 text-lg">{formatINR(selectedCustomer.totalCredit)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${selectedCustomer.balance > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <p className={`text-xs font-semibold ${selectedCustomer.balance > 0 ? "text-red-500" : "text-green-500"}`}>
                    {selectedCustomer.balance > 0 ? "Net Outstanding" : "Net Advance"}
                  </p>
                  <p className={`font-black text-lg ${selectedCustomer.balance > 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatINR(Math.abs(selectedCustomer.balance))}
                  </p>
                </div>
              </div>

              <Button size="sm" className="w-full gap-2" onClick={() => {
                setAddForm((f) => ({ ...f, customerId: selectedCustomer.uid }));
                setAddDialog(true);
              }}>
                <Plus className="h-4 w-4" /> Add Entry for {selectedCustomer.name}
              </Button>

              {customerLedgerEntries.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {customerLedgerEntries.map((entry) => (
                    <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border ${entry.type === "debit" ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                      {entry.type === "debit" ? <TrendingUp className="h-4 w-4 text-red-500 shrink-0" /> : <TrendingDown className="h-4 w-4 text-green-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{entry.note || (entry.type === "debit" ? "Credit given" : "Payment received")}</p>
                        <p className="text-xs text-slate-500">{new Date(entry.date || entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                      <p className={`font-black shrink-0 ${entry.type === "debit" ? "text-red-600" : "text-green-600"}`}>
                        {entry.type === "debit" ? "+" : "−"} {formatINR(entry.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Ledger Entry Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!addForm.customerId && (
              <div>
                <Label>Customer *</Label>
                <Select value={addForm.customerId} onValueChange={(v) => setAddForm((f) => ({ ...f, customerId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(customers).map(([uid, data]: any) => (
                      <SelectItem key={uid} value={uid}>{data.name || data.displayName || uid}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {addForm.customerId && (
              <div className="bg-slate-50 rounded-xl p-3 text-sm flex items-center justify-between">
                <span className="font-semibold">{customers[addForm.customerId]?.name || "Customer"}</span>
                <button onClick={() => setAddForm((f) => ({ ...f, customerId: "" }))} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
              </div>
            )}
            <div>
              <Label>Entry Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => setAddForm((f) => ({ ...f, type: "debit" }))}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 justify-center ${addForm.type === "debit" ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200"}`}>
                  <TrendingUp className="h-4 w-4" /> Credit Given (Dr)
                </button>
                <button onClick={() => setAddForm((f) => ({ ...f, type: "credit" }))}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 justify-center ${addForm.type === "credit" ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200"}`}>
                  <TrendingDown className="h-4 w-4" /> Payment Received (Cr)
                </button>
              </div>
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="0" value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={addForm.date} onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea placeholder="e.g. Laptop credit, UPI payment received..." value={addForm.note} onChange={(e) => setAddForm((f) => ({ ...f, note: e.target.value }))} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={addEntry} disabled={adding}>
              {adding ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Adding...</> : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Record Local Sale Dialog ══ */}
      <Dialog open={saleDialog} onOpenChange={(o) => { if (!o) { setSaleDialog(false); setSaleForm(defaultSaleForm); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" /> Record Local Sale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* Client Info */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Client Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client Name *</Label>
                  <Input className="mt-1" placeholder="e.g. Ramesh Kumar" value={saleForm.clientName} onChange={(e) => setSaleForm((f) => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
                  <Input className="mt-1" placeholder="+91 XXXXX XXXXX" value={saleForm.clientPhone} onChange={(e) => setSaleForm((f) => ({ ...f, clientPhone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Address</Label>
                <Textarea className="mt-1" placeholder="Street, City, District..." rows={2} value={saleForm.clientAddress} onChange={(e) => setSaleForm((f) => ({ ...f, clientAddress: e.target.value }))} />
              </div>
            </div>

            {/* Product Selection */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Product</p>
              <div>
                <Label>Select Product *</Label>
                <Select value={saleForm.productId} onValueChange={handleProductSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a product from inventory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(products)
                      .filter(([, p]: any) => p.isActive !== false)
                      .map(([pid, p]: any) => (
                        <SelectItem key={pid} value={pid}>
                          {p.name} {p.brand ? `— ${p.brand}` : ""} {p.stock != null ? `(Stock: ${p.stock})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProduct && (
                <div className="bg-white border rounded-xl p-3 text-sm flex items-center gap-3">
                  {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} className="h-12 w-12 rounded-lg object-cover border" />}
                  <div>
                    <p className="font-bold">{selectedProduct.name}</p>
                    {selectedProduct.brand && <p className="text-xs text-slate-500">{selectedProduct.brand}</p>}
                    <p className="text-xs text-blue-600 font-semibold">MRP: {formatINR(selectedProduct.price)}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" className="mt-1" value={saleForm.qty} onChange={(e) => setSaleForm((f) => ({ ...f, qty: e.target.value }))} />
                </div>
                <div>
                  <Label>MRP per unit (₹)</Label>
                  <Input type="number" className="mt-1" value={saleForm.mrp} onChange={(e) => setSaleForm((f) => ({ ...f, mrp: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>

            {/* Discount */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Discount</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSaleForm((f) => ({ ...f, discountType: "percent" }))}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${saleForm.discountType === "percent" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-white"}`}
                >
                  % Percentage Discount
                </button>
                <button
                  onClick={() => setSaleForm((f) => ({ ...f, discountType: "flat" }))}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${saleForm.discountType === "flat" ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-200 bg-white"}`}
                >
                  ₹ Flat Amount Off
                </button>
              </div>
              <div>
                <Label>{saleForm.discountType === "percent" ? "Discount %" : "Discount Amount (₹)"}</Label>
                <Input
                  type="number" min="0"
                  className="mt-1"
                  placeholder={saleForm.discountType === "percent" ? "e.g. 10" : "e.g. 2000"}
                  value={saleForm.discountValue}
                  onChange={(e) => setSaleForm((f) => ({ ...f, discountValue: e.target.value }))}
                />
              </div>
            </div>

            {/* Deal Preview */}
            {saleForm.productId && mrp > 0 && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Deal Summary</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">MRP × {qty}</p>
                    <p className="font-bold">{formatINR(mrp * qty)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Discount Given</p>
                    <p className="font-bold text-red-400">− {formatINR(discountAmount * qty)} <span className="text-xs text-slate-400">({discountPercent}%)</span></p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Sell Price × {qty}</p>
                    <p className="font-black text-green-400 text-lg">{formatINR(totalSaleValue)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Per Unit Price</p>
                    <p className="font-bold text-blue-300">{formatINR(sellPrice)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Payment Received</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount Paid by Client (₹)</Label>
                  <Input
                    type="number" min="0"
                    className="mt-1"
                    placeholder={`Max: ${totalSaleValue}`}
                    value={saleForm.amountPaid}
                    onChange={(e) => setSaleForm((f) => ({ ...f, amountPaid: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Due Date (if partial)</Label>
                  <Input type="date" className="mt-1" value={saleForm.dueDate} onChange={(e) => setSaleForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              {/* Payment breakdown */}
              {saleForm.amountPaid !== "" && totalSaleValue > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-green-500 font-semibold">Paid Now</p>
                    <p className="font-black text-green-700">{formatINR(amountPaid)}</p>
                  </div>
                  <div className={`border rounded-xl p-2.5 text-center ${dueAmount > 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                    <p className={`text-xs font-semibold ${dueAmount > 0 ? "text-red-500" : "text-green-500"}`}>{dueAmount > 0 ? "Balance Due" : "Fully Paid"}</p>
                    <p className={`font-black ${dueAmount > 0 ? "text-red-700" : "text-green-700"}`}>{dueAmount > 0 ? formatINR(dueAmount) : "✓"}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-blue-500 font-semibold">Sale Total</p>
                    <p className="font-black text-blue-700">{formatINR(totalSaleValue)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" placeholder="e.g. Exchange deal, part payment via UPI..." rows={2} value={saleForm.notes} onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSaleDialog(false); setSaleForm(defaultSaleForm); }}>Cancel</Button>
            <Button onClick={saveSale} disabled={savingSale} className="gap-2">
              {savingSale ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Receipt className="h-4 w-4" /> Save & Print Invoice</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Sale Detail Dialog ══ */}
      <Dialog open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" /> Sale Details
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              {/* Client */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Client</p>
                <p className="font-bold text-base">{selectedSale.clientName}</p>
                {selectedSale.clientPhone && <p className="text-sm text-slate-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {selectedSale.clientPhone}</p>}
                {selectedSale.clientAddress && <p className="text-sm text-slate-600 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedSale.clientAddress}</p>}
                <p className="text-xs text-slate-400 mt-1">{new Date(selectedSale.createdAt).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>

              {/* Product */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Product Sold</p>
                <p className="font-bold">{selectedSale.productName}</p>
                {selectedSale.productBrand && <p className="text-xs text-slate-500">{selectedSale.productBrand}</p>}
                <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">
                  <div className="bg-white border rounded-lg p-2">
                    <p className="text-slate-400">MRP</p>
                    <p className="font-bold">{formatINR(selectedSale.mrp)}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-2">
                    <p className="text-slate-400">Discount</p>
                    <p className="font-bold text-red-500">
                      {selectedSale.discountType === "percent" ? `${selectedSale.discountValue}%` : formatINR(selectedSale.discountValue)}
                    </p>
                  </div>
                  <div className="bg-white border rounded-lg p-2">
                    <p className="text-slate-400">Sell Price</p>
                    <p className="font-bold text-blue-600">{formatINR(selectedSale.sellPrice)}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-2">
                    <p className="text-slate-400">Qty</p>
                    <p className="font-bold">{selectedSale.qty}</p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 font-semibold">Sale Total</p>
                  <p className="font-black text-blue-700">{formatINR(selectedSale.totalSaleValue)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-500 font-semibold">Paid</p>
                  <p className="font-black text-green-700">{formatINR(selectedSale.amountPaid)}</p>
                </div>
                <div className={`border rounded-xl p-3 text-center ${selectedSale.dueAmount > 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                  <p className={`text-xs font-semibold ${selectedSale.dueAmount > 0 ? "text-red-500" : "text-green-500"}`}>{selectedSale.dueAmount > 0 ? "Due" : "Settled"}</p>
                  <p className={`font-black ${selectedSale.dueAmount > 0 ? "text-red-700" : "text-green-700"}`}>{selectedSale.dueAmount > 0 ? formatINR(selectedSale.dueAmount) : "✓"}</p>
                </div>
              </div>
              {selectedSale.dueDate && selectedSale.dueAmount > 0 && (
                <p className="text-sm text-orange-600 flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                  <Calendar className="h-4 w-4" /> Due by: <strong>{new Date(selectedSale.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                </p>
              )}
              {selectedSale.notes && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                  <span className="font-semibold">Notes: </span>{selectedSale.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSale(null)}>Close</Button>
            <Button onClick={() => selectedSale && printSaleInvoice(selectedSale)} className="gap-2">
              <Printer className="h-4 w-4" /> Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
