import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useRef } from "react";
import {
  Search, Camera, Mic, Heart, ShoppingCart, LogOut, User, Settings,
  Package, Laptop, Gamepad2, GraduationCap, Briefcase, Palette,
  Recycle, Star, Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  { key: "gaming",      href: "/search?q=Gaming",      tKey: "cat_gaming",      icon: Gamepad2,      color: "#EF4444" },
  { key: "business",    href: "/search?q=Business",    tKey: "cat_business",    icon: Briefcase,     color: "#3B82F6" },
  { key: "student",     href: "/search?q=Student",     tKey: "cat_student",     icon: GraduationCap, color: "#8B5CF6" },
  { key: "creator",     href: "/search?q=Creator",     tKey: "cat_creator",     icon: Palette,       color: "#F59E0B" },
  { key: "accessories", href: "/search?q=Accessories", tKey: "cat_accessories", icon: Cpu,           color: "#10B981" },
  { key: "refurbished", href: "/search?q=Refurbished", tKey: "cat_refurbished", icon: Recycle,       color: "#6B7280" },
  { key: "premium",     href: "/search?q=Premium",     tKey: "cat_premium",     icon: Star,          color: "#FFD700" },
  { key: "laptops",     href: "/search",               tKey: "cat_all_laptops", icon: Laptop,        color: "#16a34a" },
];

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export const Navbar = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { userData, extUser, currentUser, isLoggedIn, isAdmin, logout } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { lang, t } = useLanguage();
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
    if (query.trim()) setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
    else setLocation("/search");
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (ev: any) => {
      const text = ev.results[0][0].transcript;
      setQuery(text); setListening(false);
      if (text.trim()) setLocation(`/search?q=${encodeURIComponent(text.trim())}`);
    };
    r.onerror = () => setListening(false);
    r.onend  = () => setListening(false);
    recognitionRef.current = r; r.start(); setListening(true);
  };

  const isChipActive = (href: string) => {
    const base = href.split("?")[0];
    if (!href.includes("?")) return location === href;
    return location.startsWith(base) && location.includes(href.split("?")[1] || "");
  };

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
    >
      {/* ── Row 1: Logo + Search + Icons ── */}
      <div className="container mx-auto px-4 h-12 flex items-center gap-3">

        {/* Brand */}
        <Link href="/" className="flex items-center shrink-0 group flex-1">
          <div className="leading-none">
            <span className="font-black text-lg tracking-tight text-gray-900">SUPER</span>
            <span className="font-black text-lg tracking-tight ml-1" style={{ color: "#16a34a" }}>COMPUTER</span>
          </div>
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Wishlist */}
          <Link href="/wishlist">
            <motion.button whileTap={{ scale: 0.88 }}
              className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Heart size={20} style={{ color: wishlistCount > 0 ? "#EF4444" : "#374151", fill: wishlistCount > 0 ? "#EF4444" : "none" }} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: "#EF4444" }}>
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </motion.button>
          </Link>

          {/* Cart */}
          <Link href="/cart">
            <motion.button whileTap={{ scale: 0.88 }}
              className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <ShoppingCart size={20} style={{ color: "#374151" }} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: "#16a34a" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </motion.button>
          </Link>

          {/* User */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button whileTap={{ scale: 0.88 }}
                  className="h-9 w-9 rounded-full flex items-center justify-center font-black text-sm text-white ml-1 shadow-md"
                  style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                  {avatarLetter}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="font-bold text-xs text-slate-500 truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")}>
                    <Settings size={13} className="mr-2 text-green-600" /> Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <User size={13} className="mr-2" /> {t("profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/orders")}>
                  <Package size={13} className="mr-2" /> {t("my_orders")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut size={13} className="mr-2" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={openLoginDialog}
              className="ml-1 h-8 px-3 text-xs font-bold text-white rounded-full"
              style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
              {t("login")}
            </Button>
          )}
        </div>
      </div>

      {/* ── Row 2: Search bar ── */}
      <div className="container mx-auto px-4 pb-2">
        <form onSubmit={handleSearch} className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full h-9 text-sm text-gray-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-400"
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
        </form>
      </div>

      {/* ── Category chips ── */}
      <div className="overflow-x-auto scrollbar-none border-t border-black/[0.05]">
        <div className="flex items-center gap-1.5 px-4 py-2 w-max min-w-full">
          {CATEGORIES.map(({ key, href, tKey, icon: Icon, color }) => {
            const active = isChipActive(href);
            return (
              <Link key={key} href={href}>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all"
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
                  {t(tKey)}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
