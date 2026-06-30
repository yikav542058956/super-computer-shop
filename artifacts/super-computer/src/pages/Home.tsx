import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Star, Truck, ShieldCheck, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatINR } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

const DEFAULT_BANNERS = [
  {
    id: "d1",
    title: "Next-Gen Gaming Performance",
    subtitle: "Experience uncompromised power with the latest RTX 40-series laptops.",
    buttonText: "Shop Gaming",
    buttonLink: "/products?category=cat-2",
    imageUrl: "/images/banners/banner-1.png",
    bg: "from-slate-900 via-blue-950 to-slate-900",
  },
  {
    id: "d2",
    title: "Premium Ultrabooks",
    subtitle: "Thin, light, and ready for anything. Upgrade your productivity today.",
    buttonText: "Explore Now",
    buttonLink: "/products?category=cat-1",
    imageUrl: "/images/banners/banner-2.png",
    bg: "from-indigo-950 via-slate-900 to-slate-900",
  },
];

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
    <div
      className="relative w-full overflow-hidden h-[300px] sm:h-[380px] md:h-[480px] lg:h-[540px]"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
    >
      <div ref={emblaRef} className="h-full">
        <div className="flex h-full">
          {slides.map((banner: any, idx: number) => (
            <div
              key={banner.id || idx}
              className={`relative flex-[0_0_100%] h-full bg-gradient-to-r ${banner.bg || "from-slate-900 to-slate-800"} overflow-hidden`}
            >
              {banner.imageUrl && (
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 select-none"
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-5 sm:px-8 md:px-12">
                  <div className="max-w-xl">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-5 leading-tight">
                      {banner.title}
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-5 md:mb-8 max-w-lg leading-relaxed hidden sm:block">
                      {banner.subtitle}
                    </p>
                    <Link href={banner.buttonLink || "/products"}>
                      <Button
                        size="lg"
                        className="text-sm sm:text-base px-5 sm:px-8 h-10 sm:h-12 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
                      >
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

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 h-9 w-9 md:h-11 md:w-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition-all hover:scale-110 border border-white/20"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 h-9 w-9 md:h-11 md:w-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition-all hover:scale-110 border border-white/20"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === selectedIndex
                  ? "w-6 md:w-8 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide counter */}
      {slides.length > 1 && (
        <div className="absolute top-4 right-4 md:right-6 bg-black/30 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {selectedIndex + 1} / {slides.length}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);

  useEffect(() => {
    const productsRef = ref(db, "products");
    const unsubProducts = onValue(productsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((p) => p.status === "active");
        setFeaturedProducts(list.filter((p) => p.isFeatured).slice(0, 4));
        setNewArrivals(list.filter((p) => p.isNewArrival).slice(0, 4));
      }
    });

    const bannersRef = ref(db, "banners");
    const unsubBanners = onValue(bannersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter((b) => b.isActive)
          .sort((a: any, b: any) => a.order - b.order);
        setBanners(list);
      }
    });

    return () => { unsubProducts(); unsubBanners(); };
  }, []);

  const ProductCard = ({ product }: { product: any }) => (
    <Link href={`/products/${product.id}`}>
      <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 h-full border-slate-200 hover:border-primary/40 overflow-hidden rounded-2xl">
        <div className="relative bg-gradient-to-br from-slate-50 to-white flex justify-center items-center h-40 sm:h-48 border-b overflow-hidden p-4">
          <img
            src={product.images?.[0]}
            alt={product.name}
            className="h-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
          {product.discountPrice && product.discountPrice < product.price && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              SALE
            </div>
          )}
          {product.isNewArrival && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              NEW
            </div>
          )}
        </div>
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{product.brand}</p>
          <h3 className="font-bold text-slate-900 line-clamp-1 mb-1.5 group-hover:text-primary transition-colors text-sm sm:text-base">{product.name}</h3>
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
            <Button size="icon" variant="secondary" className="rounded-full h-8 w-8 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
              <ShoppingCart className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <Layout>
      {/* Banner Slider */}
      <BannerSlider banners={banners} />

      {/* Trust Badges */}
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-3 gap-2 md:gap-6 text-center">
            {[
              { icon: Truck, title: "Free Delivery", sub: "Orders above ₹50,000" },
              { icon: ShieldCheck, title: "1 Year Warranty", sub: "Brand warranty" },
              { icon: Clock, title: "24/7 Support", sub: "Always here for you" },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex flex-col items-center py-2 md:py-3">
                <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary mb-1.5 md:mb-2" />
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm md:text-base leading-tight">{title}</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 md:py-16 container mx-auto px-4">
        <div className="flex justify-between items-center mb-4 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold text-slate-900">Shop by Category</h2>
          <Link href="/products" className="text-primary font-medium hover:underline text-sm md:text-base">View All</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {[
            { href: "/products?category=cat-1", label: "Premium Laptops", sub: "For professionals", img: "/images/laptops/macbook-pro.png", bg: "bg-slate-100" },
            { href: "/products?category=cat-2", label: "Gaming Laptops", sub: "Unleash power", img: "/images/laptops/asus-rog.png", bg: "bg-slate-900" },
            { href: "/products?category=cat-3", label: "Accessories", sub: "Complete your setup", img: "/images/laptops/hp-spectre.png", bg: "bg-gradient-to-br from-blue-50 to-indigo-100" },
          ].map(({ href, label, sub, img, bg }) => (
            <Link href={href} key={href}>
              <div className={`group relative h-44 sm:h-52 md:h-64 rounded-2xl overflow-hidden cursor-pointer ${bg}`}>
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <img src={img} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl" alt={label} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
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
            <h2 className="text-xl md:text-3xl font-bold text-slate-900">New Arrivals</h2>
            <Link href="/products" className="text-primary font-medium hover:underline text-sm md:text-base">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Promo Banner */}
      <section className="py-8 md:py-12 bg-primary">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-xl md:text-3xl font-bold mb-2 md:mb-3">Use code <span className="bg-white/20 px-2 py-0.5 rounded-lg font-mono">SAVE10</span> for 10% off</h2>
          <p className="text-primary-foreground/80 mb-4 md:mb-6 text-sm md:text-base">Valid on orders above ₹50,000</p>
          <Link href="/products">
            <Button variant="secondary" size="lg" className="rounded-full px-8 font-bold shadow-lg hover:scale-105 transition-transform">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
