import { Layout } from "@/components/layout/Layout";
import { Link, useLocation } from "wouter";
import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Marquee from "react-fast-marquee";
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight, ArrowRight,
  Heart, Eye, Zap, Shield, Truck, Headphones, RotateCcw, CreditCard,
  Users, Package, Award, ChevronDown, Gamepad2,
  Briefcase, GraduationCap, Palette, Cpu, Laptop, MonitorCheck,
  Info, AlertTriangle, CheckCircle, Megaphone, X,
} from "lucide-react";
import { formatINR, fakeRating, fakeReviewCount } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";

/* ─── Animation Variants ────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

/* ─── Data ──────────────────────────────────────────────────── */

const BRANDS = [
  { name: "HP",      logo: "/images/brands/hp.png",      color: "#0096D6" },
  { name: "Dell",    logo: "/images/brands/dell.png",    color: "#007DB8" },
  { name: "Lenovo",  logo: "/images/brands/lenovo.png",  color: "#E2231A" },
  { name: "ASUS",    logo: "/images/brands/asus.png",    color: "#00539C" },
  { name: "Acer",    logo: "/images/brands/acer.png",    color: "#83B81A" },
  { name: "MSI",     logo: "/images/brands/msi.png",     color: "#FF0000" },
  { name: "Apple",   logo: "/images/brands/apple.png",   color: "#555555" },
  { name: "Samsung", logo: "/images/brands/samsung.png", color: "#1428A0" },
];

const CATEGORIES = [
  { href: "/search?q=Gaming",      label: "Gaming",      icon: Gamepad2,      color: "#EF4444", bg: "#EF44441A" },
  { href: "/search?q=Business",    label: "Business",    icon: Briefcase,     color: "#3B82F6", bg: "#3B82F61A" },
  { href: "/search?q=Student",     label: "Student",     icon: GraduationCap, color: "#8B5CF6", bg: "#8B5CF61A" },
  { href: "/search?q=Creator",     label: "Creator",     icon: Palette,       color: "#F59E0B", bg: "#F59E0B1A" },
  { href: "/search?q=Accessories", label: "Accessories", icon: Cpu,           color: "#10B981", bg: "#10B9811A" },
  { href: "/search",               label: "All Laptops", icon: Laptop,        color: "#16a34a", bg: "#16a34a1A" },
  { href: "/search?q=Refurbished", label: "Refurbished", icon: MonitorCheck,  color: "#64748B", bg: "#64748B1A" },
  { href: "/search?q=Workstation", label: "Workstation", icon: Package,       color: "#F97316", bg: "#F973161A" },
];


const FAQS = [
  { q: "Do you provide genuine products with warranty?",        a: "Yes, 100% genuine products with manufacturer warranty. We are authorized resellers for HP, Dell, Lenovo, ASUS, and more." },
  { q: "Do you offer EMI options?",                             a: "Yes! EMI available from ₹999/month with no-cost EMI on select products. We support multiple bank cards and finance options." },
  { q: "What is your delivery policy?",                         a: "Free delivery within Kasganj and nearby areas. Express delivery available. Pan-India shipping available too." },
  { q: "Can I exchange my old laptop?",                         a: "Yes, we accept old laptops and offer the best exchange value. Bring your old device to our store for evaluation." },
  { q: "Do you provide laptop repair services?",                a: "Yes, we have an in-house service center for repairs, upgrades, data recovery, and software installation." },
  { q: "Can I compare products before buying?",                 a: "Yes! Walk into our showroom at Kasganj Road or call us at 9761809960. We'll help you compare options side by side." },
];

const TRUST_ITEMS = [
  { icon: Users,      stat: "12,000+", label: "Happy Customers",  color: "#16a34a", bg: "#16a34a15" },
  { icon: Truck,      stat: "Free",    label: "Delivery Available",color: "#3B82F6", bg: "#3B82F615" },
  { icon: Shield,     stat: "100%",    label: "Genuine Products",  color: "#F59E0B", bg: "#F59E0B15" },
  { icon: Award,      stat: "5+ Yrs",  label: "of Excellence",     color: "#8B5CF6", bg: "#8B5CF615" },
  { icon: CreditCard, stat: "Safe",    label: "Secure Payments",   color: "#EF4444", bg: "#EF44441515" },
  { icon: RotateCcw,  stat: "Easy",    label: "Returns & Support", color: "#10B981", bg: "#10B98115" },
];

const TYPE_STYLE: Record<string, { bar: string; icon: any }> = {
  info: { bar: "bg-blue-600", icon: Info }, warning: { bar: "bg-amber-500", icon: AlertTriangle },
  success: { bar: "bg-green-600", icon: CheckCircle }, promo: { bar: "bg-purple-600", icon: Zap },
  new_product: { bar: "bg-rose-600", icon: Star },
};

/* ─── Skeleton ──────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
      <div className="skeleton" style={{ height: 180 }} />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-4 rounded-lg" />
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-6 w-1/2 rounded-lg mt-3" />
        <div className="flex gap-2 mt-3">
          <div className="skeleton h-9 flex-1 rounded-xl" />
          <div className="skeleton h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Ticker ────────────────────────────────────────────────── */
function AnnouncementTicker({ items }: { items: any[] }) {
  if (!items.length) return null;
  const text = items.map(i => `${i.title}: ${i.message}`).join("   ·   ");
  return (
    <div className="overflow-hidden flex items-center border-b" style={{ background: "rgba(22,163,74,0.07)", borderColor: "rgba(22,163,74,0.18)" }}>
      <div className="shrink-0 px-3 flex items-center gap-1.5 py-1.5 font-bold text-xs" style={{ color: "#16a34a" }}>
        <Megaphone size={13} />LIVE
      </div>
      <div className="overflow-hidden flex-1 py-1.5">
        <div className="whitespace-nowrap text-sm font-medium text-gray-700 animate-[ticker_28s_linear_infinite]" style={{ display: "inline-block" }}>
          {text}&nbsp;&nbsp;&nbsp;&nbsp;{text}
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
    if (!items.length) return;
    const seen = sessionStorage.getItem("sc_popup_seen");
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 2000);
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
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={close}>
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)" }}
          onClick={e => e.stopPropagation()}>
          <div className={`${style.bar} px-5 py-4 flex items-center gap-3`}>
            <Icon className="h-6 w-6 text-white" /><h3 className="text-white font-bold flex-1">{item.title}</h3>
            <button onClick={close} className="text-white/70 hover:text-white"><X size={18} /></button>
          </div>
          <div className="p-5">
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{item.message}</p>
            <div className="flex gap-2">
              {item.link && <Link href={item.link}><button onClick={close} className="h-9 px-4 rounded-xl text-sm font-bold flex-1 ripple" style={{ background: "#16a34a", color: "#fff" }}>View Now</button></Link>}
              <button onClick={close} className="h-9 px-4 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Close</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Hero Banner ────────────────────────────────────────────── */
function HeroBanner({ banners }: { banners: any[] }) {
  const slides = banners;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [sel, setSel] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const goTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSel(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel); onSel();
    return () => { emblaApi.off("select", onSel); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return;
    autoRef.current = setInterval(() => emblaApi.scrollNext(), 4500);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [emblaApi, slides.length]);

  return (
    <div className="relative" style={{ padding: "12px 12px 0" }}
      onMouseEnter={() => { if (autoRef.current) clearInterval(autoRef.current); }}
      onMouseLeave={() => { if (slides.length > 1) autoRef.current = setInterval(() => emblaApi?.scrollNext(), 4500); }}>
      <div ref={emblaRef} style={{ borderRadius: 24, overflow: "hidden", height: "clamp(220px, 46vw, 500px)" }}>
        <div className="flex h-full">
          {slides.map((b: any, i) => (
            <div key={b.id || i} className="relative flex-[0_0_100%] h-full"
              style={{ background: `linear-gradient(135deg, ${b.from || "#0B0F19"} 0%, ${b.via || "#151A24"} 60%, #1E293B 100%)` }}>
              {b.img && <img src={b.img} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.18, mixBlendMode: "luminosity" }} />}
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.3) 55%,transparent 100%)" }} />
              {/* glow */}
              <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(22,163,74,0.08)" }} />

              <div className="absolute inset-0 flex items-center px-6 sm:px-12">
                <motion.div initial="hidden" animate="show" variants={staggerContainer} className="max-w-lg">
                  <motion.div variants={fadeUp}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
                    style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a" }}>
                    {b.badge || "🔥 Hot Deals"}
                  </motion.div>
                  <motion.h1 variants={fadeUp}
                    className="font-black text-white leading-[1.1] mb-3"
                    style={{ fontSize: "clamp(22px,4.5vw,56px)", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>
                    {b.title}<br />
                    <span style={{ color: "#16a34a" }}>{b.accent || b.titleGreen}</span>
                  </motion.h1>
                  <motion.p variants={fadeUp} className="text-slate-400 mb-6 leading-relaxed hidden sm:block" style={{ fontSize: "clamp(13px,1.8vw,17px)" }}>
                    {b.sub || b.subtitle}
                  </motion.p>
                  <motion.div variants={fadeUp} className="flex gap-3 flex-wrap">
                    <Link href={b.link || b.buttonLink || "/products"}>
                      <motion.button whileHover={{ scale: 1.04, boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }} whileTap={{ scale: 0.96 }}
                        className="h-11 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 ripple"
                        style={{ background: "#16a34a", color: "#000", boxShadow: "0 4px 16px rgba(22,163,74,0.25)" }}>
                        <ShoppingCart size={16} />{b.btn || b.buttonText || "Shop Now"}
                      </motion.button>
                    </Link>
                    <Link href="/products">
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className="h-11 px-6 rounded-2xl font-semibold text-sm flex items-center gap-2 glass ripple"
                        style={{ color: "rgba(255,255,255,0.9)" }}>
                        Explore <ArrowRight size={15} />
                      </motion.button>
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No arrow controls — swipe/dots only */}
      <div className="flex justify-center gap-2 pt-3 pb-1">
        {slides.map((_, i) => (
          <motion.button key={i} onClick={() => goTo(i)} animate={{ width: i === sel ? 24 : 7 }}
            transition={{ duration: 0.3 }}
            style={{ height: 7, borderRadius: 4, background: i === sel ? "#16a34a" : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Brand Carousel ─────────────────────────────────────────── */
function BrandCarousel() {
  return (
    <motion.section initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }}
      className="py-6 border-y" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <div className="container mx-auto px-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Authorized Reseller</p>
          <h3 className="text-gray-800 font-bold text-sm mt-0.5">Top Brands</h3>
        </div>
        <Link href="/search"><span className="text-xs font-semibold" style={{ color: "#16a34a" }}>View All →</span></Link>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-3 px-4 w-max">
          {BRANDS.map(brand => (
            <Link key={brand.name} href={`/search?q=${encodeURIComponent(brand.name)}`}>
              <motion.div
                whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer flex-shrink-0 transition-all"
                style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", width: 72 }}>
                <div className="h-10 w-10 flex items-center justify-center">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-full max-w-full object-contain"
                    onError={e => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                      const parent = t.parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "font-black text-xs";
                        span.style.color = brand.color;
                        span.textContent = brand.name;
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-600 leading-none">{brand.name}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.section>
  );
}


/* ─── Product Card ──────────────────────────────────────────── */
function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const { addToCart } = useCart();
  const [, nav] = useLocation();
  const inWishlist = isWishlisted(product.id);
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const pct = hasDiscount ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;
  const finalPrice = product.discountPrice || product.price;
  const emi = Math.round(finalPrice / 12);

  return (
    <motion.div variants={scaleIn} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Link href={`/products/${product.id}`}>
        <div className="group rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full transition-all hover-glow"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

          {/* Image */}
          <div className="relative overflow-hidden" style={{ background: "#F8FAFC", height: 186, padding: 16 }}>
            <img src={product.images?.[0] || "/images/laptops/macbook-pro.png"} alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-xl" />

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
              {hasDiscount && (
                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-lg" style={{ background: "#EF4444" }}>
                  -{pct}% OFF
                </span>
              )}
              {product.isNewArrival && (
                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-lg" style={{ background: "#16a34a", color: "#000" }}>
                  NEW
                </span>
              )}
            </div>

            {/* Free Delivery badge */}
            {finalPrice >= 20000 && (
              <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.12)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.3)" }}>
                  <Truck size={8} className="inline mr-1" />Free Delivery
                </span>
              </div>
            )}

            {/* Wishlist heart */}
            <motion.button
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
              onClick={e => {
                e.preventDefault(); e.stopPropagation();
                inWishlist
                  ? removeFromWishlist(product.id)
                  : addToWishlist({ productId: product.id, name: product.name, price: product.discountPrice || product.price, image: product.images?.[0], brand: product.brand, addedAt: Date.now() });
              }}
              className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full flex items-center justify-center ripple"
              style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              <Heart size={15} style={{ color: inWishlist ? "#EF4444" : "#94A3B8", fill: inWishlist ? "#EF4444" : "none" }} />
            </motion.button>

            {/* Quick View */}
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={e => { e.preventDefault(); e.stopPropagation(); }}
              className="absolute top-12 right-2.5 h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ripple"
              style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              <Eye size={14} style={{ color: "#64748B" }} />
            </motion.button>
          </div>

          {/* Info */}
          <div className="p-3.5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#16a34a" }}>{product.brand}</span>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ background: "#059669" }}>
                {fakeRating(product.id, product.rating).toFixed(1)} <Star size={9} className="fill-white ml-0.5" />
              </div>
            </div>

            <h3 className="text-gray-900 font-semibold text-sm line-clamp-2 leading-snug mb-1 flex-1 group-hover:text-green-700 transition-colors">
              {product.name}
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">({fakeReviewCount(product.id, product.reviewsCount)} reviews)</p>

            {/* Price */}
            <div className="mb-3">
              <div className="flex items-baseline gap-2">
                <span className="font-black text-gray-900 text-lg">{formatINR(finalPrice)}</span>
                {hasDiscount && <span className="text-xs text-slate-400 line-through">{formatINR(product.price)}</span>}
              </div>
              {finalPrice >= 5000 && (
                <p className="text-[10px] text-slate-400 mt-0.5">EMI from <span style={{ color: "#3B82F6" }} className="font-bold">₹{emi.toLocaleString("en-IN")}/mo</span></p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={e => { e.preventDefault(); e.stopPropagation(); addToCart({ productId: product.id, name: product.name, price: product.discountPrice || product.price, qty: 1, image: product.images?.[0] }); }}
                className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ripple transition-all"
                style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.25)", color: "#16a34a" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#16a34a"; (e.currentTarget as HTMLButtonElement).style.color = "#000"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#16a34a"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(22,163,74,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "#16a34a"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(22,163,74,0.25)"; }}>
                <ShoppingCart size={13} /><span className="hidden sm:inline">Add to Cart</span><span className="sm:hidden">Add</span>
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={e => { e.preventDefault(); e.stopPropagation(); nav(`/products/${product.id}`); }}
                className="h-9 px-3 rounded-xl text-xs font-bold ripple transition-all"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#3B82F6" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#3B82F6"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6"; }}>
                Buy
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Product Section ───────────────────────────────────────── */
function ProductSection({ title, accent, badge, products, loading }: {
  title: string; accent: string; badge: string; products: any[] | null; loading?: boolean;
}) {
  return (
    <section className="py-10 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <div className="container mx-auto px-4">
        <motion.div initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }}
          className="flex justify-between items-end mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>
              {badge}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-2">
              {title} <span style={{ color: "#16a34a" }}>{accent}</span>
            </h2>
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#16a34a" }}>
            View All <ArrowRight size={15} />
          </Link>
        </motion.div>

        {loading || products === null ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <motion.div initial="hidden" whileInView="show" variants={staggerContainer} viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-slate-500">No products yet. Add from the admin panel.</div>
        )}
      </div>
    </section>
  );
}

/* ─── Trust Section ─────────────────────────────────────────── */
function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-12 border-t" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#f8fafc" }}>
      <div className="container mx-auto px-4">
        <motion.div initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">
            Why <span style={{ color: "#16a34a" }}>Super Computer</span>?
          </h2>
          <p className="text-gray-500 mt-2 text-sm">Serving Kasganj Road since 5+ years</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="show" variants={staggerContainer} viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TRUST_ITEMS.map(({ icon: Icon, stat, label, color, bg }) => (
            <motion.div key={label} variants={scaleIn}
              whileHover={{ scale: 1.05, y: -4 }}
              className="flex flex-col items-center text-center p-4 rounded-2xl bg-white"
              style={{ border: `1px solid ${color}20` }}>
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: `${color}15` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <p className="font-black text-gray-900 text-lg leading-none">{stat}</p>
              <p className="text-gray-500 text-xs mt-1 leading-tight">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Happy Customers (admin-managed photos) ────────────────── */
function HappyCustomers() {
  const [photos, setPhotos] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onValue(ref(db, "customerPhotos"), snap => {
      if (!snap.exists()) { setPhotos([]); return; }
      const list = Object.entries(snap.val())
        .map(([id, v]: any) => ({ id, ...v }))
        .filter((p: any) => p.isActive !== false)
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setPhotos(list);
    });
    return () => unsub();
  }, []);

  if (!photos.length) return null;

  return (
    <section className="py-10 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <div className="container mx-auto px-4">
        <motion.div initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }} className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Our Community</p>
          <h2 className="text-xl font-black text-gray-900">
            Happy <span style={{ color: "#16a34a" }}>Customers</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-2 gap-3">
          {photos.slice(0, 6).map((photo, i) => (
            <motion.div key={photo.id}
              initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="rounded-2xl overflow-hidden relative"
              style={{ background: "#e5e7eb", border: "1px solid rgba(0,0,0,0.07)" }}>
              <img src={photo.imageUrl} alt={photo.customerName || "Customer"}
                className="w-full object-cover" style={{ aspectRatio: "4/3" }} />
              {(photo.customerName || photo.laptop) && (
                <div className="absolute bottom-0 left-0 right-0 p-2.5"
                  style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.75))" }}>
                  {photo.customerName && <p className="text-white text-xs font-bold leading-none">{photo.customerName}</p>}
                  {photo.laptop && <p className="text-slate-300 text-[10px] mt-0.5 leading-none truncate">{photo.laptop}</p>}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ───────────────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-12 border-t" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#f8fafc" }}>
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial="hidden" whileInView="show" variants={fadeUp} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">
            Frequently Asked <span style={{ color: "#16a34a" }}>Questions</span>
          </h2>
        </motion.div>
        <div className="space-y-2.5">
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}>
              <button className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}>
                <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                  <ChevronDown size={18} style={{ color: "#16a34a" }} />
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                    <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Still Looking ─────────────────────────────────────────── */
function StillLooking({ products }: { products: any[] }) {
  if (!products.length) return null;
  return (
    <section className="py-4 border-b" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#f1f5f9" }}>
      <div className="px-4">
        <p className="text-gray-900 font-black text-sm mb-3">Recently Viewed</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {products.map(p => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <motion.div whileHover={{ scale: 1.04 }} className="flex-shrink-0 w-28 rounded-xl overflow-hidden cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div className="h-20 flex items-center justify-center p-2" style={{ background: "#F8FAFC" }}>
                  <img src={p.images?.[0] || "/images/laptops/macbook-pro.png"} alt={p.name} className="h-full w-full object-contain" />
                </div>
                <div className="p-2">
                  <p className="text-gray-900 text-[10px] font-semibold line-clamp-2 leading-tight mb-1">{p.name}</p>
                  <p className="text-[10px] font-bold" style={{ color: "#16a34a" }}>₹{Number(p.discountPrice || p.price).toLocaleString("en-IN")}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */
export default function Home() {
  const [featured, setFeatured]   = useState<any[] | null>(null);
  const [arrivals, setArrivals]   = useState<any[] | null>(null);
  const [deals, setDeals]         = useState<any[] | null>(null);
  const [banners, setBanners]     = useState<any[]>([]);
  const [announcements, setAnn]   = useState<any[]>([]);
  const [recentlyViewed, setRV]   = useState<any[]>([]);

  useEffect(() => {
    const unsub = onValue(ref(db, "products"), snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).filter((p: any) => p.status === "active");
        setFeatured(list.filter((p: any) => p.isFeatured).slice(0, 8));
        setArrivals(list.filter((p: any) => p.isNewArrival).slice(0, 8));
        const topDeals = list.filter((p: any) => p.isTopDeal || p.isBestSeller || (p.discountPrice && p.discountPrice < p.price));
        setDeals(topDeals.slice(0, 8));
      } else { setFeatured([]); setArrivals([]); setDeals([]); }
    });
    const unsubB = onValue(ref(db, "banners"), snap => {
      if (snap.exists()) {
        setBanners(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).filter((b: any) => b.isActive).sort((a: any, b: any) => a.order - b.order));
      }
    });
    const unsubA = onValue(ref(db, "announcements"), snap => {
      setAnn(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).filter((a: any) => a.isActive) : []);
    });
    return () => { unsub(); unsubB(); unsubA(); };
  }, []);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("sc_recently_viewed") || "[]");
      if (!ids.length) return;
      Promise.all(ids.map(id => get(ref(db, `products/${id}`)).then(s => s.exists() ? { id, ...s.val() } : null)))
        .then(r => setRV(r.filter(Boolean).filter((p: any) => p.status === "active")));
    } catch {}
  }, []);

  return (
    <Layout>
      <AnnouncementTicker items={announcements.filter(a => a.showAsTicker)} />
      <AnnouncementPopup  items={announcements.filter(a => a.showAsPopup)} />

      <HeroBanner banners={banners} />
      <StillLooking products={recentlyViewed} />
      <BrandCarousel />

      <ProductSection title="Featured" accent="Products" badge="Editor's Pick" products={featured} />
      <ProductSection title="New" accent="Arrivals"  badge="Just In"        products={arrivals} />
      {deals && deals.length > 0 && (
        <ProductSection title="Today's" accent="Deals" badge="Top Deals"  products={deals} />
      )}

      <TrustSection />
      <HappyCustomers />
      <FAQ />
    </Layout>
  );
}
