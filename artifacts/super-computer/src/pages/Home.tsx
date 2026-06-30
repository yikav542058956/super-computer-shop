import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart, Star, Truck, ShieldCheck, Clock,
  ChevronLeft, ChevronRight, Wrench, Phone, Award,
  Zap, Info, AlertTriangle, CheckCircle, X, Megaphone,
  Laptop, Cpu, Package,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

const DEFAULT_BANNERS = [
  {
    id: "d1",
    title: "Next-Gen Gaming Performance",
    subtitle: "Experience uncompromised power with the latest laptops.",
    buttonText: "Shop Gaming",
    buttonLink: "/products?category=cat-2",
    imageUrl: "/images/banners/banner-1.png",
    bg: "from-slate-900 via-blue-950 to-slate-900",
  },
  {
    id: "d2",
    title: "Premium Ultrabooks",
    subtitle: "Thin, light, and ready for anything.",
    buttonText: "Explore Now",
    buttonLink: "/products?category=cat-1",
    imageUrl: "/images/banners/banner-2.png",
    bg: "from-indigo-950 via-slate-900 to-slate-900",
  },
];

const CUSTOMER_PHOTOS = [
  { src: "/images/customers/c9.jpg", caption: "Happy customer — Dell Laptop" },
  { src: "/images/customers/c1.jpg", caption: "Laptop handover — Dell" },
  { src: "/images/customers/c3.jpg", caption: "Happy customer — Dell" },
  { src: "/images/customers/c4.jpg", caption: "HP Laptop handover" },
  { src: "/images/customers/c5.jpg", caption: "HP Laptop delivery" },
  { src: "/images/customers/c6.jpg", caption: "Computer purchase" },
  { src: "/images/customers/c8.jpg", caption: "HP Laptop handover" },
  { src: "/images/customers/c2.jpg", caption: "Our store — Super Computers" },
];

const TYPE_STYLE: Record<string, { bar: string; icon: any; text: string }> = {
  info:        { bar: "bg-blue-600",   icon: Info,          text: "text-white" },
  warning:     { bar: "bg-amber-500",  icon: AlertTriangle, text: "text-white" },
  success:     { bar: "bg-green-600",  icon: CheckCircle,   text: "text-white" },
  promo:       { bar: "bg-purple-600", icon: Zap,           text: "text-white" },
  new_product: { bar: "bg-rose-600",   icon: Star,          text: "text-white" },
};

function AnnouncementTicker({ items }: { items: any[] }) {
  if (!items.length) return null;
  const text = items.map(i => `📢 ${i.title}: ${i.message}`).join("   •••   ");
  return (
    <div className="bg-slate-900 text-white py-1.5 overflow-hidden relative flex items-center">
      <div className="shrink-0 px-3 flex items-center gap-1.5 text-yellow-400 font-bold text-xs z-10">
        <Megaphone className="h-3.5 w-3.5" />LIVE
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div
          className="whitespace-nowrap text-sm font-medium animate-[ticker_30s_linear_infinite]"
          style={{ display: "inline-block" }}
        >
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => {
      setVisible(false);
      sessionStorage.setItem("sc_popup_seen", "1");
    }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`${style.bar} px-5 py-4 flex items-center gap-3`}>
          <Icon className="h-6 w-6 text-white" />
          <h3 className="text-white font-bold text-lg flex-1">{item.title}</h3>
          <button onClick={() => { setVisible(false); sessionStorage.setItem("sc_popup_seen", "1"); }} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-slate-700 text-sm leading-relaxed mb-4">{item.message}</p>
          <div className="flex gap-2">
            {item.link && (
              <Link href={item.link}>
                <Button size="sm" className="flex-1" onClick={() => { setVisible(false); sessionStorage.setItem("sc_popup_seen", "1"); }}>
                  View Now
                </Button>
              </Link>
            )}
            {items.length > 1 && current < items.length - 1 && (
              <Button size="sm" variant="outline" onClick={() => setCurrent(c => c + 1)}>
                Next ({current + 1}/{items.length})
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { setVisible(false); sessionStorage.setItem("sc_popup_seen", "1"); }}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerSlider({ banners }: { banners: any[] }) {
  const slides = banners.length > 0 ? banners : DEFAULT_BANNERS;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return;
    autoplayRef.current = setInterval(() => emblaApi.scrollNext(), 4500);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [emblaApi, slides.length]);

  const pauseAutoplay = () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  const resumeAutoplay = () => {
    if (slides.length <= 1) return;
    autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), 4500);
  };

  return (
    <div className="relative w-full overflow-hidden h-[300px] sm:h-[380px] md:h-[480px] lg:h-[540px]"
      onMouseEnter={pauseAutoplay} onMouseLeave={resumeAutoplay}>
      <div ref={emblaRef} className="h-full">
        <div className="flex h-full">
          {slides.map((banner: any, idx: number) => (
            <div key={banner.id || idx}
              className={`relative flex-[0_0_100%] h-full bg-gradient-to-r ${banner.bg || "from-slate-900 to-slate-800"} overflow-hidden`}>
              {banner.imageUrl && (
                <img src={banner.imageUrl} alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 select-none" draggable={false} />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-5 sm:px-8 md:px-12">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-medium mb-3 border border-white/20">
                      <Laptop className="h-3 w-3" />Super Computers — Kasganj Road
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-5 leading-tight">
                      {banner.title}
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-5 md:mb-8 max-w-lg leading-relaxed hidden sm:block">
                      {banner.subtitle}
                    </p>
                    <Link href={banner.buttonLink || "/products"}>
                      <Button size="lg"
                        className="text-sm sm:text-base px-5 sm:px-8 h-10 sm:h-12 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        {banner.buttonText || "Shop Now"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <button onClick={scrollPrev} aria-label="Previous"
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 h-9 w-9 md:h-11 md:w-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition-all hover:scale-110 border border-white/20">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={scrollNext} aria-label="Next"
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 h-9 w-9 md:h-11 md:w-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition-all hover:scale-110 border border-white/20">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      {slides.length > 1 && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => scrollTo(idx)}
              className={`rounded-full transition-all duration-300 ${idx === selectedIndex ? "w-6 md:w-8 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
              aria-label={`Go to slide ${idx + 1}`} />
          ))}
        </div>
      )}
      <div className="absolute top-4 right-4 md:right-6 bg-black/30 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full font-medium">
        {selectedIndex + 1} / {slides.length}
      </div>
    </div>
  );
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

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
          .filter((b) => b.isActive)
          .sort((a: any, b: any) => a.order - b.order);
        setBanners(list);
      }
    });
    const unsubAnn = onValue(ref(db, "announcements"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((a) => a.isActive);
        setAnnouncements(list);
      } else {
        setAnnouncements([]);
      }
    });
    return () => { unsubProducts(); unsubBanners(); unsubAnn(); };
  }, []);

  const tickerItems = announcements.filter(a => a.showAsTicker);
  const popupItems = announcements.filter(a => a.showAsPopup);

  const ProductCard = ({ product }: { product: any }) => (
    <Link href={`/products/${product.id}`}>
      <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 h-full border-slate-200 hover:border-primary/40 overflow-hidden rounded-2xl">
        <div className="relative bg-gradient-to-br from-slate-50 to-white flex justify-center items-center h-40 sm:h-48 border-b overflow-hidden p-4">
          <img src={product.images?.[0]} alt={product.name}
            className="h-full object-contain group-hover:scale-110 transition-transform duration-500" />
          {product.discountPrice && product.discountPrice < product.price && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              SALE
            </div>
          )}
          {product.isNewArrival && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              ✨ NEW
            </div>
          )}
          {product.isFeatured && !product.isNewArrival && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              ⭐ TOP
            </div>
          )}
        </div>
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{product.brand}</p>
          <h3 className="font-bold text-slate-900 line-clamp-2 mb-1.5 group-hover:text-primary transition-colors text-sm">{product.name}</h3>
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{product.rating}</span>
            <span className="text-xs text-slate-400">({product.reviewsCount})</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base sm:text-lg text-slate-900">{formatINR(product.discountPrice || product.price)}</p>
              {product.discountPrice && product.discountPrice < product.price && (
                <p className="text-xs text-slate-400 line-through">{formatINR(product.price)}</p>
              )}
            </div>
            <Button size="icon" variant="secondary"
              className="rounded-full h-8 w-8 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
              <ShoppingCart className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <Layout>
      {/* Announcement Ticker */}
      <AnnouncementTicker items={tickerItems} />

      {/* Announcement Popup */}
      <AnnouncementPopup items={popupItems} />

      {/* Banner Slider */}
      <BannerSlider banners={banners} />

      {/* Trust Badges */}
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 text-center">
            {[
              { emoji: "🚚", title: "Free Delivery",   sub: "Orders above ₹50,000", grad: "from-blue-500 to-cyan-400" },
              { emoji: "🛡️", title: "1 Year Warranty", sub: "Brand warranty",        grad: "from-emerald-500 to-green-400" },
              { emoji: "🔧", title: "Expert Repair",   sub: "Quick turnaround",      grad: "from-orange-500 to-amber-400" },
              { emoji: "📞", title: "24/7 Support",    sub: "Call: 9761809960",      grad: "from-violet-500 to-purple-400" },
            ].map(({ emoji, title, sub, grad }) => (
              <div key={title} className="flex flex-col items-center py-3 md:py-5 group">
                <div className={`h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center mb-2 md:mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl md:text-3xl">{emoji}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">{title}</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Announcement Cards */}
      {announcements.length > 0 && (
        <section className="container mx-auto px-4 pt-6">
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
        </section>
      )}

      {/* Categories */}
      <section className="py-8 md:py-16 container mx-auto px-4">
        <div className="flex justify-between items-center mb-4 md:mb-8">
          <div>
            <h2 className="text-xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-2xl">🛒</span> Shop by Category
            </h2>
            <p className="text-slate-500 text-sm mt-1">Find exactly what you need</p>
          </div>
          <Link href="/products" className="text-primary font-medium hover:underline text-sm md:text-base flex items-center gap-1">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {[
            { href: "/products?category=cat-1", label: "Premium Laptops", sub: "HP, Dell, Lenovo & more", img: "/images/laptops/macbook-pro.png", bg: "bg-slate-100", count: "50+ Models" },
            { href: "/products?category=cat-2", label: "Gaming Laptops",  sub: "High performance gaming",  img: "/images/laptops/asus-rog.png", bg: "bg-slate-900", count: "RTX Series" },
            { href: "/products?category=cat-3", label: "Accessories",     sub: "Mouse, keyboard & more",  img: "/images/laptops/hp-spectre.png", bg: "bg-gradient-to-br from-blue-50 to-indigo-100", count: "100+ Items" },
          ].map(({ href, label, sub, img, bg, count }) => (
            <Link href={href} key={href}>
              <div className={`group relative h-44 sm:h-52 md:h-64 rounded-2xl overflow-hidden cursor-pointer ${bg}`}>
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <img src={img} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl" alt={label} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute top-3 right-3">
                  <span className="bg-white/20 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/30">
                    {count}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-white text-lg md:text-2xl font-bold mb-0.5 leading-tight">{label}</h3>
                    <p className="text-slate-300 text-xs md:text-sm">{sub}</p>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover:bg-primary transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-8 md:py-16 bg-slate-50 border-t border-b">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6 md:mb-12">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-yellow-200">
                <span>🏆</span> EDITOR'S PICK
              </div>
              <h2 className="text-xl md:text-3xl font-bold text-slate-900 mb-2 md:mb-4">Featured Products</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base hidden sm:block">
                Hand-picked by our tech experts for unparalleled performance and value.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-8 md:py-16 container mx-auto px-4">
          <div className="flex justify-between items-center mb-4 md:mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1 border border-green-200">
                <span>⚡</span> JUST IN
              </div>
              <h2 className="text-xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-2xl">📦</span> New Arrivals
              </h2>
            </div>
            <Link href="/products" className="text-primary font-medium hover:underline text-sm md:text-base flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Happy Customers Gallery */}
      <section className="py-10 md:py-16 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 border border-white/20">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />1000+ Happy Customers
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">Our Happy Customers</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
              Real handovers, real smiles. Every laptop delivered with care from Super Computers, Mirehachi.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {CUSTOMER_PHOTOS.map((photo, i) => (
              <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-white/10 hover:border-primary/60 transition-all">
                <img
                  src={photo.src}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-xs font-medium">{photo.caption}</p>
                </div>
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 h-2 w-2 rounded-full shadow-lg shadow-green-400/50" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm mb-4">
              📍 Super Computers — Kasganj Road, Mirehachi, Distt. Etah
            </p>
            <a href="tel:9761809960">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2">
                <Phone className="h-4 w-4" />Call: 9761809960
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-8 md:py-12 bg-primary">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-bold mb-3">
            <span>⚡</span> Limited Time Offer
          </div>
          <h2 className="text-xl md:text-3xl font-bold mb-2 md:mb-3">
            Use code <span className="bg-white/20 px-2 py-0.5 rounded-lg font-mono">SAVE10</span> for 10% off
          </h2>
          <p className="text-primary-foreground/80 mb-4 md:mb-6 text-sm md:text-base">Valid on orders above ₹50,000</p>
          <Link href="/products">
            <Button variant="secondary" size="lg"
              className="rounded-full px-8 font-bold shadow-lg hover:scale-105 transition-transform gap-2">
              <ShoppingCart className="h-4 w-4" />Shop Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
