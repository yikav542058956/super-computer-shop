import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue, push, set, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Download, Plus, TrendingUp, TrendingDown,
  IndianRupee, Users, Loader2, ChevronRight, AlertCircle, BookOpen,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function AdminAccounting() {
  const [ledger, setLedger] = useState<Record<string, any>>({});
  const [customers, setCustomers] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ customerId: "", type: "debit", amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub1 = onValue(ref(db, "ledger"), (snap) => {
      setLedger(snap.exists() ? snap.val() : {});
      setLoading(false);
    });
    const unsub2 = onValue(ref(db, "users"), (snap) => {
      if (snap.exists()) setCustomers(snap.val());
    });
    const unsub3 = onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) {
        setOrders(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const customerList = useMemo(() => {
    return Object.entries(customers).map(([uid, data]: any) => {
      const cLedger = ledger[uid] || {};
      const entries = Object.values(cLedger) as any[];
      const totalDebit = entries.filter((e) => e.type === "debit").reduce((s, e) => s + (e.amount || 0), 0);
      const totalCredit = entries.filter((e) => e.type === "credit").reduce((s, e) => s + (e.amount || 0), 0);
      const balance = totalDebit - totalCredit;
      const cOrders = orders.filter((o) => o.userId === uid);
      return {
        uid, name: data.name || data.displayName || "Unknown", phone: data.phone || "",
        email: data.email || "", totalDebit, totalCredit, balance,
        ordersCount: cOrders.length,
        totalOrderValue: cOrders.reduce((s: number, o: any) => s + (o.finalAmount || 0), 0),
        entries,
      };
    }).filter((c) => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
    });
  }, [customers, ledger, orders, search]);

  const totalUdhar = customerList.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalAdvance = customerList.filter((c) => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);
  const outstandingCount = customerList.filter((c) => c.balance > 0).length;

  const addEntry = async () => {
    if (!addForm.customerId || !addForm.amount || Number(addForm.amount) <= 0) {
      toast.error("Please select a customer and enter an amount"); return;
    }
    setAdding(true);
    try {
      const entryRef = push(ref(db, `ledger/${addForm.customerId}`));
      await set(entryRef, {
        type: addForm.type,
        amount: Number(addForm.amount),
        note: addForm.note,
        date: new Date(addForm.date).getTime(),
        createdAt: Date.now(),
      });
      toast.success(`${addForm.type === "debit" ? "Debit" : "Payment"} entry added!`);
      setAddDialog(false);
      setAddForm({ customerId: "", type: "debit", amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
    } catch { toast.error("Failed to add entry"); }
    finally { setAdding(false); }
  };

  const exportCSV = () => {
    const rows = [
      ["Customer", "Phone", "Email", "Total Outstanding (Dr)", "Total Paid (Cr)", "Net Balance", "Orders", "Order Value"],
      ...customerList.map((c) => [c.name, c.phone, c.email, c.totalDebit, c.totalCredit, c.balance, c.ordersCount, c.totalOrderValue]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `accounting_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully!");
  };

  const customerLedgerEntries = selectedCustomer
    ? (Object.entries(ledger[selectedCustomer.uid] || {}) as any[])
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  return (
    <AdminLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={AlertCircle} label="Total Outstanding Due" value={formatINR(totalUdhar)} color="bg-red-100 text-red-600" />
        <StatCard icon={Users} label="Customers with Outstanding" value={outstandingCount} color="bg-amber-100 text-amber-600" />
        <StatCard icon={TrendingDown} label="Total Advance Received" value={formatINR(totalAdvance)} color="bg-green-100 text-green-600" />
        <StatCard icon={IndianRupee} label="Total Customers" value={customerList.length} color="bg-blue-100 text-blue-600" />
      </div>

      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Accounting & Ledger</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" onClick={() => setAddDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Entry</Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
      ) : customerList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed">
          <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No customers found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customerList.map((c) => (
            <div key={c.uid}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all ${c.balance > 0 ? "border-l-4 border-l-red-400" : c.balance < 0 ? "border-l-4 border-l-green-400" : ""}`}
              onClick={() => setSelectedCustomer(c)}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm flex-shrink-0">
                {c.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{c.name}</p>
                <p className="text-xs text-slate-500">{c.phone} • {c.ordersCount} orders • {formatINR(c.totalOrderValue)} total</p>
              </div>
              <div className="text-right shrink-0">
                {c.balance > 0 ? (
                  <div>
                    <p className="text-xs text-red-500 font-semibold">Outstanding (Due)</p>
                    <p className="font-black text-red-600">{formatINR(c.balance)}</p>
                  </div>
                ) : c.balance < 0 ? (
                  <div>
                    <p className="text-xs text-green-500 font-semibold">Advance</p>
                    <p className="font-black text-green-600">{formatINR(Math.abs(c.balance))}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-semibold">Settled ✓</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Customer Ledger Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedCustomer?.name} — Ledger
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-500 font-semibold">Total Debit (Outstanding)</p>
                  <p className="font-black text-red-700 text-lg">{formatINR(selectedCustomer.totalDebit)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-500 font-semibold">Total Credit (Paid)</p>
                  <p className="font-black text-green-700 text-lg">{formatINR(selectedCustomer.totalCredit)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${selectedCustomer.balance > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <p className={`text-xs font-semibold ${selectedCustomer.balance > 0 ? "text-red-500" : "text-green-500"}`}>
                    {selectedCustomer.balance > 0 ? "Net Outstanding" : "Net Advance"}
                  </p>
                  <p className={`font-black text-lg ${selectedCustomer.balance > 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatINR(Math.abs(selectedCustomer.balance))}
                  </p>
                </div>
              </div>

              <Button size="sm" className="w-full gap-2" onClick={() => {
                setAddForm((f) => ({ ...f, customerId: selectedCustomer.uid }));
                setAddDialog(true);
              }}>
                <Plus className="h-4 w-4" /> Add Entry for {selectedCustomer.name}
              </Button>

              {customerLedgerEntries.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {customerLedgerEntries.map((entry) => (
                    <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border ${entry.type === "debit" ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                      {entry.type === "debit" ? <TrendingUp className="h-4 w-4 text-red-500 shrink-0" /> : <TrendingDown className="h-4 w-4 text-green-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{entry.note || (entry.type === "debit" ? "Credit given" : "Payment received")}</p>
                        <p className="text-xs text-slate-500">{new Date(entry.date || entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                      <p className={`font-black shrink-0 ${entry.type === "debit" ? "text-red-600" : "text-green-600"}`}>
                        {entry.type === "debit" ? "+" : "−"} {formatINR(entry.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!addForm.customerId && (
              <div>
                <Label>Customer *</Label>
                <Select value={addForm.customerId} onValueChange={(v) => setAddForm((f) => ({ ...f, customerId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(customers).map(([uid, data]: any) => (
                      <SelectItem key={uid} value={uid}>{data.name || data.displayName || uid}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {addForm.customerId && (
              <div className="bg-slate-50 rounded-xl p-3 text-sm flex items-center justify-between">
                <span className="font-semibold">{customers[addForm.customerId]?.name || "Customer"}</span>
                <button onClick={() => setAddForm((f) => ({ ...f, customerId: "" }))} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
              </div>
            )}
            <div>
              <Label>Entry Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => setAddForm((f) => ({ ...f, type: "debit" }))}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 justify-center ${addForm.type === "debit" ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200"}`}>
                  <TrendingUp className="h-4 w-4" /> Credit Given (Dr)
                </button>
                <button onClick={() => setAddForm((f) => ({ ...f, type: "credit" }))}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 justify-center ${addForm.type === "credit" ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200"}`}>
                  <TrendingDown className="h-4 w-4" /> Payment Received (Cr)
                </button>
              </div>
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="0" value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={addForm.date} onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea placeholder="e.g. Laptop credit, UPI payment received..." value={addForm.note} onChange={(e) => setAddForm((f) => ({ ...f, note: e.target.value }))} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={addEntry} disabled={adding}>
              {adding ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Adding...</> : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
