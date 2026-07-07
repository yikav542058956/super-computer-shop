import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useRef, useState, useCallback } from "react";
import { ref, onValue, push, set, update, remove, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  GraduationCap, School, Plus, Loader2, FileText, Download,
  Trash2, Eye, Edit2, CheckCircle, Clock, ChevronLeft,
  Upload, Scan, AlertTriangle, ImageIcon, Save,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import jsPDF from "jspdf";

interface Exam {
  id: string;
  exam_name: string;
  school_name: string;
  created_at: number;
}

interface Paper {
  id: string;
  exam_id: string;
  content: string;
  image_url?: string;
  status: "draft" | "final";
  created_at: number;
  updated_at: number;
}

function exportPDF(exam: Exam, paper: Paper) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const usable = pw - margin * 2;
  let y = 20;

  // School Name — centered, large, bold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const schoolLines = doc.splitTextToSize(exam.school_name.toUpperCase(), usable);
  doc.text(schoolLines, pw / 2, y, { align: "center" });
  y += schoolLines.length * 8 + 2;

  // Exam Name — centered, medium
  doc.setFontSize(13);
  const examLines = doc.splitTextToSize(exam.exam_name, usable);
  doc.text(examLines, pw / 2, y, { align: "center" });
  y += examLines.length * 7 + 2;

  // Date — right aligned
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dateStr = `Date: ${new Date(paper.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`;
  doc.text(dateStr, pw - margin, y, { align: "right" });
  y += 6;

  // Divider
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  // Paper content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const pageH = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(paper.content || "", usable);

  for (const line of lines) {
    if (y > pageH - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6;
  }

  // Footer on each page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${exam.school_name} — ${exam.exam_name} — Page ${i} of ${totalPages}`, pw / 2, pageH - 10, { align: "center" });
    doc.setTextColor(0);
  }

  const fileName = `${exam.exam_name.replace(/\s+/g, "_")}_${exam.school_name.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
  toast.success("PDF exported!");
}

export default function AdminExamDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/exams/:id");
  const examId = params?.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingExam, setLoadingExam] = useState(true);

  // Create paper dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ocrText, setOcrText] = useState("");
  const [ocrWarning, setOcrWarning] = useState("");
  const [ocring, setOcring] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paperStatus, setPaperStatus] = useState<"draft" | "final">("draft");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit paper dialog
  const [editPaper, setEditPaper] = useState<Paper | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "final">("draft");
  const [editSaving, setEditSaving] = useState(false);

  // View paper dialog
  const [viewPaper, setViewPaper] = useState<Paper | null>(null);

  const hasUnsavedChanges = ocrText.trim().length > 0 && createOpen;

  useEffect(() => {
    if (!examId) return;
    get(ref(db, `exams/${examId}`)).then((snap) => {
      if (snap.exists()) setExam({ id: examId, ...snap.val() });
      setLoadingExam(false);
    });
  }, [examId]);

  useEffect(() => {
    if (!examId) return;
    const unsub = onValue(ref(db, "exam_papers"), (snap) => {
      if (!snap.exists()) { setPapers([]); return; }
      const all = Object.entries(snap.val() as Record<string, any>)
        .map(([id, v]) => ({ id, ...v }))
        .filter((p: any) => p.exam_id === examId)
        .sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
      setPapers(all as Paper[]);
    });
    return () => unsub();
  }, [examId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleImageSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10MB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    setImageFile(file);
    setOcrText("");
    setOcrWarning("");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleOCR = async () => {
    if (!imageFile) { toast.error("Please upload an image first"); return; }
    setOcring(true);
    setOcrWarning("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const res = await fetch("/api/groq/ocr-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OCR failed");

      if (data.warning) {
        setOcrWarning(data.warning);
        if (data.text) setOcrText(data.text);
        toast.warning(data.warning);
      } else {
        setOcrText(data.text || "");
        toast.success("Text extracted! Please review and correct.");
      }
    } catch (e: any) {
      toast.error("OCR failed: " + e.message);
    } finally {
      setOcring(false);
    }
  };

  const handleSavePaper = async () => {
    if (!examId || !exam) return;
    if (!ocrText.trim()) { toast.error("Paper content cannot be empty"); return; }
    setSaving(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        setUploading(true);
        const sRef = storageRef(storage, `exam_papers/${examId}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(sRef, imageFile);
        imageUrl = await getDownloadURL(sRef);
        setUploading(false);
      }
      const newRef = push(ref(db, "exam_papers"));
      await set(newRef, {
        exam_id: examId,
        content: ocrText.trim(),
        image_url: imageUrl,
        status: paperStatus,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      toast.success("Paper saved!");
      setCreateOpen(false);
      setImageFile(null);
      setImagePreview("");
      setOcrText("");
      setOcrWarning("");
      setPaperStatus("draft");
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleCloseCreate = () => {
    if (ocrText.trim() && !window.confirm("You have unsaved changes. Leave anyway?")) return;
    setCreateOpen(false);
    setImageFile(null);
    setImagePreview("");
    setOcrText("");
    setOcrWarning("");
    setPaperStatus("draft");
  };

  const handleEditSave = async () => {
    if (!editPaper) return;
    if (!editContent.trim()) { toast.error("Content cannot be empty"); return; }
    setEditSaving(true);
    try {
      await update(ref(db, `exam_papers/${editPaper.id}`), {
        content: editContent.trim(),
        status: editStatus,
        updated_at: Date.now(),
      });
      toast.success("Paper updated!");
      setEditPaper(null);
    } catch (e: any) {
      toast.error("Update failed: " + e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (paper: Paper) => {
    if (!window.confirm("Delete this paper permanently?")) return;
    try {
      await remove(ref(db, `exam_papers/${paper.id}`));
      toast.success("Paper deleted");
    } catch (e: any) {
      toast.error("Delete failed: " + e.message);
    }
  };

  const openEdit = (paper: Paper) => {
    setEditPaper(paper);
    setEditContent(paper.content);
    setEditStatus(paper.status);
  };

  if (loadingExam) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      </AdminLayout>
    );
  }

  if (!exam) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <p className="text-slate-500">Exam not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/admin/exams")}>Back to Exams</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back + Header */}
        <div>
          <button onClick={() => setLocation("/admin/exams")} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 mb-3 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> All Exams
          </button>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-7 w-7 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800">{exam.exam_name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <School className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-500 font-medium">{exam.school_name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created {new Date(exam.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    &nbsp;·&nbsp;{papers.length} paper{papers.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0">
                <Plus className="h-4 w-4" /> Create a Paper
              </Button>
            </div>
          </div>
        </div>

        {/* Papers History */}
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            Papers History ({papers.length})
          </h2>
          {papers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <FileText className="h-10 w-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No papers yet. Click "Create a Paper" to start.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {papers.map((paper, idx) => (
                <div key={paper.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${paper.status === "final" ? "bg-green-100" : "bg-amber-100"}`}>
                      {paper.status === "final"
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <Clock className="h-4 w-4 text-amber-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">Paper #{papers.length - idx}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paper.status === "final" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {paper.status === "final" ? "Final" : "Draft"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(paper.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="gap-1 text-slate-600" onClick={() => setViewPaper(paper)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(paper)}>
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50" onClick={() => exportPDF(exam, paper)}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(paper)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Paper Dialog ──────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={() => handleCloseCreate()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600" />
              Create a Paper — {exam.exam_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Upload Image */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Step 1: Upload Handwritten Paper Photo</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${imagePreview ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageSelect(f); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
                />
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain shadow" />
                    <p className="text-xs text-violet-600 font-medium">{imageFile?.name} — Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500">Click or drag to upload photo</p>
                    <p className="text-xs text-slate-400">JPG, PNG · Max 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: OCR */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Step 2: Extract Text (OCR)</Label>
              <Button
                onClick={handleOCR}
                disabled={!imageFile || ocring}
                variant="outline"
                className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                {ocring ? <><Loader2 className="h-4 w-4 animate-spin" />Extracting text...</> : <><Scan className="h-4 w-4" />Extract Text from Photo</>}
              </Button>
              {ocrWarning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{ocrWarning}</span>
                </div>
              )}
            </div>

            {/* Step 3: Edit Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Step 3: Review & Edit Extracted Text</Label>
                {ocrText && <span className="text-xs text-slate-400">{ocrText.length} chars</span>}
              </div>
              <Textarea
                rows={14}
                placeholder="OCR extracted text will appear here. You can also type manually if OCR is not accurate..."
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="font-mono text-sm resize-y"
              />
              <p className="text-xs text-slate-400">OCR is not 100% accurate for handwriting — please review and correct any mistakes before saving.</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-4">
              <Label className="text-sm font-semibold shrink-0">Save as:</Label>
              <div className="flex gap-2">
                {(["draft", "final"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPaperStatus(s)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${paperStatus === s ? (s === "final" ? "bg-green-600 text-white border-green-600" : "bg-amber-500 text-white border-amber-500") : "border-slate-200 text-slate-500 hover:border-slate-400"}`}
                  >
                    {s === "final" ? "✓ Final" : "Draft"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseCreate}>Cancel</Button>
            <Button variant="outline" onClick={() => { if (!exam || !ocrText.trim()) { toast.error("No content to preview"); return; } exportPDF(exam, { id: "preview", exam_id: exam.id, content: ocrText, status: paperStatus, created_at: Date.now(), updated_at: Date.now() }); }} className="gap-2">
              <Download className="h-4 w-4" /> Preview PDF
            </Button>
            <Button
              onClick={handleSavePaper}
              disabled={saving || uploading}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving || uploading ? <><Loader2 className="h-4 w-4 animate-spin" />{uploading ? "Uploading..." : "Saving..."}</> : <><Save className="h-4 w-4" />Save Paper</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Paper Dialog ─────────────────────────────────────── */}
      <Dialog open={!!viewPaper} onOpenChange={(o) => !o && setViewPaper(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-slate-600" />
              View Paper
            </DialogTitle>
          </DialogHeader>
          {viewPaper && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-xl p-4 text-center border">
                <p className="font-black text-lg text-slate-800">{exam.school_name}</p>
                <p className="font-semibold text-slate-600 mt-0.5">{exam.exam_name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(viewPaper.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              {viewPaper.image_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Original Photo</p>
                  <img src={viewPaper.image_url} alt="Original" className="w-full rounded-xl border object-contain max-h-56" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Paper Content</p>
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border max-h-96 overflow-y-auto">
                  {viewPaper.content}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewPaper(null)}>Close</Button>
            {viewPaper && (
              <>
                <Button variant="outline" onClick={() => { setViewPaper(null); openEdit(viewPaper); }} className="gap-2">
                  <Edit2 className="h-4 w-4" /> Edit
                </Button>
                <Button onClick={() => exportPDF(exam, viewPaper)} className="gap-2 bg-violet-600 hover:bg-violet-700">
                  <Download className="h-4 w-4" /> Export PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Paper Dialog ─────────────────────────────────────── */}
      <Dialog open={!!editPaper} onOpenChange={(o) => !o && setEditPaper(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              Edit Paper
            </DialogTitle>
          </DialogHeader>
          {editPaper && (
            <div className="space-y-4 py-2">
              {editPaper.image_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Original Photo</p>
                  <img src={editPaper.image_url} alt="Original" className="w-full rounded-xl border object-contain max-h-40" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Paper Content</Label>
                <Textarea
                  rows={16}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="font-mono text-sm resize-y"
                />
              </div>
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold shrink-0">Status:</Label>
                <div className="flex gap-2">
                  {(["draft", "final"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${editStatus === s ? (s === "final" ? "bg-green-600 text-white border-green-600" : "bg-amber-500 text-white border-amber-500") : "border-slate-200 text-slate-500 hover:border-slate-400"}`}
                    >
                      {s === "final" ? "✓ Final" : "Draft"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPaper(null)}>Cancel</Button>
            {editPaper && (
              <Button variant="outline" onClick={() => exportPDF(exam, { ...editPaper, content: editContent, status: editStatus })} className="gap-2">
                <Download className="h-4 w-4" /> Preview PDF
              </Button>
            )}
            <Button onClick={handleEditSave} disabled={editSaving} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {editSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
