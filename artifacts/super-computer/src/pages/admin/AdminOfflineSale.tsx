import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { ref, push, set, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ShoppingBag, Plus, Loader2, CheckCircle, Search, X, Package,
  ImageIcon, ChevronRight, User, Phone, MapPin, CreditCard,
  FileText, Download, IndianRupee, RotateCcw, AlertCircle, Percent,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import jsPDF from "jspdf";

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

/* ─── PDF Bill Generator ──────────────────────────── */
function generateBillPDF(bill: {
  billNo: string; date: string;
  customer: { name: string; phone: string; address: string };
  items: { name: string; qty: number; unitPrice: number; gstRate: number; gstAmount: number; total: number }[];
  subtotal: number; gstTotal: number; grandTotal: number;
  amountPaid: number; change: number; dueAmount: number;
  paymentMethod: string; notes: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SUPER COMPUTER", W / 2, 10, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Laptop & Computer Store | GST Invoice", W / 2, 16, { align: "center" });
  doc.text(`Tel: +91 XXXXXXXXXX`, W / 2, 20, { align: "center" });
  y = 28;

  // Bill info
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`BILL NO: ${bill.billNo}`, 8, y);
  doc.text(`DATE: ${bill.date}`, W - 8, y, { align: "right" });
  y += 5;

  // Customer info
  doc.setFillColor(245, 243, 255);
  doc.rect(6, y, W - 12, 16, "F");
  doc.setTextColor(80, 50, 180);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 9, y + 4);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.text(bill.customer.name, 9, y + 8);
  doc.text(`Ph: ${bill.customer.phone || "—"}`, 9, y + 12);
  if (bill.customer.address) {
    const addr = doc.splitTextToSize(bill.customer.address, W / 2 - 15);
    doc.text(addr[0], W / 2, y + 8);
    if (addr[1]) doc.text(addr[1], W / 2, y + 12);
  }
  y += 20;

  // Table header
  doc.setFillColor(124, 58, 237);
  doc.rect(6, y, W - 12, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("ITEM", 9, y + 5);
  doc.text("QTY", W * 0.5, y + 5, { align: "center" });
  doc.text("PRICE", W * 0.65, y + 5, { align: "center" });
  doc.text("GST", W * 0.78, y + 5, { align: "center" });
  doc.text("TOTAL", W - 8, y + 5, { align: "right" });
  y += 9;

  // Items
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  bill.items.forEach((item, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(252, 250, 255); doc.rect(6, y - 1, W - 12, 8, "F"); }
    const nameLine = doc.splitTextToSize(item.name, W * 0.42 - 10);
    doc.text(nameLine[0], 9, y + 4);
    doc.text(String(item.qty), W * 0.5, y + 4, { align: "center" });
    doc.text(formatINR(item.unitPrice), W * 0.65, y + 4, { align: "center" });
    doc.text(item.gstRate > 0 ? `${item.gstRate}%\n+${formatINR(item.gstAmount)}` : "—", W * 0.78, y + 4, { align: "center" });
    doc.text(formatINR(item.total), W - 8, y + 4, { align: "right" });
    y += 8;
  });

  // Totals
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(6, y, W - 6, y);
  y += 4;

  const totals = [
    { label: "Subtotal (before GST)", val: formatINR(bill.subtotal) },
    ...(bill.gstTotal > 0 ? [{ label: `GST Amount`, val: `+${formatINR(bill.gstTotal)}` }] : []),
    { label: "GRAND TOTAL", val: formatINR(bill.grandTotal), bold: true },
    { label: `Amount Paid (${bill.paymentMethod})`, val: formatINR(bill.amountPaid) },
    ...(bill.change > 0 ? [{ label: "Change Given", val: `−${formatINR(bill.change)}` }] : []),
    ...(bill.dueAmount > 0 ? [{ label: "⚠ AMOUNT DUE", val: formatINR(bill.dueAmount), red: true }] : []),
  ];

  totals.forEach(row => {
    if ((row as any).bold) {
      doc.setFillColor(124, 58, 237);
      doc.rect(W / 2, y - 1, W / 2 - 6, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
    } else if ((row as any).red) {
      doc.setTextColor(200, 50, 50);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(7.5);
    doc.text(row.label, W / 2 + 2, y + 4);
    doc.text(row.val, W - 8, y + 4, { align: "right" });
    doc.setTextColor(40, 40, 40);
    y += 7;
  });

  if (bill.notes) {
    y += 2;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(`Notes: ${bill.notes}`, 8, y);
    y += 5;
  }

  // Footer
  y = Math.max(y + 5, doc.internal.pageSize.getHeight() - 18);
  doc.setFillColor(245, 243, 255);
  doc.rect(0, y, W, 20, "F");
  doc.setTextColor(124, 58, 237);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Thank you for shopping with Super Computer!", W / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Warranty claims — please keep this bill. No returns after 7 days.", W / 2, y + 12, { align: "center" });

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
  const [newProd, setNewProd] = useState({ name: "", brand: "", price: "", category: "", gstRate: "18", imageUrl: "" });
  const [addingProd, setAddingProd] = useState(false);

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

  useEffect(() => {
    get(ref(db, "products")).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
        setProducts(list);
      }
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

  /* ── Add New Product ──────────────── */
  const handleAddProduct = async () => {
    if (!newProd.name.trim() || !newProd.price) { toast.error("Name and price required"); return; }
    setAddingProd(true);
    try {
      const newRef = push(ref(db, "products"));
      const prod: Product = {
        id: newRef.key!,
        name: newProd.name.trim(),
        brand: newProd.brand.trim(),
        price: Number(newProd.price),
        discountPrice: Number(newProd.price),
        category: newProd.category.trim() || "Laptops",
        gstRate: Number(newProd.gstRate) || 0,
        images: newProd.imageUrl ? [newProd.imageUrl] : [],
      };
      await set(newRef, { ...prod, status: "active", createdAt: Date.now() });
      setProducts(prev => [...prev, prod]);
      selectProduct(prod);
      setAddProductOpen(false);
      setNewProd({ name: "", brand: "", price: "", category: "", gstRate: "18", imageUrl: "" });
      toast.success("✅ Product added to catalog!");
    } catch { toast.error("Failed to add product"); }
    finally { setAddingProd(false); }
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
    });
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
                          onClick={() => { setNewProd(n => ({ ...n, name: searchQuery })); setAddProductOpen(true); setShowDropdown(false); }}
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

              <Button variant="outline" size="sm" onClick={() => setAddProductOpen(true)}
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

      {/* ── Add Product Dialog ────────────────── */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <Package className="h-5 w-5" /> Product Catalog mein Add Karo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. HP Pavilion 15 i5 13th Gen" value={newProd.name}
                onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input placeholder="HP, Dell, Asus..." value={newProd.brand}
                  onChange={e => setNewProd(p => ({ ...p, brand: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input placeholder="Laptops" value={newProd.category}
                  onChange={e => setNewProd(p => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (₹) <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" placeholder="45000" value={newProd.price}
                  onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>GST Rate</Label>
                <Select value={newProd.gstRate} onValueChange={v => setNewProd(p => ({ ...p, gstRate: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No GST</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Image URL (optional)</Label>
              <Input placeholder="https://..." value={newProd.imageUrl}
                onChange={e => setNewProd(p => ({ ...p, imageUrl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddProductOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProduct} disabled={addingProd} className="bg-orange-600 hover:bg-orange-700 gap-2">
              {addingProd ? <><Loader2 className="h-4 w-4 animate-spin" />Adding...</> : <><Plus className="h-4 w-4" />Add to Catalog</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
