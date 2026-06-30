import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Star, Search, Filter } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

export default function ProductListing() {
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useLocation();
  const { addToCart } = useCart();
  
  // Filters state
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const productsRef = ref(db, 'products');
    const unsubscribe = onValue(productsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const productList = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .filter(p => p.status === 'active');
        setProducts(productList);
        setFiltered(productList);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...products];

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lower) || p.brand.toLowerCase().includes(lower));
    }

    // Brands
    if (brandFilter.length > 0) {
      result = result.filter(p => brandFilter.includes(p.brand));
    }

    // Sort
    if (sortOrder === "price-low") {
      result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sortOrder === "price-high") {
      result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (sortOrder === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt); // newest
    }

    setFiltered(result);
  }, [products, brandFilter, sortOrder, searchTerm]);

  const brands = Array.from(new Set(products.map(p => p.brand)));

  const toggleBrand = (brand: string) => {
    setBrandFilter(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault(); // prevent navigation
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.discountPrice || product.price,
      qty: 1,
      image: product.images?.[0] || ""
    });
    toast.success("Added to cart");
  };

  return (
    <Layout>
      <div className="bg-slate-900 py-12 mb-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Shop Products</h1>
          <div className="max-w-xl mx-auto relative">
            <Input 
              placeholder="Search laptops, components..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-4 pr-12 text-lg bg-white/10 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-primary"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b">
              <Filter className="h-5 w-5" />
              <h3 className="font-bold text-lg">Filters</h3>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Brands</h4>
              <div className="space-y-2">
                {brands.map((brand: any) => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`brand-${brand}`} 
                      checked={brandFilter.includes(brand)}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <Label htmlFor={`brand-${brand}`} className="font-normal cursor-pointer">{brand}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Button variant="outline" className="w-full" onClick={() => setBrandFilter([])}>
              Clear Filters
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <p className="text-slate-500 font-medium">Showing <span className="text-slate-900">{filtered.length}</span> results</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 hidden sm:inline">Sort by:</span>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Arrivals</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 bg-white animate-pulse rounded-xl border"></div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-slate-500">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(product => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="group cursor-pointer hover:shadow-lg transition-all h-full border-slate-200 hover:border-primary/50 overflow-hidden flex flex-col">
                    <div className="relative p-6 bg-white flex justify-center items-center h-48 border-b">
                      <img src={product.images?.[0]} alt={product.name} className="h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      {product.discountPrice && product.discountPrice < product.price && (
                        <div className="absolute top-4 left-4 bg-destructive text-white text-xs font-bold px-2 py-1 rounded">
                          SALE
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">{product.brand}</p>
                      <h3 className="font-bold text-slate-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                      <div className="flex items-center gap-1 mb-auto">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-xs text-slate-500">({product.reviewsCount})</span>
                      </div>
                      <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
                        <div>
                          <p className="font-bold text-xl">{formatINR(product.discountPrice || product.price)}</p>
                          {product.discountPrice && product.discountPrice < product.price && (
                            <p className="text-xs text-slate-400 line-through">{formatINR(product.price)}</p>
                          )}
                        </div>
                        <Button size="icon" className="rounded-full h-10 w-10 shadow-md" onClick={(e) => handleAddToCart(e, product)}>
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}