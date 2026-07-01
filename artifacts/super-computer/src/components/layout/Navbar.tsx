import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useState, useRef } from "react";
import {
  MdShoppingCart, MdFavoriteBorder, MdFavorite,
  MdSearch, MdPerson, MdLogout,
  MdReceiptLong, MdComputer, MdMic, MdCameraAlt,
} from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Category chips ─────────────────────────────────────────── */
const CATEGORY_CHIPS = [
  { key: "foryou",      href: "/products",                label: "For You",     icon: "✨" },
  { key: "laptops",     href: "/products?category=cat-1", label: "Laptops",     icon: "💻" },
  { key: "gaming",      href: "/products?category=cat-2", label: "Gaming",      icon: "🎮" },
  { key: "accessories", href: "/products?category=cat-3", label: "Accessories", icon: "🖱️" },
  { key: "components",  href: "/products?type=component", label: "Components",  icon: "⚙️" },
  { key: "brands",      href: "/products?brand=all",      label: "Brands",      icon: "🏷️" },
  { key: "deals",       href: "/products?deals=true",     label: "Deals 🔥",    icon: "%" },
];

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const Navbar = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { currentUser, userData, extUser, isLoggedIn, logout } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayName = userData?.name || extUser?.name || currentUser?.email || extUser?.phone || "User";
  const displayEmail = currentUser?.email || extUser?.email || extUser?.phone || "";
  const avatarLetter = displayName[0]?.toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setListening(false);
      if (transcript.trim()) {
        setLocation(`/products?search=${encodeURIComponent(transcript.trim())}`);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const activeChip = (href: string) => {
    const base = href.split("?")[0];
    const params = new URLSearchParams(href.includes("?") ? href.split("?")[1] : "");
    if (href === "/products" && !params.has("category") && !params.has("brand") && !params.has("deals")) {
      return location === "/products";
    }
    return (location.startsWith(base) && location !== "/products") ||
      (params.get("deals") === "true" && location.includes("deals=true"));
  };

  return (
    <header className="sticky top-0 z-50 w-full animate-slide-down"
      style={{ background: "linear-gradient(135deg, #5F35F5 0%, #7B3FE4 45%, #9333EA 100%)" }}>

      {/* ── Soft top glow ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 left-1/3 w-64 h-32 rounded-full blur-3xl"
          style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* ── Main Bar ── */}
      <div className="relative container mx-auto px-3 h-14 flex items-center justify-between gap-2.5">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
            <span className="text-white font-black text-base">S</span>
          </div>
          <div className="leading-none hidden sm:block">
            <span className="text-white font-black text-base tracking-tight drop-shadow-sm">SUPER </span>
            <span className="font-black text-base tracking-tight drop-shadow-sm" style={{ color: "#FFD700" }}>COMPUTER</span>
          </div>
        </Link>

        {/* ── Search Bar ── */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl min-w-0">
          <div className="relative flex items-center">
            {/* Search Icon */}
            <MdSearch className="absolute left-3.5 h-5 w-5 z-10" style={{ color: "#9E9E9E" }} />

            <input
              ref={searchRef}
              type="search"
              placeholder="Search laptops, accessories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-white text-gray-800 placeholder-gray-400 pl-10 pr-20 text-sm outline-none font-medium"
              style={{
                borderRadius: "24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                border: "none",
              }}
            />

            {/* Right icons inside search */}
            <div className="absolute right-1.5 flex items-center gap-0.5">
              {/* Camera */}
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center rounded-full transition-all hover:bg-gray-100 active:scale-90 ripple-container"
                title="Search by image"
              >
                <MdCameraAlt size={18} style={{ color: "#757575" }} />
              </button>
              {/* Mic */}
              <button
                type="button"
                onClick={startListening}
                className={`h-7 w-7 flex items-center justify-center rounded-full transition-all ripple-container ${
                  listening ? "animate-pulse" : "hover:bg-gray-100 active:scale-90"
                }`}
                title="Voice search"
              >
                <MdMic size={18} style={{ color: listening ? "#EF4444" : "#5F35F5" }} />
              </button>
            </div>
          </div>
        </form>

        {/* ── Right side — desktop only ── */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <Link href="/cart">
            <button className="relative h-9 w-9 rounded-full flex items-center justify-center transition-colors ripple-container"
              style={{ background: "rgba(255,255,255,0.12)" }}>
              <MdShoppingCart size={22} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow animate-bounce-in">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </Link>
          <Link href="/wishlist">
            <button className="relative h-9 w-9 rounded-full flex items-center justify-center transition-colors ripple-container"
              style={{ background: "rgba(255,255,255,0.12)" }}>
              {wishlistCount > 0
                ? <MdFavorite size={22} style={{ color: "#FF6B8A" }} />
                : <MdFavoriteBorder size={22} className="text-white" />}
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </button>
          </Link>

          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full flex items-center justify-center border-2 border-white/40 transition-all hover:border-white/80"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  <span className="text-sm font-bold text-white">{avatarLetter}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1A1535] border-white/10 text-white">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-semibold text-white">{displayName}</p>
                    <p className="text-xs text-slate-400">{displayEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="gap-2.5 cursor-pointer text-slate-200 focus:bg-white/10">
                  <MdPerson size={18} className="text-slate-400" /><span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile?tab=orders")} className="gap-2.5 cursor-pointer text-slate-200 focus:bg-white/10">
                  <MdReceiptLong size={18} className="text-slate-400" /><span>My Orders</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/wishlist")} className="gap-2.5 cursor-pointer text-slate-200 focus:bg-white/10">
                  <MdFavoriteBorder size={18} className="text-slate-400" /><span>My Wishlist</span>
                </DropdownMenuItem>
                {userData?.role === "admin" && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} className="gap-2.5 cursor-pointer focus:bg-purple-500/10">
                      <MdComputer size={18} style={{ color: "#A78BFA" }} />
                      <span style={{ color: "#A78BFA" }} className="font-medium">Admin Dashboard</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="gap-2.5 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
                  <MdLogout size={18} /><span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm"
              className="rounded-full px-5 font-bold shadow-lg border-0"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(8px)" }}
              onClick={openLoginDialog}>
              Login
            </Button>
          )}
        </div>
      </div>

      {/* ── Category Chips — scrollable ── */}
      <div className="relative overflow-x-auto scrollbar-none border-t border-white/10">
        <div className="flex items-center gap-1.5 px-3 py-2 w-max min-w-full">
          {CATEGORY_CHIPS.map(({ key, href, label, icon }) => {
            const active = activeChip(href);
            return (
              <Link key={key} href={href}>
                <div
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ripple-container"
                  style={active ? {
                    background: "rgba(255,255,255,0.95)",
                    color: "#5F35F5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    fontWeight: 700,
                  } : {
                    background: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <span>{icon}</span>
                  {label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </header>
  );
};
