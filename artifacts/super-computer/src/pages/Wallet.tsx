import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ChevronLeft, Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight,
  RefreshCcw, ShoppingBag, Gift, AlertCircle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

function formatDateTime(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const TX_TYPES: Record<string, { label: string; icon: any; color: string; sign: string }> = {
  credit:   { label: "Money Added",    icon: ArrowDownLeft,  color: "#22C55E", sign: "+" },
  refund:   { label: "Refund",         icon: RefreshCcw,     color: "#3B82F6", sign: "+" },
  gift:     { label: "Reward/Gift",    icon: Gift,           color: "#F59E0B", sign: "+" },
  debit:    { label: "Used in Order",  icon: ShoppingBag,    color: "#EF4444", sign: "-" },
  payment:  { label: "Order Payment",  icon: ShoppingBag,    color: "#EF4444", sign: "-" },
};

export default function Wallet() {
  const { currentUser, isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const unsubBal = onValue(ref(db, `wallet/${currentUser.uid}/balance`), snap => {
      setBalance(snap.exists() ? Number(snap.val()) : 0);
    });
    const unsubTx = onValue(ref(db, `wallet/${currentUser.uid}/transactions`), snap => {
      setLoading(false);
      if (!snap.exists()) { setTransactions([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      setTransactions(list);
    });
    return () => { unsubBal(); unsubTx(); };
  }, [currentUser]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#f8fafc" }}>
        <WalletIcon size={48} className="text-slate-600" />
        <p className="text-gray-900 font-bold">Login to view your wallet</p>
        <button onClick={() => setLocation("/")} className="h-12 px-8 rounded-2xl font-bold text-sm"
          style={{ background: "#22C55E", color: "#000" }}>Go Home</button>
      </div>
    );
  }

  const credited = transactions.filter(t => ["credit", "refund", "gift"].includes(t.type)).reduce((s, t) => s + (t.amount || 0), 0);
  const debited  = transactions.filter(t => ["debit", "payment"].includes(t.type)).reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>

      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
        <button onClick={() => window.history.back()}
          className="h-9 w-9 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.05)" }}>
          <ChevronLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">My Wallet</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Balance Card */}
        <div className="mx-4 mt-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden p-6"
            style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 60%,#bbf7d0 100%)", border: "1px solid rgba(22,163,74,0.3)" }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
              style={{ background: "rgba(34,197,94,0.1)" }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <WalletIcon size={16} style={{ color: "#16a34a" }} />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Wallet Balance</p>
              </div>
              <p className="text-4xl font-black text-green-900 mt-2">{formatINR(balance)}</p>
              <p className="text-xs text-green-700 mt-2">Use at checkout to get instant discount</p>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-5 relative">
              <div className="p-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownLeft size={14} style={{ color: "#22C55E" }} />
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Total Credited</p>
                </div>
                <p className="text-base font-black" style={{ color: "#22C55E" }}>{formatINR(credited)}</p>
              </div>
              <div className="p-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpRight size={14} style={{ color: "#EF4444" }} />
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Total Used</p>
                </div>
                <p className="text-base font-black" style={{ color: "#EF4444" }}>{formatINR(debited)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Info Banner */}
        <div className="mx-4 mt-3 p-4 rounded-2xl flex items-start gap-3"
          style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
          <AlertCircle size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Wallet balance is added by the store team as refunds or rewards. Contact us on WhatsApp to request a refund or for any wallet queries.
          </p>
        </div>

        {/* Transactions */}
        <div className="mt-5">
          <div className="px-4 mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Transaction History</h2>
            <p className="text-xs text-slate-500">{transactions.length} transactions</p>
          </div>

          {loading ? (
            <div className="px-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f1f5f9" }} />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <WalletIcon size={40} className="text-slate-700" />
              <p className="text-sm text-slate-500 font-semibold">No transactions yet</p>
              <p className="text-xs text-slate-600 text-center px-8">Wallet balance is added by admin as refunds or rewards</p>
            </div>
          ) : (
            <div className="px-4 space-y-2.5">
              {transactions.map((tx, i) => {
                const type = TX_TYPES[tx.type] || TX_TYPES.credit;
                const TIcon = type.icon;
                const isCredit = ["credit", "refund", "gift"].includes(tx.type);
                return (
                  <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
                    <div className="h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${type.color}18` }}>
                      <TIcon size={18} style={{ color: type.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-none">{type.label}</p>
                      {tx.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{tx.note}</p>}
                      <p className="text-[11px] text-slate-600 mt-1">{formatDateTime(tx.createdAt)}</p>
                    </div>
                    <p className="text-base font-black flex-shrink-0" style={{ color: type.color }}>
                      {type.sign}{formatINR(tx.amount)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
