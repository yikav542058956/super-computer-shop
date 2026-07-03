import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useRef } from "react";
import { ref, onValue, remove, push, update, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash, Upload, ImageIcon, Loader2, X, Search, ScanLine, CheckCircle, AlertCircle, Cpu, Camera, Sparkles, Star, ChevronDown } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

interface SpecField { key: string; value: string; }
interface SeedReview { userName: string; rating: number; text: string; imageUrl: string; daysAgo: number; generatingText: boolean; uploadingPhoto: boolean; }

const SEED_NAMES = ["Rahul Sharma","Priya Singh","Amit Kumar","Neha Gupta","Vikas Yadav","Sunita Verma","Rajesh Patel","Pooja Joshi","Deepak Nair","Anjali Mehta","Suresh Reddy","Kavita Iyer","Manish Tiwari","Rohit Agarwal","Anita Rao"];

function randomReviewCount() { return Math.floor(Math.random() * 901) + 300; }

function genRatingDist(total: number): Record<number, number> {
  const pcts: Record<number,number> = { 5: 0.52, 4: 0.28, 3: 0.11, 2: 0.05, 1: 0.04 };
  const dist: Record<number, number> = {};
  let used = 0;
  [1, 2, 3, 4].forEach(s => { dist[s] = Math.round(total * pcts[s]); used += dist[s]; });
  dist[5] = Math.max(0, total - used);
  return dist;
}

function calcAvgFromDist(dist: Record<number, number>): number {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const sum = Object.entries(dist).reduce((a, [star, cnt]) => a + Number(star) * cnt, 0);
  return Math.round((sum / total) * 10) / 10;
}

const EMPTY_FORM = {
  name: "",
  brand: "",
  category: "",
  price: "",
  discountPrice: "",
  stock: "",
  description: "",
  specs: [] as SpecField[],
  images: [] as string[],
  isFeatured: false,
  isNewArrival: false,
  isTopDeal: false,
  isBestSeller: false,
  isStudentPick: false,
  isGamingDeal: false,
  status: "active" as "active" | "inactive",
};

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [scanningBill, setScanningBill] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [specsFetchedFor, setSpecsFetchedFor] = useState("");   // tracks last name we fetched for
  const [aiExtracted, setAiExtracted] = useState<any>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const billScanRef = useRef<HTMLInputElement>(null);
  const reviewPhotoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [seedReviews, setSeedReviews] = useState<SeedReview[]>([]);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [showSeedSection, setShowSeedSection] = useState(false);

  /* ── Safe JSON parse from fetch response ─────── */
  async function safeJson(res: Response): Promise<any> {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    const text = await res.text();
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }

  /* ── Scan bill / photo ─────────────────────────── */
  async function scanBill(file: File) {
    setScanningBill(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mime = file.type || "image/jpeg";
      const res = await fetch("/api/scan-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setAiExtracted(data.extracted);
      setShowVerifyDialog(true);
    } catch (e: any) {
      toast.error("Bill scan error: " + e.message);
    } finally {
      setScanningBill(false);
      if (billScanRef.current) billScanRef.current.value = "";
    }
  }

  function applyExtracted(extracted: any) {
    const specsEntries: SpecField[] = extracted.specs
      ? Object.entries(extracted.specs as Record<string, string>)
          .filter(([, v]) => v)
          .map(([key, value]) => ({ key, value }))
      : [];
    const defaultKeys = ["Processor","RAM","Storage","Display","Graphics","OS","Battery","Weight"];
    const existing = new Set(specsEntries.map(s => s.key));
    defaultKeys.forEach(k => { if (!existing.has(k)) specsEntries.push({ key: k, value: "" }); });

    setForm(f => ({
      ...f,
      name: extracted.name || f.name,
      brand: extracted.brand || f.brand,
      category: extracted.category || f.category,
      price: extracted.mrp ? String(extracted.mrp) : f.price,
      specs: specsEntries,
    }));
    setShowVerifyDialog(false);
    setAiExtracted(null);
    toast.success("Details filled in the form — please verify and save.");
  }

  /* ── Auto-fetch specs from device name ─────────── */
  async function fetchSpecs() {
    const nameNow = form.name.trim();
    // Skip if empty, already running, or already fetched for this exact name
    if (!nameNow || fetchingSpecs || nameNow === specsFetchedFor) return;
    setFetchingSpecs(true);
    try {
      const res = await fetch("/api/fetch-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameNow, brand: form.brand }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      const specsEntries: SpecField[] = data.specs
        ? Object.entries(data.specs as Record<string, string>)
            .filter(([, v]) => v)
            .map(([key, value]) => ({ key, value }))
        : [];

      setSpecsFetchedFor(nameNow);
      setForm(f => ({
        ...f,
        brand: f.brand || data.brand || "",
        category: f.category || data.category || "",
        // Only fill MRP if field is currently empty
        price: f.price || (data.mrp ? String(data.mrp) : ""),
        // Merge: keep existing manual specs; only add keys that are still blank
        specs: f.specs.map(s => {
          const aiVal = specsEntries.find(e => e.key === s.key)?.value || "";
          return s.value.trim() ? s : { key: s.key, value: aiVal };
        }),
      }));

      const conf = data.confidence === "high"
        ? "✅ High confidence"
        : data.confidence === "medium"
          ? "⚠️ Medium — please verify"
          : "⚠️ Low — manually verify";
      toast.success(`AI specs ready! ${conf}`);
    } catch (e: any) {
      toast.error("Specs fetch failed: " + e.message);
    } finally {
      setFetchingSpecs(false);
    }
  }

  async function generateDescription() {
    if (!form.name.trim()) {
      toast.error("Please enter the product name before generating with AI.");
      return;
    }
    setGeneratingDesc(true);
    try {
      const specsObj: Record<string, string> = {};
      form.specs.forEach(s => { if (s.key && s.value) specsObj[s.key] = s.value; });
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          category: form.category,
          price: form.price,
          discountPrice: form.discountPrice,
          specs: specsObj,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setForm(f => ({ ...f, description: data.description }));
      toast.success("AI description generated!");
    } catch (e: any) {
      toast.error("AI error: " + e.message);
    } finally {
      setGeneratingDesc(false);
    }
  }
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const productsRef = ref(db, "products");
    const unsubscribe = onValue(productsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setProducts(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      } else {
        setProducts([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    get(ref(db, "categories")).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setCategories(Object.entries(data).map(([id, val]: any) => ({ id, ...(val as any) })));
      }
    });
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, specs: defaultSpecs() });
    setSeedReviews([]);
    setTotalReviewCount(randomReviewCount());
    setShowSeedSection(false);
    setShowDialog(true);
  };

  const defaultSpecs = (): SpecField[] => [
    { key: "Processor", value: "" },
    { key: "RAM", value: "" },
    { key: "Storage", value: "" },
    { key: "Display", value: "" },
    { key: "Graphics", value: "" },
    { key: "OS", value: "" },
    { key: "Battery", value: "" },
    { key: "Weight", value: "" },
  ];

  const openEdit = (product: any) => {
    setEditingId(product.id);
    const specs: SpecField[] = product.specs
      ? Object.entries(product.specs).map(([key, value]) => ({ key, value: String(value) }))
      : defaultSpecs();
    setForm({
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      price: String(product.price || ""),
      discountPrice: String(product.discountPrice || ""),
      stock: String(product.stock || ""),
      description: product.description || "",
      specs,
      images: Array.isArray(product.images) ? product.images : product.images ? Object.values(product.images) : [],
      isFeatured: product.isFeatured || false,
      isNewArrival: product.isNewArrival || false,
      isTopDeal: product.isTopDeal || false,
      isBestSeller: product.isBestSeller || false,
      isStudentPick: product.isStudentPick || false,
      isGamingDeal: product.isGamingDeal || false,
      status: product.status || "active",
    });
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Some images failed to upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const addSpec = () => {
    setForm((f) => ({ ...f, specs: [...f.specs, { key: "", value: "" }] }));
  };

  const updateSpec = (idx: number, field: "key" | "value", val: string) => {
    setForm((f) => {
      const specs = [...f.specs];
      specs[idx] = { ...specs[idx], [field]: val };
      return { ...f, specs };
    });
  };

  const removeSpec = (idx: number) => {
    setForm((f) => ({ ...f, specs: f.specs.filter((_, i) => i !== idx) }));
  };

  /* ── Seed review helpers ─────────────────────── */
  const addSeedReview = () => {
    const idx = seedReviews.length;
    setSeedReviews(rs => [...rs, {
      userName: SEED_NAMES[idx % SEED_NAMES.length],
      rating: 5, text: "", imageUrl: "",
      daysAgo: Math.floor(Math.random() * 90) + 1,
      generatingText: false, uploadingPhoto: false,
    }]);
  };

  async function generateReviewText(idx: number) {
    if (!form.name.trim()) { toast.error("Enter product name first"); return; }
    setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, generatingText: true } : r));
    try {
      const rating = seedReviews[idx]?.rating || 5;
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, brand: form.brand, category: form.category, rating }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, text: data.text } : r));
    } catch (e: any) {
      toast.error("Review generation failed: " + e.message);
    } finally {
      setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, generatingText: false } : r));
    }
  }

  async function uploadReviewPhoto(file: File, idx: number) {
    setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, uploadingPhoto: true } : r));
    try {
      const url = await uploadToCloudinary(file);
      setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, imageUrl: url } : r));
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, uploadingPhoto: false } : r));
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error("Valid price is required"); return; }
    if (form.discountPrice && (isNaN(Number(form.discountPrice)) || Number(form.discountPrice) >= Number(form.price))) {
      toast.error("Sale Price must be less than MRP — enter the final selling price, not the discount amount"); return;
    }
    if (!form.stock || isNaN(Number(form.stock))) { toast.error("Valid stock is required"); return; }
    if (form.images.length === 0) { toast.error("Please upload at least one product image"); return; }

    setSaving(true);
    try {
      const specsObj: Record<string, string> = {};
      form.specs.filter((s) => s.key.trim()).forEach((s) => { specsObj[s.key.trim()] = s.value.trim(); });

      const data: any = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stock: Number(form.stock),
        description: form.description.trim(),
        specs: specsObj,
        images: form.images,
        isFeatured: form.isFeatured,
        isNewArrival: form.isNewArrival,
        status: form.status,
        rating: editingId ? undefined : 0,
        reviewsCount: editingId ? undefined : 0,
        createdAt: editingId ? undefined : Date.now(),
      };
      let savedProductId = editingId;
      if (editingId) {
        delete data.rating; delete data.reviewsCount; delete data.createdAt;
        await update(ref(db, `products/${editingId}`), data);
        toast.success("Product updated");
      } else {
        const newRef = await push(ref(db, "products"), data);
        savedProductId = newRef.key!;
        toast.success("Product added");
      }

      // Save seed review stats + seeded reviews
      if (savedProductId && (totalReviewCount > 0 || seedReviews.some(r => r.text.trim()))) {
        const count = totalReviewCount > 0 ? totalReviewCount : 0;
        const dist = count > 0 ? genRatingDist(count) : {};
        const avg = count > 0 ? calcAvgFromDist(dist) : 0;
        if (count > 0) {
          await update(ref(db, `products/${savedProductId}`), { reviewsCount: count, ratingDist: dist, rating: avg });
        }
        for (const sr of seedReviews.filter(r => r.text.trim())) {
          const rRef = push(ref(db, `productReviews/${savedProductId}`));
          await set(rRef, {
            userName: sr.userName.trim() || SEED_NAMES[Math.floor(Math.random() * SEED_NAMES.length)],
            rating: sr.rating,
            comment: sr.text.trim(),
            imageUrl: sr.imageUrl || null,
            isSeeded: true,
            createdAt: Date.now() - sr.daysAgo * 86400000,
          });
        }
      }

      setShowDialog(false);
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `products/${id}`));
      toast.success("Product deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = products.filter(
    (p) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">{search ? "No products match your search." : "No products yet."}</TableCell></TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-contain bg-slate-50 rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm leading-tight">{product.name}</span>
                      <div className="flex gap-1">
                        {product.isFeatured && <Badge variant="secondary" className="text-xs py-0 h-4">Featured</Badge>}
                        {product.isNewArrival && <Badge variant="outline" className="text-xs py-0 h-4">New</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{product.brand}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-semibold">{formatINR(product.price)}</span>
                      {product.discountPrice && (
                        <p className="text-xs text-green-600 font-medium">{formatINR(product.discountPrice)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={product.stock <= 5 ? "text-red-600 font-bold" : "text-slate-600"}>{product.stock}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(product.id)}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Product</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">This will permanently delete the product and cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI Verification Dialog ── */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-purple-600" />
              AI extracted these details — please verify
            </DialogTitle>
          </DialogHeader>
          {aiExtracted && (
            <div className="space-y-4 py-2">
              {/* Confidence badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                aiExtracted.confidence === "high" ? "bg-green-50 text-green-700 border border-green-200"
                : aiExtracted.confidence === "medium" ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {aiExtracted.confidence === "high" ? <CheckCircle className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
                Confidence: {aiExtracted.confidence === "high" ? "High — Details clearly readable" : aiExtracted.confidence === "medium" ? "Medium — Please double-check" : "Low — Manually verify sab kuch"}
              </div>

              {/* Extracted fields */}
              <div className="space-y-2">
                {[
                  { label: "Product Name", val: aiExtracted.name },
                  { label: "Brand", val: aiExtracted.brand },
                  { label: "Category", val: aiExtracted.category },
                  { label: "Model", val: aiExtracted.model },
                  { label: "MRP (₹)", val: aiExtracted.mrp ? `₹${Number(aiExtracted.mrp).toLocaleString("en-IN")}` : null },
                ].filter(f => f.val).map(f => (
                  <div key={f.label} className="flex gap-3 items-center px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-xs font-bold text-slate-500 w-28 flex-shrink-0">{f.label}</span>
                    <span className="text-sm font-semibold text-slate-800">{f.val}</span>
                  </div>
                ))}
              </div>

              {/* Specs */}
              {aiExtracted.specs && Object.keys(aiExtracted.specs).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Specifications</p>
                  <div className="space-y-1.5 bg-slate-50 rounded-xl p-3">
                    {Object.entries(aiExtracted.specs as Record<string,string>).filter(([,v])=>v).map(([k,v])=>(
                      <div key={k} className="flex gap-3 text-sm">
                        <span className="font-bold text-slate-500 w-24 flex-shrink-0 text-xs">{k}</span>
                        <span className="text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiExtracted.notes && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <span className="font-bold">Note:</span> {aiExtracted.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowVerifyDialog(false); setAiExtracted(null); }}>Cancel</Button>
            <Button onClick={() => aiExtracted && applyExtracted(aiExtracted)}
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}>
              <CheckCircle className="h-4 w-4 mr-2" /> Apply to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          {/* ── Bill Scan Banner ── */}
          <div className="rounded-xl border-2 border-dashed p-4 flex items-center justify-between gap-3"
            style={{ borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.04)" }}>
            <div>
              <p className="text-sm font-black" style={{ color: "#7c3aed" }}>📷 Auto-Fill from Bill / Box Photo</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload any bill, invoice or product box photo — AI will auto-fill all details</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { if(billScanRef.current){ billScanRef.current.capture="environment"; billScanRef.current.click(); }}}
                disabled={scanningBill}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all"
                style={{ color: "#7c3aed", borderColor: "rgba(124,58,237,0.4)", background: "#fff" }}>
                <Camera className="h-3.5 w-3.5" /> Camera
              </button>
              <button
                type="button"
                onClick={() => { if(billScanRef.current){ billScanRef.current.removeAttribute("capture"); billScanRef.current.click(); }}}
                disabled={scanningBill}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}>
                {scanningBill ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Scanning...</> : <><ScanLine className="h-3.5 w-3.5"/> Upload Bill</>}
              </button>
            </div>
          </div>
          <input ref={billScanRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if(f) scanBill(f); }} />

          <div className="space-y-6 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Product Name *</Label>
                  <button type="button" onClick={fetchSpecs} disabled={fetchingSpecs || !form.name.trim()}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                    style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
                    {fetchingSpecs ? <><Loader2 className="h-3 w-3 animate-spin"/> Fetching...</> : <><Cpu className="h-3 w-3"/> AI Specs Fetch</>}
                  </button>
                </div>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onBlur={fetchSpecs}
                  placeholder="e.g. Dell XPS 15 9530 Laptop" />
                <p className="text-[10px] text-slate-400">💡 Enter the full model name — AI will auto-fill specs and MRP</p>
              </div>
              <div className="space-y-1">
                <Label>Brand *</Label>
                <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Dell, HP, Asus..." />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    <SelectItem value="Laptops">Laptops</SelectItem>
                    <SelectItem value="Gaming Laptops">Gaming Laptops</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">MRP / Original Price (₹) *</Label>
                <Input
                  type="number" min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="85000"
                />
                <p className="text-[11px] text-slate-400">Original / market price — shown crossed out to the customer</p>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold text-green-700">Sale Price / Offer Price (₹)</Label>
                <Input
                  type="number" min={0}
                  value={form.discountPrice}
                  onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))}
                  placeholder="75000"
                  className={
                    form.discountPrice && form.price && Number(form.discountPrice) >= Number(form.price)
                      ? "border-red-400 focus-visible:ring-red-400"
                      : form.discountPrice ? "border-green-400 focus-visible:ring-green-400" : ""
                  }
                />
                <p className="text-[11px] text-slate-400">
                  Enter the <span className="font-semibold text-green-700">final selling price</span> — what the customer will actually pay.
                  Do not enter a discount amount or percentage.
                </p>
                {/* Live price preview */}
                {form.price && form.discountPrice && Number(form.discountPrice) > 0 && (
                  <div className={`rounded-lg border px-3 py-2 text-xs mt-1 ${
                    Number(form.discountPrice) < Number(form.price)
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    {Number(form.discountPrice) < Number(form.price) ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-green-800">✅ Product card preview:</p>
                        <p>
                          <span className="font-black text-slate-900 text-sm">₹{Number(form.discountPrice).toLocaleString("en-IN")}</span>
                          {" "}<span className="text-slate-400 line-through text-[11px]">₹{Number(form.price).toLocaleString("en-IN")}</span>
                          {" "}<span className="text-green-700 font-bold">
                            {Math.round(((Number(form.price) - Number(form.discountPrice)) / Number(form.price)) * 100)}% off
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="font-bold text-red-700">
                        ❌ Sale price must be less than MRP ({Number(form.discountPrice).toLocaleString("en-IN")} ≥ {Number(form.price).toLocaleString("en-IN")})
                      </p>
                    )}
                  </div>
                )}
                {form.price && !form.discountPrice && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs mt-1 text-slate-500">
                    Preview: <span className="font-black text-slate-900">₹{Number(form.price).toLocaleString("en-IN")}</span> (no discount shown)
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Stock *</Label>
                <Input type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="50" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "isFeatured",    label: "Featured",      color: "text-amber-500" },
                { key: "isNewArrival",  label: "New Arrival",   color: "text-blue-500" },
                { key: "isTopDeal",     label: "Top Deal",      color: "text-red-500" },
                { key: "isBestSeller",  label: "Best Seller",   color: "text-green-500" },
                { key: "isStudentPick", label: "Student Pick",  color: "text-purple-500" },
                { key: "isGamingDeal",  label: "Gaming Deal",   color: "text-orange-500" },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                  <Switch checked={(form as any)[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
                  <Label className={`cursor-pointer text-sm font-semibold ${color}`}>{label}</Label>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generatingDesc}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }}
                >
                  {generatingDesc
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                    : <><Sparkles className="h-3 w-3" /> Generate with AI</>}
                </button>
              </div>
              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Enter product name, brand and price — then use AI to auto-generate..."
              />
              <p className="text-[11px] text-slate-400">✨ You can manually edit the text after AI generates it</p>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Product Images *</Label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => !uploading && fileRef.current?.click()}
              >
                {uploading ? (
                  <div className="py-4"><Loader2 className="h-7 w-7 animate-spin mx-auto text-slate-400 mb-2" /><p className="text-sm text-slate-400">Uploading...</p></div>
                ) : (
                  <div className="py-4"><Upload className="h-7 w-7 mx-auto text-slate-400 mb-2" /><p className="text-sm text-slate-400">Click to upload images (multiple allowed)</p></div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

              {form.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Product ${idx + 1}`} className="w-full h-20 object-contain bg-slate-50 rounded-lg border" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {idx === 0 && <span className="absolute bottom-1 left-1 bg-primary text-white text-xs px-1 rounded">Main</span>}
                    </div>
                  ))}
                  <div
                    className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Plus className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Specs */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Specifications</Label>
                <Button variant="outline" size="sm" onClick={addSpec}><Plus className="h-3 w-3 mr-1" /> Add Spec</Button>
              </div>
              <div className="space-y-2 bg-slate-50 rounded-xl p-3">
                {form.specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      value={spec.key}
                      onChange={(e) => updateSpec(idx, "key", e.target.value)}
                      placeholder="e.g. Processor"
                      className="bg-white flex-1 text-sm"
                    />
                    <Input
                      value={spec.value}
                      onChange={(e) => updateSpec(idx, "value", e.target.value)}
                      placeholder="e.g. Intel Core i7-13700H"
                      className="bg-white flex-[2] text-sm"
                    />
                    <button onClick={() => removeSpec(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

            {/* ── Seed Reviews ──────────────────────────────────── */}
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
                onClick={() => setShowSeedSection(v => !v)}
              >
                <span className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  Seed Reviews
                  <span className="text-xs font-normal text-amber-600">(Amazon-style rating bars + featured reviews)</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-amber-600 transition-transform ${showSeedSection ? "rotate-180" : ""}`} />
              </button>

              {showSeedSection && (
                <div className="p-4 space-y-4 bg-white border-t border-amber-100">
                  {/* Total count */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-sm">Total Review Count (shown to customers)</Label>
                      <Input
                        type="number" min={0}
                        value={totalReviewCount}
                        onChange={e => setTotalReviewCount(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTotalReviewCount(randomReviewCount())}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 shrink-0"
                    >
                      🎲 Random
                    </button>
                  </div>

                  {/* Distribution preview */}
                  {totalReviewCount > 0 && (() => {
                    const dist = genRatingDist(totalReviewCount);
                    const avg = calcAvgFromDist(dist);
                    return (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-4xl font-black text-slate-900">{avg.toFixed(1)}</p>
                          <div>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= Math.round(avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-transparent"}`} />)}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{totalReviewCount.toLocaleString("en-IN")} ratings</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {[5,4,3,2,1].map(star => {
                            const count = dist[star] || 0;
                            const pct = totalReviewCount ? (count / totalReviewCount) * 100 : 0;
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <span className="text-xs w-3 text-slate-600">{star}</span>
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-400 w-10 text-right">{count.toLocaleString("en-IN")}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Featured reviews */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold">Featured Reviews (with photo + AI text)</Label>
                      {seedReviews.length < 3 && (
                        <button
                          type="button"
                          onClick={addSeedReview}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Review
                        </button>
                      )}
                    </div>

                    {seedReviews.map((sr, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Review #{idx + 1}</span>
                          <button type="button" onClick={() => setSeedReviews(rs => rs.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Reviewer Name</Label>
                            <Input
                              className="text-sm bg-white"
                              value={sr.userName}
                              onChange={e => setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, userName: e.target.value } : r))}
                              placeholder="e.g. Rahul Sharma"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rating</Label>
                            <div className="flex gap-0.5 mt-1.5">
                              {[1,2,3,4,5].map(s => (
                                <button key={s} type="button" onClick={() => setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, rating: s } : r))} className="p-0.5 hover:scale-110 transition-transform">
                                  <Star className={`h-5 w-5 ${s <= sr.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Review Text</Label>
                            <button
                              type="button"
                              onClick={() => generateReviewText(idx)}
                              disabled={sr.generatingText}
                              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg disabled:opacity-60"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}
                            >
                              {sr.generatingText ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</> : <><Sparkles className="h-3 w-3" /> Generate with AI</>}
                            </button>
                          </div>
                          <Textarea
                            rows={3}
                            className="text-sm bg-white"
                            value={sr.text}
                            onChange={e => setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, text: e.target.value } : r))}
                            placeholder="Write a review or click Generate with AI..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Review Photo (optional)</Label>
                          {sr.imageUrl ? (
                            <div className="flex items-center gap-3 mt-1">
                              <img src={sr.imageUrl} className="h-16 w-16 object-cover rounded-lg border border-slate-200" alt="Review" />
                              <button type="button" onClick={() => setSeedReviews(rs => rs.map((r, i) => i === idx ? { ...r, imageUrl: "" } : r))} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reviewPhotoRefs.current[idx]?.click()}
                              disabled={sr.uploadingPhoto}
                              className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-60 w-full justify-center"
                            >
                              {sr.uploadingPhoto ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</> : <><Camera className="h-3.5 w-3.5" /> Upload Photo</>}
                            </button>
                          )}
                          <input
                            type="file" accept="image/*" className="hidden"
                            ref={el => { reviewPhotoRefs.current[idx] = el; }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadReviewPhoto(f, idx); e.target.value = ""; }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : editingId ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
