import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, Heart, Search, User as UserIcon, LogOut, Package, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";

export const Navbar = () => {
  const { cartCount } = useCart();
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await auth.signOut();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Super Computer</span>
        </Link>

        <div className="flex-1 max-w-xl hidden md:flex relative">
          <Input 
            type="search" 
            placeholder="Search laptops, accessories..." 
            className="w-full pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-4">
          <Link href="/wishlist">
            <Button variant="ghost" size="icon" className="relative">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>
          
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>

          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData?.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile?tab=orders")}>
                  <Package className="mr-2 h-4 w-4" />
                  <span>My Orders</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile?tab=addresses")}>
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>Addresses</span>
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
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Category Mega Menu - simplified for now */}
      <div className="border-t bg-card hidden md:block">
        <div className="container mx-auto px-4 h-10 flex items-center gap-6 text-sm font-medium">
          <Link href="/products?category=cat-1" className="hover:text-primary transition-colors">Laptops</Link>
          <Link href="/products?category=cat-2" className="hover:text-primary transition-colors">Gaming</Link>
          <Link href="/products?category=cat-3" className="hover:text-primary transition-colors">Accessories</Link>
          <Link href="/products?brand=Apple" className="hover:text-primary transition-colors">Brands</Link>
          <Link href="/products?deals=true" className="text-destructive hover:text-destructive/80 transition-colors">Today's Deals</Link>
        </div>
      </div>
    </header>
  );
};