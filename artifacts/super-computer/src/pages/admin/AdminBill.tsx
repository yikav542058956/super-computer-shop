import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useMemo, useRef, useState } from "react";
import { ref as dbRef, onValue, push, remove, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Receipt, Plus, Search, Trash2, Edit, X, Download, Share2,
  CheckCircle2, Clock, IndianRupee, Phone, User, Calendar,
  StickyNote, ChevronDown, ChevronUp, Printer, FileText,
  Building2, Tag, Percent, AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Net Banking", "Cheque", "Credit"];
const PAYMENT_STATUSES = [
  { value: "unpaid",   label: "Unpaid",   cls: "bg-red-100 text-red-600" },
  { value: "partial",  label: "Partial",  cls: "bg-amber-100 text-amber-700" },
  { value: "paid",     label: "Paid",     cls: "bg-green-100 text-green-700" },
];

interface BillItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

interface Bill {
  id: string;
  billNo: number;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: BillItem[];
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  paymentMode: string;
  paymentStatus: "unpaid" | "partial" | "paid";
  notes?: string;
  createdAt: number;
}

interface ShopInfo {
  storeName: string;
  phone: string;
  address: string;
  email: string;
  gstin?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${dd} ${months[parseInt(m) - 1]} ${y}`;
};
const psObj = (s: string) => PAYMENT_STATUSES.find(p => p.value === s) || PAYMENT_STATUSES[0];

// ─── Empty item ───────────────────────────────────────────────────────────────

const emptyItem = (): BillItem => ({ id: uid(), description: "", qty: 1, rate: 0, amount: 0 });

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generateBillPDF(bill: Bill, shop: ShopInfo): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210;
  const margin = 14;

  // ── Header ──
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pw, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(shop.storeName || "Super Computer", margin, 13);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const shopDetails = [shop.phone, shop.address, shop.email, shop.gstin ? `GSTIN: ${shop.gstin}` : ""]
    .filter(Boolean).join("  |  ");
  doc.text(shopDetails, margin, 20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pw - margin, 13, { align: "right" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Bill No: #${String(bill.billNo).padStart(4, "0")}`, pw - margin, 20, { align: "right" });
  doc.text(`Date: ${fmtDate(bill.date)}`, pw - margin, 26, { align: "right" });

  // ── Customer ──
  doc.setTextColor(30, 30, 30);
  let y = 40;
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, pw - margin * 2, 22, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(bill.customerName || "—", margin + 3, y + 13);
  doc.setFontSize(8);
  const custLine = [bill.customerPhone, bill.customerAddress].filter(Boolean).join("  |  ");
  if (custLine) doc.text(custLine, margin + 3, y + 19);

  // ── Items table ──
  y += 28;
  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Qty", "Rate (₹)", "Amount (₹)"]],
    body: bill.items.map((item, i) => [
      i + 1,
      item.description || "—",
      item.qty,
      fmt(item.rate),
      fmt(item.amount),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  // ── Totals ──
  const finalY = (doc as any).lastAutoTable.finalY + 4;
  const col2 = pw - margin;
  const col1 = col2 - 40;

  const addRow = (label: string, value: string, bold = false, color?: number[]) => {
    doc.setFontSize(bold ? 10 : 9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (color) doc.setTextColor(...(color as [number, number, number]));
    else doc.setTextColor(60, 60, 60);
    doc.text(label, col1, finalY + addRow._y, { align: "right" });
    doc.text(value, col2, finalY + addRow._y, { align: "right" });
    addRow._y += (bold ? 7 : 5.5);
  };
  addRow._y = 0;

  addRow("Subtotal:", `₹${fmt(bill.subtotal)}`);
  if (bill.discountAmount > 0) {
    addRow(
      `Discount${bill.discountType === "percent" ? ` (${bill.discountValue}%)` : ""}:`,
      `- ₹${fmt(bill.discountAmount)}`,
      false, [180, 50, 50],
    );
  }
  if (bill.gstPercent > 0) {
    addRow(`GST (${bill.gstPercent}%):`, `₹${fmt(bill.gstAmount)}`);
  }

  // Total line
  const totalY = finalY + addRow._y + 1;
  doc.setFillColor(37, 99, 235);
  doc.rect(col1 - 40, totalY - 5, pw - margin - col1 + 40 + margin, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", col1, totalY + 2, { align: "right" });
  doc.text(`₹${fmt(bill.total)}`, col2, totalY + 2, { align: "right" });

  // Payment info
  let py = totalY + 14;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Amount Paid: ₹${fmt(bill.amountPaid)}   |   Balance Due: ₹${fmt(Math.max(0, bill.total - bill.amountPaid))}   |   Mode: ${bill.paymentMode}`, margin, py);

  // Notes
  if (bill.notes) {
    py += 8;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, py);
    doc.setFont("helvetica", "normal");
    doc.text(bill.notes, margin + 14, py);
  }

  // Footer
  const footerY = 285;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 4, pw - margin, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Thank you for your business!", pw / 2, footerY, { align: "center" });

  return doc;
}

// Monkey-patch for _y
(generateBillPDF as any)._y = 0;
declare global { interface Function { _y: number; } }

// ─── Empty form ────────────────────────────────────────────────────────────────

const emptyForm = () => ({
  date: today(),
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  discountType: "flat" as "flat" | "percent",
  discountValue: "",
  gstPercent: "",
  amountPaid: "",
  paymentMode: "Cash",
  paymentStatus: "paid" as "unpaid" | "partial" | "paid",
  notes: "",
});

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminBill() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopInfo>({ storeName: "Super Computer", phone: "", address: "", email: "" });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [items, setItems] = useState<BillItem[]>([emptyItem()]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Load ──
  useEffect(() => {
    const unsub = onValue(dbRef(db, "bills"), snap => {
      setLoading(false);
      if (!snap.exists()) { setBills([]); return; }
      const list = Object.entries(snap.val() as Record<string, any>)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setBills(list as Bill[]);
    });
    // Load shop info
    get(dbRef(db, "settings/storeInfo")).then(snap => {
      if (snap.exists()) setShop(s => ({ ...s, ...snap.val() }));
    });
    get(dbRef(db, "settings/general")).then(snap => {
      if (snap.exists()) {
        const g = snap.val();
        setShop(s => ({
          ...s,
          storeName: g.storeName || s.storeName,
          phone: g.phone || s.phone,
          email: g.email || s.email,
          address: g.address || s.address,
        }));
      }
    });
    return () => unsub();
  }, []);

  const nextBillNo = useMemo(() => {
    if (bills.length === 0) return 1;
    return Math.max(...bills.map(b => b.billNo || 0)) + 1;
  }, [bills]);

  // ── Computed totals ──
  const computeTotals = (
    rows: BillItem[],
    discType: "flat" | "percent",
    discVal: number,
    gstPct: number,
  ) => {
    const subtotal = rows.reduce((s, r) => s + (r.amount || 0), 0);
    const discountAmount = discType === "percent"
      ? Math.round((subtotal * discVal) / 100 * 100) / 100
      : discVal;
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const gstAmount = Math.round((afterDiscount * gstPct) / 100 * 100) / 100;
    const total = afterDiscount + gstAmount;
    return { subtotal, discountAmount, gstAmount, total };
  };

  const { subtotal, discountAmount, gstAmount, total } = useMemo(() =>
    computeTotals(
      items,
      form.discountType,
      Number(form.discountValue) || 0,
      Number(form.gstPercent) || 0,
    ), [items, form.discountType, form.discountValue, form.gstPercent]);

  // ── Filters ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills.filter(b => {
      if (filterStatus !== "all" && b.paymentStatus !== filterStatus) return false;
      if (filterFrom && b.date < filterFrom) return false;
      if (filterTo && b.date > filterTo) return false;
      if (q) {
        const s = `${b.customerName} ${b.customerPhone || ""} #${b.billNo}`.toLowerCase();
        if (!s.includes(q)) return false;
      }
      return true;
    });
  }, [bills, search, filterFrom, filterTo, filterStatus]);

  // ── Summary ──
  const stats = useMemo(() => {
    const total = bills.reduce((s, b) => s + (b.total || 0), 0);
    const collected = bills.reduce((s, b) => s + (b.amountPaid || 0), 0);
    const unpaid = bills.filter(b => b.paymentStatus !== "paid").length;
    return { total, collected, unpaid };
  }, [bills]);

  // ── Open dialog ──
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setItems([emptyItem()]);
    setDialogOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditing(bill);
    setForm({
      date: bill.date,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || "",
      customerAddress: bill.customerAddress || "",
      discountType: bill.discountType,
      discountValue: bill.discountValue > 0 ? String(bill.discountValue) : "",
      gstPercent: bill.gstPercent > 0 ? String(bill.gstPercent) : "",
      amountPaid: String(bill.amountPaid || 0),
      paymentMode: bill.paymentMode,
      paymentStatus: bill.paymentStatus,
      notes: bill.notes || "",
    });
    setItems(bill.items?.length ? bill.items : [emptyItem()]);
    setDialogOpen(true);
  };

  const f = (key: keyof ReturnType<typeof emptyForm>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  // ── Item CRUD ──
  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(rows => rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "qty" || field === "rate") {
        updated.amount = Math.round(updated.qty * updated.rate * 100) / 100;
      }
      return updated;
    }));
  };

  const addItem = () => setItems(r => [...r, emptyItem()]);
  const removeItem = (id: string) => setItems(r => r.length > 1 ? r.filter(x => x.id !== id) : r);

  // ── Save ──
  const handleSave = async () => {
    if (!form.customerName.trim()) { toast.error("Customer name is required"); return; }
    if (items.every(i => !i.description.trim())) { toast.error("Add at least one item"); return; }

    const validItems = items.filter(i => i.description.trim());
    const amountPaid = Number(form.amountPaid) || 0;
    const discValue = Number(form.discountValue) || 0;
    const gstPct = Number(form.gstPercent) || 0;
    const { subtotal, discountAmount, gstAmount, total } = computeTotals(validItems, form.discountType, discValue, gstPct);

    const autoStatus: "unpaid" | "partial" | "paid" =
      amountPaid <= 0 ? "unpaid" :
      amountPaid >= total ? "paid" : "partial";

    const payload: Omit<Bill, "id"> = {
      billNo: editing ? editing.billNo : nextBillNo,
      date: form.date,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || undefined,
      customerAddress: form.customerAddress.trim() || undefined,
      items: validItems,
      subtotal,
      discountType: form.discountType,
      discountValue: discValue,
      discountAmount,
      gstPercent: gstPct,
      gstAmount,
      total,
      amountPaid,
      paymentMode: form.paymentMode,
      paymentStatus: autoStatus,
      notes: form.notes.trim() || undefined,
      createdAt: editing ? editing.createdAt : Date.now(),
    };

    try {
      if (editing) {
        await update(dbRef(db, `bills/${editing.id}`), payload);
        toast.success("Bill updated!");
      } else {
        await push(dbRef(db, "bills"), payload);
        toast.success(`Bill #${nextBillNo} created!`);
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill permanently?")) return;
    await remove(dbRef(db, `bills/${id}`));
    toast.success("Bill deleted");
  };

  // ── PDF ──
  const downloadPDF = (bill: Bill) => {
    const doc = generateBillPDF(bill, shop);
    doc.save(`bill_${String(bill.billNo).padStart(4, "0")}_${bill.customerName.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const shareWhatsApp = (bill: Bill) => {
    const balance = Math.max(0, bill.total - bill.amountPaid);
    const text = `*${shop.storeName}*\nBill #${String(bill.billNo).padStart(4, "0")} | Date: ${fmtDate(bill.date)}\nCustomer: ${bill.customerName}\nTotal: ₹${fmt(bill.total)}\nPaid: ₹${fmt(bill.amountPaid)}${balance > 0 ? `\nBalance Due: ₹${fmt(balance)}` : ""}\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-black text-slate-800">Bill / Invoice</h1>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Bill
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Bills",    value: bills.length,                      color: "text-slate-700" },
            { label: "Pending Payment",value: stats.unpaid,                       color: "text-red-600"   },
            { label: "Total Billed",   value: `₹${stats.total.toLocaleString("en-IN")}`,   color: "text-blue-600" },
            { label: "Total Collected",value: `₹${stats.collected.toLocaleString("en-IN")}`, color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search name, bill no…" className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm bg-white">
            <option value="all">All Status</option>
            {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <Input type="date" className="h-9 text-sm w-36" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            <span className="text-slate-400 text-xs">to</span>
            <Input type="date" className="h-9 text-sm w-36" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          {(search || filterStatus !== "all" || filterFrom || filterTo) && (
            <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterFrom(""); setFilterTo(""); }}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50">
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} bills</span>
        </div>

        {/* ── Bills List ── */}
        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-medium">No bills yet</p>
            <p className="text-slate-300 text-sm mt-1">Click "New Bill" to create your first invoice</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(bill => {
              const ps = psObj(bill.paymentStatus);
              const balance = Math.max(0, bill.total - bill.amountPaid);
              const isExpanded = expandedId === bill.id;

              return (
                <div key={bill.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-slate-800 text-base">
                          #{String(bill.billNo).padStart(4, "0")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ps.cls}`}>
                          {ps.label}
                        </span>
                        <span className="text-xs text-slate-400">{fmtDate(bill.date)}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 truncate">{bill.customerName}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                        {bill.customerPhone && (
                          <a href={`tel:${bill.customerPhone}`} className="flex items-center gap-1 hover:text-blue-600">
                            <Phone className="h-3.5 w-3.5" />{bill.customerPhone}
                          </a>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <IndianRupee className="h-3.5 w-3.5" />₹{fmt(bill.total)}
                        </span>
                        <span className="text-green-600 font-semibold">Paid: ₹{fmt(bill.amountPaid)}</span>
                        {balance > 0 && <span className="text-red-500 font-semibold">Due: ₹{fmt(balance)}</span>}
                        <span className="text-slate-400">{bill.items?.length || 0} item{(bill.items?.length || 0) !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : bill.id)}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => downloadPDF(bill)} title="Download PDF"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => shareWhatsApp(bill)} title="Share on WhatsApp"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50">
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(bill)} title="Edit"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(bill.id)} title="Delete"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-200">
                              <th className="pb-2 pr-3">Item / Description</th>
                              <th className="pb-2 pr-3 text-center">Qty</th>
                              <th className="pb-2 pr-3 text-right">Rate</th>
                              <th className="pb-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(bill.items || []).map(item => (
                              <tr key={item.id} className="hover:bg-white">
                                <td className="py-2 pr-3 font-medium text-slate-700">{item.description}</td>
                                <td className="py-2 pr-3 text-center text-slate-500">{item.qty}</td>
                                <td className="py-2 pr-3 text-right text-slate-500">₹{fmt(item.rate)}</td>
                                <td className="py-2 text-right font-semibold text-slate-700">₹{fmt(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-sm border-t border-slate-200 pt-3">
                        <div className="flex gap-8 text-slate-500"><span>Subtotal</span><span className="font-semibold text-slate-700 w-24 text-right">₹{fmt(bill.subtotal)}</span></div>
                        {bill.discountAmount > 0 && <div className="flex gap-8 text-red-500"><span>Discount {bill.discountType === "percent" ? `(${bill.discountValue}%)` : ""}</span><span className="font-semibold w-24 text-right">- ₹{fmt(bill.discountAmount)}</span></div>}
                        {bill.gstPercent > 0 && <div className="flex gap-8 text-slate-500"><span>GST ({bill.gstPercent}%)</span><span className="font-semibold text-slate-700 w-24 text-right">₹{fmt(bill.gstAmount)}</span></div>}
                        <div className="flex gap-8 text-blue-700 font-black text-base border-t border-slate-200 pt-1.5 mt-0.5"><span>Total</span><span className="w-24 text-right">₹{fmt(bill.total)}</span></div>
                      </div>
                      {bill.notes && (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-slate-600">
                          <StickyNote className="h-3.5 w-3.5 inline mr-1 text-yellow-600" />
                          <strong>Notes:</strong> {bill.notes}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => downloadPDF(bill)} className="gap-1 text-xs">
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => shareWhatsApp(bill)} className="gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50">
                          <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────── Create / Edit Bill Dialog ─────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              {editing ? `Edit Bill #${String(editing.billNo).padStart(4, "0")}` : `New Bill #${String(nextBillNo).padStart(4, "0")}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">

            {/* ── Basic Info ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Bill Details</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Date *</Label>
                  <Input type="date" value={form.date} onChange={f("date")} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Payment Mode</Label>
                  <select value={form.paymentMode} onChange={f("paymentMode")}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Customer ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Customer Details</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Customer Name *</Label>
                  <Input placeholder="e.g. Ramesh Kumar" value={form.customerName} onChange={f("customerName")} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Phone Number</Label>
                  <Input type="tel" placeholder="10-digit mobile" value={form.customerPhone} onChange={f("customerPhone")} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs mb-1 block">Address</Label>
                  <Input placeholder="Customer address (optional)" value={form.customerAddress} onChange={f("customerAddress")} />
                </div>
              </div>
            </section>

            {/* ── Items ── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Items / Services</p>
                <button onClick={addItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
              </div>
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-400 uppercase font-semibold px-1 hidden sm:grid">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate (₹)</span>
                  <span className="col-span-2 text-right">Amount (₹)</span>
                  <span className="col-span-1" />
                </div>
                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <Input
                        placeholder={`Item ${idx + 1} name / description`}
                        value={item.description}
                        onChange={e => updateItem(item.id, "description", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input type="number" min={0} step="0.01" placeholder="Qty"
                        value={item.qty}
                        onChange={e => updateItem(item.id, "qty", parseFloat(e.target.value) || 0)}
                        className="text-sm text-center" />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input type="number" min={0} step="0.01" placeholder="Rate"
                        value={item.rate || ""}
                        onChange={e => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                        className="text-sm text-right" />
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right">
                      <div className="h-10 flex items-center justify-end pr-1 font-semibold text-sm text-slate-700">
                        ₹{fmt(item.amount)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeItem(item.id)}
                        className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={addItem}
                  className="w-full border border-dashed border-slate-300 hover:border-blue-400 rounded-lg py-2 text-xs text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add another item
                </button>
              </div>
            </section>

            {/* ── Discount & Tax ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Discount & Tax</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Discount Type</Label>
                  <select value={form.discountType} onChange={f("discountType")}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
                    <option value="flat">Flat (₹ amount)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">
                    Discount {form.discountType === "percent" ? "(%)" : "(₹)"}
                  </Label>
                  <Input type="number" min={0} placeholder="0"
                    value={form.discountValue} onChange={f("discountValue")} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">GST (%)</Label>
                  <Input type="number" min={0} max={100} placeholder="0 (skip if not applicable)"
                    value={form.gstPercent} onChange={f("gstPercent")} />
                </div>
              </div>
            </section>

            {/* ── Totals preview ── */}
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span className="font-semibold">₹{fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount {form.discountType === "percent" ? `(${form.discountValue}%)` : ""}</span>
                  <span className="font-semibold">- ₹{fmt(discountAmount)}</span>
                </div>
              )}
              {gstAmount > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>GST ({form.gstPercent}%)</span><span className="font-semibold">₹{fmt(gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-blue-700 border-t border-slate-200 pt-2">
                <span>TOTAL</span><span>₹{fmt(total)}</span>
              </div>
            </section>

            {/* ── Payment ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Payment Received</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Amount Paid (₹)</Label>
                  <Input type="number" min={0} placeholder={`Max ₹${fmt(total)}`}
                    value={form.amountPaid} onChange={f("amountPaid")} />
                  {Number(form.amountPaid) > 0 && Number(form.amountPaid) < total && (
                    <p className="text-xs text-amber-600 mt-1">
                      Balance due: ₹{fmt(Math.max(0, total - Number(form.amountPaid)))}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Notes (optional)</Label>
                  <Input placeholder="Any notes for this bill…" value={form.notes} onChange={f("notes")} />
                </div>
              </div>
            </section>

          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => {
              // Preview PDF without saving
              if (!form.customerName.trim()) { toast.error("Add customer name first"); return; }
              const previewBill: Bill = {
                id: "preview",
                billNo: editing ? editing.billNo : nextBillNo,
                date: form.date,
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.trim() || undefined,
                customerAddress: form.customerAddress.trim() || undefined,
                items: items.filter(i => i.description.trim()),
                subtotal, discountType: form.discountType,
                discountValue: Number(form.discountValue) || 0,
                discountAmount, gstPercent: Number(form.gstPercent) || 0,
                gstAmount, total,
                amountPaid: Number(form.amountPaid) || 0,
                paymentMode: form.paymentMode,
                paymentStatus: "paid",
                notes: form.notes.trim() || undefined,
                createdAt: Date.now(),
              };
              const doc = generateBillPDF(previewBill, shop);
              window.open(doc.output("bloburl"), "_blank");
            }} className="gap-1">
              <FileText className="h-4 w-4" /> Preview PDF
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 gap-1">
              <Receipt className="h-4 w-4" />
              {editing ? "Save Changes" : "Create & Save Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
