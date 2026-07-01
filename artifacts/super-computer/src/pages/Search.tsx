import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Mic, Camera, ShoppingCart,
  Star, Heart, GitCompare, MessageCircle, Shield,
  Truck, BadgeCheck, X, Clock, TrendingUp, SlidersHorizontal,
  ChevronRight, Package,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart as useCartBadge } from "@/contexts/CartContext";
import { toast } from "sonner";

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

/* ─── constants ─────────────────────────────── */
const RECENT_KEY = "sc_recent_searches";
const TRENDING = [
  "HP i5 laptop",
  "Dell Latitude",
  "Lenovo ThinkPad",
  "Gaming laptop",
  "Laptop under ₹25000",
  "Refurbished laptop",
  "ASUS VivoBook",
  "MacBook Air",
];
const FILTER_CHIPS = [
  "Sort & Filter",
  "Brand",
  "Processor",
  "RAM",
  "SSD",
  "Price",
  "Condition",
  "Warranty",
  "Delivery",
];

/* ─── helpers ────────────────────────────────── */
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(q: string) {
  const prev = getRecent().filter(r => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 8)));
}
function removeRecent(q: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter(r => r !== q)));
}

function specsLine(p: any): string {
  const parts: string[] = [];
  if (p.processor) parts.push(p.processor);
  if (p.ram) parts.push(p.ram + " RAM");
  if (p.storage) parts.push(p.storage + " SSD");
  if (p.display) parts.push(p.display);
  return parts.join(" • ") || "Intel Core • 8GB RAM • 256GB SSD • 15.6\"";
}

function discount(p: any): number {
  if (!p.discountPrice || p.discountPrice >= p.price) return 0;
  return Math.round(((p.price - p.discountPrice) / p.price) * 100);
}

/* ─── SkeletonCard ───────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-3 flex gap-3 animate-pulse">
      <div className="w-28 h-28 rounded-xl bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded w-full" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

/* ─── ProductCard ────────────────────────────── */
function ProductCard({ product, index, onNavigate }: { product: any; index: number; onNavigate: (id: string) => void }) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const isWished = isWishlisted(product.id);
  const disc = discount(product);
  const price = product.discountPrice || product.price;

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ productId: product.id, name: product.name, price, qty: 1, image: product.images?.[0] || "" });
    toast.success("Added to cart");
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist({ productId: product.id, name: product.name, price: price, image: product.images?.[0] || "", addedAt: Date.now() });
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = `Hi! I'm interested in *${product.name}* priced at ${formatINR(price)}. Can you share more details?`;
    window.open(`https://wa.me/919999999999?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onNavigate(product.id)}
      className="bg-white rounded-2xl p-3 cursor-pointer active:scale-[0.99] transition-transform"
      style={{ border: "1px solid #E5E7EB" }}
    >
      <div className="flex gap-3">
        {/* Image */}
        <div className="relative w-28 h-28 flex-shrink-0 bg-[#F5F7FB] rounded-xl flex items-center justify-center overflow-hidden">
          <img
            src={product.images?.[0] || "https://via.placeholder.com/112x112?text=Laptop"}
            alt={product.name}
            className="w-full h-full object-contain p-1"
            onError={e => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/112x112?text=Laptop"; }}
          />
          {disc > 0 && (
            <span className="absolute top-1 left-1 bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
              -{disc}%
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 relative">
          {/* Wishlist */}
          <button onClick={handleWishlist} className="absolute top-0 right-0 p-0.5">
            <Heart size={17} className={isWished ? "fill-red-500 text-red-500" : "text-gray-300"} />
          </button>

          {/* Name */}
          <p className="text-[13px] font-semibold text-[#111827] leading-snug pr-6 line-clamp-2">{product.name}</p>

          {/* Specs */}
          <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed line-clamp-1">{specsLine(product)}</p>

          {/* Rating + Badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {product.rating && (
              <span className="flex items-center gap-0.5 bg-[#16A34A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                <Star size={8} className="fill-white" />
                {product.rating}
              </span>
            )}
            {product.reviewsCount && (
              <span className="text-[10px] text-[#6B7280]">({product.reviewsCount})</span>
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-[#2563EB] font-semibold">
              <BadgeCheck size={11} />
              Verified
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-[#16A34A] font-semibold">
              <Shield size={10} />
              Assured
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[15px] font-bold text-[#111827]">{formatINR(price)}</span>
            {disc > 0 && (
              <>
                <span className="text-[11px] text-[#6B7280] line-through">{formatINR(product.price)}</span>
                <span className="text-[11px] text-[#16A34A] font-semibold">{disc}% off</span>
              </>
            )}
          </div>

          {/* Bank offer */}
          <p className="text-[10px] text-[#2563EB] font-medium mt-0.5">
            💳 Extra ₹500 off on SBI Card
          </p>

          {/* Delivery */}
          <div className="flex items-center gap-1 mt-0.5">
            <Truck size={10} className="text-[#16A34A]" />
            <span className="text-[10px] text-[#16A34A] font-medium">Get it by Tomorrow</span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#F3F4F6]">
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold text-white"
          style={{ background: "#25D366" }}
        >
          <MessageCircle size={13} />
          WhatsApp Enquiry
        </button>
        <button
          onClick={handleCart}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold text-[#2563EB] border border-[#2563EB]"
        >
          <ShoppingCart size={13} />
          Add to Cart
        </button>
        <button className="h-8 w-8 flex items-center justify-center rounded-xl border border-[#E5E7EB] flex-shrink-0">
          <GitCompare size={13} className="text-[#6B7280]" />
        </button>
      </div>

      {/* EMI */}
      <p className="text-[10px] text-[#6B7280] mt-1.5 pl-0.5">
        EMI from ₹{Math.round(price / 12 / 100) * 100}/month • No Cost EMI available
      </p>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────── */
export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { cartCount } = useCartBadge();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  /* Load products from Firebase */
  useEffect(() => {
    const r = ref(db, "products");
    const unsub = onValue(r, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((p: any) => p.status === "active");
        setProducts(list);
      }
    });
    return () => unsub();
  }, []);

  /* Load recent searches + read URL ?q= param on mount */
  useEffect(() => {
    setRecentSearches(getRecent());
    const params = new URLSearchParams(window.location.search);
    const urlQ = params.get("q");
    if (urlQ) {
      setQuery(urlQ);
    } else {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, []);

  /* Search logic */
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      const q = query.trim().toLowerCase();
      const found = products.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.processor?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
      setResults(found);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, products]);

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    saveRecent(q.trim());
    setQuery(q.trim());
    setRecentSearches(getRecent());
  };

  const handleDeleteRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecent(q);
    setRecentSearches(getRecent());
  };

  const navigateToProduct = (id: string) => {
    setLocation(`/products/${id}`);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Voice search not supported in this browser"); return; }
    const r = new SR();
    r.lang = "hi-IN"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (ev: any) => {
      const t = ev.results[0][0].transcript;
      setQuery(t); setListening(false);
      handleSearch(t);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  };

  const suggestions = TRENDING.filter(t => query && t.toLowerCase().includes(query.toLowerCase()));
  const showPre = !query.trim();
  const showResults = !!query.trim();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "#F5F7FB" }}
    >
      {/* ── Sticky Header ── */}
      <div className="bg-white shadow-sm flex-shrink-0" style={{ borderBottom: "1px solid #E5E7EB" }}>
        {/* Search row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={() => window.history.back()}
            className="h-9 w-9 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: "#F5F7FB" }}
          >
            <ArrowLeft size={20} className="text-[#111827]" />
          </button>

          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 h-10" style={{ background: "#F5F7FB", border: "1.5px solid #2563EB" }}>
            <Search size={16} className="text-[#6B7280] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search laptops..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch(query)}
              className="flex-1 bg-transparent text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X size={15} className="text-[#9CA3AF]" />
              </button>
            )}
          </div>

          <button onClick={startVoice} className="h-9 w-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: "#F5F7FB" }}>
            <Mic size={18} className={listening ? "text-[#2563EB] animate-pulse" : "text-[#6B7280]"} />
          </button>
          <button className="h-9 w-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: "#F5F7FB" }}>
            <Camera size={18} className="text-[#6B7280]" />
          </button>
          <button onClick={() => setLocation("/cart")} className="h-9 w-9 flex items-center justify-center rounded-xl relative flex-shrink-0" style={{ background: "#F5F7FB" }}>
            <ShoppingCart size={18} className="text-[#111827]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full text-[9px] font-black text-white bg-[#EF4444] flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter chips — only when results visible */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2 px-3 pb-2.5 w-max">
                  {FILTER_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => setActiveFilter(f => f === chip ? null : chip)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                      style={
                        activeFilter === chip
                          ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                          : { background: "#fff", color: "#111827", border: "1px solid #E5E7EB" }
                      }
                    >
                      {chip === "Sort & Filter" && <SlidersHorizontal size={11} />}
                      {chip}
                      {chip !== "Sort & Filter" && <ChevronRight size={11} className="rotate-90" />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── PRE-SEARCH: Recent + Trending ── */}
        <AnimatePresence mode="wait">
          {showPre && (
            <motion.div
              key="pre"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4 space-y-6"
            >
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-bold text-[#111827]">Recent Searches</p>
                    <button onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }} className="text-[11px] text-[#2563EB] font-semibold">
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {recentSearches.map(q => (
                      <div
                        key={q}
                        onClick={() => { setQuery(q); handleSearch(q); }}
                        className="flex items-center justify-between py-2.5 px-3 bg-white rounded-xl cursor-pointer active:bg-[#F5F7FB] transition-colors"
                        style={{ border: "1px solid #F3F4F6" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock size={14} className="text-[#9CA3AF]" />
                          <span className="text-[13px] text-[#111827]">{q}</span>
                        </div>
                        <button onClick={e => handleDeleteRecent(q, e)}>
                          <X size={14} className="text-[#D1D5DB]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Trending Searches */}
              <section>
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp size={14} className="text-[#2563EB]" />
                  <p className="text-[13px] font-bold text-[#111827]">Popular Searches</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map(t => (
                    <button
                      key={t}
                      onClick={() => { setQuery(t); handleSearch(t); }}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium text-[#374151] transition-colors active:bg-[#2563EB] active:text-white"
                      style={{ background: "#fff", border: "1px solid #E5E7EB" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              {/* Category shortcuts */}
              <section>
                <p className="text-[13px] font-bold text-[#111827] mb-3">Browse by Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Gaming Laptops", sub: "RTX & High FPS", color: "#EF4444", bg: "#FEF2F2" },
                    { label: "Business Laptops", sub: "i5/i7 Certified", color: "#2563EB", bg: "#EFF6FF" },
                    { label: "Student Laptops", sub: "Under ₹30K", color: "#7C3AED", bg: "#F5F3FF" },
                    { label: "Refurbished", sub: "Warranty Included", color: "#16A34A", bg: "#F0FDF4" },
                  ].map(cat => (
                    <button
                      key={cat.label}
                      onClick={() => { setQuery(cat.label); handleSearch(cat.label); }}
                      className="text-left p-3 rounded-xl transition-colors active:opacity-80"
                      style={{ background: cat.bg, border: `1px solid ${cat.color}20` }}
                    >
                      <p className="text-[12px] font-bold" style={{ color: cat.color }}>{cat.label}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{cat.sub}</p>
                    </button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* ── RESULTS ── */}
          {showResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Result count */}
              {!loading && (
                <div className="flex items-center justify-between px-4 mt-3 mb-2">
                  <p className="text-[12px] text-[#6B7280] font-medium">
                    <span className="text-[#111827] font-bold">{results.length}</span> results for "{query}"
                  </p>
                </div>
              )}

              {/* Skeleton */}
              {loading && (
                <div className="px-4 mt-3 space-y-3">
                  {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
              )}

              {/* Empty state */}
              {!loading && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-6"
                >
                  <div className="w-20 h-20 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4">
                    <Package size={36} className="text-[#2563EB]" />
                  </div>
                  <p className="text-[16px] font-bold text-[#111827] mb-1">No results found</p>
                  <p className="text-[13px] text-[#6B7280] text-center mb-6">
                    We couldn't find any laptops matching "{query}".<br />Try a different search term.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {TRENDING.slice(0, 4).map(t => (
                      <button
                        key={t}
                        onClick={() => { setQuery(t); handleSearch(t); }}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#2563EB] border border-[#2563EB]"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Product list */}
              {!loading && results.length > 0 && (
                <div className="px-4 mt-2 space-y-3 pb-4">
                  {results.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      onNavigate={navigateToProduct}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
