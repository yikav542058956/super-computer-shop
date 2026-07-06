import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import { ref, onValue, remove, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPinned, Search, Loader2, Trash2, Download, FileText,
  Phone, MapPin, Sparkles, Layers, ThumbsUp, ThumbsDown, X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh", "Puducherry",
];

type LeadStatus = "new" | "interested" | "not_interested";

interface Lead {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  state: string;
  createdAt: number;
  status?: LeadStatus;
}

export default function AdminLeads() {
  const [state, setState] = useState("Bihar");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState("20");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filters
  const [filterState, setFilterState] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | LeadStatus>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, "leads"), (snap) => {
      setLoading(false);
      if (!snap.exists()) { setLeads([]); return; }
      const list = Object.entries(snap.val() as Record<string, any>)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setLeads(list as Lead[]);
    });
    return () => unsub();
  }, []);

  const stateOptions = useMemo(() => Array.from(new Set(leads.map((l) => l.state).filter(Boolean))).sort(), [leads]);
  const categoryOptions = useMemo(() => Array.from(new Set(leads.map((l) => l.category).filter(Boolean))).sort(), [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = filterFrom ? new Date(filterFrom + "T00:00:00").getTime() : null;
    const to = filterTo ? new Date(filterTo + "T23:59:59").getTime() : null;
    return leads.filter((l) => {
      if (q) {
        const matches =
          l.name?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) ||
          l.state?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterState !== "all" && l.state !== filterState) return false;
      if (filterCategory !== "all" && l.category !== filterCategory) return false;
      if (filterStatus !== "all" && (l.status || "new") !== filterStatus) return false;
      if (from && (!l.createdAt || l.createdAt < from)) return false;
      if (to && (!l.createdAt || l.createdAt > to)) return false;
      return true;
    });
  }, [leads, search, filterState, filterCategory, filterStatus, filterFrom, filterTo]);

  const clearFilters = () => {
    setSearch(""); setFilterState("all"); setFilterCategory("all"); setFilterStatus("all");
    setFilterFrom(""); setFilterTo("");
  };
  const filtersActive = !!search || filterState !== "all" || filterCategory !== "all" || filterStatus !== "all" || !!filterFrom || !!filterTo;

  const handleGenerate = async () => {
    if (!category.trim()) { toast.error("Category daalein, jaise: computer coaching"); return; }
    setGenerating(true);
    setGenMessage("");
    try {
      const res = await fetch("/api/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, category: category.trim(), count: Number(count) || 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setGenMessage(data.message || "");
      if (data.newCount > 0) {
        toast.success(`${data.newCount} naye leads mil gaye!`);
      } else {
        toast.info(data.message || "Koi naya lead nahi mila");
      }
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Ye lead delete karna hai? Ye dobara generate mein bhi nahi aayega.")) return;
    try {
      // Mark as excluded first so future "Generate" runs never bring this same business back.
      await set(ref(db, `leads_excluded_ids/${id}`), true);
      await remove(ref(db, `leads/${id}`));
      toast.success("Lead deleted — ab ye dobara nahi aayega");
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    }
  };

  const handleSetStatus = async (id: string, status: LeadStatus) => {
    try {
      await update(ref(db, `leads/${id}`), { status });
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    }
  };

  const statusLabel = (s?: LeadStatus) => s === "interested" ? "Interesting" : s === "not_interested" ? "Not Interesting" : "New";

  const downloadCSV = () => {
    if (filtered.length === 0) { toast.error("Koi lead nahi hai download karne ke liye"); return; }
    const header = ["Name", "Address", "Phone", "Category", "State", "Date", "Status"];
    const rows = filtered.map((l) => [
      l.name || "",
      l.address || "",
      l.phone || "",
      l.category || "",
      l.state || "",
      l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "",
      statusLabel(l.status),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel (CSV) file download ho gayi!");
  };

  const downloadPDF = () => {
    if (filtered.length === 0) { toast.error("Koi lead nahi hai download karne ke liye"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Lead List — Super Computer", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")} · Total: ${filtered.length}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Name", "Address", "Phone", "Category", "State", "Status"]],
      body: filtered.map((l) => [l.name || "", l.address || "", l.phone || "", l.category || "", l.state || "", statusLabel(l.status)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`leads_${Date.now()}.pdf`);
    toast.success("PDF download ho gayi!");
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-2">
          <MapPinned className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-black text-slate-800">Lead Generator</h1>
        </div>
        <p className="text-sm text-slate-500 -mt-4">
          State aur category daalkar naye business leads generate karein (naam, address, phone) — kabhi duplicate nahi milega.
        </p>

        {/* ── Generate Form ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">State</Label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Category</Label>
              <Input
                placeholder="jaise: computer coaching"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Kitne leads chahiye</Label>
              <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generate ho raha hai..." : "Generate Leads"}
          </Button>
          {genMessage && <p className="text-xs text-slate-500">{genMessage}</p>}
          <p className="text-[11px] text-slate-400">
            Ye tool free open-source map data (OpenStreetMap) use karta hai, isliye kuch business ka phone number ho sakta hai available na ho.
            Roz naya category/state try karke aur leads generate kar sakte ho — pehle wale kabhi dobara nahi aayenge.
          </p>
        </div>

        {/* ── Leads Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Layers className="h-4 w-4" /> Total Leads: {leads.length}
              {filtersActive && <span className="text-xs font-normal text-slate-400">(showing {filtered.length})</span>}
            </div>
            <div className="flex gap-2 flex-1 sm:flex-none">
              <div className="relative flex-1 sm:w-56">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search leads..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={downloadCSV}>
                <Download className="h-3.5 w-3.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={downloadPDF}>
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">State</Label>
              <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">Sabhi</option>
                {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">Category</Label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">Sabhi</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">Status</Label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">Sabhi</option>
                <option value="new">New</option>
                <option value="interested">Interesting</option>
                <option value="not_interested">Not Interesting</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">From Date</Label>
              <Input type="date" className="h-9 text-xs" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-slate-400 mb-1 block">To Date</Label>
                <Input type="date" className="h-9 text-xs" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
              </div>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  title="Clear filters"
                  className="h-9 w-9 shrink-0 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">Abhi tak koi lead generate nahi hua. Upar form se leads generate karein.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Address</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pl-3 pr-1 sticky right-0 bg-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((l) => {
                    const status = l.status || "new";
                    return (
                      <tr key={l.id} className="hover:bg-slate-50 group">
                        <td className="py-2.5 pr-3 font-semibold text-slate-800 whitespace-nowrap">{l.name}</td>
                        <td className="py-2.5 pr-3 text-slate-600 max-w-[160px]">
                          <span className="flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />{l.address || "—"}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                          {l.phone ? (
                            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" />{l.phone}</span>
                          ) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{l.category}</td>
                        <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{l.state}</td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={
                              "px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap " +
                              (status === "interested"
                                ? "bg-green-100 text-green-700"
                                : status === "not_interested"
                                ? "bg-red-100 text-red-600"
                                : "bg-slate-100 text-slate-500")
                            }
                          >
                            {statusLabel(status)}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 pr-1 sticky right-0 bg-white group-hover:bg-slate-50">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleSetStatus(l.id, "interested")}
                              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${status === "interested" ? "text-green-600 bg-green-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
                              title="Interesting lead"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleSetStatus(l.id, "not_interested")}
                              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${status === "not_interested" ? "text-red-600 bg-red-50" : "text-slate-400 hover:text-red-600 hover:bg-red-50"}`}
                              title="Not interesting"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(l.id)}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                              title="Delete this lead"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
