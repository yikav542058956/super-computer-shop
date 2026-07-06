import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { Home, Search, User, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

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
    if (isLoggedIn) setLocation("/profile");
    else openLoginDialog();
  };

  const tabs = [
    { label: "Home",    icon: Home,   path: "/",        active: location === "/",      onClick: () => setLocation("/") },
    { label: "Search",  icon: Search, path: "/search",  active: isActive("/search"),    onClick: () => setLocation("/search") },
    { label: "Account", icon: User,   path: "/profile", active: isActive("/profile") || isActive("/orders") || isActive("/wallet"), onClick: handleAccount },
  ];

  return (
    <nav
      className="md:hidden"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: "#0F1723",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-around" style={{ height: 60 }}>
        {tabs.map(({ label, icon: Icon, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative ripple"
          >
            <motion.span
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full"
              animate={{ width: active ? 32 : 0, opacity: active ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ background: "#22C55E" }}
            />
            <motion.div
              animate={{ scale: active ? 1.15 : 1, color: active ? "#22C55E" : "#64748B" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Icon size={22} />
            </motion.div>
            <span className="text-[10px] font-semibold leading-none"
              style={{ color: active ? "#22C55E" : "#64748B" }}>
              {label}
            </span>
          </button>
        ))}

        {/* Cart */}
        <button
          onClick={() => setLocation("/cart")}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative ripple"
        >
          <motion.span
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full"
            animate={{ width: isActive("/cart") ? 32 : 0, opacity: isActive("/cart") ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: "#22C55E" }}
          />
          <motion.div
            animate={{ scale: isActive("/cart") ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="relative"
          >
            <ShoppingCart size={22} style={{ color: isActive("/cart") ? "#22C55E" : "#64748B" }} />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                style={{ height: 16, minWidth: 16, padding: "0 3px", background: "#EF4444" }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </motion.span>
            )}
          </motion.div>
          <span className="text-[10px] font-semibold leading-none"
            style={{ color: isActive("/cart") ? "#22C55E" : "#64748B" }}>
            Cart
          </span>
        </button>
      </div>
      <div style={{ height: "env(safe-area-inset-bottom,0px)", background: "#0F1723" }} />
    </nav>
  );
}
