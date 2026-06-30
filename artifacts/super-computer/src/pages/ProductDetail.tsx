import { Layout } from "@/components/layout/Layout";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";
import { ShoppingCart, Heart, ShieldCheck, Truck, Star, Info, ChevronRight, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { WhatsAppProductButton } from "@/components/WhatsAppButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/lib/utils";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (id) {
        const productRef = ref(db, `products/${id}`);
        const snapshot = await get(productRef);
        if (snapshot.exists()) {
          setProduct({ id, ...snapshot.val() });
        }
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  if (loading) return <Layout><div className="h-screen flex items-center justify-center">Loading...</div></Layout>;
  if (!product) return <Layout><div className="h-screen flex items-center justify-center text-xl">Product not found</div></Layout>;

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.discountPrice || product.price,
      qty: 1,
      image: product.images?.[0] || ""
    });
    toast.success("Cart mein add ho gaya!");
  };

  const handleToggleWishlist = () => {
    toggleWishlist({
      productId: product.id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      image: product.images?.[0] || "",
      brand: product.brand,
      addedAt: Date.now(),
    });
    if (isWishlisted(product.id)) {
      toast("Wishlist se remove ho gaya", { icon: "💔" });
    } else {
      toast.success("Wishlist mein save ho gaya! ❤️");
    }
  };

  const SpecsIcon = ({ label }: { label: string }) => {
    if (label.toLowerCase().includes('processor')) return <Cpu className="h-5 w-5 text-slate-400" />;
    if (label.toLowerCase().includes('storage')) return <HardDrive className="h-5 w-5 text-slate-400" />;
    if (label.toLowerCase().includes('ram')) return <MemoryStick className="h-5 w-5 text-slate-400" />;
    return <Info className="h-5 w-5 text-slate-400" />;
  };

  return (
    <Layout>
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3 flex items-center text-sm text-slate-500">
          <span className="hover:text-primary cursor-pointer">Home</span>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="hover:text-primary cursor-pointer">{product.brand}</span>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-slate-900 font-medium truncate">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row mb-8">
          
          {/* Images */}
          <div className="w-full md:w-1/2 p-8 border-r bg-slate-50/50 flex flex-col">
            <div className="flex-1 flex items-center justify-center min-h-[400px] mb-8 bg-white rounded-xl border p-8">
              <img src={product.images?.[activeImage]} alt={product.name} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex gap-4 justify-center">
              {product.images?.map((img: string, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 bg-white rounded-lg border-2 p-2 ${activeImage === idx ? 'border-primary shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <img src={img} className="w-full h-full object-contain" alt="" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
            <p className="text-primary font-bold tracking-wider uppercase text-sm mb-2">{product.brand}</p>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">{product.rating}</span>
              </div>
              <span className="text-sm text-primary hover:underline cursor-pointer">{product.reviewsCount} Reviews</span>
              <span className="text-slate-300">|</span>
              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-destructive'}`}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </span>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-slate-900">{formatINR(product.discountPrice || product.price)}</span>
                {product.discountPrice && product.discountPrice < product.price && (
                  <span className="text-xl text-slate-400 line-through">{formatINR(product.price)}</span>
                )}
              </div>
              <p className="text-sm text-slate-500">Inclusive of all taxes</p>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {Object.entries(product.specs || {}).slice(0, 4).map(([key, val]: any) => (
                <div key={key} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
                  <SpecsIcon label={key} />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">{key}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{val}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-auto flex-wrap">
              <Button size="lg" className="flex-1 h-14 text-base min-w-[140px]" onClick={handleAddToCart} disabled={product.stock <= 0}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
              </Button>
              <WhatsAppProductButton
                productName={product.name}
                productPrice={product.discountPrice || product.price}
              />
              <Button
                size="lg"
                variant="outline"
                className={`h-14 w-14 p-0 shrink-0 transition-colors ${isWishlisted(product.id) ? "border-red-400 bg-red-50 hover:bg-red-100" : ""}`}
                onClick={handleToggleWishlist}
                title={isWishlisted(product.id) ? "Wishlist se hatao" : "Wishlist mein save karo"}
              >
                <Heart className={`h-5 w-5 transition-all ${isWishlisted(product.id) ? "fill-red-500 text-red-500 scale-110" : ""}`} />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Truck className="h-5 w-5 text-primary" /> Free Delivery
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck className="h-5 w-5 text-primary" /> 1 Year Warranty
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <Tabs defaultValue="overview">
            <TabsList className="mb-8 border-b w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base">Overview</TabsTrigger>
              <TabsTrigger value="specs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3 text-base">Full Specifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="prose max-w-none">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Product Description</h3>
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
            </TabsContent>
            
            <TabsContent value="specs">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Technical Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {Object.entries(product.specs || {}).map(([key, val]: any) => (
                  <div key={key} className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500 font-medium capitalize">{key}</span>
                    <span className="text-slate-900 font-bold text-right pl-4">{val}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}