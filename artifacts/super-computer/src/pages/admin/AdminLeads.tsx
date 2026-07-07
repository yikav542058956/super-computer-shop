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
  Map, Globe, Star,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INDIA_DISTRICTS, INDIA_STATE_NAMES } from "@/lib/indiaDistricts";

type LeadStatus = "new" | "interested" | "not_interested";
type LeadSource = "osm" | "google_maps";

interface Lead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category: string;
  state?: string;
  city?: string;
  source?: "google_maps" | "openstreetmap";
  createdAt: number;
  status?: LeadStatus;
}

export default function AdminLeads() {
  // Source toggle
  const [source, setSource] = useState<LeadSource>("google_maps");

  // Google Maps form — State → District → Area hierarchy
  const [gmState, setGmState] = useState("Uttar Pradesh");
  const [gmDistrict, setGmDistrict] = useState("Lucknow");
  const [gmArea, setGmArea] = useState(""); // optional sub-area/city within district
  const [gmCategory, setGmCategory] = useState("computer coaching");
  const [gmCount, setGmCount] = useState("20");

  // When state changes, reset district to first in the new list
  const gmDistrictList = INDIA_DISTRICTS[gmState] || [];

  // OSM form
  const [osmState, setOsmState] = useState("Bihar");
  const [osmDistrict, setOsmDistrict] = useState("");
  const [osmCategory, setOsmCategory] = useState("");
  const [osmCount, setOsmCount] = useState("20");

  const osmDistrictList = INDIA_DISTRICTS[osmState] || [];

  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Selective delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => setSelectedIds(
    selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id))
  );
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} leads? They will not appear again in future generate results.`)) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.flatMap(id => [
        set(ref(db, `leads_excluded_ids/${id}`), true),
        remove(ref(db, `leads/${id}`)),
      ]));
      setSelectedIds(new Set());
      toast.success(`${ids.length} leads deleted`);
    } catch (e: any) { toast.error("Failed: " + e.message); }
    finally { setBulkDeleting(false); }
  };

  // Filters
  const [filterState, setFilterState] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | LeadStatus>("all");
  const [filterSource, setFilterSource] = useState<"all" | "google_maps" | "openstreetmap">("all");
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

  const locationOptions = useMemo(() => {
    const locs = leads.map((l) => l.city || l.state || "").filter(Boolean);
    return Array.from(new Set(locs)).sort();
  }, [leads]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.category).filter(Boolean))).sort(),
    [leads],
  );

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
          l.city?.toLowerCase().includes(q) ||
          l.state?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterState !== "all" && l.city !== filterState && l.state !== filterState) return false;
      if (filterCategory !== "all" && l.category !== filterCategory) return false;
      if (filterStatus !== "all" && (l.status || "new") !== filterStatus) return false;
      if (filterSource !== "all" && (l.source || "openstreetmap") !== filterSource) return false;
      if (from && (!l.createdAt || l.createdAt < from)) return false;
      if (to && (!l.createdAt || l.createdAt > to)) return false;
      return true;
    });
  }, [leads, search, filterState, filterCategory, filterStatus, filterSource, filterFrom, filterTo]);

  const clearFilters = () => {
    setSearch(""); setFilterState("all"); setFilterCategory("all");
    setFilterStatus("all"); setFilterSource("all"); setFilterFrom(""); setFilterTo("");
  };

  const filtersActive =
    !!search || filterState !== "all" || filterCategory !== "all" ||
    filterStatus !== "all" || filterSource !== "all" || !!filterFrom || !!filterTo;

  const handleGenerate = async () => {
    if (source === "google_maps") {
      const city = gmArea.trim() ? `${gmArea.trim()}, ${gmDistrict}, ${gmState}` : `${gmDistrict}, ${gmState}`;
      if (!gmCategory.trim()) { toast.error("Please enter a category, e.g: computer coaching"); return; }
      if (!gmDistrict) { toast.error("Please select a district"); return; }
      setGenerating(true);
      setGenMessage("");
      try {
        const res = await fetch("/api/leads/gmaps-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, category: gmCategory.trim(), count: Number(gmCount) || 20 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generate failed");
        setGenMessage(data.message || "");
        if (data.newCount > 0) {
          toast.success(`${data.newCount} new leads found from Google Maps!`);
        } else {
          toast.info(data.message || "No new leads found");
        }
      } catch (e: any) {
        toast.error("Failed: " + e.message);
      } finally {
        setGenerating(false);
      }
    } else {
      if (!osmCategory.trim()) { toast.error("Please enter a category, e.g: computer coaching"); return; }
      setGenerating(true);
      setGenMessage("");
      try {
        const locationForOsm = osmDistrict || osmState;
        const res = await fetch("/api/leads/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: locationForOsm, category: osmCategory.trim(), count: Number(osmCount) || 20 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generate failed");
        setGenMessage(data.message || "");
        if (data.newCount > 0) {
          toast.success(`${data.newCount} new leads found!`);
        } else {
          toast.info(data.message || "No new leads found");
        }
      } catch (e: any) {
        toast.error("Failed: " + e.message);
      } finally {
        setGenerating(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this lead? It will not appear again in future generate results.")) return;
    try {
      await set(ref(db, `leads_excluded_ids/${id}`), true);
      await remove(ref(db, `leads/${id}`));
      toast.success("Lead deleted — it will not be generated again");
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

  const statusLabel = (s?: LeadStatus) =>
    s === "interested" ? "Interesting" : s === "not_interested" ? "Not Interesting" : "New";

  const downloadCSV = () => {
    if (filtered.length === 0) { toast.error("No leads to download"); return; }
    const header = ["Name", "Address", "Phone", "Website", "Rating", "Category", "City/State", "Source", "Date", "Status"];
    const rows = filtered.map((l) => [
      l.name || "",
      l.address || "",
      l.phone || "",
      l.website || "",
      l.rating != null ? String(l.rating) : "",
      l.category || "",
      l.city || l.state || "",
      l.source === "google_maps" ? "Google Maps" : "OpenStreetMap",
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
    toast.success("CSV file downloaded!");
  };

  const downloadPDF = () => {
    if (filtered.length === 0) { toast.error("No leads to download"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Lead List — Super Computer", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")} · Total: ${filtered.length}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Name", "Address", "Phone", "Category", "City", "Rating", "Status"]],
      body: filtered.map((l) => [
        l.name || "",
        l.address || "",
        l.phone || "",
        l.category || "",
        l.city || l.state || "",
        l.rating != null ? `${l.rating}★` : "",
        statusLabel(l.status),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`leads_${Date.now()}.pdf`);
    toast.success("PDF downloaded!");
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-2">
          <MapPinned className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-black text-slate-800">Lead Generator</h1>
        </div>
        <p className="text-sm text-slate-500 -mt-4">
          Enter a city and category to generate business leads from Google Maps — name, address, phone and more.
        </p>

        {/* ── Source Toggle ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setSource("google_maps")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              source === "google_maps"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >
            <Map className="h-4 w-4" />
            Google Maps
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${source === "google_maps" ? "bg-white/20 text-white" : "bg-green-100 text-green-700"}`}>
              RECOMMENDED
            </span>
          </button>
          <button
            onClick={() => setSource("osm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              source === "osm"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            <Globe className="h-4 w-4" />
            OpenStreetMap
          </button>
        </div>

        {/* ── Generate Form ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
          {source === "google_maps" ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* State */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">State / UT</Label>
                  <select
                    value={gmState}
                    onChange={(e) => {
                      setGmState(e.target.value);
                      const firstDistrict = (INDIA_DISTRICTS[e.target.value] || [])[0] || "";
                      setGmDistrict(firstDistrict);
                      setGmArea("");
                    }}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                  >
                    {INDIA_STATE_NAMES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {/* District */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">District / Zila</Label>
                  <select
                    value={gmDistrict}
                    onChange={(e) => { setGmDistrict(e.target.value); setGmArea(""); }}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                  >
                    {gmDistrictList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* Area (optional) */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Area / City <span className="text-slate-300">(optional)</span></Label>
                  <Input
                    placeholder="e.g: Gomti Nagar, Hazratganj"
                    value={gmArea}
                    onChange={(e) => setGmArea(e.target.value)}
                    className="text-sm"
                  />
                </div>
                {/* Category */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Category</Label>
                  <Input
                    placeholder="e.g: computer coaching"
                    value={gmCategory}
                    onChange={(e) => setGmCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32">
                  <Label className="text-xs text-slate-500 mb-1 block">How many leads</Label>
                  <Input type="number" min={1} max={50} value={gmCount} onChange={(e) => setGmCount(e.target.value)} />
                </div>
                <div className="flex-1 bg-blue-50 rounded-xl p-3 text-xs text-blue-700 border border-blue-100">
                  <strong>Google Maps:</strong> Searching for "<em>{gmCategory || "..."}</em>" in <strong>{gmArea ? `${gmArea}, ` : ""}{gmDistrict}, {gmState}</strong> — name, phone, address, website, rating.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* State */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">State / UT</Label>
                  <select
                    value={osmState}
                    onChange={(e) => { setOsmState(e.target.value); setOsmDistrict(""); }}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                  >
                    {INDIA_STATE_NAMES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {/* District */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">District <span className="text-slate-300">(optional)</span></Label>
                  <select
                    value={osmDistrict}
                    onChange={(e) => setOsmDistrict(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                  >
                    <option value="">— Whole State —</option>
                    {osmDistrictList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* Category */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Category</Label>
                  <Input
                    placeholder="e.g: computer coaching"
                    value={osmCategory}
                    onChange={(e) => setOsmCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  />
                </div>
                {/* Count */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">How many leads</Label>
                  <Input type="number" min={1} max={100} value={osmCount} onChange={(e) => setOsmCount(e.target.value)} />
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100">
                <strong>OpenStreetMap mode:</strong> Uses free open-source map data. Phone numbers may not always be available, but duplicates are never generated.
              </div>
            </>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate Leads"}
          </Button>
          {genMessage && (
            <p className={`text-xs ${genMessage.toLowerCase().includes("no new") ? "text-amber-600" : "text-green-600"}`}>
              {genMessage}
            </p>
          )}
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
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">City/State</Label>
              <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">All</option>
                {locationOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">Category</Label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">All</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">Source</Label>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">All</option>
                <option value="google_maps">Google Maps</option>
                <option value="openstreetmap">OpenStreetMap</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">Status</Label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full h-9 rounded-md border border-slate-200 px-2 text-xs bg-white">
                <option value="all">All</option>
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
            <p className="text-center text-slate-400 py-10 text-sm">
              No leads yet. Select "Google Maps" above, enter a city + category, and click Generate.
            </p>
          ) : (
            <div className="overflow-x-auto">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                  <span className="text-sm text-red-700 font-semibold">{selectedIds.size} selected</span>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
                    {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete Selected
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors">Clear</button>
                </div>
              )}
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="py-2 pr-2 w-8">
                      <input type="checkbox" className="rounded cursor-pointer"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)))} />
                    </th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Address</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Rating</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">City</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pl-3 pr-1 sticky right-0 bg-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((l) => {
                    const status = l.status || "new";
                    const isGmaps = l.source === "google_maps";
                    return (
                      <tr key={l.id} className={`hover:bg-slate-50 group ${selectedIds.has(l.id) ? "bg-red-50/40" : ""}`}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-800 whitespace-nowrap max-w-[160px]">
                          <div className="truncate" title={l.name}>{l.name}</div>
                          {l.website && (
                            <a href={l.website} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 hover:underline truncate block max-w-[150px]">
                              {l.website.replace(/^https?:\/\//, "").slice(0, 30)}
                            </a>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 max-w-[160px]">
                          <span className="flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                            <span className="truncate" title={l.address || "—"}>{l.address || "—"}</span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                          {l.phone ? (
                            <a href={`tel:${l.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />{l.phone}
                            </a>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {l.rating != null ? (
                            <span className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
                              <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                              {l.rating.toFixed(1)}
                              {l.reviews != null && <span className="text-slate-400 font-normal">({l.reviews})</span>}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{l.category}</td>
                        <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{l.city || l.state || "—"}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isGmaps ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                          }`}>
                            {isGmaps ? "Google Maps" : "OSM"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={
                            "px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap " +
                            (status === "interested"
                              ? "bg-green-100 text-green-700"
                              : status === "not_interested"
                              ? "bg-red-100 text-red-600"
                              : "bg-slate-100 text-slate-500")
                          }>
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
