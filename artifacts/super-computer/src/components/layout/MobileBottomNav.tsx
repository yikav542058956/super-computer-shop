import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Home, PlayCircle, Tag, User, ShoppingCart } from "lucide-react";

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { cartCount } = useCart();
  const { isLoggedIn } = useAuth();
  const { openLoginDialog } = useLoginDialog();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const handleAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggedIn) {
      setLocation("/profile");
    } else {
      openLoginDialog();
    }
  };

  const tabs = [
    {
      label: "Home",
      icon: (active: boolean) => <Home className="h-5 w-5" />,
      onClick: () => setLocation("/"),
      active: isActive("/") && location === "/",
    },
    {
      label: "Play",
      icon: (active: boolean) => <PlayCircle className={`h-5 w-5 ${active ? "fill-green-400" : ""}`} />,
      onClick: () => setLocation("/play"),
      active: isActive("/play"),
    },
    {
      label: "Top Deals",
      icon: (active: boolean) => <Tag className="h-5 w-5" />,
      onClick: () => setLocation("/products?deals=true"),
      active: isActive("/products") && location.includes("deals=true"),
    },
    {
      label: "Account",
      icon: (active: boolean) => <User className="h-5 w-5" />,
      onClick: handleAccount,
      active: isActive("/profile"),
    },
  ];

  return (
    <nav
      className="md:hidden bg-[#0D1117] border-t border-white/10"
      style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999 }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ label, icon, onClick, active }) => (
          <button
            key={label}
            onClick={onClick}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 min-w-0 flex-1 transition-colors ${
              active ? "text-green-400" : "text-slate-500"
            }`}
          >
            <div className={`transition-transform ${active ? "scale-110" : ""}`}>
              {icon(active)}
            </div>
            <span className="text-[10px] font-semibold leading-none">{label}</span>
          </button>
        ))}

        {/* Cart */}
        <button
          onClick={() => setLocation("/cart")}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 min-w-0 flex-1 transition-colors ${
            isActive("/cart") ? "text-green-400" : "text-slate-500"
          }`}
        >
          <div className={`relative transition-transform ${isActive("/cart") ? "scale-110" : ""}`}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-green-500 text-[9px] font-black text-black flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold leading-none">Cart</span>
        </button>
      </div>
    </nav>
  );
}
