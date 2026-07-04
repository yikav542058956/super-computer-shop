import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ref, push, set, get, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShoppingBag, Plus, Loader2, CheckCircle, Search, X, Package,
  ChevronRight, User, Phone, MapPin, CreditCard,
  FileText, Download, IndianRupee, AlertCircle, Percent,
  History, Calendar, Banknote, Clock, Eye, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import jsPDF from "jspdf";
import AddProductDialog, { type SavedProduct } from "@/components/admin/AddProductDialog";

/* ─── Types ───────────────────────────────────────── */
interface Product {
  id: string; name: string; price?: number; discountPrice?: number;
  images?: string[]; brand?: string; category?: string; gstRate?: number;
}

const STEPS = ["Customer", "Product", "Payment", "Bill"] as const;
type Step = 0 | 1 | 2 | 3;

function genBillNo(): string {
  const n = Date.now().toString(36).toUpperCase().slice(-6);
  return `SC-${n}`;
}

/* ─── Store Info type ─────────────────────────────── */
interface StoreInfo {
  storeName: string; tagline: string; phone: string; altPhone: string;
  email: string; address: string; gstin: string; billFooter: string;
}
const DEFAULT_STORE: StoreInfo = {
  storeName: "Super Computer",
  tagline: "Laptop & Computer Store | Authorized Reseller",
  phone: "9761809960", altPhone: "",
  email: "info@supercomputer.in",
  address: "Mirehachi, Kasganj Road, Distt. Etah, UP - 207001",
  gstin: "",
  billFooter: "Warranty claims — please keep this bill. No returns after 7 days.",
};

/* ─── Professional PDF Bill Generator ────────────────── */
function generateBillPDF(
  bill: {
    billNo: string; date: string;
    customer: { name: string; phone: string; address: string };
    items: { name: string; qty: number; unitPrice: number; gstRate: number; gstAmount: number; total: number }[];
    subtotal: number; gstTotal: number; grandTotal: number;
    amountPaid: number; change: number; dueAmount: number;
    paymentMethod: string; notes: string;
  },
  store: StoreInfo = DEFAULT_STORE
) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 7;
  const COL = W - MARGIN * 2;
  let y = 0;

  const setColor = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const fillRect = (x: number, yy: number, w: number, h: number, r: number, g: number, b: number) => {
    doc.setFillColor(r, g, b); doc.rect(x, yy, w, h, "F");
  };
  const drawLine = (x1: number, y1: number, x2: number, y2: number, r = 220, g = 220, b = 220) => {
    doc.setDrawColor(r, g, b); doc.line(x1, y1, x2, y2);
  };

  const FOOTER_RESERVE = 28;
  const checkNewPage = (neededH: number) => {
    if (y + neededH > H - FOOTER_RESERVE) {
      doc.addPage();
      fillRect(0, 0, W, 8, 76, 29, 149);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setColor(255, 255, 255);
      doc.text(`${store.storeName.toUpperCase()} — continued`, MARGIN, 5.5);
      doc.text(`Bill: ${bill.billNo}`, W - MARGIN, 5.5, { align: "right" });
      y = 12;
    }
  };

  fillRect(0, 0, W, 30, 76, 29, 149);
  fillRect(0, 0, W, 2, 124, 58, 237);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  setColor(255, 255, 255);
  doc.text(("⚡ " + store.storeName).toUpperCase(), MARGIN, 11);
  if (store.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(200, 180, 255);
    doc.text(store.tagline, MARGIN, 17);
  }
  doc.setFontSize(6.5);
  setColor(210, 200, 255);
  const contactParts: string[] = [];
  if (store.phone) contactParts.push(`Tel: +91 ${store.phone}`);
  if (store.altPhone) contactParts.push(`/ ${store.altPhone}`);
  if (store.email) contactParts.push(`| ${store.email}`);
  if (contactParts.length > 0) doc.text(contactParts.join("  "), MARGIN, 22);
  if (store.address) {
    doc.setFontSize(6);
    setColor(180, 165, 235);
    const addrLines = doc.splitTextToSize(store.address, COL);
    doc.text(addrLines[0], MARGIN, 27);
  }
  if (store.gstin) {
    doc.setFontSize(6);
    setColor(180, 165, 235);
    doc.text(`GSTIN: ${store.gstin}`, W - MARGIN, 27, { align: "right" });
  }
  y = 33;

  fillRect(0, y, W, 9, 245, 242, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(76, 29, 149);
  doc.text("TAX INVOICE / RECEIPT", MARGIN, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(80, 60, 160);
  doc.text(`Bill No: ${bill.billNo}`, W - MARGIN, y + 4, { align: "right" });
  doc.text(`Date: ${bill.date}`, W - MARGIN, y + 8, { align: "right" });
  y += 12;

  const leftW = COL * 0.55;
  const rightW = COL * 0.42;
  const rightX = MARGIN + leftW + COL * 0.03;

  fillRect(MARGIN, y, leftW, 24, 249, 247, 255);
  doc.setDrawColor(200, 190, 240);
  doc.rect(MARGIN, y, leftW, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  setColor(120, 90, 190);
  doc.text("BILL TO", MARGIN + 2.5, y + 4.5);
  drawLine(MARGIN + 2, y + 5.5, MARGIN + leftW - 2, y + 5.5, 200, 190, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColor(25, 20, 50);
  doc.text(bill.customer.name, MARGIN + 2.5, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(80, 70, 110);
  if (bill.customer.phone) doc.text(`Ph: ${bill.customer.phone}`, MARGIN + 2.5, y + 15.5);
  if (bill.customer.address) {
    const aLines = doc.splitTextToSize(bill.customer.address, leftW - 5);
    doc.text(aLines[0], MARGIN + 2.5, y + 20);
  }

  const isPaid = bill.dueAmount <= 0;
  fillRect(rightX, y, rightW, 24, isPaid ? 240 : 255, isPaid ? 253 : 242, isPaid ? 244 : 242);
  doc.setDrawColor(isPaid ? 134 : 220, isPaid ? 239 : 120, isPaid ? 172 : 120);
  doc.rect(rightX, y, rightW, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  setColor(isPaid ? 22 : 180, isPaid ? 163 : 50, isPaid ? 74 : 50);
  doc.text("PAYMENT STATUS", rightX + 2.5, y + 4.5);
  drawLine(rightX + 2, y + 5.5, rightX + rightW - 2, y + 5.5, isPaid ? 134 : 220, isPaid ? 239 : 120, isPaid ? 172 : 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(40, 40, 40);
  doc.text(`Total: ${formatINR(bill.grandTotal)}`, rightX + 2.5, y + 10.5);
  setColor(isPaid ? 22 : 16, isPaid ? 163 : 163, isPaid ? 74 : 74);
  doc.text(`Paid: ${formatINR(bill.amountPaid)}`, rightX + 2.5, y + 15.5);
  if (bill.dueAmount > 0) {
    setColor(185, 28, 28);
    doc.text(`Due: ${formatINR(bill.dueAmount)}`, rightX + 2.5, y + 20.5);
  } else {
    setColor(22, 163, 74);
    doc.text("FULLY PAID ✓", rightX + 2.5, y + 20.5);
  }
  y += 27;

  const C_NO   = MARGIN;
  const C_NAME = MARGIN + 6;
  const C_QTY  = MARGIN + COL * 0.54;
  const C_RATE = MARGIN + COL * 0.66;
  const C_GST  = MARGIN + COL * 0.78;
  const C_TOTAL = W - MARGIN;

  fillRect(MARGIN, y, COL, 7.5, 76, 29, 149);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setColor(255, 255, 255);
  doc.text("#",        C_NO + 1,  y + 5);
  doc.text("PRODUCT",  C_NAME,    y + 5);
  doc.text("QTY",      C_QTY,     y + 5, { align: "center" });
  doc.text("RATE",     C_RATE,    y + 5, { align: "center" });
  doc.text("GST",      C_GST,     y + 5, { align: "center" });
  doc.text("AMOUNT",   C_TOTAL,   y + 5, { align: "right" });
  y += 8;

  const NAME_COL_W = C_QTY - C_NAME - 3;
  if (bill.items.length === 0) {
    checkNewPage(10);
    fillRect(MARGIN, y, COL, 10, 249, 246, 255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    setColor(160, 150, 180);
    doc.text("No items", W / 2, y + 6.5, { align: "center" });
    y += 10;
  }

  bill.items.forEach((item, idx) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const nameLines: string[] = doc.splitTextToSize(item.name, NAME_COL_W);
    const visLines = nameLines.slice(0, 2);
    const rowH = visLines.length > 1 ? 15 : 10;
    checkNewPage(rowH + 2);
    if (idx % 2 === 0) {
      fillRect(MARGIN, y, COL, rowH, 249, 246, 255);
    } else {
      fillRect(MARGIN, y, COL, rowH, 255, 255, 255);
    }
    drawLine(MARGIN, y + rowH, MARGIN + COL, y + rowH, 230, 225, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setColor(100, 80, 160);
    const rowMidY = y + rowH / 2 + 2;
    doc.text(String(idx + 1), C_NO + 1, rowMidY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(20, 15, 40);
    if (visLines.length > 1) {
      doc.text(visLines[0], C_NAME, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      setColor(80, 70, 100);
      doc.text(visLines[1], C_NAME, y + 10.5);
    } else {
      doc.text(visLines[0] ?? "", C_NAME, rowMidY);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setColor(80, 70, 100);
    doc.text(String(item.qty),                                    C_QTY,   rowMidY, { align: "center" });
    doc.text(formatINR(item.unitPrice),                           C_RATE,  rowMidY, { align: "center" });
    doc.text(item.gstRate > 0 ? `${item.gstRate}%` : "—",        C_GST,   rowMidY, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(76, 29, 149);
    doc.text(formatINR(item.total), C_TOTAL, rowMidY, { align: "right" });
    y += rowH;
  });

  checkNewPage(50);
  y += 3;
  drawLine(MARGIN, y, W - MARGIN, y, 180, 170, 220);
  y += 4;

  const totRows: Array<{ label: string; val: string; bold?: boolean; red?: boolean; green?: boolean; highlight?: boolean }> = [
    { label: "Subtotal", val: formatINR(bill.subtotal) },
  ];
  if (bill.gstTotal > 0) {
    totRows.push({ label: `GST Amount`, val: `+ ${formatINR(bill.gstTotal)}` });
  }
  totRows.push({ label: "GRAND TOTAL", val: formatINR(bill.grandTotal), highlight: true });
  const pmtLabel = bill.paymentMethod
    ? bill.paymentMethod.charAt(0).toUpperCase() + bill.paymentMethod.slice(1)
    : "Cash";
  totRows.push({ label: `Paid via ${pmtLabel}`, val: formatINR(bill.amountPaid), green: true });
  if (bill.change > 0) {
    totRows.push({ label: "Change Returned", val: `− ${formatINR(bill.change)}` });
  }
  if (bill.dueAmount > 0) {
    totRows.push({ label: "⚠  BALANCE DUE", val: formatINR(bill.dueAmount), red: true });
  }

  const totX = MARGIN + COL * 0.45;
  const totW = COL * 0.55;

  totRows.forEach(row => {
    if (row.highlight) {
      fillRect(totX - 2, y - 1.5, totW + 4, 9, 76, 29, 149);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(255, 255, 255);
      doc.text(row.label, totX, y + 5.5);
      doc.text(row.val, W - MARGIN, y + 5.5, { align: "right" });
      y += 10;
    } else if (row.red) {
      fillRect(totX - 2, y - 1.5, totW + 4, 8, 254, 242, 242);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setColor(185, 28, 28);
      doc.text(row.label, totX, y + 5);
      doc.text(row.val, W - MARGIN, y + 5, { align: "right" });
      y += 9;
    } else if (row.green) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(22, 101, 52);
      doc.text(row.label, totX, y + 5);
      doc.text(row.val, W - MARGIN, y + 5, { align: "right" });
      y += 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(90, 80, 110);
      doc.text(row.label, totX, y + 5);
      setColor(30, 20, 60);
      doc.text(row.val, W - MARGIN, y + 5, { align: "right" });
      y += 8;
    }
  });

  if (bill.notes) {
    const noteLines = doc.splitTextToSize(bill.notes, COL - 20);
    const visNoteLines = noteLines.slice(0, 3);
    const noteBoxH = 6 + visNoteLines.length * 4.5;
    checkNewPage(noteBoxH + 4);
    y += 3;
    fillRect(MARGIN, y, COL, noteBoxH, 255, 251, 235);
    doc.setDrawColor(253, 224, 71);
    doc.rect(MARGIN, y, COL, noteBoxH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setColor(120, 80, 10);
    doc.text("NOTE:", MARGIN + 2.5, y + 5);
    doc.setFont("helvetica", "normal");
    setColor(80, 60, 10);
    visNoteLines.forEach((line: string, li: number) => doc.text(line, MARGIN + 14, y + 5 + li * 4.5));
    y += noteBoxH + 3;
  }

  const footerH = 22;
  const footerY = Math.max(y + 6, H - footerH);
  drawLine(MARGIN, footerY - 3, W - MARGIN, footerY - 3, 180, 160, 230);
  fillRect(0, footerY, W, footerH, 245, 243, 255);
  fillRect(0, H - 2, W, 2, 124, 58, 237);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColor(76, 29, 149);
  doc.text(`Thank you for choosing ${store.storeName}!`, W / 2, footerY + 7, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setColor(120, 100, 170);
  const footerMsg = store.billFooter || "Warranty claims — please keep this bill.";
  const footerMsgLines = doc.splitTextToSize(footerMsg, COL - 4).slice(0, 2) as string[];
  if (footerMsgLines.length > 1) {
    doc.text(footerMsgLines[0], W / 2, footerY + 12, { align: "center" });
    doc.text(footerMsgLines[1], W / 2, footerY + 16, { align: "center" });
  } else {
    doc.text(footerMsgLines[0] ?? footerMsg, W / 2, footerY + 13, { align: "center" });
  }
  setColor(160, 140, 200);
  doc.setFontSize(6);
  doc.text("Computer generated document — no signature required", W / 2, footerY + 20, { align: "center" });
  doc.save(`Bill_${bill.billNo}_${bill.customer.name.replace(/\s+/g, "_")}.pdf`);
}

/* ─── Sale Detail Dialog ──────────────────────────── */
function SaleDetailDialog({ sale, open, onClose }: { sale: any; open: boolean; onClose: () => void }) {
  if (!sale) return null;
  const items = Array.isArray(sale.items) ? sale.items : Object.values(sale.items || {});
  const address = sale.address || {};
  const customerName = address.name || sale.customerName || "—";
  const phone = address.phone || sale.phone || "—";
  const addr = address.address || address.city || "—";
  const createdAt = sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const isPaid = (sale.paymentStatus === "paid") || (sale.dueAmount === 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Sale Details — {sale.billNo || sale.id?.slice(-8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Customer</p>
            <p className="font-bold text-slate-800">{customerName}</p>
            {phone !== "—" && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{phone}</p>}
            {addr !== "—" && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{addr}</p>}
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar className="h-3 w-3" />{createdAt}</p>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Product(s)</p>
            <div className="space-y-2">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.qty} × {formatINR(item.price || item.unitPrice)}</p>
                    {item.gstRate > 0 && <p className="text-xs text-purple-600">GST {item.gstRate}% = {formatINR(item.gstAmount)}</p>}
                  </div>
                  <p className="font-bold text-orange-700">{formatINR(item.total || (item.price * item.qty))}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Payment Summary</p>
            {sale.subtotal > 0 && (
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatINR(sale.subtotal)}</span></div>
            )}
            {sale.gstAmount > 0 && (
              <div className="flex justify-between text-purple-700"><span>GST</span><span>+{formatINR(sale.gstAmount)}</span></div>
            )}
            <div className="flex justify-between font-black text-base border-t pt-2">
              <span>Grand Total</span>
              <span className="text-orange-700">{formatINR(sale.finalAmount || sale.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Amount Paid</span>
              <span>{formatINR(sale.amountPaid)}</span>
            </div>
            {sale.change > 0 && (
              <div className="flex justify-between text-slate-500"><span>Change Returned</span><span>{formatINR(sale.change)}</span></div>
            )}
            {(sale.dueAmount > 0) && (
              <div className="flex justify-between bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                <span className="text-red-700 font-bold">⚠ Balance Due</span>
                <span className="text-red-700 font-bold">{formatINR(sale.dueAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 text-xs">
              <span>Payment Method</span>
              <span className="capitalize">{sale.paymentMethod || "Cash"}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {isPaid ? "✅ Fully Paid" : "⚠ Partial / Due"}
            </span>
            {sale.dueDate && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Due: {new Date(sale.dueDate).toLocaleDateString("en-IN")}
              </span>
            )}
          </div>

          {sale.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <strong>Note:</strong> {sale.notes}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── History Tab ─────────────────────────────────── */
function SalesHistory() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "partial">("all");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) {
        const all = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
        const offline = all.filter((o: any) => o.source === "offline");
        offline.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setSales(offline);
      } else {
        setSales([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    let fromTs: number | null = null, toTs: number | null = null;
    if (dateFilter === "today") { fromTs = sod(now); toTs = eod(now); }
    else if (dateFilter === "yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); fromTs = sod(y); toTs = eod(y); }
    else if (dateFilter === "week") { const w = new Date(now); w.setDate(now.getDate() - 6); fromTs = sod(w); toTs = eod(now); }
    else if (dateFilter === "custom" && customFrom && customTo) { fromTs = new Date(customFrom).getTime(); toTs = eod(new Date(customTo)); }

    return sales.filter(s => {
      const name = (s.address?.name || s.customerName || "").toLowerCase();
      const phone = (s.address?.phone || s.phone || "").toLowerCase();
      const itemsArr = Array.isArray(s.items) ? s.items : Object.values(s.items || {});
      const product = ((itemsArr[0] as any)?.name || "") as string;
      const bill = (s.billNo || "").toLowerCase();
      const q = search.toLowerCase();
      const matchSearch = !q || name.includes(q) || phone.includes(q) || product.toLowerCase().includes(q) || bill.includes(q);
      const due = Number(s.dueAmount) || 0;
      const matchStatus = filterStatus === "all"
        ? true
        : filterStatus === "paid"
        ? (s.paymentStatus === "paid" || due === 0)
        : (s.paymentStatus === "partial" || due > 0);
      const ts = s.createdAt || 0;
      const matchDate = fromTs === null || (ts >= fromTs && ts <= toTs!);
      return matchSearch && matchStatus && matchDate;
    });
  }, [sales, search, filterStatus, dateFilter, customFrom, customTo]);

  const totalPending = useMemo(() => sales.reduce((sum, s) => sum + (Number(s.dueAmount) || 0), 0), [sales]);
  const pendingCount = useMemo(() => sales.filter(s => (s.dueAmount || 0) > 0).length, [sales]);
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0), [sales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="ml-3 text-slate-500">Loading records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
          <p className="text-2xl font-black text-slate-800">{sales.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Sales</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-green-700">{formatINR(totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-0.5">Total Collected</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${pendingCount > 0 ? "bg-red-50 border-red-200" : "bg-slate-50"}`}>
          <p className={`text-2xl font-black ${pendingCount > 0 ? "text-red-700" : "text-slate-400"}`}>{formatINR(totalPending)}</p>
          <p className={`text-xs mt-0.5 ${pendingCount > 0 ? "text-red-600" : "text-slate-400"}`}>
            {pendingCount > 0 ? `${pendingCount} customer(s) pending` : "No Pending"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Search + Status */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, product..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "paid", "partial"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === f
                    ? f === "all" ? "bg-orange-600 text-white" : f === "paid" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "all" ? "All" : f === "paid" ? "✅ Paid" : "⚠ Due"}
              </button>
            ))}
          </div>
        </div>
        {/* Date Filter */}
        <div className="flex gap-1 flex-wrap items-center">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {(["all", "today", "yesterday", "week", "custom"] as const).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateFilter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "all" ? "All Time" : f === "today" ? "Today" : f === "yesterday" ? "Yesterday" : f === "week" ? "This Week" : "Custom"}
            </button>
          ))}
          {dateFilter === "custom" && (
            <>
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 text-xs w-32 px-2" />
              <span className="text-slate-400 text-xs">→</span>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 text-xs w-32 px-2" />
            </>
          )}
        </div>
      </div>

      {/* Records List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No records found</p>
          <p className="text-slate-400 text-sm mt-1">
            {sales.length === 0 ? "No offline sales yet" : "Try a different search or filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sale => {
            const items = Array.isArray(sale.items) ? sale.items : Object.values(sale.items || {});
            const firstItem = items[0] as any;
            const customerName = sale.address?.name || sale.customerName || "—";
            const phone = sale.address?.phone || sale.phone || "";
            const isPaid = sale.paymentStatus === "paid" || sale.dueAmount === 0;
            const createdDate = sale.createdAt
              ? new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "—";

            return (
              <div
                key={sale.id}
                className="bg-white border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedSale(sale)}
              >
                <div className="flex items-start gap-3">
                  {/* Left: Customer + Product */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{customerName}</p>
                      {phone && (
                        <span className="text-xs text-slate-500 flex items-center gap-0.5">
                          <Phone className="h-3 w-3" />{phone}
                        </span>
                      )}
                    </div>
                    {firstItem && (
                      <p className="text-sm text-slate-600 mt-0.5 truncate">
                        📦 {firstItem.name}
                        {firstItem.qty > 1 ? ` × ${firstItem.qty}` : ""}
                        {items.length > 1 ? ` + ${items.length - 1} more` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{createdDate}
                      </span>
                      {sale.billNo && (
                        <span className="text-xs text-slate-400">Bill: {sale.billNo}</span>
                      )}
                      <span className="text-xs text-slate-500 capitalize flex items-center gap-1">
                        <Banknote className="h-3 w-3" />{sale.paymentMethod || "Cash"}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount + Status */}
                  <div className="text-right shrink-0">
                    <p className="font-black text-base text-orange-700">{formatINR(sale.finalAmount || sale.grandTotal || 0)}</p>
                    <p className="text-xs text-green-700">Paid: {formatINR(sale.amountPaid || 0)}</p>
                    {(sale.dueAmount || 0) > 0 ? (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        ⚠ {formatINR(sale.dueAmount)} due
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        ✅ Paid
                      </span>
                    )}
                  </div>
                </div>

                {/* Due Date Warning */}
                {sale.dueDate && (sale.dueAmount || 0) > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-amber-700">
                    <Clock className="h-3 w-3" />
                    Due Date: {new Date(sale.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}

                <div className="mt-2 flex justify-end">
                  <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                    <Eye className="h-3 w-3" /> View Details
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SaleDetailDialog sale={selectedSale} open={!!selectedSale} onClose={() => setSelectedSale(null)} />
    </div>
  );
}

/* ─── Main Component ──────────────────────────────── */
export default function AdminOfflineSale() {
  const [view, setView] = useState<"new" | "history">("new");
  const [step, setStep] = useState<Step>(0);
  const [billNo] = useState(genBillNo);

  /* ── Step 0: Customer ─────────────── */
  const [cust, setCust] = useState({ name: "", phone: "", address: "" });

  /* ── Step 1: Product ──────────────── */
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState("1");
  const searchRef = useRef<HTMLDivElement>(null);

  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addProductInitialName, setAddProductInitialName] = useState("");

  /* ── Step 2: Payment ──────────────── */
  const [salePrice, setSalePrice] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  /* ── Step 3: Save/Done ────────────── */
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState<any>(null);
  const [currentBillNo, setCurrentBillNo] = useState(billNo);

  /* ── Store Info for PDF ────────────── */
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE);

  useEffect(() => {
    get(ref(db, "products")).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
        setProducts(list);
      }
    });
    get(ref(db, "settings/storeInfo")).then(snap => {
      if (snap.exists()) setStoreInfo(s => ({ ...s, ...snap.val() }));
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectProduct = useCallback((p: Product) => {
    setSelectedProduct(p);
    setSearchQuery(p.name);
    setShowDropdown(false);
    const price = p.discountPrice || p.price || 0;
    setSalePrice(String(price));
    if (p.gstRate && p.gstRate > 0) {
      setGstEnabled(true);
      setGstRate(String(p.gstRate));
    }
  }, []);

  const clearProduct = () => {
    setSelectedProduct(null);
    setSearchQuery("");
    setSalePrice("");
    setGstEnabled(false);
    setGstRate("18");
  };

  const filtered = searchQuery.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const unitPrice = Number(salePrice) || 0;
  const quantity = Number(qty) || 1;
  const subtotal = unitPrice * quantity;
  const gstAmount = gstEnabled ? Math.round((subtotal * Number(gstRate)) / 100) : 0;
  const grandTotal = subtotal + gstAmount;
  const paid = amountPaid.trim() === "" ? grandTotal : (Number(amountPaid) || 0);
  const change = Math.max(0, paid - grandTotal);
  const dueAmount = Math.max(0, grandTotal - paid);

  const handleProductSaved = (prod: SavedProduct) => {
    const newProdItem: Product = {
      id: prod.id,
      name: prod.name,
      brand: prod.brand,
      category: prod.category,
      price: prod.price,
      discountPrice: prod.discountPrice,
      images: prod.images,
    };
    setProducts(prev => [...prev, newProdItem]);
    selectProduct(newProdItem);
  };

  const handleSave = async () => {
    const productName = selectedProduct?.name || searchQuery.trim();
    if (!cust.name.trim()) { toast.error("Customer name is required"); setStep(0); return; }
    if (!productName) { toast.error("Please select a product"); setStep(1); return; }
    if (!salePrice || grandTotal <= 0) { toast.error("Enter a valid sale amount"); setStep(2); return; }

    setSaving(true);
    try {
      const orderRef = push(ref(db, "orders"));
      const billData = {
        source: "offline",
        billNo: currentBillNo,
        orderStatus: "delivered",
        paymentStatus: dueAmount > 0 ? "partial" : "paid",
        paymentMethod,
        finalAmount: grandTotal,
        subtotal,
        gstAmount,
        gstRate: gstEnabled ? Number(gstRate) : 0,
        deliveryCharge: 0,
        amountPaid: paid,
        change,
        dueAmount,
        dueDate: dueDate || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        address: {
          name: cust.name.trim(),
          phone: cust.phone.trim(),
          city: "Walk-in",
          state: "",
          pincode: "",
          address: cust.address.trim() || "In-store / Offline sale",
        },
        items: [{
          name: productName,
          productId: selectedProduct?.id || null,
          qty: quantity,
          price: unitPrice,
          gstRate: gstEnabled ? Number(gstRate) : 0,
          gstAmount,
          total: grandTotal,
          image: selectedProduct?.images?.[0] || null,
        }],
        notes: notes.trim(),
        statusHistory: [{ status: "delivered", timestamp: Date.now(), note: "Offline / in-store sale added by admin" }],
      };

      await set(orderRef, billData);

      if (dueAmount > 0) {
        const ledgerRef = push(ref(db, "ledger"));
        await set(ledgerRef, {
          customerName: cust.name.trim(),
          phone: cust.phone.trim(),
          address: cust.address.trim(),
          amount: dueAmount,
          originalTotal: grandTotal,
          amountPaid: paid,
          billNo: currentBillNo,
          orderId: orderRef.key,
          productName,
          dueDate: dueDate || null,
          createdAt: Date.now(),
          status: "pending",
        });
      }

      setSavedBill({ ...billData, orderId: orderRef.key, productName });
      toast.success(`✅ Sale saved! Bill #${currentBillNo}`);
      setStep(3);
    } catch (e: any) {
      toast.error("Could not save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = () => {
    if (!savedBill) return;
    generateBillPDF({
      billNo: currentBillNo,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
      customer: { name: cust.name, phone: cust.phone, address: cust.address },
      items: [{
        name: savedBill.productName,
        qty: quantity,
        unitPrice,
        gstRate: gstEnabled ? Number(gstRate) : 0,
        gstAmount,
        total: grandTotal,
      }],
      subtotal,
      gstTotal: gstAmount,
      grandTotal,
      amountPaid: paid || grandTotal,
      change,
      dueAmount,
      paymentMethod,
      notes,
    }, storeInfo);
  };

  const startNew = () => {
    setCurrentBillNo(genBillNo());
    setStep(0);
    setCust({ name: "", phone: "", address: "" });
    clearProduct();
    setQty("1");
    setSalePrice("");
    setGstEnabled(false);
    setGstRate("18");
    setPaymentMethod("cash");
    setAmountPaid("");
    setNotes("");
    setDueDate("");
    setSavedBill(null);
  };

  const canGoNext = () => {
    if (step === 0) return !!cust.name.trim();
    if (step === 1) return !!(selectedProduct || searchQuery.trim());
    if (step === 2) return !!salePrice && grandTotal > 0;
    return false;
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Offline / In-Store Sale</h1>
              <p className="text-slate-500 text-xs">
                {view === "new"
                  ? `Bill #${currentBillNo} · ${new Date().toLocaleDateString("en-IN")}`
                  : "All past sale records"}
              </p>
            </div>
          </div>
          {/* Tab toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView("new")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                view === "new" ? "bg-orange-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> New Sale
            </button>
            <button
              onClick={() => setView("history")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                view === "history" ? "bg-orange-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <History className="h-3.5 w-3.5" /> Records
            </button>
          </div>
        </div>

        {/* ═══ HISTORY VIEW ═══════════════════════════════ */}
        {view === "history" && <SalesHistory />}

        {/* ═══ NEW SALE VIEW ══════════════════════════════ */}
        {view === "new" && (
          <>
            {/* Step progress */}
            <div className="flex items-center gap-1 mb-6">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        step === i
                          ? "bg-orange-600 text-white shadow-lg scale-110"
                          : step > i
                          ? "bg-green-500 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {step > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-semibold mt-1 ${step === i ? "text-orange-600" : step > i ? "text-green-600" : "text-slate-400"}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mt-[-12px] transition-all ${step > i ? "bg-green-400" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* ── STEP 0: Customer ─────────────────── */}
            {step === 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-5 w-5 text-orange-500" /> Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Customer Name <span className="text-red-500">*</span></Label>
                    <Input
                      autoFocus
                      placeholder="e.g. Ramesh Kumar"
                      value={cust.name}
                      onChange={e => setCust(c => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Mobile Number</Label>
                    <Input
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      value={cust.phone}
                      onChange={e => setCust(c => ({ ...c, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address (optional)</Label>
                    <Textarea
                      placeholder="Street, Area, City..."
                      rows={2}
                      value={cust.address}
                      onChange={e => setCust(c => ({ ...c, address: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── STEP 1: Product ──────────────────── */}
            {step === 1 && (
              <Card className="border-2 border-orange-100">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-orange-500" /> Select Product
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        autoFocus
                        placeholder="Search by name or brand..."
                        className="pl-9 pr-9"
                        value={searchQuery}
                        disabled={!!selectedProduct}
                        onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedProduct(null); }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      {(searchQuery || selectedProduct) && (
                        <button onClick={clearProduct} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {showDropdown && searchQuery.trim().length > 0 && !selectedProduct && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {filtered.length > 0 ? (
                          filtered.map(p => (
                            <button key={p.id} type="button" onClick={() => selectProduct(p)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 text-left transition-colors">
                              <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                                {p.images?.[0]
                                  ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                                  : <Package className="h-5 w-5 text-slate-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                                <p className="text-xs text-slate-400">{p.brand}{p.gstRate ? ` · GST ${p.gstRate}%` : ""}</p>
                              </div>
                              <p className="text-sm font-bold text-orange-600 shrink-0">{formatINR(p.discountPrice || p.price || 0)}</p>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-sm text-slate-500 mb-3">
                              "<strong>{searchQuery}</strong>" not found in catalog
                            </p>
                            <Button size="sm"
                              onClick={() => { setAddProductInitialName(searchQuery); setAddProductOpen(true); setShowDropdown(false); }}
                              className="gap-1.5 bg-orange-600 hover:bg-orange-700">
                              <Plus className="h-3.5 w-3.5" /> Add to Catalog
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedProduct && (
                    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <div className="h-14 w-14 rounded-xl bg-white border border-orange-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {selectedProduct.images?.[0]
                          ? <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="h-full w-full object-cover" />
                          : <Package className="h-7 w-7 text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{selectedProduct.name}</p>
                        <p className="text-xs text-slate-500">{selectedProduct.brand}</p>
                        <p className="text-sm font-black text-orange-600">{formatINR(selectedProduct.discountPrice || selectedProduct.price || 0)}</p>
                      </div>
                      <button onClick={clearProduct} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="w-28" />
                  </div>

                  <Button variant="outline" size="sm" onClick={() => { setAddProductInitialName(""); setAddProductOpen(true); }}
                    className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 w-full">
                    <Plus className="h-3.5 w-3.5" /> Add New Product to Catalog
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── STEP 2: Payment ──────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IndianRupee className="h-5 w-5 text-orange-500" /> Price & GST
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedProduct && (
                      <div className="flex items-center gap-3 bg-slate-50 border rounded-xl p-3">
                        <Package className="h-5 w-5 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{selectedProduct.name}</p>
                          <p className="text-xs text-slate-500">Qty: {quantity} · Listed: {formatINR(selectedProduct.discountPrice || selectedProduct.price || 0)}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <Label>Sale Price (₹) <span className="text-red-500">*</span></Label>
                        <Input
                          autoFocus
                          type="number" min="0"
                          placeholder="45000"
                          value={salePrice}
                          onChange={e => setSalePrice(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400">Actual sale price (may differ from catalog)</p>
                      </div>
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <Label>Quantity</Label>
                        <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
                      </div>
                    </div>

                    {/* GST */}
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-purple-600" />
                          <Label className="text-purple-800 font-semibold">Apply GST?</Label>
                        </div>
                        <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                      </div>
                      {gstEnabled && (
                        <div className="flex items-center gap-3">
                          <Label className="shrink-0 text-sm">GST Rate:</Label>
                          <Select value={gstRate} onValueChange={setGstRate}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["5", "12", "18", "28"].map(r => (
                                <SelectItem key={r} value={r}>{r}% GST</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-purple-700 font-bold">= {formatINR(gstAmount)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-5 w-5 text-orange-500" /> Payment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Price breakdown */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>{selectedProduct?.name || "Product"} × {quantity}</span>
                        <span className="font-semibold">{formatINR(subtotal)}</span>
                      </div>
                      {gstEnabled && (
                        <div className="flex justify-between text-purple-700">
                          <span>GST ({gstRate}%)</span>
                          <span className="font-semibold">+{formatINR(gstAmount)}</span>
                        </div>
                      )}
                      <div className="h-px bg-slate-200" />
                      <div className="flex justify-between font-black text-base text-slate-900">
                        <span>GRAND TOTAL</span>
                        <span className="text-orange-700">{formatINR(grandTotal)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="upi">📱 UPI</SelectItem>
                          <SelectItem value="card">💳 Card / Swipe</SelectItem>
                          <SelectItem value="emi">🏦 EMI / Finance</SelectItem>
                          <SelectItem value="mixed">🔀 Mixed (Cash + UPI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Amount Paid by Customer (₹)</Label>
                      <Input
                        type="number" min="0"
                        placeholder={`Total: ${grandTotal} — amount paid?`}
                        value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400">Leave blank if fully paid</p>
                    </div>

                    {amountPaid && (
                      <div className={`rounded-xl p-3 space-y-1 text-sm ${
                        dueAmount > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
                      }`}>
                        {change > 0 && (
                          <div className="flex justify-between text-green-700 font-bold">
                            <span>🔄 Change to Return</span>
                            <span>{formatINR(change)}</span>
                          </div>
                        )}
                        {dueAmount > 0 && (
                          <div className="flex justify-between text-red-700 font-bold">
                            <span>⚠️ Balance Due</span>
                            <span>{formatINR(dueAmount)}</span>
                          </div>
                        )}
                        {dueAmount === 0 && change === 0 && (
                          <p className="text-green-700 font-bold">✅ Exact payment — No balance!</p>
                        )}
                      </div>
                    )}

                    {dueAmount > 0 && (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Due Date (optional)
                        </Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                        />
                        <p className="text-[10px] text-red-500">
                          ₹{dueAmount.toLocaleString("en-IN")} remaining — will be saved to ledger automatically
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Notes (optional)</Label>
                      <Textarea placeholder="Warranty, accessories, any notes..." rows={2}
                        value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── STEP 3: Bill Generated ───────────── */}
            {step === 3 && savedBill && (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h2 className="text-xl font-black text-green-800">Sale Saved! 🎉</h2>
                  <p className="text-green-600 text-sm mt-1">Bill #{currentBillNo}</p>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Bill Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-semibold">{cust.name}</span></div>
                    {cust.phone && <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{cust.phone}</span></div>}
                    <div className="flex justify-between"><span className="text-slate-500">Product</span><span className="font-semibold text-right max-w-[60%]">{savedBill.productName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Quantity</span><span>{quantity}</span></div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                    {gstEnabled && <div className="flex justify-between text-purple-700"><span>GST ({gstRate}%)</span><span>+{formatINR(gstAmount)}</span></div>}
                    <div className="flex justify-between font-black text-base"><span>Grand Total</span><span className="text-orange-700">{formatINR(grandTotal)}</span></div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between"><span className="text-slate-500">Amount Paid</span><span className="text-green-700 font-bold">{formatINR(paid || grandTotal)}</span></div>
                    {change > 0 && <div className="flex justify-between"><span className="text-slate-500">Change Returned</span><span>{formatINR(change)}</span></div>}
                    {dueAmount > 0 && (
                      <div className="flex justify-between bg-red-50 rounded-lg px-2 py-1.5">
                        <span className="text-red-700 font-bold">⚠ Balance Due</span>
                        <span className="text-red-700 font-bold">{formatINR(dueAmount)}</span>
                      </div>
                    )}
                    {dueAmount > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                        💰 {formatINR(dueAmount)} — saved to {cust.name}'s ledger{dueDate ? ` | Due: ${new Date(dueDate).toLocaleDateString("en-IN")}` : ""}
                      </div>
                    )}
                    <div className="flex justify-between"><span className="text-slate-500">Payment Method</span><span className="capitalize">{paymentMethod}</span></div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={downloadPDF} variant="outline" className="gap-2 h-12 border-purple-300 text-purple-700 hover:bg-purple-50">
                    <Download className="h-4 w-4" /> PDF Download
                  </Button>
                  <Button onClick={startNew} className="gap-2 h-12 bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4" /> New Sale
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setView("history")}
                  className="w-full gap-2 border-slate-200 text-slate-600"
                >
                  <History className="h-4 w-4" /> View All Records
                </Button>
              </div>
            )}

            {/* ── Navigation ──────────────────────── */}
            {step < 3 && (
              <div className="flex items-center justify-between mt-6 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(s => Math.max(0, s - 1) as Step)}
                  disabled={step === 0}
                  className="gap-2"
                >
                  ← Back
                </Button>
                {step < 2 ? (
                  <Button
                    onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
                    disabled={!canGoNext()}
                    className="gap-2 bg-orange-600 hover:bg-orange-700 flex-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving || !canGoNext()}
                    className="gap-2 bg-green-600 hover:bg-green-700 flex-1 h-12 font-bold text-base"
                  >
                    {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : <><CheckCircle className="h-5 w-5" /> Save Sale</>}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        initialName={addProductInitialName}
        onSaved={handleProductSaved}
      />
    </AdminLayout>
  );
}
