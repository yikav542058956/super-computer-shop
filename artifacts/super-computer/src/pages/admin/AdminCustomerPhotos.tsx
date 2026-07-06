import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useRef } from "react";
import { ref, onValue, push, update, remove, set } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Eye, EyeOff, Loader2, X, Camera,
  Upload, ImagePlus, Link as LinkIcon,
} from "lucide-react";

function formatDate(ts: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminCustomerPhotos() {
  const [photos, setPhotos]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);

  // Form
  const [tab, setTab]                   = useState<"upload" | "url">("upload");
  const [customerName, setCustomerName] = useState("");
  const [laptop, setLaptop]             = useState("");
  const [imageUrl, setImageUrl]         = useState("");

  // Upload state
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string>("");
  const [progress, setProgress]   = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

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

  // ── Pick file ──
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!picked.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    if (picked.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  // ── Drag & drop ──
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!dropped.type.startsWith("image/")) { toast.error("Please drop an image file"); return; }
    setFile(dropped);
    setPreview(URL.createObjectURL(dropped));
  };

  // ── Upload to Firebase Storage ──
  const uploadToStorage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error("No file selected")); return; }
      const path = `customerPhotos/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const sRef  = storageRef(storage, path);
      const task  = uploadBytesResumable(sRef, file);
      setUploading(true);
      setProgress(0);
      task.on(
        "state_changed",
        snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err  => { setUploading(false); reject(err); },
        ()   => { setUploading(false); getDownloadURL(task.snapshot.ref).then(resolve).catch(reject); },
      );
    });
  };

  // ── Save ──
  const savePhoto = async () => {
    if (tab === "upload" && !file)     { toast.error("Please select a photo first"); return; }
    if (tab === "url"    && !imageUrl.trim()) { toast.error("Please enter an image URL"); return; }

    setSaving(true);
    try {
      let finalUrl = imageUrl.trim();
      if (tab === "upload") {
        finalUrl = await uploadToStorage();
      }
      const newRef = push(ref(db, "customerPhotos"));
      await set(newRef, {
        imageUrl: finalUrl,
        customerName: customerName.trim(),
        laptop: laptop.trim(),
        isActive: true,
        createdAt: Date.now(),
      });
      toast.success("Photo added successfully!");
      resetForm();
      setAddOpen(false);
    } catch (e: any) {
      toast.error("Failed: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview("");
    setImageUrl("");
    setCustomerName("");
    setLaptop("");
    setProgress(0);
    setTab("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleActive = async (id: string, current: boolean) => {
    await update(ref(db, `customerPhotos/${id}`), { isActive: !current });
    toast.success(!current ? "Shown on home page" : "Hidden from home page");
  };

  const deletePhoto = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    await remove(ref(db, `customerPhotos/${id}`));
    toast.success("Deleted");
  };

  const isLoading = saving || uploading;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Happy Customers</h1>
            <p className="text-sm text-slate-400 mt-1">Upload real customer photos — shown on the home page</p>
          </div>
          <button
            onClick={() => { resetForm(); setAddOpen(true); }}
            className="h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Plus size={16} /> Add Photo
          </button>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video rounded-2xl animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Camera size={48} className="text-slate-300" />
            <p className="text-slate-400 font-semibold">No customer photos yet</p>
            <button
              onClick={() => { resetForm(); setAddOpen(true); }}
              className="h-10 px-6 rounded-xl text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Add First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="rounded-2xl overflow-hidden relative group bg-slate-100 border border-slate-200"
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.customerName || "Customer"}
                  className="w-full object-cover"
                  style={{ aspectRatio: "4/3" }}
                />
                {!photo.isActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-300 bg-black/50 px-2 py-1 rounded-lg">Hidden</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => toggleActive(photo.id, photo.isActive)}
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-white/90 hover:bg-white"
                    title={photo.isActive ? "Hide" : "Show"}
                  >
                    {photo.isActive
                      ? <EyeOff size={15} className="text-slate-500" />
                      : <Eye size={15} className="text-green-600" />}
                  </button>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-white/90 hover:bg-white"
                    title="Delete"
                  >
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 p-2"
                  style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.75))" }}
                >
                  {photo.customerName && (
                    <p className="text-white text-xs font-bold leading-none">{photo.customerName}</p>
                  )}
                  {photo.laptop && (
                    <p className="text-slate-300 text-[10px] mt-0.5 leading-none truncate">{photo.laptop}</p>
                  )}
                  <p className="text-[9px] text-slate-400 mt-0.5">{formatDate(photo.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Photo Dialog ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => !isLoading && setAddOpen(false)}
          >
            <motion.div
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 bg-white"
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-900">Add Customer Photo</h2>
                <button
                  onClick={() => !isLoading && setAddOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setTab("upload")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === "upload" ? "bg-white text-gray-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Upload size={14} /> Upload from Device
                </button>
                <button
                  onClick={() => setTab("url")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === "url" ? "bg-white text-gray-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <LinkIcon size={14} /> Paste URL
                </button>
              </div>

              {/* Upload tab */}
              {tab === "upload" && (
                <div>
                  {!preview ? (
                    <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-green-400 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-50 hover:bg-green-50"
                      style={{ minHeight: 160 }}
                    >
                      <ImagePlus size={32} className="text-slate-300" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-500">Tap to pick a photo</p>
                        <p className="text-xs text-slate-400 mt-0.5">or drag & drop here · JPG, PNG, WEBP · max 10 MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-100" style={{ aspectRatio: "4/3" }}>
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      {!isLoading && (
                        <button
                          onClick={() => { setFile(null); setPreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black flex items-center justify-center"
                        >
                          <X size={13} className="text-white" />
                        </button>
                      )}
                      {/* Progress bar */}
                      {uploading && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-2">
                          <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-white text-xs text-center mt-1">Uploading {progress}%</p>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                </div>
              )}

              {/* URL tab */}
              {tab === "url" && (
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="https://... (Google Drive / any image link)"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl text-sm outline-none bg-slate-100 border border-slate-200 focus:border-blue-400"
                  />
                  {imageUrl.trim() && (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full rounded-xl object-cover"
                      style={{ maxHeight: 180 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
              )}

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-slate-100 border border-slate-200 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">
                    Product / Laptop
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HP Pavilion 15"
                    value={laptop}
                    onChange={e => setLaptop(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-slate-100 border border-slate-200 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={savePhoto}
                disabled={isLoading}
                className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uploading ? `Uploading ${progress}%…` : "Saving…"}
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Photo
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
