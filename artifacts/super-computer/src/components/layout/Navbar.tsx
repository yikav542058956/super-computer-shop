import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useState, useRef } from "react";
import { Search, Camera, Mic, Heart, ShoppingCart, Bell, LogOut, User, Settings, Package, Laptop, Gamepad2, GraduationCap, Briefcase, Palette, Recycle, Star, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  { key: "gaming",      href: "/search?q=Gaming",      label: "Gaming",      icon: Gamepad2,    color: "#EF4444" },
  { key: "business",    href: "/search?q=Business",    label: "Business",    icon: Briefcase,   color: "#3B82F6" },
  { key: "student",     href: "/search?q=Student",     label: "Student",     icon: GraduationCap, color: "#8B5CF6" },
  { key: "creator",     href: "/search?q=Creator",     label: "Creator",     icon: Palette,     color: "#F59E0B" },
  { key: "accessories", href: "/search?q=Accessories", label: "Accessories", icon: Cpu,         color: "#10B981" },
  { key: "refurbished", href: "/search?q=Refurbished", label: "Refurbished", icon: Recycle,     color: "#6B7280" },
  { key: "premium",     href: "/search?q=Premium",     label: "Premium",     icon: Star,        color: "#FFD700" },
  { key: "laptops",     href: "/search",               label: "All Laptops", icon: Laptop,      color: "#16a34a" },
];

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export const Navbar = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { userData, extUser, currentUser, isLoggedIn, isAdmin, logout } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const displayName = userData?.name || extUser?.name || currentUser?.email || "User";
  const avatarLetter = displayName[0]?.toUpperCase() || "U";

  const handleLogout = async () => { await logout(); setLocation("/"); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation("/search");
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "hi-IN"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (ev: any) => {
      const t = ev.results[0][0].transcript;
      setQuery(t); setListening(false);
      if (t.trim()) setLocation(`/products?search=${encodeURIComponent(t.trim())}`);
    };
    r.onerror = () => setListening(false);
    r.onend  = () => setListening(false);
    recognitionRef.current = r; r.start(); setListening(true);
  };

  const isChipActive = (href: string) => {
    const base = href.split("?")[0];
    const params = new URLSearchParams(href.includes("?") ? href.split("?")[1] : "");
    if (!params.has("category") && !params.has("deals")) return location === href;
    return location.startsWith(base) && location !== "/products" && location.includes(href.split("?")[1] || "");
  };

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
    >
      {/* ── Row 1: Logo + Icons ── */}
      <div className="container mx-auto px-4 h-12 flex items-center gap-3">

        {/* Brand name */}
        <Link href="/" className="flex items-center shrink-0 group flex-1">
          <div className="leading-none">
            <span className="font-black text-lg tracking-tight text-gray-900">SUPER</span>
            <span className="font-black text-lg tracking-tight ml-1" style={{ color: "#16a34a" }}>COMPUTER</span>
          </div>
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Wishlist */}
          <Link href="/wishlist">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              className="relative h-9 w-9 rounded-xl flex items-center justify-center transition-all ripple"
              style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <Heart size={19} style={{ color: wishlistCount > 0 ? "#EF4444" : "#64748B", fill: wishlistCount > 0 ? "#EF4444" : "none" }} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: "#EF4444" }}>
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </motion.button>
          </Link>

          {/* Notifications — desktop only */}
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            className="hidden md:flex relative h-9 w-9 rounded-xl items-center justify-center transition-all ripple"
            style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <Bell size={19} style={{ color: "#64748B" }} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{ background: "#16a34a" }} />
          </motion.button>

          {/* Cart */}
          <Link href="/cart">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              className="relative h-9 w-9 rounded-xl flex items-center justify-center transition-all ripple"
              style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <ShoppingCart size={19} style={{ color: cartCount > 0 ? "#16a34a" : "#64748B" }} />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-sm"
                  style={{ background: "#16a34a", border: "2px solid white" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </motion.span>
              )}
            </motion.button>
          </Link>

          {/* User */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="h-9 w-9 rounded-xl flex items-center justify-center border-2 font-bold text-sm transition-all"
                  style={{ background: "rgba(22,163,74,0.1)", borderColor: "rgba(22,163,74,0.3)", color: "#16a34a" }}>
                  {avatarLetter}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 16 }}>
                <DropdownMenuLabel className="text-gray-900">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-500 font-normal">{currentUser?.email || extUser?.phone}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="gap-2 cursor-pointer text-gray-700 focus:bg-gray-50 focus:text-gray-900 rounded-lg mx-1">
                  <User size={15} className="text-slate-400" />Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile?tab=orders")} className="gap-2 cursor-pointer text-gray-700 focus:bg-gray-50 focus:text-gray-900 rounded-lg mx-1">
                  <Package size={15} className="text-slate-400" />My Orders
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} className="gap-2 cursor-pointer focus:bg-emerald-50 rounded-lg mx-1" style={{ color: "#16a34a" }}>
                      <Settings size={15} />Admin Panel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50 rounded-lg mx-1">
                  <LogOut size={15} />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" onClick={openLoginDialog}
                className="rounded-xl px-4 font-bold border-0"
                style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", boxShadow: "0 4px 12px rgba(22,163,74,0.25)" }}>
                Login
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Row 2: Search bar ── */}
      <div className="px-3 pb-2.5">
        <form onSubmit={handleSearch}>
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 z-10 pointer-events-none" style={{ color: "#94A3B8" }} />
            <input
              type="search"
              placeholder="Search laptops, brands, processors..."
              value={query}
              readOnly
              onClick={() => setLocation("/search")}
              className="w-full h-10 text-sm outline-none font-medium text-gray-800 placeholder-slate-400 cursor-pointer"
              style={{
                background: "#F1F5F9",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                paddingLeft: 40,
                paddingRight: 76,
              }}
            />
            <div className="absolute right-2 flex items-center gap-0.5">
              <button type="button" onClick={() => setLocation("/search")}
                className="h-7 w-7 flex items-center justify-center rounded-lg">
                <Camera size={15} style={{ color: "#94A3B8" }} />
              </button>
              <button type="button" onClick={startListening}
                className={`h-7 w-7 flex items-center justify-center rounded-lg ${listening ? "animate-pulse" : ""}`}>
                <Mic size={15} style={{ color: listening ? "#16a34a" : "#94A3B8" }} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Category chips ── */}
      <div className="overflow-x-auto scrollbar-none border-t border-black/[0.05]">
        <div className="flex items-center gap-1.5 px-4 py-2 w-max min-w-full">
          {CATEGORIES.map(({ key, href, label, icon: Icon, color }) => {
            const active = isChipActive(href) && location.includes(key === "laptops" ? "cat-1" : key === "gaming" ? "cat-2" : "");
            return (
              <Link key={key} href={href}>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ripple"
                  style={active ? {
                    background: `${color}18`,
                    border: `1px solid ${color}40`,
                    color,
                  } : {
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.07)",
                    color: "#64748B",
                  }}>
                  <Icon size={13} />
                  {label}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
