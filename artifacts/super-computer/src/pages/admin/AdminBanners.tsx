import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useRef } from "react";
import { ref, onValue, remove, push, update, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash, Upload, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { title: "", subtitle: "", buttonText: "", buttonLink: "", imageUrl: "", order: 1, isActive: true };

export default function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bannersRef = ref(db, "banners");
    const unsubscribe = onValue(bannersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setBanners(
          Object.entries(data)
            .map(([id, val]: any) => ({ id, ...val }))
            .sort((a, b) => a.order - b.order)
        );
      } else {
        setBanners([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowDialog(true);
  };

  const openEdit = (banner: any) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "",
      imageUrl: banner.imageUrl || "",
      order: banner.order || 1,
      isActive: banner.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    if (!form.imageUrl) { toast.error("Please upload a banner image"); return; }
    setSaving(true);
    try {
      const data = {
        title: form.title,
        subtitle: form.subtitle,
        buttonText: form.buttonText,
        buttonLink: form.buttonLink,
        imageUrl: form.imageUrl,
        order: Number(form.order),
        isActive: form.isActive,
      };
      if (editingId) {
        await update(ref(db, `banners/${editingId}`), data);
        toast.success("Banner updated");
      } else {
        await push(ref(db, "banners"), data);
        toast.success("Banner added");
      }
      setShowDialog(false);
    } catch {
      toast.error("Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => setSelectedIds(
    selectedIds.size === banners.length ? new Set() : new Set(banners.map(b => b.id))
  );
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} banners?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => remove(ref(db, `banners/${id}`))));
      setSelectedIds(new Set()); toast.success("Banners deleted");
    } catch { toast.error("Failed to delete some banners"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await remove(ref(db, `banners/${id}`));
      toast.success("Banner deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (banner: any) => {
    await update(ref(db, `banners/${banner.id}`), { isActive: !banner.isActive });
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Banners</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Banner</Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
          <span className="text-sm text-red-700 font-semibold">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">
            <Trash className="h-3.5 w-3.5" /> Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-10 px-3">
                <input type="checkbox" className="rounded cursor-pointer"
                  checked={banners.length > 0 && selectedIds.size === banners.length}
                  onChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Subtitle</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : banners.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">No banners yet. Add one to get started.</TableCell></TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner.id} className={selectedIds.has(banner.id) ? "bg-red-50/40" : ""}>
                  <TableCell className="px-3">
                    <input type="checkbox" className="rounded cursor-pointer"
                      checked={selectedIds.has(banner.id)}
                      onChange={() => toggleSelect(banner.id)} />
                  </TableCell>
                  <TableCell>
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt={banner.title} className="h-14 w-28 object-cover rounded-lg bg-slate-100" />
                    ) : (
                      <div className="h-14 w-28 bg-slate-100 rounded-lg flex items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-400" /></div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{banner.title}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{banner.subtitle}</TableCell>
                  <TableCell>{banner.order}</TableCell>
                  <TableCell>
                    <Switch checked={banner.isActive} onCheckedChange={() => toggleActive(banner)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(banner)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(banner.id)}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Banner Image *</Label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Banner preview" className="w-full h-40 object-cover" />
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
                    {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <><Upload className="h-8 w-8" /><span className="text-sm">Click to upload image</span></>}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {form.imageUrl && (
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Change Image
                </Button>
              )}
            </div>

            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Next-Gen Gaming Performance" />
            </div>

            <div className="space-y-1">
              <Label>Subtitle</Label>
              <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Experience uncompromised power." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Button Text</Label>
                <Input value={form.buttonText} onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))} placeholder="Shop Now" />
              </div>
              <div className="space-y-1">
                <Label>Button Link</Label>
                <Input value={form.buttonLink} onChange={(e) => setForm((f) => ({ ...f, buttonLink: e.target.value }))} placeholder="/products" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input type="number" min={1} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Active</Label>
                <div className="flex items-center h-10">
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                  <span className="ml-2 text-sm text-slate-600">{form.isActive ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : editingId ? "Update Banner" : "Add Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
