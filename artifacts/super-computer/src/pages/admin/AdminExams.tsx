import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue, push, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GraduationCap, Plus, Trash2, ChevronRight, Loader2, School, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface Exam {
  id: string;
  exam_name: string;
  school_name: string;
  created_at: number;
}

export default function AdminExams() {
  const [, setLocation] = useLocation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [examName, setExamName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "exams"), (snap) => {
      setLoading(false);
      if (!snap.exists()) { setExams([]); return; }
      const list = Object.entries(snap.val() as Record<string, any>)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
      setExams(list as Exam[]);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!examName.trim()) { toast.error("Exam name is required"); return; }
    if (!schoolName.trim()) { toast.error("School name is required"); return; }
    setSaving(true);
    try {
      const newRef = push(ref(db, "exams"));
      await set(newRef, {
        exam_name: examName.trim(),
        school_name: schoolName.trim(),
        created_at: Date.now(),
      });
      toast.success("Exam created!");
      setDialogOpen(false);
      setExamName("");
      setSchoolName("");
      if (newRef.key) setLocation(`/admin/exams/${newRef.key}`);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!window.confirm(`Delete exam "${exam.exam_name}"? All papers under this exam will also be deleted.`)) return;
    try {
      await remove(ref(db, `exams/${exam.id}`));
      // Also remove all papers under this exam
      const { get: fbGet } = await import("firebase/database");
      const papersSnap = await fbGet(ref(db, "exam_papers"));
      if (papersSnap.exists()) {
        const papers = papersSnap.val() as Record<string, any>;
        const toDelete = Object.entries(papers)
          .filter(([, v]) => v.exam_id === exam.id)
          .map(([id]) => id);
        await Promise.all(toDelete.map(pid => remove(ref(db, `exam_papers/${pid}`))));
      }
      toast.success("Exam deleted");
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Exam Papers</h1>
              <p className="text-xs text-slate-500">Upload handwritten papers → edit → export PDF</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Add New Exam
          </Button>
        </div>

        {/* Exam List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <GraduationCap className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">No exams yet</p>
            <p className="text-sm text-slate-400 mt-1">Click "Add New Exam" to create your first exam</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4 hover:border-violet-300 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => setLocation(`/admin/exams/${exam.id}`)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-6 w-6 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{exam.exam_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <School className="h-3 w-3" /> {exam.school_name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(exam.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDelete(exam); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Exam Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-600" />
              Add New Exam
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Exam Name *</Label>
              <Input
                placeholder="e.g. Mid-Term Exam 2026"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>School / Institution Name *</Label>
              <Input
                placeholder="e.g. St. Mary's High School"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-violet-600 hover:bg-violet-700 gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><Plus className="h-4 w-4" />Create Exam</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
