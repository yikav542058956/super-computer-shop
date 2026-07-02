import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
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
  ChevronLeft, Send, User, Package, Zap, Award,
} from "lucide-react";
import { WhatsAppProductButton } from "@/components/WhatsAppButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

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

/* ─── Star Rating Input ──────────────────────────────────────── */
function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 fill-transparent"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ─── Review Card ────────────────────────────────────────────── */
function ReviewCard({ review }: { review: any }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
          <span className="text-green-400 font-bold text-sm">{review.userName?.[0]?.toUpperCase() || "U"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-800 text-sm">{review.userName || "Anonymous"}</p>
            <p className="text-[10px] text-slate-500">
              {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-0.5 mt-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-transparent"}`} />
            ))}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
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

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

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

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.discountPrice || product.price,
      qty: 1,
      image: product.images?.[0] || "",
    });
    toast.success("Cart mein add ho gaya! 🛒");
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
    toast(wasWishlisted ? "Wishlist se remove ho gaya" : "Wishlist mein save ho gaya! ❤️", {
      icon: wasWishlisted ? "💔" : "❤️",
    });
  };

  const handleSubmitReview = async () => {
    if (!currentUser) { toast.error("Please login to write a review"); return; }
    if (!reviewForm.comment.trim()) { toast.error("Review likhna zaroori hai"); return; }
    setSubmittingReview(true);
    try {
      const reviewRef = push(ref(db, `productReviews/${id}`));
      await set(reviewRef, {
        userId: currentUser.uid,
        userName: userData?.name || currentUser.email?.split("@")[0] || "User",
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        createdAt: Date.now(),
      });
      setReviewForm({ rating: 5, comment: "" });
      toast.success("Review submit ho gaya! ⭐");
    } catch {
      toast.error("Review submit karne mein error aaya");
    } finally {
      setSubmittingReview(false);
    }
  };

  const hasDiscount = product?.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : product?.rating || 0;

  const alreadyReviewed = reviews.some((r) => r.userId === currentUser?.uid);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
            <p className="text-slate-400">Loading product...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
          <Package className="h-16 w-16 text-slate-600" />
          <p className="text-xl text-gray-900 font-bold">Product not found</p>
          <Link href="/products"><Button className="bg-green-500 text-black font-bold hover:bg-green-400">Browse Products</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 flex items-center gap-1 text-sm text-slate-500 flex-wrap">
            <Link href="/" className="hover:text-green-400 transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/products" className="hover:text-green-400 transition-colors">Products</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-400 truncate max-w-[200px]">{product.name}</span>
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
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right: Details ── */}
              <div className="lg:w-[55%] p-6 lg:p-8 flex flex-col">
                {/* Brand + badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-green-400 text-xs font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                    {product.brand}
                  </span>
                  {product.isNewArrival && (
                    <span className="text-xs font-black bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-full">✨ New Arrival</span>
                  )}
                  {product.isFeatured && (
                    <span className="text-xs font-black bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2.5 py-1 rounded-full">⭐ Featured</span>
                  )}
                </div>

                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight mb-4">{product.name}</h1>

                {/* Rating row */}
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 bg-green-600 px-3 py-1.5 rounded-xl">
                    <span className="text-gray-900 font-black text-sm">{avgRating}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-slate-400 text-sm">{reviews.length || product.reviewsCount || 0} Reviews</span>
                  <span className="text-gray-300">|</span>
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                    product.stock > 0
                      ? "text-green-400 bg-green-500/10 border border-green-500/20"
                      : "text-red-400 bg-red-500/10 border border-red-500/20"
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
                        <span className="text-xl text-slate-500 line-through">{formatINR(product.price)}</span>
                        <span className="text-base font-black text-green-400 bg-green-500/10 px-2.5 py-1 rounded-xl border border-green-500/20">
                          {discountPct}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  {hasDiscount && (
                    <p className="text-green-400 text-sm font-semibold mt-1">
                      You save {formatINR(product.price - product.discountPrice)}!
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">Inclusive of all taxes • Free delivery</p>
                </div>

                {/* Quick Specs Grid */}
                {product.specs && Object.keys(product.specs).length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {Object.entries(product.specs).slice(0, 4).map(([key, val]: any) => (
                      <div key={key} className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3 group hover:border-green-500/30 transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                          <SpecsIcon label={key} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{key}</p>
                          <p className="text-xs font-bold text-gray-900 truncate">{val}</p>
                        </div>
                      </div>
                    ))}
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

                  <WhatsAppProductButton
                    productName={product.name}
                    productPrice={product.discountPrice || product.price}
                  />

                  <button
                    onClick={handleToggleWishlist}
                    className={`h-13 w-13 p-3.5 rounded-2xl border transition-all hover:scale-105 ${
                      isWishlisted(product.id)
                        ? "border-red-500/50 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        : "border-gray-200 bg-gray-50 text-slate-400 hover:border-white/30 hover:text-red-400"
                    }`}
                    title={isWishlisted(product.id) ? "Remove from Wishlist" : "Save to Wishlist"}
                  >
                    <Heart className={`h-5 w-5 transition-all ${isWishlisted(product.id) ? "fill-red-400 scale-110" : ""}`} />
                  </button>
                </div>

                {/* EMI / COD info */}
                <div className="flex flex-wrap gap-2">
                  {["Cash on Delivery", "Easy EMI Available", "7-Day Returns"].map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-[11px] text-slate-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                      <Zap className="h-3 w-3 text-green-400" />{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs — Overview, Specs, Reviews */}
          <div className="bg-white backdrop-blur-sm border border-gray-100 rounded-3xl overflow-hidden shadow-xl">
            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent border-b border-gray-100">
                {[
                  { value: "overview", label: "Overview" },
                  { value: "specs",    label: "Full Specs" },
                  { value: "reviews",  label: `Reviews (${reviews.length || product.reviewsCount || 0})` },
                ].map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-none px-6 py-4 text-sm font-semibold text-slate-600 border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-green-600 data-[state=active]:bg-transparent hover:text-gray-900 transition-colors"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 lg:p-8">
                <h3 className="text-xl font-black text-gray-900 mb-4">Product Description</h3>
                <p className="text-slate-600 leading-relaxed text-[15px]">{product.description || "No description available."}</p>
              </TabsContent>

              {/* Specs Tab */}
              <TabsContent value="specs" className="p-6 lg:p-8">
                <h3 className="text-xl font-black text-gray-900 mb-6">Technical Specifications</h3>
                {product.specs && Object.keys(product.specs).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {Object.entries(product.specs).map(([key, val]: any, idx) => (
                      <div
                        key={key}
                        className={`flex justify-between items-center py-3.5 px-4 gap-4 border-b border-gray-100 ${
                          idx % 2 === 0 ? "bg-gray-50" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <span className="text-slate-600 font-medium capitalize text-sm flex items-center gap-2">
                          <SpecsIcon label={key} />
                          {key}
                        </span>
                        <span className="text-gray-900 font-bold text-sm text-right pl-4">{val}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No specifications available.</p>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="p-6 lg:p-8">
                {/* Rating summary */}
                <div className="flex items-center gap-6 mb-8 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-center">
                    <p className="text-5xl font-black text-gray-900">{avgRating}</p>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 fill-transparent"}`} />
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{reviews.length} Reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => r.rating === star).length;
                      const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-3">{star}</span>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 w-5">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Review Form */}
                {currentUser ? (
                  alreadyReviewed ? (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                      <p className="text-green-400 text-sm font-semibold">✓ Aapne is product ka review de diya hai. Shukriya!</p>
                    </div>
                  ) : (
                    <div className="mb-8 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-400" />
                        Apna Review Likho
                      </h4>
                      <div className="mb-4">
                        <p className="text-slate-400 text-sm mb-2">Rating do:</p>
                        <StarRatingInput value={reviewForm.rating} onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))} />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Product ke baare mein apna experience share karo..."
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder-gray-400 outline-none focus:border-green-500/50 transition-all resize-none"
                      />
                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewForm.comment.trim()}
                        className="mt-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {submittingReview ? "Submit ho raha hai..." : "Review Submit Karo"}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                    <User className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Review likhne ke liye <span className="text-green-400 font-semibold">login karo</span></p>
                  </div>
                )}

                {/* Reviews List */}
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="text-center py-10">
                      <Star className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500">Abhi tak koi review nahi. Pehle review likhne wale bano!</p>
                    </div>
                  ) : (
                    reviews.map((r) => <ReviewCard key={r.id} review={r} />)
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>
    </Layout>
  );
}
