import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  MdShoppingCart, MdFavoriteBorder, MdFavorite,
  MdSearch, MdMenu, MdClose, MdPerson, MdLogout,
  MdReceiptLong, MdLocationOn, MdChevronRight,
  MdLightMode, MdDarkMode, MdComputer, MdStore,
  MdLocalOffer, MdSportsSoccer, MdHeadphones,
} from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-full flex items-center justify-center transition-all hover:bg-accent border border-border text-foreground"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {theme === "dark"
        ? <MdLightMode size={20} className="text-yellow-400" />
        : <MdDarkMode size={20} className="text-slate-600" />
      }
    </button>
  );
}

export const Navbar = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { currentUser, userData, extUser, isLoggedIn, logout } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const displayName = userData?.name || extUser?.name || currentUser?.email || extUser?.phone || "User";
  const displayEmail = currentUser?.email || extUser?.email || extUser?.phone || "";
  const avatarLetter = displayName[0]?.toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    setLocation("/");
  };

  const navLinks = [
    { href: "/products?category=cat-1", label: "Laptops",      Icon: MdComputer },
    { href: "/products?category=cat-2", label: "Gaming",       Icon: MdSportsSoccer },
    { href: "/products?category=cat-3", label: "Accessories",  Icon: MdHeadphones },
    { href: "/products?brand=Apple",    label: "Brands",       Icon: MdStore },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Main Bar */}
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <span className="text-xl font-bold text-foreground tracking-tight">Super Computer</span>
        </Link>

        {/* Desktop Search */}
        <div className="flex-1 max-w-xl hidden md:flex relative">
          <Input
            type="search"
            placeholder="Search laptops, accessories..."
            className="w-full pr-10"
          />
          <MdSearch className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Mobile search toggle */}
          <button
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <MdSearch size={22} className="text-foreground" />
          </button>

          {/* Cart */}
          <Link href="/cart">
            <button className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors">
              <MdShoppingCart size={22} className="text-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shadow">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </Link>

          {/* Desktop extras */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Wishlist */}
            <Link href="/wishlist">
              <button className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                {wishlistCount > 0
                  ? <MdFavorite size={22} className="text-red-500" />
                  : <MdFavoriteBorder size={22} className="text-foreground" />
                }
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </button>
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* User menu */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center border border-primary/20">
                    <span className="text-sm font-bold text-primary">{avatarLetter}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-semibold leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")} className="gap-2.5 cursor-pointer">
                    <MdPerson size={18} className="text-muted-foreground" /><span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/profile?tab=orders")} className="gap-2.5 cursor-pointer">
                    <MdReceiptLong size={18} className="text-muted-foreground" /><span>My Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/wishlist")} className="gap-2.5 cursor-pointer">
                    <MdFavoriteBorder size={18} className="text-muted-foreground" /><span>My Wishlist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/profile?tab=addresses")} className="gap-2.5 cursor-pointer">
                    <MdLocationOn size={18} className="text-muted-foreground" /><span>Addresses</span>
                  </DropdownMenuItem>
                  {userData?.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} className="gap-2.5 cursor-pointer">
                        <MdComputer size={18} className="text-primary" /><span className="text-primary font-medium">Admin Dashboard</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2.5 cursor-pointer text-destructive focus:text-destructive">
                    <MdLogout size={18} /><span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" className="rounded-full px-5" onClick={openLoginDialog}>Login</Button>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <MdClose size={24} className="text-foreground" /> : <MdMenu size={24} className="text-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="md:hidden border-t px-4 py-3 bg-background">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search laptops, accessories..."
              className="w-full pr-10"
              autoFocus
            />
            <MdSearch className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Desktop Category Bar */}
      <div className="border-t bg-card hidden md:block">
        <div className="container mx-auto px-4 h-10 flex items-center gap-6 text-sm font-medium">
          {navLinks.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground hover:text-foreground">
              <Icon size={16} />{label}
            </Link>
          ))}
          <Link href="/products?deals=true" className="flex items-center gap-1.5 text-destructive hover:text-destructive/80 transition-colors font-semibold">
            <MdLocalOffer size={16} />Today's Deals
          </Link>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background shadow-xl">
          <nav className="py-1">
            {navLinks.map(({ href, label, Icon }) => (
              <Link
                key={href} href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 text-base font-medium hover:bg-accent transition-colors"
              >
                <Icon size={20} className="text-muted-foreground" />
                {label}
                <MdChevronRight size={18} className="ml-auto text-muted-foreground" />
              </Link>
            ))}
            <Link
              href="/products?deals=true"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-5 py-3.5 text-base font-semibold text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <MdLocalOffer size={20} />Today's Deals 🔥
              <MdChevronRight size={18} className="ml-auto" />
            </Link>
          </nav>

          <div className="border-t mx-4" />

          <div className="py-2">
            {/* Theme toggle in mobile menu */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-foreground">Theme</span>
              <ThemeToggle />
            </div>

            <div className="border-t mx-4 mb-1" />

            {isLoggedIn ? (
              <>
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-primary">{avatarLetter}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                </div>
                <div className="border-t mx-4 mb-1" />
                {[
                  { Icon: MdPerson,       label: "My Profile",  href: "/profile" },
                  { Icon: MdReceiptLong,  label: "My Orders",   href: "/profile?tab=orders" },
                  { Icon: MdFavoriteBorder, label: "My Wishlist", href: "/wishlist" },
                  { Icon: MdLocationOn,   label: "Addresses",   href: "/profile?tab=addresses" },
                ].map(({ Icon, label, href }) => (
                  <Link
                    key={href} href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <Icon size={18} className="text-muted-foreground" />{label}
                  </Link>
                ))}
                {userData?.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    <MdComputer size={18} />Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full text-left"
                >
                  <MdLogout size={18} />Log out
                </button>
              </>
            ) : (
              <div className="px-4 py-3">
                <Button
                  className="w-full rounded-full"
                  onClick={() => { setMobileOpen(false); openLoginDialog(); }}
                >
                  Login / Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
