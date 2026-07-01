import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, get } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight,
  Zap, Info, AlertTriangle, CheckCircle, X, Megaphone,
  ArrowRight, Users, Package, Award, ThumbsUp,
} from "lucide-react";
import { MdComputer } from "react-icons/md";
import { formatINR } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

/* ─── Constants ────────────────────────────────────────────── */
const DEFAULT_BANNERS = [
  {
    id: "d1", title: "Power Your World with", titleAccent: "Premium Technology",
    subtitle: "High-performance laptops, custom PCs & accessories at best prices.",
    buttonText: "Shop Now", buttonLink: "/products",
    imageUrl: "/images/store/s4.jpeg",
    gradient: "from-[#5F35F5] via-[#7B3FE4] to-[#9333EA]",
  },
  {
    id: "d2", title: "Unmatched Gaming Power", titleAccent: "Built to Dominate",
    subtitle: "RTX-powered gaming laptops with in-store demos available now.",
    buttonText: "Explore Gaming", buttonLink: "/products?category=cat-2",
    imageUrl: "/images/store/s7.jpeg",
    gradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
  },
  {
    id: "d3", title: "Free Delivery &", titleAccent: "Expert Support",
    subtitle: "Every purchase comes with doorstep delivery and free setup.",
    buttonText: "View Products", buttonLink: "/products",
    imageUrl: "/images/store/s2.jpeg",
    gradient: "from-[#134e5e] via-[#1a6b7c] to-[#71b280]",
  },
];

const CUSTOMER_PHOTOS = [
  { src: "/images/customers/c9.jpg", name: "Aman Verma",   rating: 5, review: "Super Computer is my go-to store for all tech needs. Amazing support!" },
  { src: "/images/customers/c1.jpg", name: "Rohit Sharma", rating: 5, review: "Got my Dell laptop in perfect condition. Great prices and fast delivery." },
  { src: "/images/customers/c3.jpg", name: "Vikram Patel", rating: 5, review: "Genuine products, best deals in the area. Highly recommended!" },
  { src: "/images/customers/c4.jpg", name: "Karan Mehta",  rating: 5, review: "Excellent service! The team helped me pick the right laptop." },
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

const CATEGORIES = [
  { href: "/products?category=cat-1", label: "Laptops",     img: "/images/laptops/macbook-pro.png",    color: "#EDE9FE", accent: "#7C3AED" },
  { href: "/products?category=cat-2", label: "Gaming",      img: "/images/laptops/asus-rog.png",        color: "#FEE2E2", accent: "#DC2626" },
  { href: "/products?category=cat-3", label: "Desktop PCs", img: "/images/laptops/hp-spectre.png",      color: "#DBEAFE", accent: "#2563EB" },
  { href: "/products?category=cat-3", label: "Accessories", img: "/images/laptops/dell-xps.png",        color: "#D1FAE5", accent: "#059669" },
  { href: "/products",                label: "Components",  img: "/images/laptops/lenovo-thinkpad.png", color: "#FEF3C7", accent: "#D97706" },
];

/* ─── Skeleton Card ─────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="skeleton" style={{ height: "160px" }} />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-5 w-1/2 rounded mt-3" />
      </div>
    </div>
  );
}

/* ─── Announcement Ticker ───────────────────────────────────── */
function AnnouncementTicker({ items }: { items: any[] }) {
  if (!items.length) return null;
  const text = items.map(i => `📢 ${i.title}: ${i.message}`).join("   •••   ");
  return (
    <div className="overflow-hidden flex items-center" style={{ background: "rgba(95,53,245,0.15)", borderBottom: "1px solid rgba(95,53,245,0.2)" }}>
      <div className="shrink-0 px-3 flex items-center gap-1.5 font-bold text-xs py-1.5" style={{ color: "#A78BFA" }}>
        <Megaphone className="h-3.5 w-3.5" />LIVE
      </div>
      <div className="overflow-hidden flex-1 py-1.5">
        <div className="whitespace-nowrap text-sm font-medium text-slate-300 animate-[ticker_30s_linear_infinite]"
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={close}>
      <div
        className="rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-up"
        style={{ background: "#1A1535", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
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
                <Button size="sm" style={{ background: "#5F35F5", color: "white" }} className="font-bold flex-1 rounded-xl border-0" onClick={close}>
                  View Now
                </Button>
              </Link>
            )}
            {items.length > 1 && current < items.length - 1 && (
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl" onClick={() => setCurrent(c => c + 1)}>
                Next ({current + 1}/{items.length})
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white rounded-xl" onClick={close}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero Banner Slider (M3 rounded card style) ────────────── */
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
    autoplayRef.current = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [emblaApi, slides.length]);

  return (
    <div
      className="relative w-full animate-fade-in"
      style={{ padding: "12px 12px 0" }}
      onMouseEnter={() => { if (autoplayRef.current) clearInterval(autoplayRef.current); }}
      onMouseLeave={() => {
        if (slides.length > 1) autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), 4000);
      }}
    >
      {/* Rounded clipping container */}
      <div
        ref={emblaRef}
        style={{ borderRadius: "20px", overflow: "hidden", height: "clamp(200px, 45vw, 480px)" }}
      >
        <div className="flex h-full">
          {slides.map((banner: any, idx: number) => (
            <div
              key={banner.id || idx}
              className={`relative flex-[0_0_100%] h-full bg-gradient-to-br ${banner.gradient || "from-[#5F35F5] to-[#9333EA]"}`}
            >
              {banner.imageUrl && (
                <img src={banner.imageUrl} alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.2, mixBlendMode: "luminosity" }} />
              )}
              {/* Overlay gradient left to right */}
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />

              {/* Decorative circles */}
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="absolute -right-4 bottom-0 w-64 h-40 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)" }} />

              <div className="absolute inset-0 flex items-center px-6 sm:px-10">
                <div className="max-w-md">
                  {/* Label badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                    style={{ background: "rgba(255,255,255,0.18)", color: "white", backdropFilter: "blur(8px)" }}>
                    <MdComputer className="h-3.5 w-3.5" />Super Computers · Kasganj Road
                  </div>
                  <h1 className="font-black text-white leading-tight mb-1"
                    style={{ fontSize: "clamp(18px, 4vw, 48px)", textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
                    {banner.title}
                    {banner.titleAccent && (
                      <><br /><span style={{ color: "#FFD700" }}>{banner.titleAccent}</span></>
                    )}
                    {banner.titleGreen && (
                      <><br /><span style={{ color: "#4ADE80" }}>{banner.titleGreen}</span></>
                    )}
                  </h1>
                  <p className="text-white/80 mb-5 leading-relaxed hidden sm:block"
                    style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
                    {banner.subtitle}
                  </p>
                  <div className="flex gap-2.5 flex-wrap">
                    <Link href={banner.buttonLink || "/products"}>
                      <button
                        className="font-bold px-5 h-10 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ripple-container"
                        style={{ background: "white", color: "#5F35F5", fontSize: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {banner.buttonText || "Shop Now"}
                      </button>
                    </Link>
                    <Link href="/products">
                      <button
                        className="font-semibold px-5 h-10 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: "14px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}
                      >
                        Explore <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow Controls */}
      {slides.length > 1 && (
        <>
          <button onClick={scrollPrev}
            className="absolute left-5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: "rgba(255,255,255,0.85)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          </button>
          <button onClick={scrollNext}
            className="absolute right-5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ background: "rgba(255,255,255,0.85)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            <ChevronRight className="h-4 w-4 text-gray-700" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 pt-3 pb-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === selectedIndex ? "24px" : "7px",
                height: "7px",
                background: i === selectedIndex ? "#5F35F5" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
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

function StatCounter({ target, suffix, label, Icon, bg }: {
  target: number; suffix: string; label: string; Icon: any; bg: string;
}) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="flex flex-col items-center text-center group animate-slide-up">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
        style={{ background: bg, boxShadow: `0 4px 20px ${bg}40` }}
      >
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="text-3xl md:text-4xl font-black text-white tabular-nums">
        {count.toLocaleString("en-IN")}<span style={{ color: "#A78BFA" }}>{suffix}</span>
      </div>
      <p className="text-slate-400 text-sm font-medium mt-1">{label}</p>
    </div>
  );
}

/* ─── Stats Section ─────────────────────────────────────────── */
function StatsSection() {
  return (
    <section className="py-12 md:py-16 relative overflow-hidden border-y border-white/5">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full blur-3xl"
          style={{ background: "rgba(95,53,245,0.08)" }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl"
          style={{ background: "rgba(147,51,234,0.06)" }} />
      </div>
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", color: "#A78BFA" }}
          >
            📊 Our Numbers Speak
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Trusted by <span style={{ color: "#A78BFA" }}>Thousands</span> Across the Region
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          <StatCounter target={600} suffix="+"  label="Happy Customers"     Icon={Users}    bg="#7C3AED" />
          <StatCounter target={700} suffix="+"  label="Products in Stock"   Icon={Package}  bg="#2563EB" />
          <StatCounter target={5}   suffix="+"  label="Years of Excellence" Icon={Award}    bg="#D97706" />
          <StatCounter target={98}  suffix="%"  label="Satisfaction Rate"   Icon={ThumbsUp} bg="#059669" />
        </div>
      </div>
    </section>
  );
}

/* ─── Product Card (M3 white-card style) ────────────────────── */
function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <Link href={`/products/${product.id}`}>
      <div
        className="group rounded-2xl overflow-hidden cursor-pointer h-full flex flex-col animate-slide-up transition-all duration-300 hover:-translate-y-2 ripple-container"
        style={{
          animationDelay: `${index * 0.06}s`,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(95,53,245,0.25), 0 2px 12px rgba(0,0,0,0.3)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(95,53,245,0.4)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.2)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
        }}
      >
        {/* Image area */}
        <div className="relative flex justify-center items-center overflow-hidden"
          style={{ height: "180px", padding: "16px", background: "#F8F8FF" }}>
          <img
            src={product.images?.[0] || "/images/laptops/macbook-pro.png"}
            alt={product.name}
            className="h-full w-full object-contain group-hover:scale-108 transition-transform duration-500 drop-shadow-xl"
            style={{ maxHeight: "140px" }}
          />
          {hasDiscount && (
            <div className="absolute top-2.5 left-2.5 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg"
              style={{ background: "#EF4444" }}>
              {discountPct}% OFF
            </div>
          )}
          {product.isNewArrival && (
            <div className="absolute top-2.5 right-2.5 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg"
              style={{ background: "#5F35F5" }}>
              NEW ✨
            </div>
          )}
          {product.isFeatured && !product.isNewArrival && (
            <div className="absolute top-2.5 right-2.5 text-black text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg"
              style={{ background: "#FFD700" }}>
              ⭐ TOP
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col flex-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#A78BFA" }}>
              {product.brand}
            </p>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-white text-[10px] font-bold"
              style={{ background: "#059669" }}>
              {(product.rating || 4).toFixed(1)}
              <Star className="w-2.5 h-2.5 fill-white ml-0.5" />
            </div>
          </div>

          <h3 className="font-semibold text-white line-clamp-2 text-sm leading-snug mb-1 flex-1 transition-colors group-hover:text-purple-300">
            {product.name}
          </h3>

          <p className="text-[10px] text-slate-500 mb-3">({product.reviewsCount || 0} reviews)</p>

          <div className="flex items-center justify-between gap-2 mt-auto">
            <div>
              <p className="font-black text-white text-lg leading-none">
                {formatINR(product.discountPrice || product.price)}
              </p>
              {hasDiscount ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-500 line-through">{formatINR(product.price)}</p>
                  <p className="text-xs font-bold" style={{ color: "#4ADE80" }}>-{discountPct}%</p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mt-0.5">Best Price</p>
              )}
            </div>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); }}
              className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ripple-container"
              style={{
                background: "rgba(95,53,245,0.12)",
                border: "1px solid rgba(95,53,245,0.3)",
                color: "#A78BFA",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "#5F35F5";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#5F35F5";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(95,53,245,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "#A78BFA";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(95,53,245,0.3)";
              }}
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

/* ─── Section Header ────────────────────────────────────────── */
function SectionHeader({ badge, title, accent, viewAllHref }: {
  badge: string; title: string; accent: string; viewAllHref: string;
}) {
  return (
    <div className="flex justify-between items-end mb-5">
      <div>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5"
          style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", color: "#A78BFA" }}
        >
          {badge}
        </div>
        <h2 className="text-lg md:text-2xl font-black text-white">
          {title} <span style={{ color: "#A78BFA" }}>{accent}</span>
        </h2>
      </div>
      <Link href={viewAllHref}
        className="text-xs font-semibold flex items-center gap-1 transition-colors"
        style={{ color: "#A78BFA" }}>
        View All <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ─── Auto-Sliding Customers ────────────────────────────────── */
function CustomersSlider() {
  const doubled = [...CUSTOMER_PHOTOS, ...CUSTOMER_PHOTOS];
  return (
    <section className="py-12 md:py-16 border-t border-white/5 overflow-hidden">
      <div className="container mx-auto px-4 mb-8 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
          style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", color: "#A78BFA" }}
        >
          <Star className="h-3.5 w-3.5 fill-[#A78BFA]" />Trusted by 1000+ Customers
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-white mb-1">
          Our <span style={{ color: "#A78BFA" }}>Happy Customers</span>
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Real handovers, real smiles — from Super Computers, Kasganj Road.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 h-full w-20 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, #0f0b2e, transparent)" }} />
        <div className="absolute right-0 top-0 h-full w-20 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, #0a0f1e, transparent)" }} />
        <div className="flex gap-4 w-max" style={{ animation: "slideLeft 32s linear infinite" }}>
          {doubled.map((photo, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 w-64 rounded-2xl overflow-hidden transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="h-40 overflow-hidden">
                <img src={photo.src} alt={photo.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(photo.rating)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 mb-2">"{photo.review}"</p>
                <p className="text-white font-semibold text-sm">{photo.name}</p>
                <p className="text-[10px]" style={{ color: "#A78BFA" }}>Verified Customer</p>
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
    <section className="py-4 border-b border-white/5" style={{ background: "rgba(95,53,245,0.06)" }}>
      <div className="px-4">
        <p className="text-white font-black text-sm mb-3">🔍 Still looking for these?</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {products.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <div
                className="flex-shrink-0 w-28 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="h-20 flex items-center justify-center p-2" style={{ background: "#F8F8FF" }}>
                  <img src={p.images?.[0] || "/images/laptops/macbook-pro.png"} alt={p.name}
                    className="h-full w-full object-contain" />
                </div>
                <div className="p-2">
                  <p className="text-white text-[10px] font-semibold line-clamp-2 leading-tight mb-1">{p.name}</p>
                  <p className="text-[10px] font-bold" style={{ color: "#A78BFA" }}>
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
  const [featuredProducts, setFeaturedProducts] = useState<any[] | null>(null);
  const [newArrivals, setNewArrivals] = useState<any[] | null>(null);
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
      } else {
        setFeaturedProducts([]);
        setNewArrivals([]);
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
        setRecentlyViewed(results.filter(Boolean).filter((p: any) => p.status === "active"));
      });
    } catch {}
  }, []);

  const tickerItems = announcements.filter(a => a.showAsTicker);
  const popupItems = announcements.filter(a => a.showAsPopup);

  return (
    <Layout>
      <AnnouncementTicker items={tickerItems} />
      <AnnouncementPopup items={popupItems} />

      {/* Hero Banner */}
      <BannerSlider banners={banners} />

      {/* Still Looking */}
      <StillLooking products={recentlyViewed} />

      {/* Featured Products */}
      <section className="py-8 md:py-12 border-b border-white/5">
        <div className="container mx-auto px-4">
          <SectionHeader badge="🏆 EDITOR'S PICK" title="Featured" accent="Products" viewAllHref="/products" />
          {featuredProducts === null ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {featuredProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No featured products yet. Add some from the admin panel.</p>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-8 md:py-12 border-b border-white/5">
        <div className="container mx-auto px-4">
          <SectionHeader badge="⚡ JUST IN" title="New" accent="Arrivals" viewAllHref="/products" />
          {newArrivals === null ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {newArrivals.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No new arrivals yet. Add some from the admin panel.</p>
          )}
        </div>
      </section>

      {/* Shop by Category — M3 colored cards */}
      <section className="py-8 md:py-12 border-b border-white/5">
        <div className="container mx-auto px-4">
          <h2 className="text-lg md:text-2xl font-black text-white mb-5">
            Shop by <span style={{ color: "#A78BFA" }}>Category</span>
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {CATEGORIES.map(({ href, label, img, color, accent }, i) => (
              <Link href={href} key={label}>
                <div
                  className="group rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                  style={{
                    animationDelay: `${i * 0.07}s`,
                    background: `${accent}14`,
                    border: `1px solid ${accent}25`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = color;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${accent}30`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = `${accent}14`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                  }}
                >
                  <div className="h-14 w-full flex items-center justify-center mb-2 overflow-hidden">
                    <img src={img} alt={label}
                      className="h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                  </div>
                  <p className="text-white font-semibold text-xs group-hover:text-white transition-colors">{label}</p>
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
        <section className="py-6 border-t border-white/5">
          <div className="container mx-auto px-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.slice(0, 3).map((ann) => {
                const style = TYPE_STYLE[ann.type] || TYPE_STYLE.info;
                const Icon = style.icon;
                return (
                  <div key={ann.id} className={`${style.bar} rounded-2xl p-4 flex gap-3 items-start`}>
                    <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
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
