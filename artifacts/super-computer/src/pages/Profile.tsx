import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Package, Heart, Wallet,
  MapPin, Tag, Shield, HelpCircle, MessageCircle,
  Star, LogOut, User, Edit3, Phone, Mail, Camera,
  ArrowRight, Clock, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

function formatDate(ts: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:            { label: "Pending",          color: "#F59E0B", bg: "#F59E0B15" },
  confirmed:          { label: "Confirmed",         color: "#3B82F6", bg: "#3B82F615" },
  shipped:            { label: "Shipped",           color: "#8B5CF6", bg: "#8B5CF615" },
  "out-for-delivery": { label: "Out for Delivery",  color: "#F97316", bg: "#F9731615" },
  delivered:          { label: "Delivered",         color: "#22C55E", bg: "#22C55E15" },
  cancelled:          { label: "Cancelled",         color: "#EF4444", bg: "#EF444415" },
  returned:           { label: "Returned",          color: "#64748B", bg: "#64748B15" },
};

/* ─── Edit Profile Dialog ─────────────────────────────────────── */
function EditProfileSheet({ open, onClose, userData, currentUser }: any) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) setForm({ name: userData.name || "", phone: userData.phone || "" });
  }, [userData]);

  const save = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await update(ref(db, `users/${currentUser.uid}`), form);
      toast.success("Profile updated");
      onClose();
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#0B0F19" }}
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}>
          <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <ChevronLeft size={20} className="text-white" />
            </button>
            <h1 className="text-base font-bold text-white flex-1">Edit Profile</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className="w-full h-12 px-4 rounded-2xl text-white text-sm outline-none"
                style={{ background: "#1F2937", border: "1px solid #374151" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Phone Number</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit phone number" type="tel"
                className="w-full h-12 px-4 rounded-2xl text-white text-sm outline-none"
                style={{ background: "#1F2937", border: "1px solid #374151" }} />
            </div>
          </div>
          <div className="p-5 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <button onClick={save} disabled={saving}
              className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "#22C55E", color: "#000" }}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Save Changes
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Menu Row ────────────────────────────────────────────────── */
function MenuRow({ icon: Icon, label, sub, color = "#94A3B8", onClick }: any) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 active:bg-white/[0.03] transition-colors text-left">
      <div className="h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-none">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 leading-none">{sub}</p>}
      </div>
      <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
    </button>
  );
}

function MenuDivider({ label }: { label: string }) {
  return (
    <div className="px-5 pt-5 pb-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</p>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function Profile() {
  const { currentUser, userData, logout, isLoggedIn } = useAuth();
  const { wishlistCount } = useWishlist();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onValue(ref(db, "orders"), snap => {
      if (!snap.exists()) { setOrders([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .filter((o: any) => o.userId === currentUser.uid)
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      setOrders(list);
    });
    const unsubW = onValue(ref(db, `wallet/${currentUser.uid}/balance`), snap => {
      setWalletBalance(snap.exists() ? Number(snap.val()) : 0);
    });
    return () => { unsub(); unsubW(); };
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    setLocation("/");
    toast.success("Logged out");
  };

  const displayName = userData?.name || currentUser?.displayName || "User";
  const displayEmail = userData?.email || currentUser?.email || "";
  const displayPhone = userData?.phone || "";
  const initial = displayName.charAt(0).toUpperCase();

  const activeOrders = orders.filter(o => !["delivered", "cancelled", "returned"].includes(o.orderStatus));
  const recentOrder = orders[0];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B0F19" }}>

      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#0B0F19", borderColor: "rgba(255,255,255,0.06)" }}>
        <button onClick={() => window.history.back()}
          className="h-9 w-9 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-base font-bold text-white flex-1">My Account</h1>
        <button onClick={() => setEditOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Edit3 size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">

        {/* Profile Card */}
        <div className="mx-4 mt-4 p-5 rounded-3xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#0f2318 0%,#162B1E 100%)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: "rgba(34,197,94,0.08)" }} />
          <div className="flex items-center gap-4 relative">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "#000" }}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white leading-tight">{displayName}</h2>
              {displayPhone && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone size={12} className="text-slate-400" />
                  <p className="text-xs text-slate-400">{displayPhone}</p>
                </div>
              )}
              {displayEmail && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Mail size={12} className="text-slate-500" />
                  <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Orders", value: orders.length, icon: Package, color: "#3B82F6" },
              { label: "Wishlist", value: wishlistCount, icon: Heart, color: "#EF4444" },
              { label: "Wallet", value: `₹${walletBalance.toLocaleString("en-IN")}`, icon: Wallet, color: "#22C55E" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-3 rounded-2xl"
                style={{ background: "rgba(0,0,0,0.25)" }}>
                <Icon size={18} style={{ color }} />
                <p className="text-sm font-black text-white">{value}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active order banner */}
        {activeOrders.length > 0 && recentOrder && (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => setLocation("/orders")}
            className="mx-4 mt-3 w-[calc(100%-32px)] flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ background: "#1F2937", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#F8FAFC" }}>
              <img src={recentOrder.items?.[0]?.image} alt="" className="h-full w-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Order</p>
              <p className="text-sm font-semibold text-white truncate mt-0.5">{recentOrder.items?.[0]?.name}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{
                color: STATUS_CONFIG[recentOrder.orderStatus]?.color || "#94A3B8",
                background: STATUS_CONFIG[recentOrder.orderStatus]?.bg || "#94A3B815",
              }}>
                {STATUS_CONFIG[recentOrder.orderStatus]?.label || recentOrder.orderStatus}
              </span>
              <ArrowRight size={14} className="text-slate-500" />
            </div>
          </motion.button>
        )}

        {/* Menu */}
        <div className="mt-4" style={{ background: "#111827", borderRadius: "0 0 0 0" }}>
          <MenuDivider label="Shopping" />
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <MenuRow icon={Package} label="My Orders" sub={`${orders.length} total orders`} color="#3B82F6" onClick={() => setLocation("/orders")} />
            <MenuRow icon={Heart} label="Wishlist" sub={`${wishlistCount} saved items`} color="#EF4444" onClick={() => setLocation("/wishlist")} />
          </div>

          <MenuDivider label="Finance" />
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <MenuRow icon={Wallet} label="My Wallet" sub={`Balance: ${formatINR(walletBalance)}`} color="#22C55E" onClick={() => setLocation("/wallet")} />
            <MenuRow icon={Tag} label="Coupons & Offers" sub="View available coupons" color="#F59E0B" onClick={() => toast.info("No coupons available right now")} />
          </div>

          <MenuDivider label="Account" />
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <MenuRow icon={MapPin} label="Saved Addresses" sub="Manage delivery addresses" color="#8B5CF6" onClick={() => toast.info("Coming soon")} />
            <MenuRow icon={User} label="Edit Profile" sub="Update name, phone" color="#64748B" onClick={() => setEditOpen(true)} />
          </div>

          <MenuDivider label="Support" />
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <MenuRow icon={Shield} label="Warranty Claims" sub="Track your warranty" color="#10B981" onClick={() => toast.info("Contact us on WhatsApp for warranty")} />
            <MenuRow icon={HelpCircle} label="Help Center" sub="FAQs & guides" color="#6366F1" onClick={() => setLocation("/about")} />
            <MenuRow icon={MessageCircle} label="Contact Support" sub="Chat, call, or WhatsApp" color="#F97316" onClick={() => setLocation("/contact")} />
            <MenuRow icon={Star} label="Rate & Review" sub="Share your experience" color="#EAB308" onClick={() => toast.info("You can review after your order is delivered")} />
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 mt-5 mb-4">
          <button onClick={handleLogout}
            className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
            <LogOut size={17} />
            Logout
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 pb-4">Super Computer v1.0 · Made with care</p>
      </div>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} userData={userData} currentUser={currentUser} />
    </div>
  );
}
