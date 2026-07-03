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
  ChevronLeft, User, Package, Zap, Award, ArrowLeft,
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

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { currentUser, userData } = useAuth();

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
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Use product-level seeded stats when available (Amazon-style realistic counts)
  const displayAvg = product?.rating
    ? product.rating.toFixed(1)
    : avgRating;
  const displayCount = product?.reviewsCount || reviews.length || 0;
  const hasDist = product?.ratingDist && displayCount > 0;

  /* ── Wrappers for loading / not-found (still no footer) ── */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <WhatsAppFloat />
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

                {/* Trust badges under image */}
                <div className="grid grid-cols-3 gap-2 mt-5">
                  {[
                    { Icon: ShieldCheck, label: "1 Year Warranty", color: "text-green-400" },
                    { Icon: Truck,       label: "Free Delivery",    color: "text-blue-400" },
                    { Icon: Award,       label: "100% Genuine",     color: "text-yellow-400" },
                  ].map(({ Icon, label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl py-3 px-2 text-center">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">{label}</p>
                    </div>
                  ))}
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
                    <span className="text-xs font-black bg-blue-500/15 border border-blue-500/30 text-blue-500 px-2.5 py-1 rounded-full">✨ New Arrival</span>
                  )}
                  {product.isFeatured && (
                    <span className="text-xs font-black bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 px-2.5 py-1 rounded-full">⭐ Featured</span>
                  )}
                </div>

                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight mb-4">{product.name}</h1>

                {/* Rating row */}
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 bg-green-600 px-3 py-1.5 rounded-xl">
                    <span className="text-white font-black text-sm">{avgRating}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-slate-500 text-sm">{reviews.length || product.reviewsCount || 0} Reviews</span>
                  <span className="text-gray-300">|</span>
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                    product.stock > 0
                      ? "text-green-600 bg-green-500/10 border border-green-500/20"
                      : "text-red-500 bg-red-500/10 border border-red-500/20"
                  }`}>
                    {product.stock > 0 ? `✓ In Stock (${product.stock})` : "✗ Out of Stock"}
                  </span>
                </div>

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

                {/* EMI / COD info */}
                <div className="flex flex-wrap gap-2">
                  {["Cash on Delivery", "Easy EMI Available", "7-Day Returns"].map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-[11px] text-slate-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                      <Zap className="h-3 w-3 text-green-500" />{tag}
                    </span>
                  ))}
                </div>
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
                  const count = hasDist
                    ? (product.ratingDist[star] ?? 0) + reviews.filter((r: any) => !r.isSeeded && r.rating === star).length
                    : reviews.filter((r: any) => r.rating === star).length;
                  const total = hasDist ? displayCount : reviews.length;
                  const pct = total ? (count / total) * 100 : 0;
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


            {/* Reviews list */}
            <div className="divide-y divide-gray-50">
              {reviews.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No reviews yet. Be the first to write one!</p>
                </div>
              ) : (
                reviews.map((r) => (
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
