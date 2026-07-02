import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue, get, push, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Wallet, Search, Plus, ArrowDownLeft, ArrowUpRight, Users, Loader2, X } from "lucide-react";
import { formatINR } from "@/lib/utils";

function formatDateTime(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const TX_TYPES = [
  { key: "credit", label: "Add Money (Credit)", color: "#22C55E" },
  { key: "refund", label: "Refund", color: "#3B82F6" },
  { key: "gift",   label: "Reward/Gift", color: "#F59E0B" },
  { key: "debit",  label: "Deduct Money", color: "#EF4444" },
];

export default function AdminWallet() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: "refund", amount: "", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "users"), snap => {
      setLoading(false);
      if (!snap.exists()) { setUsers([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .filter((u: any) => u.role !== "admin");
      setUsers(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const unsubBal = onValue(ref(db, `wallet/${selected.id}/balance`), snap => {
      setWalletBalance(snap.exists() ? Number(snap.val()) : 0);
    });
    const unsubTx = onValue(ref(db, `wallet/${selected.id}/transactions`), snap => {
      if (!snap.exists()) { setTxHistory([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      setTxHistory(list);
    });
    return () => { unsubBal(); unsubTx(); };
  }, [selected]);

  const addTransaction = async () => {
    if (!selected || !form.amount || isNaN(Number(form.amount))) {
      toast.error("Enter valid amount"); return;
    }
    setSaving(true);
    const amount = Math.abs(Number(form.amount));
    const isDebit = form.type === "debit" || form.type === "payment";
    try {
      const newBalance = isDebit ? Math.max(0, walletBalance - amount) : walletBalance + amount;
      await update(ref(db, `wallet/${selected.id}`), { balance: newBalance });
      const txRef = push(ref(db, `wallet/${selected.id}/transactions`));
      await set(txRef, {
        type: form.type,
        amount,
        note: form.note || TX_TYPES.find(t => t.key === form.type)?.label || "Transaction",
        createdAt: Date.now(),
        addedBy: "admin",
      });
      toast.success(`${isDebit ? "Deducted" : "Added"} ${formatINR(amount)} ${isDebit ? "from" : "to"} wallet`);
      setForm({ type: "refund", amount: "", note: "" });
      setAddOpen(false);
    } catch { toast.error("Transaction failed"); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Wallet size={24} style={{ color: "#22C55E" }} /> Wallet Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Add refunds, rewards, or deduct from user wallets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* User List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search user..."
                className="w-full h-10 rounded-xl text-sm text-gray-900 placeholder-slate-500 outline-none"
                style={{ background: "#f8fafc", paddingLeft: 36, paddingRight: 12, border: "1px solid #e2e8f0" }} />
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#f8fafc" }} />)}</div>
            ) : filtered.map(user => (
              <button key={user.id} onClick={() => setSelected(user)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selected?.id === user.id ? "border-green-500/40 bg-green-500/8" : "border-transparent hover:border-white/10"}`}
                style={{ border: "1px solid", background: selected?.id === user.id ? "rgba(34,197,94,0.08)" : "#f8fafc" }}>
                <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: "#f8fafc", color: "#94A3B8" }}>
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name || "User"}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email || user.phone || user.id}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Wallet Panel */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 rounded-2xl"
                style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
                <Users size={40} className="text-slate-600" />
                <p className="text-slate-400 font-semibold">Select a user to manage wallet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Balance Card */}
                <div className="p-5 rounded-2xl" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{selected.name || "User"}'s Wallet</p>
                      <p className="text-3xl font-black text-gray-900 mt-2">{formatINR(walletBalance)}</p>
                    </div>
                    <button onClick={() => setAddOpen(true)}
                      className="h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-2"
                      style={{ background: "#22C55E", color: "#000" }}>
                      <Plus size={15} /> Add/Deduct
                    </button>
                  </div>
                </div>

                {/* Transactions */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-900">Transaction History</h3>
                  {txHistory.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No transactions yet</p>
                  ) : txHistory.map(tx => {
                    const isCredit = ["credit", "refund", "gift"].includes(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0`}
                          style={{ background: isCredit ? "#22C55E18" : "#EF444418" }}>
                          {isCredit ? <ArrowDownLeft size={15} style={{ color: "#22C55E" }} /> : <ArrowUpRight size={15} style={{ color: "#EF4444" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{tx.note || tx.type}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                        </div>
                        <p className="font-black text-sm" style={{ color: isCredit ? "#22C55E" : "#EF4444" }}>
                          {isCredit ? "+" : "-"}{formatINR(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Transaction Dialog */}
      {addOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-4" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Wallet Transaction</h2>
              <button onClick={() => setAddOpen(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-400">User: <span className="text-gray-900 font-semibold">{selected.name}</span> · Balance: <span style={{ color: "#22C55E" }}>{formatINR(walletBalance)}</span></p>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full h-11 px-4 rounded-xl text-sm text-gray-900 outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                {TX_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Enter amount"
                className="w-full h-11 px-4 rounded-xl text-sm text-gray-900 placeholder-slate-500 outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Note (optional)</label>
              <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Refund for order #ABC"
                className="w-full h-11 px-4 rounded-xl text-sm text-gray-900 placeholder-slate-500 outline-none"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} />
            </div>
            <button onClick={addTransaction} disabled={saving}
              className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "#22C55E", color: "#000" }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Confirm Transaction
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
