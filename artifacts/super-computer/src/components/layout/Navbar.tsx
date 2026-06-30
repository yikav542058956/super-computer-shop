import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  ShoppingCart, Heart, Search, User as UserIcon, LogOut,
  Package, MapPin, Menu, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";

export const Navbar = () => {
  const { cartCount } = useCart();
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    setMobileOpen(false);
    setLocation("/");
  };

  const navLinks = [
    { href: "/products?category=cat-1", label: "Laptops" },
    { href: "/products?category=cat-2", label: "Gaming" },
    { href: "/products?category=cat-3", label: "Accessories" },
    { href: "/products?brand=Apple", label: "Brands" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Main Bar */}
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <span className="text-lg md:text-xl font-bold text-primary">Super Computer</span>
        </Link>

        {/* Desktop Search */}
        <div className="flex-1 max-w-xl hidden md:flex relative">
          <Input
            type="search"
            placeholder="Search laptops, accessories..."
            className="w-full pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-1 md:gap-3">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost" size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/wishlist">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {(userData?.name || currentUser.email || "U")[0].toUpperCase()}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData?.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{currentUser.email || currentUser.phoneNumber}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /><span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/profile?tab=orders")}>
                    <Package className="mr-2 h-4 w-4" /><span>My Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/profile?tab=addresses")}>
                    <MapPin className="mr-2 h-4 w-4" /><span>Addresses</span>
                  </DropdownMenuItem>
                  {userData?.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")}>
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login"><Button>Login</Button></Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <Button
            variant="ghost" size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
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
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Desktop Category Bar */}
      <div className="border-t bg-card hidden md:block">
        <div className="container mx-auto px-4 h-10 flex items-center gap-6 text-sm font-medium">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className="hover:text-primary transition-colors">{l.label}</Link>
          ))}
          <Link href="/products?deals=true" className="text-destructive hover:text-destructive/80 transition-colors font-semibold">Today's Deals</Link>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background shadow-lg">
          {/* Nav Links */}
          <nav className="py-2">
            {navLinks.map(l => (
              <Link
                key={l.href} href={l.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-5 py-3.5 text-base font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                {l.label}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
            <Link
              href="/products?deals=true"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-5 py-3.5 text-base font-semibold text-destructive hover:bg-red-50 transition-colors"
            >
              Today's Deals 🔥
              <ChevronRight className="h-4 w-4 text-destructive/60" />
            </Link>
          </nav>

          <div className="border-t mx-4" />

          {/* User Section */}
          <div className="py-2">
            {currentUser ? (
              <>
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-primary">
                      {(userData?.name || currentUser.email || "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{userData?.name || "User"}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email || currentUser.phoneNumber}</p>
                  </div>
                </div>
                <div className="border-t mx-4 mb-2" />
                {[
                  { icon: UserIcon, label: "My Profile", href: "/profile" },
                  { icon: Package, label: "My Orders", href: "/profile?tab=orders" },
                  { icon: Heart, label: "Wishlist", href: "/wishlist" },
                  { icon: MapPin, label: "Addresses", href: "/profile?tab=addresses" },
                ].map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href} href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    {label}
                  </Link>
                ))}
                {userData?.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-destructive hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" />Log out
                </button>
              </>
            ) : (
              <div className="px-4 py-3 flex gap-3">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button className="w-full">Login</Button>
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
