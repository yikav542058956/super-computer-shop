import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useRef } from "react";
import { ref, onValue, remove, push, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash, Upload, ImageIcon, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { name: "", image: "", displayOrder: 1 };

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const catRef = ref(db, "categories");
    const unsubscribe = onValue(catRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setCategories(
          Object.entries(data)
            .map(([id, val]: any) => ({ id, ...val }))
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        );
      } else {
        setCategories([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, displayOrder: categories.length + 1 });
    setShowDialog(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({ name: cat.name || "", image: cat.image || "", displayOrder: cat.displayOrder || 1 });
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((f) => ({ ...f, image: url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Category name is required"); return; }
    setSaving(true);
    try {
      const data = { name: form.name, image: form.image, displayOrder: Number(form.displayOrder) };
      if (editingId) {
        await update(ref(db, `categories/${editingId}`), data);
        toast.success("Category updated");
      } else {
        await push(ref(db, "categories"), data);
        toast.success("Category added");
      }
      setShowDialog(false);
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await remove(ref(db, `categories/${id}`));
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No categories yet.</TableCell></TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell><GripVertical className="h-4 w-4 text-slate-300 cursor-grab" /></TableCell>
                  <TableCell>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-10 w-10 object-cover rounded-lg bg-slate-100" />
                    ) : (
                      <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-400" /></div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{cat.name}</TableCell>
                  <TableCell>{cat.displayOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Category Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Gaming Laptops" />
            </div>

            <div className="space-y-1">
              <Label>Category Image</Label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {form.image ? (
                  <div className="relative h-32 flex items-center justify-center bg-slate-50">
                    <img src={form.image} alt="Category" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400">
                    {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <><ImageIcon className="h-7 w-7" /><span className="text-sm">Click to upload image</span></>}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input type="number" min={1} value={form.displayOrder} onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : editingId ? "Update" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
