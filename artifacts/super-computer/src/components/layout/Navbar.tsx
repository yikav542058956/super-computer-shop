import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useState, useRef, useEffect } from "react";
import {
  MdShoppingCart, MdFavoriteBorder, MdFavorite,
  MdSearch, MdMenu, MdClose, MdPerson, MdLogout,
  MdReceiptLong, MdLocationOn, MdChevronRight,
  MdComputer, MdStore, MdLocalOffer, MdSportsSoccer, MdHeadphones, MdMic,
} from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Category chips ─────────────────────────────────────────── */
const CATEGORY_CHIPS = [
  { href: "/products",                label: "For You",    icon: "✨" },
  { href: "/products?category=cat-1", label: "Laptops",    icon: "💻" },
  { href: "/products?category=cat-2", label: "Gaming",     icon: "🎮" },
  { href: "/products?category=cat-3", label: "Accessories",icon: "🖱️" },
  { href: "/products",                label: "Components", icon: "⚙️" },
  { href: "/products?brand=Apple",    label: "Brands",     icon: "🏷️" },
  { href: "/products?deals=true",     label: "Deals 🔥",   icon: "%" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayName = userData?.name || extUser?.name || currentUser?.email || extUser?.phone || "User";
  const displayEmail = currentUser?.email || extUser?.email || extUser?.phone || "";
  const avatarLetter = displayName[0]?.toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
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
    return location.startsWith(base) && location !== "/products" || (params.get("deals") === "true" && location.includes("deals=true"));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#0D1117]/95 backdrop-blur">
      {/* ── Main Bar ── */}
      <div className="container mx-auto px-3 h-14 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0" onClick={() => setMobileOpen(false)}>
          <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <span className="text-black font-black text-sm">S</span>
          </div>
          <div className="leading-none hidden sm:block">
            <span className="text-white font-black text-base tracking-tight">SUPER </span>
            <span className="text-green-400 font-black text-base tracking-tight">COMPUTER</span>
          </div>
        </Link>

        {/* Search Bar — always visible, flex-1 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex relative min-w-0">
          <div className="relative w-full flex items-center">
            <MdSearch className="absolute left-3 h-5 w-5 text-slate-400 shrink-0 z-10" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Laptops, accessories search karein..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 pl-9 pr-10 text-sm outline-none focus:border-green-500/50 transition-all"
            />
            {/* Mic button */}
            <button
              type="button"
              onClick={startListening}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full transition-all ${
                listening
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-green-400"
              }`}
              title="Voice search"
            >
              <MdMic size={16} />
            </button>
          </div>
        </form>

        {/* Right icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Cart — always visible */}
          <Link href="/cart">
            <button className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <MdShoppingCart size={22} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-green-500 text-[10px] font-bold text-black flex items-center justify-center shadow">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </Link>

          {/* Desktop extras */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/wishlist">
              <button className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                {wishlistCount > 0
                  ? <MdFavorite size={22} className="text-red-400" />
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
                  <button className="h-9 w-9 rounded-full bg-green-500/15 hover:bg-green-500/25 transition-colors flex items-center justify-center border border-green-500/30">
                    <span className="text-sm font-bold text-green-400">{avatarLetter}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#161B22] border-white/10 text-white">
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
                      <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} className="gap-2.5 cursor-pointer focus:bg-green-500/10 focus:text-green-400">
                        <MdComputer size={18} className="text-green-400" /><span className="text-green-400 font-medium">Admin Dashboard</span>
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
              <Button size="sm" className="rounded-full px-5 bg-green-500 hover:bg-green-400 text-black font-bold shadow-lg shadow-green-500/20" onClick={openLoginDialog}>
                Login
              </Button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <MdClose size={24} className="text-white" /> : <MdMenu size={24} className="text-white" />}
          </button>
        </div>
      </div>

      {/* ── Category Chips — scrollable, always visible ── */}
      <div className="border-t border-white/5 bg-[#0D1117] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 px-3 py-2 w-max min-w-full">
          {CATEGORY_CHIPS.map(({ href, label, icon }) => (
            <Link key={href + label} href={href}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                activeChip(href)
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : "border-white/8 text-slate-400 hover:text-white hover:border-white/20 bg-white/3"
              }`}>
                <span>{icon}</span>
                {label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Mobile Slide-Down Menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#0D1117] shadow-2xl">
          <div className="py-2">
            {isLoggedIn ? (
              <>
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-green-400">{avatarLetter}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
                  </div>
                </div>
                <div className="border-t border-white/8 mb-1" />
                {[
                  { Icon: MdPerson,         label: "My Profile",  href: "/profile" },
                  { Icon: MdReceiptLong,    label: "My Orders",   href: "/profile?tab=orders" },
                  { Icon: MdFavoriteBorder, label: "My Wishlist", href: "/wishlist" },
                  { Icon: MdLocationOn,     label: "Addresses",   href: "/profile?tab=addresses" },
                ].map(({ Icon, label, href }) => (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">
                    <Icon size={18} className="text-slate-500" />{label}
                    <MdChevronRight size={18} className="ml-auto text-slate-600" />
                  </Link>
                ))}
                {userData?.role === "admin" && (
                  <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-green-400 hover:bg-green-500/10 transition-colors">
                    <MdComputer size={18} />Admin Dashboard
                    <MdChevronRight size={18} className="ml-auto" />
                  </Link>
                )}
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
                  <MdLogout size={18} />Log out
                </button>
              </>
            ) : (
              <div className="px-4 py-3">
                <Button className="w-full rounded-full bg-green-500 hover:bg-green-400 text-black font-bold"
                  onClick={() => { setMobileOpen(false); openLoginDialog(); }}>
                  Login / Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
