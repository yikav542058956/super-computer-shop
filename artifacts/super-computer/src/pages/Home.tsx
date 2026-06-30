import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, get } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight,
  Zap, Info, AlertTriangle, CheckCircle, X, Megaphone,
  Shield, Truck, Wrench, Headphones, ArrowRight,
  Users, Package, Award, ThumbsUp,
} from "lucide-react";
import { MdComputer } from "react-icons/md";
import { formatINR } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

/* ─── Constants ────────────────────────────────────────────── */
const DEFAULT_BANNERS = [
  {
    id: "d1", title: "Power Your World with", titleGreen: "Premium Technology",
    subtitle: "Explore high-performance laptops, custom PCs, and accessories at the best prices.",
    buttonText: "Shop Now", buttonLink: "/products",
    imageUrl: "/images/store/s4.jpeg",
  },
  {
    id: "d2", title: "Unmatched Gaming Power", titleGreen: "Built to Dominate",
    subtitle: "RTX-powered gaming laptops with in-store demos available now.",
    buttonText: "Explore Gaming", buttonLink: "/products?category=cat-2",
    imageUrl: "/images/store/s7.jpeg",
  },
  {
    id: "d3", title: "Free Delivery &", titleGreen: "Expert Support",
    subtitle: "Every purchase comes with doorstep delivery and free setup assistance.",
    buttonText: "View Products", buttonLink: "/products",
    imageUrl: "/images/store/s2.jpeg",
  },
];

const CUSTOMER_PHOTOS = [
  { src: "/images/customers/c9.jpg", name: "Aman Verma",  rating: 5, review: "Super Computer is my go-to store for all tech needs. Amazing support!" },
  { src: "/images/customers/c1.jpg", name: "Rohit Sharma", rating: 5, review: "Got my Dell laptop in perfect condition. Great prices and fast delivery." },
  { src: "/images/customers/c3.jpg", name: "Vikram Patel", rating: 5, review: "Genuine products, best deals in the area. Highly recommended!" },
  { src: "/images/customers/c4.jpg", name: "Karan Mehta",  rating: 5, review: "Excellent service! The team helped me pick the right laptop for my needs." },
  { src: "/images/customers/c5.jpg", name: "Salfi Khan",   rating: 5, review: "Quality products and amazing after-sales support. Will buy again!" },
  { src: "/images/customers/c6.jpg", name: "Priya Singh",  rating: 5, review: "Best laptop store in the region. Very helpful and knowledgeable staff." },
  { src: "/images/customers/c8.jpg", name: "Rahul Gupta",  rating: 5, review: "Got a great deal on HP laptop. Super satisfied with the purchase!" },
  { src: "/images/customers/c2.jpg", name: "Neha Joshi",   rating: 5, review: "Wonderful experience. Products are genuine and prices are unbeatable." },
];

const TYPE_STYLE: Record<string, { bar: string; icon: any }> = {
  info:        { bar: "bg-blue-600",   icon: Info },
  warning:     { bar: "bg-amber-500",  icon: AlertTriangle },
  success:     { bar: "bg-green-600",  icon: CheckCircle },
  promo:       { bar: "bg-purple-600", icon: Zap },
  new_product: { bar: "bg-rose-600",   icon: Star },
};

/* ─── Announcement Ticker ───────────────────────────────────── */
function AnnouncementTicker({ items }: { items: any[] }) {
  if (!items.length) return null;
  const text = items.map(i => `📢 ${i.title}: ${i.message}`).join("   •••   ");
  return (
    <div className="bg-green-500/10 border-b border-green-500/20 text-white py-1.5 overflow-hidden flex items-center">
      <div className="shrink-0 px-3 flex items-center gap-1.5 text-green-400 font-bold text-xs">
        <Megaphone className="h-3.5 w-3.5" />LIVE
      </div>
      <div className="overflow-hidden flex-1">
        <div className="whitespace-nowrap text-sm font-medium animate-[ticker_30s_linear_infinite] text-slate-300"
          style={{ display: "inline-block" }}>
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
        </div>
      </div>
    </div>
  );
}

/* ─── Announcement Popup ────────────────────────────────────── */
function AnnouncementPopup({ items }: { items: any[] }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!items.length) return undefined;
    const seen = sessionStorage.getItem("sc_popup_seen");
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [items.length]);

  if (!visible || !items.length) return null;
  const item = items[current];
  const style = TYPE_STYLE[item.type] || TYPE_STYLE.info;
  const Icon = style.icon;

  const close = () => { setVisible(false); sessionStorage.setItem("sc_popup_seen", "1"); };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-[#161B22] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`${style.bar} px-5 py-4 flex items-center gap-3`}>
          <Icon className="h-6 w-6 text-white" />
          <h3 className="text-white font-bold text-lg flex-1">{item.title}</h3>
          <button onClick={close} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{item.message}</p>
          <div className="flex gap-2">
            {item.link && (
              <Link href={item.link}>
                <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-bold flex-1" onClick={close}>View Now</Button>
              </Link>
            )}
            {items.length > 1 && current < items.length - 1 && (
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setCurrent(c => c + 1)}>
                Next ({current + 1}/{items.length})
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10" onClick={close}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero Banner Slider ────────────────────────────────────── */
function BannerSlider({ banners }: { banners: any[] }) {
  const slides = banners.length > 0 ? banners : DEFAULT_BANNERS;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return;
    autoplayRef.current = setInterval(() => emblaApi.scrollNext(), 4500);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [emblaApi, slides.length]);

  return (
    <div className="relative w-full overflow-hidden h-[300px] sm:h-[400px] md:h-[500px] lg:h-[560px] bg-[#0D1117]"
      onMouseEnter={() => { if (autoplayRef.current) clearInterval(autoplayRef.current); }}
      onMouseLeave={() => {
        if (slides.length > 1) autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), 4500);
      }}>
      <div ref={emblaRef} className="h-full">
        <div className="flex h-full">
          {slides.map((banner: any, idx: number) => (
            <div key={banner.id || idx} className="relative flex-[0_0_100%] h-full overflow-hidden bg-[#0D1117]">
              {banner.imageUrl && (
                <img src={banner.imageUrl} alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-25" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-[#0D1117]/80 to-transparent" />
              {/* Green glow */}
              <div className="absolute bottom-0 left-1/4 w-96 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-6 sm:px-10 md:px-16">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full text-green-400 text-xs font-bold mb-4">
                      <MdComputer className="h-3.5 w-3.5" />Super Computers — Kasganj Road
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-2">
                      {banner.title}
                      {banner.titleGreen && (
                        <><br /><span className="text-green-400">{banner.titleGreen}</span></>
                      )}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400 mb-6 max-w-lg leading-relaxed hidden sm:block">
                      {banner.subtitle}
                    </p>
                    <div className="flex gap-3">
                      <Link href={banner.buttonLink || "/products"}>
                        <Button className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 h-11 rounded-full shadow-lg shadow-green-500/25 gap-2">
                          <ShoppingCart className="h-4 w-4" />{banner.buttonText || "Shop Now"}
                        </Button>
                      </Link>
                      <Link href="/products">
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 h-11 rounded-full gap-2">
                          Explore Offers <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Controls */}
      {slides.length > 1 && (
        <>
          <button onClick={scrollPrev} className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={scrollNext} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => scrollTo(i)}
                className={`rounded-full transition-all duration-300 ${i === selectedIndex ? "w-6 h-2 bg-green-400" : "w-2 h-2 bg-white/30"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Animated Counter ──────────────────────────────────────── */
function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, ref };
}

function StatCounter({ target, suffix, label, Icon, color }: {
  target: number; suffix: string; label: string; Icon: any; color: string;
}) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="flex flex-col items-center text-center group">
      <div className={`h-14 w-14 rounded-2xl ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="text-3xl md:text-4xl font-black text-white tabular-nums">
        {count.toLocaleString("en-IN")}<span className="text-green-400">{suffix}</span>
      </div>
      <p className="text-slate-400 text-sm font-medium mt-1">{label}</p>
    </div>
  );
}

/* ─── Stats Section ─────────────────────────────────────────── */
function StatsSection() {
  return (
    <section className="py-12 md:py-16 bg-[#0D1117] border-b border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold mb-3">
            📊 Our Numbers Speak
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Trusted by <span className="text-green-400">Thousands</span> Across the Region
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          <StatCounter target={600}  suffix="+"  label="Happy Customers"    Icon={Users}    color="bg-green-600" />
          <StatCounter target={700}  suffix="+"  label="Products in Stock"  Icon={Package}  color="bg-blue-600" />
          <StatCounter target={5}    suffix="+"  label="Years of Excellence" Icon={Award}   color="bg-yellow-600" />
          <StatCounter target={98}   suffix="%"  label="Satisfaction Rate"  Icon={ThumbsUp} color="bg-purple-600" />
        </div>
      </div>
    </section>
  );
}

/* ─── Product Card (Flipkart-style) ─────────────────────────── */
function ProductCard({ product }: { product: any }) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group bg-[#161B22] border border-white/8 rounded-2xl overflow-hidden hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer h-full flex flex-col">
        {/* Image area — Flipkart-style clean bg with generous padding */}
        <div className="relative bg-[#F0F2F5] flex justify-center items-center overflow-hidden" style={{ height: "190px", padding: "20px" }}>
          <img
            src={product.images?.[0] || "/images/laptops/macbook-pro.png"}
            alt={product.name}
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-xl"
            style={{ maxHeight: "150px" }}
          />
          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg">
              {discountPct}% OFF
            </div>
          )}
          {/* New badge */}
          {product.isNewArrival && (
            <div className="absolute top-2.5 right-2.5 bg-green-500 text-black text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg">
              NEW ✨
            </div>
          )}
          {/* Featured badge */}
          {product.isFeatured && !product.isNewArrival && (
            <div className="absolute top-2.5 right-2.5 bg-yellow-400 text-black text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg">
              ⭐ TOP
            </div>
          )}
          {/* Bottom gradient for smooth transition */}
          <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#161B22]/20 to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col flex-1 border-t border-white/5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-green-400 text-[10px] font-black uppercase tracking-widest">{product.brand}</p>
            {/* Rating pill */}
            <div className="flex items-center gap-0.5 bg-green-600 px-1.5 py-0.5 rounded text-white text-[10px] font-bold">
              {(product.rating || 4).toFixed(1)}
              <Star className="w-2.5 h-2.5 fill-white ml-0.5" />
            </div>
          </div>

          <h3 className="font-semibold text-white line-clamp-2 text-sm leading-snug mb-1 group-hover:text-green-400 transition-colors flex-1">
            {product.name}
          </h3>

          <p className="text-[10px] text-slate-500 mb-3">({product.reviewsCount || 0} reviews)</p>

          {/* Price row */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <div>
              <p className="font-black text-white text-lg leading-none">
                {formatINR(product.discountPrice || product.price)}
              </p>
              {hasDiscount ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-500 line-through">{formatINR(product.price)}</p>
                  <p className="text-xs text-green-400 font-bold">Save {discountPct}%</p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mt-0.5">Best Price</p>
              )}
            </div>
            {/* Cart button */}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); }}
              className="h-9 px-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-1.5 group-hover:bg-green-500 group-hover:text-black group-hover:border-green-500 transition-all shrink-0"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Auto-Sliding Customers ────────────────────────────────── */
function CustomersSlider() {
  const doubled = [...CUSTOMER_PHOTOS, ...CUSTOMER_PHOTOS];

  return (
    <section className="py-12 md:py-16 bg-[#0D1117] border-t border-white/5 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Star className="h-3.5 w-3.5 fill-green-400" />Trusted by 1000+ Customers
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
            Our <span className="text-green-400">Happy Customers</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Real handovers, real smiles — from Super Computers, Kasganj Road.
          </p>
        </div>
      </div>

      {/* Auto-scrolling track */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-[#0D1117] to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-[#0D1117] to-transparent z-10 pointer-events-none" />

        <div
          className="flex gap-4 w-max"
          style={{ animation: "slideLeft 30s linear infinite" }}
        >
          {doubled.map((photo, i) => (
            <div key={i}
              className="relative flex-shrink-0 w-64 bg-[#161B22] border border-white/8 rounded-2xl overflow-hidden hover:border-green-500/30 transition-all"
            >
              {/* Photo */}
              <div className="h-40 overflow-hidden">
                <img src={photo.src} alt={photo.name}
                  className="w-full h-full object-cover" />
              </div>
              {/* Review */}
              <div className="p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(photo.rating)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 mb-2">"{photo.review}"</p>
                <p className="text-white font-semibold text-sm">{photo.name}</p>
                <p className="text-green-400 text-[10px]">Verified Customer</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Still Looking Section ─────────────────────────────────── */
function StillLooking({ products }: { products: any[] }) {
  if (!products.length) return null;
  return (
    <section className="py-4 bg-[#161B22] border-b border-white/5">
      <div className="px-4">
        <p className="text-white font-black text-sm mb-3">
          🔍 Still looking for these?
        </p>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {products.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <div className="flex-shrink-0 w-28 bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden hover:border-green-500/30 transition-all cursor-pointer">
                <div className="h-20 bg-[#F0F2F5] flex items-center justify-center p-2">
                  <img
                    src={p.images?.[0] || "/images/laptops/macbook-pro.png"}
                    alt={p.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="p-2">
                  <p className="text-white text-[10px] font-semibold line-clamp-2 leading-tight mb-1">{p.name}</p>
                  <p className="text-green-400 text-[10px] font-bold">
                    {p.salePrice
                      ? `₹${Number(p.salePrice).toLocaleString("en-IN")}`
                      : `₹${Number(p.price).toLocaleString("en-IN")}`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    const unsubProducts = onValue(ref(db, "products"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((p) => p.status === "active");
        setFeaturedProducts(list.filter((p) => p.isFeatured).slice(0, 4));
        setNewArrivals(list.filter((p) => p.isNewArrival).slice(0, 4));
      }
    });
    const unsubBanners = onValue(ref(db, "banners"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((b: any) => b.isActive)
          .sort((a: any, b: any) => a.order - b.order);
        setBanners(list);
      }
    });
    const unsubAnn = onValue(ref(db, "announcements"), (snap) => {
      if (snap.exists()) {
        setAnnouncements(Object.entries(snap.val())
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((a: any) => a.isActive));
      } else {
        setAnnouncements([]);
      }
    });
    return () => { unsubProducts(); unsubBanners(); unsubAnn(); };
  }, []);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("sc_recently_viewed") || "[]");
      if (!ids.length) return;
      Promise.all(
        ids.map((id) =>
          get(ref(db, `products/${id}`)).then((snap) =>
            snap.exists() ? { id, ...snap.val() } : null
          )
        )
      ).then((results) => {
        setRecentlyViewed(
          results.filter(Boolean).filter((p: any) => p.status === "active")
        );
      });
    } catch {}
  }, []);

  const tickerItems = announcements.filter(a => a.showAsTicker);
  const popupItems = announcements.filter(a => a.showAsPopup);

  return (
    <Layout>
      <AnnouncementTicker items={tickerItems} />
      <AnnouncementPopup items={popupItems} />

      {/* Hero */}
      <BannerSlider banners={banners} />

      {/* Still Looking — recently viewed */}
      <StillLooking products={recentlyViewed} />

      {/* Featured Products — right after banner */}
      {featuredProducts.length > 0 && (
        <section className="py-8 md:py-12 bg-[#0D1117] border-b border-white/5">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5">
                  🏆 EDITOR'S PICK
                </div>
                <h2 className="text-lg md:text-2xl font-black text-white">Featured Products</h2>
              </div>
              <Link href="/products" className="text-green-400 hover:text-green-300 text-xs font-semibold flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-8 md:py-12 bg-[#161B22] border-b border-white/5">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5">
                  ⚡ JUST IN
                </div>
                <h2 className="text-lg md:text-2xl font-black text-white">New Arrivals</h2>
              </div>
              <Link href="/products" className="text-green-400 hover:text-green-300 text-xs font-semibold flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-8 md:py-12 bg-[#0D1117] border-b border-white/5">
        <div className="container mx-auto px-4">
          <h2 className="text-lg md:text-2xl font-black text-white mb-5">Shop by Category</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { href: "/products?category=cat-1", label: "Laptops",       img: "/images/laptops/macbook-pro.png"    },
              { href: "/products?category=cat-2", label: "Gaming",        img: "/images/laptops/asus-rog.png"        },
              { href: "/products?category=cat-3", label: "Desktop PCs",   img: "/images/laptops/hp-spectre.png"      },
              { href: "/products?category=cat-3", label: "Accessories",   img: "/images/laptops/dell-xps.png"        },
              { href: "/products",                label: "Components",    img: "/images/laptops/lenovo-thinkpad.png" },
            ].map(({ href, label, img }) => (
              <Link href={href} key={label}>
                <div className="group bg-[#161B22] border border-white/8 rounded-xl p-3 flex flex-col items-center text-center hover:border-green-500/40 transition-all cursor-pointer">
                  <div className="h-16 w-full flex items-center justify-center mb-2 overflow-hidden">
                    <img src={img} alt={label} className="h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <p className="text-white font-semibold text-xs">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <StatsSection />

      {/* Happy Customers */}
      <CustomersSlider />

      {/* Announcement cards */}
      {announcements.length > 0 && (
        <section className="py-6 bg-[#0D1117] border-t border-white/5">
          <div className="container mx-auto px-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.slice(0, 3).map((ann) => {
                const style = TYPE_STYLE[ann.type] || TYPE_STYLE.info;
                const Icon = style.icon;
                return (
                  <div key={ann.id} className={`${style.bar} rounded-xl p-4 flex gap-3 items-start`}>
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm">{ann.title}</p>
                      <p className="text-white/80 text-xs mt-0.5 line-clamp-2">{ann.message}</p>
                      {ann.link && (
                        <Link href={ann.link}>
                          <span className="text-white text-xs underline mt-1 inline-block">Learn more →</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
