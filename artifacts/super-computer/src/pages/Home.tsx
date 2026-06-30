import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Star, Clock, Truck, ShieldCheck } from "lucide-react";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);

  useEffect(() => {
    const productsRef = ref(db, 'products');
    const unsubscribeProducts = onValue(productsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const productList = Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter(p => p.status === 'active');
        
        setFeaturedProducts(productList.filter(p => p.isFeatured).slice(0, 4));
        setNewArrivals(productList.filter(p => p.isNewArrival).slice(0, 4));
      }
    });

    const bannersRef = ref(db, 'banners');
    const unsubscribeBanners = onValue(bannersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const bannerList = Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter(b => b.isActive).sort((a, b) => a.order - b.order);
        setBanners(bannerList);
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeBanners();
    };
  }, []);

  const heroBanner = banners[0] || {
    title: "Next-Gen Gaming Performance",
    subtitle: "Experience uncompromised power.",
    buttonText: "Shop Now",
    buttonLink: "/products",
    imageUrl: "/images/banners/banner-1.png"
  };

  const ProductCard = ({ product }: { product: any }) => (
    <Link href={`/products/${product.id}`}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all h-full border-slate-200 hover:border-primary/50 overflow-hidden">
        <div className="relative p-6 bg-white flex justify-center items-center h-48 border-b">
          <img src={product.images?.[0]} alt={product.name} className="h-full object-contain group-hover:scale-105 transition-transform duration-300" />
          {product.discountPrice && product.discountPrice < product.price && (
            <div className="absolute top-4 left-4 bg-destructive text-white text-xs font-bold px-2 py-1 rounded">
              SALE
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <p className="text-sm text-slate-500 mb-1">{product.brand}</p>
          <h3 className="font-bold text-slate-900 line-clamp-1 mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-xs text-slate-500">({product.reviewsCount})</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">₹{(product.discountPrice || product.price).toLocaleString()}</p>
              {product.discountPrice && product.discountPrice < product.price && (
                <p className="text-xs text-slate-400 line-through">₹{product.price.toLocaleString()}</p>
              )}
            </div>
            <Button size="icon" variant="secondary" className="rounded-full h-8 w-8 group-hover:bg-primary group-hover:text-white transition-colors">
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] w-full bg-slate-900 overflow-hidden">
        <img 
          src={heroBanner.imageUrl} 
          alt={heroBanner.title} 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                {heroBanner.title}
              </h1>
              <p className="text-lg text-slate-300 mb-8 max-w-xl">
                {heroBanner.subtitle}
              </p>
              <Link href={heroBanner.buttonLink || "/products"}>
                <Button size="lg" className="text-lg px-8 h-12 rounded-full">{heroBanner.buttonText || "Shop Now"}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x text-center">
            <div className="flex flex-col items-center justify-center py-2">
              <Truck className="h-8 w-8 text-primary mb-2" />
              <h4 className="font-bold text-slate-900">Free Fast Delivery</h4>
              <p className="text-sm text-slate-500">On all orders over ₹50,000</p>
            </div>
            <div className="flex flex-col items-center justify-center py-2">
              <ShieldCheck className="h-8 w-8 text-primary mb-2" />
              <h4 className="font-bold text-slate-900">1 Year Warranty</h4>
              <p className="text-sm text-slate-500">Official brand warranty included</p>
            </div>
            <div className="flex flex-col items-center justify-center py-2">
              <Clock className="h-8 w-8 text-primary mb-2" />
              <h4 className="font-bold text-slate-900">24/7 Support</h4>
              <p className="text-sm text-slate-500">Dedicated tech assistance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Shop by Category</h2>
          <Link href="/products" className="text-primary font-medium hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/products?category=cat-1">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer bg-slate-100">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <img src="/images/laptops/macbook-pro.png" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl" alt="Laptops" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <h3 className="text-white text-2xl font-bold mb-1">Premium Laptops</h3>
                  <p className="text-slate-300 text-sm">For professionals</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover:bg-primary transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
          <Link href="/products?category=cat-2">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer bg-slate-900">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <img src="/images/laptops/asus-rog.png" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl" alt="Gaming" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <h3 className="text-white text-2xl font-bold mb-1">Gaming Laptops</h3>
                  <p className="text-slate-300 text-sm">Unleash power</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover:bg-primary transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
          <Link href="/products?category=cat-3">
            <div className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <img src="/images/laptops/hp-spectre.png" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl" alt="Accessories" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <h3 className="text-white text-2xl font-bold mb-1">Accessories</h3>
                  <p className="text-slate-300 text-sm">Complete your setup</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover:bg-primary transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-slate-50 border-t border-b">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Featured Products</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Hand-picked by our tech experts for unparalleled performance and value.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-16 container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-bold text-slate-900">New Arrivals</h2>
            <Link href="/products" className="text-primary font-medium hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

// Inline ArrowRight component since it's not imported at top
const ArrowRight = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);