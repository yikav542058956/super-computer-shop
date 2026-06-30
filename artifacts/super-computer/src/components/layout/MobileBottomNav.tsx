import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { Home, Play, Tag, User, ShoppingCart } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",        Icon: Home,         label: "Home"      },
  { href: "/play",    Icon: Play,         label: "Play"      },
  { href: "/products?deals=true", Icon: Tag, label: "Top Deals" },
  { href: "/profile", Icon: User,         label: "Account"   },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { cartCount } = useCart();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href.split("?")[0]);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[#0D1117]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}>
              <div className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                active ? "text-green-400" : "text-slate-500"
              }`}>
                <div className={`relative h-6 w-6 flex items-center justify-center ${active ? "scale-110" : ""} transition-transform`}>
                  <Icon className={`h-5 w-5 ${active && label === "Play" ? "fill-green-400" : ""}`} />
                </div>
                <span className={`text-[10px] font-semibold leading-none ${active ? "text-green-400" : "text-slate-500"}`}>
                  {label}
                </span>
                {active && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-green-400 rounded-full" />
                )}
              </div>
            </Link>
          );
        })}

        {/* Cart tab with badge */}
        <Link href="/cart">
          <div className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
            isActive("/cart") ? "text-green-400" : "text-slate-500"
          }`}>
            <div className="relative h-6 w-6 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-green-500 text-[9px] font-black text-black flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold leading-none ${isActive("/cart") ? "text-green-400" : "text-slate-500"}`}>
              Cart
            </span>
          </div>
        </Link>
      </div>
    </nav>
  );
}
