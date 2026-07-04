import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ShoppingBag, Plus, Loader2, CheckCircle, Search, X, Package,
  ChevronRight, User, Phone, MapPin, CreditCard,
  FileText, Download, IndianRupee, AlertCircle, Percent,
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

  /* ── helpers ── */
  const setColor = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const fillRect = (x: number, yy: number, w: number, h: number, r: number, g: number, b: number) => {
    doc.setFillColor(r, g, b); doc.rect(x, yy, w, h, "F");
  };
  const drawLine = (x1: number, y1: number, x2: number, y2: number, r = 220, g = 220, b = 220) => {
    doc.setDrawColor(r, g, b); doc.line(x1, y1, x2, y2);
  };

  // Add a new page when remaining space is insufficient; paints a mini-header on new pages
  const FOOTER_RESERVE = 28; // mm reserved at bottom for footer
  const checkNewPage = (neededH: number) => {
    if (y + neededH > H - FOOTER_RESERVE) {
      doc.addPage();
      // mini-header on continuation pages
      fillRect(0, 0, W, 8, 76, 29, 149);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setColor(255, 255, 255);
      doc.text(`${store.storeName.toUpperCase()} — continued`, MARGIN, 5.5);
      doc.text(`Bill: ${bill.billNo}`, W - MARGIN, 5.5, { align: "right" });
      y = 12;
    }
  };

  /* ══ 1. HEADER ══════════════════════════════════════════ */
  // Purple gradient-like background via layered rects
  fillRect(0, 0, W, 30, 76, 29, 149);       // dark purple base
  fillRect(0, 0, W, 2, 124, 58, 237);        // top accent strip

  // Store name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  setColor(255, 255, 255);
  doc.text(("⚡ " + store.storeName).toUpperCase(), MARGIN, 11);

  // Tagline
  if (store.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(200, 180, 255);
    doc.text(store.tagline, MARGIN, 17);
  }

  // Contact row
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

  /* ══ 2. INVOICE TITLE BAR ══════════════════════════════ */
  fillRect(0, y, W, 9, 245, 242, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(76, 29, 149);
  doc.text("TAX INVOICE / RECEIPT", MARGIN, y + 6.5);

  // Bill meta on the right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(80, 60, 160);
  doc.text(`Bill No: ${bill.billNo}`, W - MARGIN, y + 4, { align: "right" });
  doc.text(`Date: ${bill.date}`, W - MARGIN, y + 8, { align: "right" });
  y += 12;

  /* ══ 3. BILL TO & PAYMENT BADGE ════════════════════════ */
  const leftW = COL * 0.55;
  const rightW = COL * 0.42;
  const rightX = MARGIN + leftW + COL * 0.03;

  // Bill To box
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

  // Payment status badge box
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

  /* ══ 4. ITEMS TABLE ════════════════════════════════════ */
  // Column positions
  const C_NO   = MARGIN;
  const C_NAME = MARGIN + 6;
  const C_QTY  = MARGIN + COL * 0.54;
  const C_RATE = MARGIN + COL * 0.66;
  const C_GST  = MARGIN + COL * 0.78;
  const C_TOTAL = W - MARGIN;

  // Table header
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

  // Items — dynamic row height based on wrapped name
  const NAME_COL_W = C_QTY - C_NAME - 3;
  if (bill.items.length === 0) {
    // empty-items fallback row
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
    // clamp to 2 visible lines, row height grows accordingly
    const visLines = nameLines.slice(0, 2);
    const rowH = visLines.length > 1 ? 15 : 10;

    checkNewPage(rowH + 2);

    if (idx % 2 === 0) {
      fillRect(MARGIN, y, COL, rowH, 249, 246, 255);
    } else {
      fillRect(MARGIN, y, COL, rowH, 255, 255, 255);
    }
    drawLine(MARGIN, y + rowH, MARGIN + COL, y + rowH, 230, 225, 245);

    // Row number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setColor(100, 80, 160);
    const rowMidY = y + rowH / 2 + 2;
    doc.text(String(idx + 1), C_NO + 1, rowMidY);

    // Product name (up to 2 lines)
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

    // Qty / Rate / GST / Amount — vertically centred
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

  /* ══ 5. TOTALS SECTION ══════════════════════════════════ */
  checkNewPage(50); // need enough room for totals block
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

  /* ══ 6. NOTES ══════════════════════════════════════════ */
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

  /* ══ 7. FOOTER (always at bottom of last page) ═══════════ */
  const footerH = 22;
  const footerY = Math.max(y + 6, H - footerH);

  // decorative divider
  drawLine(MARGIN, footerY - 3, W - MARGIN, footerY - 3, 180, 160, 230);

  fillRect(0, footerY, W, footerH, 245, 243, 255);
  fillRect(0, H - 2, W, 2, 124, 58, 237);  // bottom accent

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColor(76, 29, 149);
  doc.text(`Thank you for choosing ${store.storeName}!`, W / 2, footerY + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setColor(120, 100, 170);
  const footerMsg = store.billFooter || "Warranty claims — please keep this bill.";
  // wrap footer message across up to 2 lines
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

/* ─── Main Component ──────────────────────────────── */
export default function AdminOfflineSale() {
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

  /* Add Product Dialog */
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addProductInitialName, setAddProductInitialName] = useState("");

  /* ── Step 2: Payment ──────────────── */
  const [salePrice, setSalePrice] = useState("");  // actual sale price (can differ from product price)
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");  // optional due date if balance pending

  /* ── Step 3: Save/Done ────────────── */
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState<any>(null);
  const [currentBillNo, setCurrentBillNo] = useState(billNo);

  /* ── Store Info for PDF ────────────── */
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE);

  useEffect(() => {
    // load products
    get(ref(db, "products")).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
        setProducts(list);
      }
    });
    // load store info for PDF
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

  // When product selected, pre-fill price and GST
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

  /* ── Computed values ──────────────── */
  const unitPrice = Number(salePrice) || 0;
  const quantity = Number(qty) || 1;
  const subtotal = unitPrice * quantity;
  const gstAmount = gstEnabled ? Math.round((subtotal * Number(gstRate)) / 100) : 0;
  const grandTotal = subtotal + gstAmount;
  // Blank amountPaid means full payment — use grandTotal so dueAmount = 0
  const paid = amountPaid.trim() === "" ? grandTotal : (Number(amountPaid) || 0);
  const change = Math.max(0, paid - grandTotal);
  const dueAmount = Math.max(0, grandTotal - paid);

  /* ── Product added from dialog ────── */
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

  /* ── Save Sale & Generate Bill ────── */
  const handleSave = async () => {
    const productName = selectedProduct?.name || searchQuery.trim();
    if (!cust.name.trim()) { toast.error("Customer name is required"); setStep(0); return; }
    if (!productName) { toast.error("Select a product"); setStep(1); return; }
    if (!salePrice || grandTotal <= 0) { toast.error("Enter valid sale amount"); setStep(2); return; }

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
        amountPaid: paid,          // paid is already set to grandTotal when field is blank
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

      // Only create ledger entry when there is a genuine due amount
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
      toast.success(`✅ Sale recorded! Bill #${currentBillNo}`);
      setStep(3);
    } catch (e: any) {
      toast.error("Failed to save: " + e.message);
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
    setCurrentBillNo(genBillNo());   // fresh unique bill number for each new sale
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

  /* ── Step validation ──────────────── */
  const canGoNext = () => {
    if (step === 0) return !!cust.name.trim();
    if (step === 1) return !!(selectedProduct || searchQuery.trim());
    if (step === 2) return !!salePrice && grandTotal > 0;
    return false;
  };

  /* ─── Render ─────────────────────── */
  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Offline / In-Store Sale</h1>
            <p className="text-slate-500 text-sm">Bill #{currentBillNo} · {new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

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
                <User className="h-5 w-5 text-orange-500" /> Customer Details
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
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
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
                  placeholder="Street, City, State, PIN..."
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
                    placeholder="Name ya brand se search karo..."
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
                          "<strong>{searchQuery}</strong>" catalog mein nahi mila
                        </p>
                        <Button size="sm"
                          onClick={() => { setAddProductInitialName(searchQuery); setAddProductOpen(true); setShowDropdown(false); }}
                          className="gap-1.5 bg-orange-600 hover:bg-orange-700">
                          <Plus className="h-3.5 w-3.5" /> Catalog mein add karo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected product card */}
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
                <Plus className="h-3.5 w-3.5" /> Naya Product Catalog mein Add Karo
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
                  <IndianRupee className="h-5 w-5 text-orange-500" /> Sale Price & GST
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product summary */}
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
                    <Label>Sale Price per unit (₹) <span className="text-red-500">*</span></Label>
                    <Input
                      autoFocus
                      type="number" min="0"
                      placeholder="45000"
                      value={salePrice}
                      onChange={e => setSalePrice(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400">Actual sale price (can be different from catalog price)</p>
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label>Qty</Label>
                    <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
                  </div>
                </div>

                {/* GST */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-purple-600" />
                      <Label className="text-purple-800 font-semibold">GST Lagana Hai?</Label>
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
                    <span>TOTAL</span>
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
                  <Label>Customer ne kitna diya? (₹)</Label>
                  <Input
                    type="number" min="0"
                    placeholder={`Total: ${grandTotal} — kitna diya?`}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400">Blank chhod do agar poora payment ho gaya</p>
                </div>

                {/* Change / Due live preview */}
                {amountPaid && (
                  <div className={`rounded-xl p-3 space-y-1 text-sm ${
                    dueAmount > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
                  }`}>
                    {change > 0 && (
                      <div className="flex justify-between text-green-700 font-bold">
                        <span>🔄 Customer ko Wapas Dena</span>
                        <span>{formatINR(change)}</span>
                      </div>
                    )}
                    {dueAmount > 0 && (
                      <div className="flex justify-between text-red-700 font-bold">
                        <span>⚠️ Baaki Bache (Due Amount)</span>
                        <span>{formatINR(dueAmount)}</span>
                      </div>
                    )}
                    {dueAmount === 0 && change === 0 && (
                      <p className="text-green-700 font-bold">✅ Exact payment — Koi baki nahi!</p>
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
                      ₹{dueAmount.toLocaleString("en-IN")} baccha hua — Ledger mein automatically save ho jayega customer ke naam se
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Warranty, accessories, remarks..." rows={2}
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
              <h2 className="text-xl font-black text-green-800">Sale Recorded! 🎉</h2>
              <p className="text-green-600 text-sm mt-1">Bill #{currentBillNo}</p>
            </div>

            {/* Bill Summary */}
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
                <div className="flex justify-between"><span className="text-slate-500">Qty</span><span>{quantity}</span></div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                {gstEnabled && <div className="flex justify-between text-purple-700"><span>GST ({gstRate}%)</span><span>+{formatINR(gstAmount)}</span></div>}
                <div className="flex justify-between font-black text-base"><span>Total</span><span className="text-orange-700">{formatINR(grandTotal)}</span></div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between"><span className="text-slate-500">Amount Paid</span><span className="text-green-700 font-bold">{formatINR(paid || grandTotal)}</span></div>
                {change > 0 && <div className="flex justify-between"><span className="text-slate-500">Change Given</span><span>{formatINR(change)}</span></div>}
                {dueAmount > 0 && (
                  <div className="flex justify-between bg-red-50 rounded-lg px-2 py-1.5">
                    <span className="text-red-700 font-bold">⚠ Due Amount</span>
                    <span className="text-red-700 font-bold">{formatINR(dueAmount)}</span>
                  </div>
                )}
                {dueAmount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    💰 {formatINR(dueAmount)} — {cust.name} ke ledger mein save ho gaya{dueDate ? ` | Due: ${new Date(dueDate).toLocaleDateString("en-IN")}` : ""}
                  </div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="capitalize">{paymentMethod}</span></div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={downloadPDF} variant="outline" className="gap-2 h-12 border-purple-300 text-purple-700 hover:bg-purple-50">
                <Download className="h-4 w-4" /> PDF Download
              </Button>
              <Button onClick={startNew} className="gap-2 h-12 bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4" /> Naya Sale
              </Button>
            </div>
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
              ← Wapas
            </Button>
            {step < 2 ? (
              <Button
                onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
                disabled={!canGoNext()}
                className="gap-2 bg-orange-600 hover:bg-orange-700 flex-1"
              >
                Aage <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving || !canGoNext()}
                className="gap-2 bg-green-600 hover:bg-green-700 flex-1 h-12 font-bold text-base"
              >
                {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : <><CheckCircle className="h-5 w-5" /> Sale Save Karo</>}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Add Product Dialog (full-featured, same as Products page) ── */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        initialName={addProductInitialName}
        onSaved={handleProductSaved}
      />
    </AdminLayout>
  );
}
