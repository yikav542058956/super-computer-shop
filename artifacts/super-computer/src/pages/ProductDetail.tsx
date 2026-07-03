import { useParams, useLocation, Link } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { ref, get, push, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ShoppingCart, Heart, ShieldCheck, Truck, Star,
  Info, ChevronRight, Cpu, HardDrive, MemoryStick,
  ChevronLeft, User, Package, Zap, Award, ArrowLeft, Phone, CheckCheck,
} from "lucide-react";
import { WhatsAppFloat } from "@/components/WhatsAppButton";
import { formatINR } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

/* ─── Image Carousel ─────────────────────────────────────────── */
function ImageCarousel({ images, productName }: { images: string[]; productName: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const imgList = images?.length ? images : ["/images/laptops/macbook-pro.png"];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative rounded-2xl overflow-hidden bg-[#F0F2F5]" style={{ height: "360px" }}>
        <div ref={emblaRef} className="h-full overflow-hidden">
          <div className="flex h-full">
            {imgList.map((src, idx) => (
              <div key={idx} className="flex-[0_0_100%] h-full flex items-center justify-center p-8">
                <img
                  src={src}
                  alt={`${productName} view ${idx + 1}`}
                  className="max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>

        {imgList.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm border border-gray-200 text-white flex items-center justify-center hover:bg-black/50 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm border border-gray-200 text-white flex items-center justify-center hover:bg-black/50 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imgList.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={`rounded-full transition-all duration-300 ${i === selectedIndex ? "w-5 h-2 bg-green-400" : "w-2 h-2 bg-black/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {imgList.length > 1 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {imgList.map((src, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={`h-16 w-16 rounded-xl border-2 p-1.5 transition-all bg-[#F0F2F5] ${
                selectedIndex === idx
                  ? "border-green-500 shadow-lg shadow-green-500/30"
                  : "border-gray-200 hover:border-white/30"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Star Rating Display ────────────────────────────────────── */
function StarRatingDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300 fill-transparent"}`}
        />
      ))}
    </div>
  );
}

/* ─── Review Card ────────────────────────────────────────────── */
function ReviewCard({ review }: { review: any }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
          <span className="text-green-600 font-bold text-sm">{review.userName?.[0]?.toUpperCase() || "U"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm">{review.userName || "Anonymous"}</p>
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">✓ Verified Purchase</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-0.5 mt-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-transparent"}`} />
            ))}
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
          {review.imageUrl && (
            <div className="mt-3">
              <img
                src={review.imageUrl}
                alt="Review photo"
                className="h-32 w-32 object-cover rounded-xl border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => window.open(review.imageUrl, "_blank")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Spec Icon ──────────────────────────────────────────────── */
function SpecsIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.includes("processor") || l.includes("cpu")) return <Cpu className="h-4 w-4 text-green-400" />;
  if (l.includes("storage") || l.includes("ssd") || l.includes("hdd")) return <HardDrive className="h-4 w-4 text-blue-400" />;
  if (l.includes("ram") || l.includes("memory")) return <MemoryStick className="h-4 w-4 text-purple-400" />;
  return <Info className="h-4 w-4 text-slate-400" />;
}

/* ─── Suggested Product Card ─────────────────────────────────── */
function SuggestedCard({ p }: { p: any }) {
  const { addToCart } = useCart();
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const discountPct = hasDiscount ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0;

  return (
    <Link href={`/products/${p.id}`}>
      <div className="group flex-shrink-0 w-44 sm:w-52 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-200 cursor-pointer">
        {/* Image */}
        <div className="h-36 bg-[#F0F2F5] flex items-center justify-center p-4">
          <img
            src={p.images?.[0] || "/images/laptops/macbook-pro.png"}
            alt={p.name}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        {/* Info */}
        <div className="p-3">
          {hasDiscount && (
            <span className="text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
              {discountPct}% OFF
            </span>
          )}
          <p className="text-xs font-bold text-gray-800 mt-1.5 line-clamp-2 leading-snug">{p.name}</p>
          <p className="text-sm font-black text-gray-900 mt-1">{formatINR(p.discountPrice || p.price)}</p>
          {hasDiscount && (
            <p className="text-[10px] text-slate-400 line-through">{formatINR(p.price)}</p>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart({ productId: p.id, name: p.name, price: p.discountPrice || p.price, qty: 1, image: p.images?.[0] || "" });
              toast.success("Added to cart! 🛒");
            }}
            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-400 text-black text-xs font-bold py-2 rounded-xl transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}

/* ─── Description with Read More ────────────────────────────── */
function DescriptionSection({ description }: { description?: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = description || "No description available.";
  // ~3 lines ≈ 280 characters on mobile
  const LIMIT = 280;
  const isLong = text.length > LIMIT;
  const displayed = !isLong || expanded ? text : text.slice(0, LIMIT).trimEnd() + "…";

  return (
    <div id="sec-description" className="scroll-mt-16 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-black text-gray-900">Description</h2>
      </div>
      <div className="px-6 py-5">
        <p className="text-slate-600 leading-relaxed text-[15px] whitespace-pre-line">{displayed}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-3 text-sm font-bold flex items-center gap-1 transition-colors"
            style={{ color: "#16a34a" }}
          >
            {expanded ? "Read Less ↑" : "Read More ↓"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Stock Badge ────────────────────────────────────────────── */
function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
        Out of Stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm font-black px-3 py-1 rounded-full border animate-pulse"
        style={{
          background: "linear-gradient(135deg,#fff7ed,#ffedd5)",
          borderColor: "#fb923c",
          color: "#c2410c",
        }}
      >
        {/* Fire icon */}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-orange-500 shrink-0">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
        </svg>
        Only {stock} Left!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
      In Stock
    </span>
  );
}

/* ─── Call Button ────────────────────────────────────────────── */
function CallProductButton({ callingNumber }: { callingNumber: string }) {
  const [copied, setCopied] = useState(false);

  if (!callingNumber) return null;

  // Normalize: strip non-digits, remove leading 91 if present, keep 10 digits
  const digits = callingNumber.replace(/\D/g, "").replace(/^91/, "").slice(-10);
  const phone = `+91${digits}`;

  const handleCall = () => {
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${phone}`;
    } else {
      try {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(phone)
            .then(() => {
              setCopied(true);
              toast.success(`📋 Number copied: ${phone}`);
              setTimeout(() => setCopied(false), 3000);
            })
            .catch(() => { window.location.href = `tel:${phone}`; });
        } else {
          window.location.href = `tel:${phone}`;
        }
      } catch {
        window.location.href = `tel:${phone}`;
      }
    }
  };

  return (
    <button
      onClick={handleCall}
      className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:border-blue-300"
    >
      {copied ? (
        <>
          <CheckCheck className="h-4 w-4 text-green-600" />
          <span className="text-green-700">Number Copied!</span>
          <span className="text-xs font-normal text-green-600">{phone}</span>
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          Call for More Information
          <span className="text-xs font-normal text-blue-500 hidden sm:inline">({phone})</span>
        </>
      )}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [callingNumber, setCallingNumber] = useState<string>("");

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    const unsub = onValue(ref(db, "settings/callingNumber"), (snap) => {
      if (snap.exists()) setCallingNumber(snap.val());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id) return;
    get(ref(db, `products/${id}`)).then((snap) => {
      if (snap.exists()) setProduct({ id, ...snap.val() });
      setLoading(false);
    });
    // Track recently viewed
    try {
      const stored: string[] = JSON.parse(localStorage.getItem("sc_recently_viewed") || "[]");
      const updated = [id, ...stored.filter((i) => i !== id)].slice(0, 8);
      localStorage.setItem("sc_recently_viewed", JSON.stringify(updated));
    } catch {}
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onValue(ref(db, `productReviews/${id}`), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([rid, val]: any) => ({ id: rid, ...val }))
          .sort((a, b) => b.createdAt - a.createdAt);
        setReviews(list);
      } else {
        setReviews([]);
      }
    });
    return () => unsubscribe();
  }, [id]);

  // Fetch suggested products (same brand or category, excluding current)
  useEffect(() => {
    if (!product) return;
    get(ref(db, "products")).then((snap) => {
      if (!snap.exists()) return;
      const all: any[] = [];
      snap.forEach((child) => {
        const p = { id: child.key, ...child.val() };
        if (p.id === product.id) return;
        // prefer same brand or same category
        if (p.brand === product.brand || p.category === product.category) {
          all.push(p);
        }
      });
      // shuffle & cap at 10
      const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 10);
      setSuggested(shuffled);
    });
  }, [product]);

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.discountPrice || product.price,
      qty: 1,
      image: product.images?.[0] || "",
    });
    toast.success("Added to cart! 🛒");
  };

  const handleToggleWishlist = () => {
    const wasWishlisted = isWishlisted(product.id);
    toggleWishlist({
      productId: product.id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      image: product.images?.[0] || "",
      brand: product.brand,
      addedAt: Date.now(),
    });
    toast(wasWishlisted ? "Removed from wishlist" : "Saved to wishlist! ❤️", {
      icon: wasWishlisted ? "💔" : "❤️",
    });
  };

  const hasDiscount = product?.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  // Only real reviews — no fake seeded data
  const realReviews = reviews.filter((r: any) => !r.isSeeded);
  const displayAvg = realReviews.length
    ? (realReviews.reduce((s, r) => s + r.rating, 0) / realReviews.length).toFixed(1)
    : null;
  const displayCount = realReviews.length;

  /* ── Wrappers for loading / not-found (still no footer) ── */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <WhatsAppFloat
        productName={product?.name}
        productPrice={product?.discountPrice || product?.price}
        productBrand={product?.brand}
      />
      <MobileBottomNav />
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
            <p className="text-slate-500">Loading product...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!product) {
    return (
      <Shell>
        <div className="min-h-[80vh] flex items-center justify-center flex-col gap-4">
          <Package className="h-16 w-16 text-slate-400" />
          <p className="text-xl text-gray-900 font-bold">Product not found</p>
          <Link href="/products">
            <Button className="bg-green-500 text-black font-bold hover:bg-green-400">Browse Products</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="min-h-screen bg-gray-50">

        {/* ── Back button bar ─────────────────────────────────── */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3 max-w-7xl">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/products")}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-green-600 transition-colors group"
            >
              <span className="h-8 w-8 rounded-full bg-gray-100 group-hover:bg-green-50 group-hover:border-green-200 border border-gray-200 flex items-center justify-center transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </span>
              Back
            </button>
            <span className="text-gray-300">|</span>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm text-slate-500 min-w-0">
              <Link href="/" className="hover:text-green-500 transition-colors shrink-0">Home</Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <Link href="/products" className="hover:text-green-500 transition-colors shrink-0">Products</Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="text-gray-800 font-medium truncate">{product.name}</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-7xl">

          {/* Main Product Card */}
          <div className="bg-white backdrop-blur-sm border border-gray-100 rounded-3xl overflow-hidden mb-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row">

              {/* ── Left: Image ── */}
              <div className="lg:w-[45%] p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                <ImageCarousel images={product.images} productName={product.name} />

                {/* Trust badges under image — premium cards */}
                <div className="grid grid-cols-3 gap-2 mt-5">
                  {/* 1 Year Warranty */}
                  <div className="relative flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center overflow-hidden" style={{ background: "linear-gradient(145deg,#f0fdf4,#dcfce7)", border: "1.5px solid #86efac" }}>
                    <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #22c55e 0%, transparent 60%)" }} />
                    <div className="relative h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", boxShadow: "0 4px 14px rgba(22,163,74,0.4)" }}>
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M8.5 12l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="relative">
                      <p className="text-[11px] font-black text-green-900 leading-tight">1 Year</p>
                      <p className="text-[10px] font-bold text-green-700 leading-tight">Warranty</p>
                    </div>
                  </div>

                  {/* Free Delivery */}
                  <div className="relative flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center overflow-hidden" style={{ background: "linear-gradient(145deg,#eff6ff,#dbeafe)", border: "1.5px solid #93c5fd" }}>
                    <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)" }} />
                    <div className="relative h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 14px rgba(37,99,235,0.4)" }}>
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="3" width="15" height="13" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.15)"/>
                        <path d="M16 8h4l3 4v5h-7V8z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(255,255,255,0.1)"/>
                        <circle cx="5.5" cy="18.5" r="2" stroke="white" strokeWidth="1.5"/>
                        <circle cx="19.5" cy="18.5" r="2" stroke="white" strokeWidth="1.5"/>
                        <path d="M7.5 18.5h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="relative">
                      <p className="text-[11px] font-black text-blue-900 leading-tight">Free</p>
                      <p className="text-[10px] font-bold text-blue-700 leading-tight">Delivery</p>
                    </div>
                  </div>

                  {/* 100% Genuine */}
                  <div className="relative flex flex-col items-center gap-2 rounded-2xl py-4 px-2 text-center overflow-hidden" style={{ background: "linear-gradient(145deg,#fefce8,#fef9c3)", border: "1.5px solid #fde047" }}>
                    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #eab308 0%, transparent 60%)" }} />
                    <div className="relative h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 14px rgba(217,119,6,0.4)" }}>
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="relative">
                      <p className="text-[11px] font-black text-yellow-900 leading-tight">100%</p>
                      <p className="text-[10px] font-bold text-yellow-700 leading-tight">Genuine</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right: Details ── */}
              <div className="lg:w-[55%] p-6 lg:p-8 flex flex-col">
                {/* Brand + badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-green-600 text-xs font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                    {product.brand}
                  </span>
                  {product.isNewArrival && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black text-white tracking-wide select-none"
                      style={{
                        background: "linear-gradient(110deg,#6d28d9,#4f46e5,#7c3aed,#6d28d9)",
                        backgroundSize: "200% 100%",
                        animation: "shimmerBadge 2.2s linear infinite",
                        boxShadow: "0 0 12px rgba(109,40,217,0.55), 0 2px 6px rgba(79,70,229,0.3)",
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0">
                        <path d="M10 1l1.8 6.2H18l-5.1 3.7 1.9 6.1L10 13.4l-4.8 3.6 1.9-6.1L2 7.2h6.2L10 1z"/>
                      </svg>
                      NEW ARRIVAL
                    </span>
                  )}
                  {product.isFeatured && (
                    <span className="text-xs font-black bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 px-2.5 py-1 rounded-full">⭐ Featured</span>
                  )}
                </div>

                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight mb-4">{product.name}</h1>

                {/* ── Premium Trust Badges ── below product name ── */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {/* Cash on Delivery */}
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 text-center border border-green-100 bg-gradient-to-b from-green-50 to-emerald-50 shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/30">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 3h15v13H1z"/>
                        <path d="M16 8h4l3 4v5h-7V8z"/>
                        <circle cx="5.5" cy="18.5" r="2.5"/>
                        <circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                    </div>
                    <p className="text-[11px] font-black text-green-800 leading-tight">Cash on</p>
                    <p className="text-[10px] font-bold text-green-600 -mt-1 leading-tight">Delivery</p>
                  </div>

                  {/* Easy EMI */}
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 text-center border border-blue-100 bg-gradient-to-b from-blue-50 to-indigo-50 shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                        <line x1="6" y1="16" x2="8" y2="16"/>
                        <line x1="10" y1="16" x2="12" y2="16"/>
                      </svg>
                    </div>
                    <p className="text-[11px] font-black text-blue-800 leading-tight">Easy</p>
                    <p className="text-[10px] font-bold text-blue-600 -mt-1 leading-tight">EMI Available</p>
                  </div>

                  {/* 7-Day Returns */}
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 text-center border border-orange-100 bg-gradient-to-b from-orange-50 to-amber-50 shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/30">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                    </div>
                    <p className="text-[11px] font-black text-orange-800 leading-tight">7-Day</p>
                    <p className="text-[10px] font-bold text-orange-600 -mt-1 leading-tight">Easy Returns</p>
                  </div>
                </div>

                {/* Rating row — only shown when ratings exist */}
                {(displayAvg || displayCount > 0) && (
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                  {displayAvg && (
                    <div className="flex items-center gap-1.5 bg-green-600 px-3 py-1.5 rounded-xl">
                      <span className="text-white font-black text-sm">{displayAvg}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                  {displayCount > 0 && (
                    <span className="text-slate-500 text-sm">{displayCount.toLocaleString("en-IN")} Reviews</span>
                  )}
                  <span className="text-gray-300">|</span>
                  <StockBadge stock={product.stock} />
                </div>
                )}
                {/* Stock badge standalone when no ratings */}
                {!displayAvg && displayCount === 0 && (
                  <div className="mb-5 pb-5 border-b border-gray-100">
                    <StockBadge stock={product.stock} />
                  </div>
                )}

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-gray-900">
                      {formatINR(product.discountPrice || product.price)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-xl text-slate-400 line-through">{formatINR(product.price)}</span>
                        <span className="text-base font-black text-green-600 bg-green-500/10 px-2.5 py-1 rounded-xl border border-green-500/20">
                          {discountPct}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  {hasDiscount && (
                    <p className="text-green-600 text-sm font-semibold mt-1">
                      You save {formatINR(product.price - product.discountPrice)}!
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">Inclusive of all taxes • Free delivery</p>
                </div>

                {/* Product Highlights */}
                {product.specs && Object.keys(product.specs).length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Product Highlights</p>
                    <ul className="space-y-2">
                      {Object.entries(product.specs).slice(0, 6).map(([key, val]: any) => (
                        <li key={key} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          <span className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-900 capitalize">{key}:</span>{" "}
                            {val}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap mt-auto mb-4">
                  <Button
                    size="lg"
                    className="flex-1 min-w-[140px] h-13 bg-green-500 hover:bg-green-400 text-black font-black text-base rounded-2xl shadow-lg shadow-green-500/25 transition-all hover:scale-[1.02] hover:shadow-green-500/40 gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>

                  <Button
                    size="lg"
                    className="flex-1 min-w-[140px] h-13 bg-orange-500 hover:bg-orange-400 text-white font-black text-base rounded-2xl shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    onClick={() => { handleAddToCart(); setTimeout(() => navigate("/checkout"), 300); }}
                    disabled={product.stock <= 0}
                  >
                    <Zap className="h-5 w-5" />
                    Buy Now
                  </Button>

                  <button
                    onClick={handleToggleWishlist}
                    className={`h-13 w-13 p-3.5 rounded-2xl border transition-all hover:scale-105 ${
                      isWishlisted(product.id)
                        ? "border-red-500/50 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        : "border-gray-200 bg-gray-50 text-slate-400 hover:border-red-200 hover:text-red-400"
                    }`}
                    title={isWishlisted(product.id) ? "Remove from Wishlist" : "Save to Wishlist"}
                  >
                    <Heart className={`h-5 w-5 transition-all ${isWishlisted(product.id) ? "fill-red-400 scale-110" : ""}`} />
                  </button>
                </div>

                {/* Call for More Information */}
                <CallProductButton callingNumber={callingNumber} />

              </div>
            </div>
          </div>

          {/* ── Description Section ───────────────────────────── */}
          <DescriptionSection description={product.description} />

          {/* ── Specifications Section ────────────────────────── */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div id="sec-specs" className="scroll-mt-16 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-black text-gray-900">Specifications</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {Object.entries(product.specs).map(([key, val]: any, idx) => (
                  <div
                    key={key}
                    className={`flex items-center gap-4 px-6 py-3.5 ${idx % 2 === 0 ? "bg-gray-50/60" : "bg-white"}`}
                  >
                    <span className="w-2/5 flex items-center gap-2 text-sm text-slate-500 font-medium capitalize shrink-0">
                      <SpecsIcon label={key} />
                      {key}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Ratings & Reviews Section ─────────────────────── */}
          <div id="sec-reviews" className="scroll-mt-16 bg-white border border-gray-100 rounded-2xl shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">
                Ratings &amp; Reviews
                <span className="ml-2 text-sm font-normal text-slate-400">({displayCount.toLocaleString("en-IN")})</span>
              </h2>
            </div>

            {/* Rating summary bar */}
            <div className="flex items-center gap-6 px-6 py-5 border-b border-gray-100">
              <div className="text-center shrink-0">
                <p className="text-5xl font-black text-gray-900">{displayAvg ?? "—"}</p>
                <div className="flex gap-0.5 justify-center mt-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(displayAvg)) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-transparent"}`} />
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-1">{displayCount.toLocaleString("en-IN")} Ratings</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = realReviews.filter((r: any) => r.rating === star).length;
                  const pct = realReviews.length ? (count / realReviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-3">{star}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-10 text-right">{count.toLocaleString("en-IN")}</span>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Reviews list — real reviews only */}
            <div className="divide-y divide-gray-50">
              {realReviews.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No reviews yet. Be the first to write one!</p>
                </div>
              ) : (
                realReviews.map((r) => (
                  <div key={r.id} className="px-6 py-4">
                    <ReviewCard review={r} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Suggested Products ─────────────────────────────── */}
          {suggested.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">
                  You Might Also Like
                  <span className="ml-2 text-sm font-semibold text-slate-400">({product.brand})</span>
                </h2>
                <Link href={`/search?q=${encodeURIComponent(product.brand)}`}>
                  <span className="text-sm font-semibold text-green-600 hover:text-green-500 transition-colors flex items-center gap-1">
                    See all <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
              {/* Horizontal scroll strip */}
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
                {suggested.map((p) => (
                  <div key={p.id} className="snap-start">
                    <SuggestedCard p={p} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Shell>
  );
}
