import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import {
  MdHome, MdPlayCircle, MdLocalOffer, MdPerson, MdShoppingCart,
  MdHomeFilled, MdPlayCircleFilled, MdLocalOfferOutlined,
} from "react-icons/md";

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
      path: "/",
      active: location === "/",
      onClick: () => setLocation("/"),
      icon: (active: boolean) =>
        active ? (
          <MdHomeFilled className="h-6 w-6" />
        ) : (
          <MdHome className="h-6 w-6" />
        ),
    },
    {
      label: "Play",
      path: "/play",
      active: isActive("/play"),
      onClick: () => setLocation("/play"),
      icon: (active: boolean) =>
        active ? (
          <MdPlayCircleFilled className="h-6 w-6" />
        ) : (
          <MdPlayCircle className="h-6 w-6" />
        ),
    },
    {
      label: "Top Deals",
      path: "/products?deals=true",
      active: isActive("/products") && location.includes("deals=true"),
      onClick: () => setLocation("/products?deals=true"),
      icon: (active: boolean) => <MdLocalOffer className="h-6 w-6" />,
    },
    {
      label: "Account",
      path: "/profile",
      active: isActive("/profile"),
      onClick: handleAccount,
      icon: (active: boolean) => <MdPerson className="h-6 w-6" />,
    },
  ];

  return (
    <nav
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#FFFFFF",
        boxShadow: "0 -4px 24px rgba(95, 53, 245, 0.12), 0 -1px 0 rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center justify-around" style={{ height: "64px" }}>

        {tabs.map(({ label, active, onClick, icon }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative ripple-container"
            style={{ minWidth: 0 }}
          >
            {/* Active indicator pill */}
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all animate-fade-in"
                style={{ width: "32px", background: "#5F35F5" }}
              />
            )}

            <div
              className={`transition-all duration-200 ${active ? "animate-bounce-in" : ""}`}
              style={{ color: active ? "#5F35F5" : "#9E9E9E" }}
            >
              {icon(active)}
            </div>

            <span
              className="text-[10px] font-semibold leading-none transition-all"
              style={{
                color: active ? "#5F35F5" : "#9E9E9E",
                fontWeight: active ? 700 : 500,
              }}
            >
              {label}
            </span>
          </button>
        ))}

        {/* Cart tab */}
        <button
          onClick={() => setLocation("/cart")}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative ripple-container"
          style={{ minWidth: 0 }}
        >
          {isActive("/cart") && (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full animate-fade-in"
              style={{ width: "32px", background: "#5F35F5" }}
            />
          )}

          <div
            className={`relative transition-all duration-200 ${isActive("/cart") ? "animate-bounce-in" : ""}`}
            style={{ color: isActive("/cart") ? "#5F35F5" : "#9E9E9E" }}
          >
            <MdShoppingCart className="h-6 w-6" />
            {cartCount > 0 && (
              <span
                className="absolute -top-2 -right-2 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-bounce-in"
                style={{
                  height: "16px",
                  minWidth: "16px",
                  padding: "0 3px",
                  background: "#EF4444",
                  boxShadow: "0 1px 4px rgba(239,68,68,0.5)",
                }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </div>

          <span
            className="text-[10px] leading-none transition-all"
            style={{
              color: isActive("/cart") ? "#5F35F5" : "#9E9E9E",
              fontWeight: isActive("/cart") ? 700 : 500,
            }}
          >
            Cart
          </span>
        </button>
      </div>

      {/* Safe area for iOS */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)", background: "#FFFFFF" }} />
    </nav>
  );
}
