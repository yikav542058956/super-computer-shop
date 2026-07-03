import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect, useRef } from "react";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ShoppingBag, Plus, Loader2, CheckCircle, Search, X, Package,
  Camera, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

const emptyForm = {
  customerName: "", phone: "", qty: "1",
  amount: "", paymentMethod: "cash", notes: "",
};

interface Product {
  id: string;
  name: string;
  price?: number;
  discountPrice?: number;
  images?: string[];
  brand?: string;
  category?: string;
}

export default function AdminOfflineSale() {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  /* ── Product search ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customProduct, setCustomProduct] = useState(false);
  const [customName, setCustomName] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  /* ── Add New Product dialog ── */
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", price: "", category: "", imageUrl: "" });
  const [addingProduct, setAddingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get(ref(db, "products")).then((snap) => {
      if (snap.exists()) {
        setProducts(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
      }
    });
  }, []);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = searchQuery.trim().length > 0
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearchQuery(p.name);
    setShowDropdown(false);
    setCustomProduct(false);
    const price = p.discountPrice || p.price || 0;
    setForm(f => ({ ...f, amount: String(price) }));
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setSearchQuery("");
    setCustomProduct(false);
    setCustomName("");
    setForm(f => ({ ...f, amount: "" }));
  };

  /* ── Add New Product to catalog ── */
  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price) { toast.error("Name and price are required"); return; }
    setAddingProduct(true);
    try {
      const newRef = push(ref(db, "products"));
      const prod: Product = {
        id: newRef.key!,
        name: newProduct.name.trim(),
        brand: newProduct.brand.trim(),
        price: Number(newProduct.price),
        discountPrice: Number(newProduct.price),
        category: newProduct.category.trim(),
        images: newProduct.imageUrl ? [newProduct.imageUrl] : [],
      };
      await set(newRef, { ...prod, status: "active", createdAt: Date.now() });
      setProducts(prev => [...prev, prod]);
      selectProduct(prod);
      setAddProductOpen(false);
      setNewProduct({ name: "", brand: "", price: "", category: "", imageUrl: "" });
      toast.success("✅ Product added to catalog!");
    } catch {
      toast.error("Failed to add product");
    } finally {
      setAddingProduct(false);
    }
  };

  /* ── Save Sale ── */
  const handleSave = async () => {
    const productName = selectedProduct?.name || customName.trim();
    if (!form.customerName.trim()) { toast.error("Customer name is required"); return; }
    if (!productName) { toast.error("Select or enter a product"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    try {
      const newRef = push(ref(db, "orders"));
      await set(newRef, {
        source: "offline",
        orderStatus: "delivered",
        paymentStatus: "paid",
        paymentMethod: form.paymentMethod,
        finalAmount: Number(form.amount),
        subtotal: Number(form.amount),
        gstAmount: 0,
        gstRate: 0,
        deliveryCharge: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        address: {
          name: form.customerName.trim(),
          phone: form.phone.trim(),
          city: "Walk-in",
          state: "",
          pincode: "",
          address: "In-store / Offline sale",
        },
        items: [{
          name: productName,
          productId: selectedProduct?.id || null,
          qty: Number(form.qty) || 1,
          price: Number(form.amount),
          image: selectedProduct?.images?.[0] || null,
        }],
        notes: form.notes.trim(),
        statusHistory: [{ status: "delivered", timestamp: Date.now(), note: "Offline / in-store sale added by admin" }],
      });
      setLastSaved(form.customerName.trim());
      toast.success(`✅ Sale recorded for ${form.customerName.trim()}!`);
      setForm({ ...emptyForm });
      clearProduct();
    } catch {
      toast.error("Failed to save offline sale");
    } finally {
      setSaving(false);
    }
  };

  const paymentLabel: Record<string, string> = { cash: "💵 Cash", upi: "📱 UPI", card: "💳 Card" };

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Offline / In-Store Sale</h1>
            <p className="text-slate-500 text-sm">Record a walk-in sale — counts in revenue & reports</p>
          </div>
        </div>

        {lastSaved && (
          <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Last saved: <strong>{lastSaved}</strong> — form cleared for next entry
          </div>
        )}

        <div className="space-y-4">

          {/* ── Customer ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-700">👤 Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Customer Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Ramesh Kumar" value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Phone Number</Label>
                <Input placeholder="10-digit number" inputMode="numeric" maxLength={10}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
              </div>
            </CardContent>
          </Card>

          {/* ── Product Search ── */}
          <Card className="border-2 border-orange-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-700">📦 Product</CardTitle>
              <CardDescription>Search your catalog or add a new product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">

              {/* Search box */}
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search products by name or brand..."
                    className="pl-9 pr-9"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedProduct(null); setCustomProduct(false); }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={!!selectedProduct}
                  />
                  {(searchQuery || selectedProduct) && (
                    <button onClick={clearProduct} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && searchQuery.trim().length > 0 && !selectedProduct && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filtered.length > 0 ? (
                      filtered.slice(0, 8).map(p => (
                        <button key={p.id} type="button" onClick={() => selectProduct(p)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 text-left transition-colors">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                            {p.images?.[0]
                              ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                              : <Package className="h-5 w-5 text-slate-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                            {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                          </div>
                          <p className="text-sm font-bold text-orange-600 shrink-0">
                            {formatINR(p.discountPrice || p.price || 0)}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-sm text-slate-500 mb-2">No product found for "<strong>{searchQuery}</strong>"</p>
                        <Button size="sm" variant="outline" onClick={() => { setNewProduct(n => ({ ...n, name: searchQuery })); setAddProductOpen(true); setShowDropdown(false); }}
                          className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50">
                          <Plus className="h-3.5 w-3.5" /> Add "{searchQuery}" to catalog
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OR custom name */}
              {!selectedProduct && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="flex-1 h-px bg-slate-200" />
                  OR type manually
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
              {!selectedProduct && (
                <Input placeholder="Custom product name (if not in catalog)" value={customName}
                  onChange={e => setCustomName(e.target.value)} />
              )}

              {/* Selected product card */}
              {selectedProduct && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="h-14 w-14 rounded-xl bg-white border border-orange-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedProduct.images?.[0]
                      ? <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="h-full w-full object-cover" />
                      : <Package className="h-7 w-7 text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{selectedProduct.name}</p>
                    {selectedProduct.brand && <p className="text-xs text-slate-500">{selectedProduct.brand}</p>}
                    <p className="text-sm font-black text-orange-600">{formatINR(selectedProduct.discountPrice || selectedProduct.price || 0)}</p>
                  </div>
                  <button onClick={clearProduct} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              )}

              {/* Add to catalog button */}
              <Button variant="outline" size="sm" onClick={() => setAddProductOpen(true)}
                className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 w-full">
                <Plus className="h-3.5 w-3.5" /> Add New Product to Catalog
              </Button>
            </CardContent>
          </Card>

          {/* ── Sale Details ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-700">💰 Sale Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sale Amount (₹) <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" placeholder="e.g. 45000" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="upi">📱 UPI</SelectItem>
                    <SelectItem value="card">💳 Card / Swipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Warranty, accessories included, etc." rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {form.amount && Number(form.amount) > 0 && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Sale Amount</p>
                <p className="text-3xl font-black text-orange-700">{formatINR(Number(form.amount))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Payment</p>
                <p className="text-base font-bold">{paymentLabel[form.paymentMethod]}</p>
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}
            className="w-full gap-2 bg-orange-600 hover:bg-orange-700 h-12 text-base font-bold">
            {saving
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
              : <><CheckCircle className="h-5 w-5" /> Record Sale</>
            }
          </Button>
        </div>
      </div>

      {/* ── Add New Product Dialog ── */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <Package className="h-5 w-5" /> Add Product to Catalog
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Lenovo IdeaPad 3 i5 12th Gen" value={newProduct.name}
                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input placeholder="e.g. Lenovo" value={newProduct.brand}
                  onChange={e => setNewProduct(p => ({ ...p, brand: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input placeholder="e.g. Laptop" value={newProduct.category}
                  onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹) <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" placeholder="e.g. 45000" value={newProduct.price}
                onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Image URL (optional)</Label>
              <Input placeholder="https://..." value={newProduct.imageUrl}
                onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))} />
              {newProduct.imageUrl && (
                <img src={newProduct.imageUrl} alt="preview" className="h-20 w-20 object-cover rounded-lg border mt-1" onError={e => (e.currentTarget.style.display = "none")} />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddProductOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProduct} disabled={addingProduct} className="bg-orange-600 hover:bg-orange-700 gap-2">
              {addingProduct ? <><Loader2 className="h-4 w-4 animate-spin" />Adding...</> : <><Plus className="h-4 w-4" />Add to Catalog</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
