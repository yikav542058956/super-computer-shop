import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useRef } from "react";
import { ref, onValue, push, update, remove, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Eye, EyeOff, Loader2, X, Camera } from "lucide-react";

function formatDate(ts: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminCustomerPhotos() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ imageUrl: "", customerName: "", laptop: "", isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "customerPhotos"), snap => {
      setLoading(false);
      if (!snap.exists()) { setPhotos([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setPhotos(list);
    });
    return () => unsub();
  }, []);

  const savePhoto = async () => {
    if (!form.imageUrl.trim()) { toast.error("Image URL required"); return; }
    setSaving(true);
    try {
      const newRef = push(ref(db, "customerPhotos"));
      await set(newRef, { ...form, createdAt: Date.now() });
      toast.success("Photo added");
      setForm({ imageUrl: "", customerName: "", laptop: "", isActive: true });
      setAddOpen(false);
    } catch { toast.error("Failed to add photo"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await update(ref(db, `customerPhotos/${id}`), { isActive: !current });
    toast.success(!current ? "Shown on home" : "Hidden from home");
  };

  const deletePhoto = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    await remove(ref(db, `customerPhotos/${id}`));
    toast.success("Deleted");
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Happy Customers</h1>
            <p className="text-sm text-slate-400 mt-1">Upload real customer purchase photos to show on home page</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-2"
            style={{ background: "#22C55E", color: "#000" }}>
            <Plus size={16} /> Add Photo
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="aspect-video rounded-2xl animate-pulse" style={{ background: "#f1f5f9" }} />)}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Camera size={48} className="text-slate-600" />
            <p className="text-slate-400 font-semibold">No customer photos yet</p>
            <button onClick={() => setAddOpen(true)} className="h-10 px-6 rounded-xl text-sm font-bold" style={{ background: "#22C55E", color: "#000" }}>Add First Photo</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="rounded-2xl overflow-hidden relative group"
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                <img src={photo.imageUrl} alt="" className="w-full object-cover" style={{ aspectRatio: "4/3" }} />
                {!photo.isActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-400 bg-black/50 px-2 py-1 rounded-lg">Hidden</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => toggleActive(photo.id, photo.isActive)}
                    className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                    {photo.isActive ? <EyeOff size={15} className="text-slate-400" /> : <Eye size={15} style={{ color: "#22C55E" }} />}
                  </button>
                  <button onClick={() => deletePhoto(photo.id)}
                    className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.7))" }}>
                  {photo.customerName && <p className="text-gray-900 text-xs font-bold leading-none">{photo.customerName}</p>}
                  {photo.laptop && <p className="text-slate-300 text-[10px] mt-0.5 leading-none truncate">{photo.laptop}</p>}
                  <p className="text-[9px] text-slate-500 mt-0.5">{formatDate(photo.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Photo Dialog */}
      <AnimatePresence>
        {addOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setAddOpen(false)}>
            <motion.div className="w-full max-w-lg rounded-t-3xl p-6 space-y-4"
              style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Add Customer Photo</h2>
                <button onClick={() => setAddOpen(false)}><X size={18} className="text-slate-400" /></button>
              </div>
              {[
                { key: "imageUrl", label: "Image URL *", placeholder: "https://... (Google Drive, Firebase Storage, etc.)", type: "url" },
                { key: "customerName", label: "Customer Name (optional)", placeholder: "e.g. Rahul Sharma", type: "text" },
                { key: "laptop", label: "Laptop Purchased (optional)", placeholder: "e.g. HP Pavilion 15", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl text-sm text-gray-900 placeholder-slate-500 outline-none"
                    style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                </div>
              ))}
              {form.imageUrl && (
                <img src={form.imageUrl} alt="Preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <button onClick={savePhoto} disabled={saving}
                className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: "#22C55E", color: "#000" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add Photo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
