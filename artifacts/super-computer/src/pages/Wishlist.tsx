import { Layout } from "@/components/layout/Layout";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { Link } from "wouter";
import { Heart, ShoppingCart, Trash2, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";
import { WhatsAppProductButton } from "@/components/WhatsAppButton";

export default function Wishlist() {
  const { wishlist, removeFromWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item: typeof wishlist[0]) => {
    addToCart({
      productId: item.productId,
      name: item.name,
      price: item.discountPrice || item.price,
      qty: 1,
      image: item.image,
    });
    toast.success(`${item.name} added to cart!`);
  };

  const handleMoveAllToCart = () => {
    wishlist.forEach(item => {
      addToCart({
        productId: item.productId,
        name: item.name,
        price: item.discountPrice || item.price,
        qty: 1,
        image: item.image,
      });
    });
    toast.success("All items added to cart!");
  };

  const savings = wishlist.reduce((sum, item) => {
    if (item.discountPrice && item.discountPrice < item.price) {
      return sum + (item.price - item.discountPrice);
    }
    return sum;
  }, 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Wishlist</h1>
              <p className="text-sm text-slate-500">{wishlistCount} item{wishlistCount !== 1 ? "s" : ""} saved</p>
            </div>
          </div>
          {wishlist.length > 0 && (
            <Button onClick={handleMoveAllToCart} variant="outline" className="gap-2 hidden sm:flex">
              <ShoppingCart className="h-4 w-4" /> Add All to Cart
            </Button>
          )}
        </div>

        {/* Savings banner */}
        {savings > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <p className="text-green-800 font-medium text-sm">
              You are saving <span className="font-bold">{formatINR(savings)}</span> in total on your wishlist items!
            </p>
          </div>
        )}

        {/* Empty State */}
        {wishlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-24 w-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
              <Heart className="h-12 w-12 text-red-200" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Wishlist is Empty</h2>
            <p className="text-slate-500 mb-8 max-w-xs">
              Save your favourite laptops and accessories here to buy them later.
            </p>
            <Link href="/products">
              <Button size="lg" className="gap-2">
                <Package className="h-5 w-5" /> Browse Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {wishlist.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {wishlist.map(item => {
                const hasDiscount = item.discountPrice && item.discountPrice < item.price;
                const discountPct = hasDiscount
                  ? Math.round(((item.price - item.discountPrice!) / item.price) * 100)
                  : 0;

                return (
                  <div key={item.productId} className="bg-white rounded-2xl border shadow-sm overflow-hidden group hover:shadow-md transition-all duration-200">
                    {/* Image */}
                    <div className="relative bg-slate-50 h-48 overflow-hidden">
                      <Link href={`/products/${item.productId}`}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {hasDiscount && (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          -{discountPct}%
                        </span>
                      )}
                      <button
                        onClick={() => { removeFromWishlist(item.productId); toast.success("Removed from wishlist"); }}
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white shadow border flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{item.brand}</p>
                      <Link href={`/products/${item.productId}`}>
                        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-primary transition-colors mb-3 cursor-pointer">
                          {item.name}
                        </h3>
                      </Link>

                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-bold text-slate-900">
                          {formatINR(item.discountPrice || item.price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-slate-400 line-through">{formatINR(item.price)}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleAddToCart(item)}
                          className="w-full gap-2 h-10"
                          size="sm"
                        >
                          <ShoppingCart className="h-4 w-4" /> Add to Cart
                        </Button>
                        <WhatsAppProductButton
                          productName={item.name}
                          productPrice={item.discountPrice || item.price}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile — add all to cart */}
            <div className="mt-6 sm:hidden">
              <Button onClick={handleMoveAllToCart} className="w-full gap-2" variant="outline">
                <ShoppingCart className="h-4 w-4" /> Add All to Cart ({wishlistCount} items)
              </Button>
            </div>

            {/* Continue shopping */}
            <div className="mt-8 text-center">
              <Link href="/products">
                <Button variant="ghost" className="gap-2 text-primary">
                  Continue Shopping <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
