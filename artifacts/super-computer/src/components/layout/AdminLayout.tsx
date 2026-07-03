import { Link, useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Settings,
  LogOut,
  Image as ImageIcon,
  MessageSquare,
  BarChart,
  Megaphone,
  Ticket,
  Camera,
  Wallet,
  BookOpen,
  CreditCard,
} from "lucide-react";

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    await auth.signOut().catch(() => {});
    setLocation("/admin/login");
  };

  const navItems = [
    { label: "Dashboard",      href: "/admin/dashboard",       icon: LayoutDashboard },
    { label: "Products",       href: "/admin/products",        icon: Package },
    { label: "Orders",         href: "/admin/orders",          icon: ShoppingCart },
    { label: "Customers",      href: "/admin/customers",       icon: Users },
    { label: "Categories",     href: "/admin/categories",      icon: Tag },
    { label: "Banners",        href: "/admin/banners",         icon: ImageIcon },
    { label: "Announcements",  href: "/admin/announcements",   icon: Megaphone },
    { label: "Coupons",        href: "/admin/coupons",         icon: Ticket },
    { label: "Reports",        href: "/admin/reports",         icon: BarChart },
    { label: "Customer Photos",href: "/admin/customer-photos", icon: Camera },
    { label: "Wallet",         href: "/admin/wallet",          icon: Wallet },
    { label: "Accounting",     href: "/admin/accounting",      icon: BookOpen },
    { label: "Payment",        href: "/admin/payment",         icon: CreditCard },
    { label: "Settings",       href: "/admin/settings",        icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white">Super Computer</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "hover:bg-slate-800 hover:text-white"
                  }`}>
                    <Icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-slate-800">Admin Portal</h2>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
