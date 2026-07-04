import { useState } from "react";
import { Link, useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag,
  Settings, LogOut, Image as ImageIcon, BarChart, Megaphone,
  Ticket, Camera, Wallet, BookOpen, CreditCard, ShoppingBag,
  Sparkles, Menu, X, ChevronRight,
} from "lucide-react";
import { AdminAIAssistant } from "@/components/admin/AdminAIAssistant";

const navItems = [
  { label: "Dashboard",       href: "/admin/dashboard",        icon: LayoutDashboard },
  { label: "Products",        href: "/admin/products",         icon: Package },
  { label: "Orders",          href: "/admin/orders",           icon: ShoppingCart },
  { label: "Offline Sale",    href: "/admin/offline-sale",     icon: ShoppingBag },
  { label: "Customers",       href: "/admin/customers",        icon: Users },
  { label: "Categories",      href: "/admin/categories",       icon: Tag },
  { label: "Banners",         href: "/admin/banners",          icon: ImageIcon },
  { label: "Announcements",   href: "/admin/announcements",    icon: Megaphone },
  { label: "Coupons",         href: "/admin/coupons",          icon: Ticket },
  { label: "Reports",         href: "/admin/reports",          icon: BarChart },
  { label: "Customer Photos", href: "/admin/customer-photos",  icon: Camera },
  { label: "Wallet",          href: "/admin/wallet",           icon: Wallet },
  { label: "Accounting",      href: "/admin/accounting",       icon: BookOpen },
  { label: "Payment",         href: "/admin/payment",          icon: CreditCard },
  { label: "Settings",        href: "/admin/settings",         icon: Settings },
];

// Bottom nav: 5 most-used pages on mobile
const bottomNav = [
  { label: "Home",    href: "/admin/dashboard",     icon: LayoutDashboard },
  { label: "Products",href: "/admin/products",      icon: Package },
  { label: "Orders",  href: "/admin/orders",        icon: ShoppingCart },
  { label: "Sale",    href: "/admin/offline-sale",  icon: ShoppingBag },
  { label: "More",    href: null,                   icon: Menu },          // opens drawer
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    await auth.signOut().catch(() => {});
    setLocation("/admin/login");
  };

  const NavItem = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => {
    const Icon = item.icon;
    const isActive = location === item.href;
    return (
      <Link href={item.href}>
        <div
          onClick={onClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
            isActive ? "bg-primary text-white shadow-sm" : "hover:bg-slate-800 hover:text-white text-slate-300"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="font-medium text-sm">{item.label}</span>
          {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-[100dvh] bg-slate-100 overflow-hidden">

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex w-60 bg-slate-900 text-slate-300 flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-slate-800 shrink-0">
          <span className="text-lg font-bold text-white tracking-tight">Super Computer</span>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <nav className="space-y-0.5">
            {navItems.map(item => <NavItem key={item.href} item={item} />)}
            {/* AI row */}
            <div className="pt-2 mt-2 border-t border-slate-800">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "rgba(124,58,237,0.15)" }}>
                <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-purple-300">AI Assistant</p>
                  <p className="text-[10px] text-purple-500">Purple button → bottom right</p>
                </div>
              </div>
            </div>
          </nav>
        </div>
        <div className="p-3 border-t border-slate-800 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer Overlay ────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Slide Drawer ──────────────────────────────── */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 bg-slate-900 text-slate-300 flex flex-col md:hidden transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <span className="text-lg font-bold text-white">Super Computer</span>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <nav className="space-y-0.5">
            {navItems.map(item => (
              <NavItem key={item.href} item={item} onClick={() => setDrawerOpen(false)} />
            ))}
          </nav>
        </div>
        <div className="p-3 border-t border-slate-800 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300 transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Header */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-slate-800 text-base truncate">
              {navItems.find(n => n.href === location)?.label || "Admin Portal"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">A</div>
          </div>
        </header>

        {/* Scrollable content — leave space for bottom nav on mobile */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex md:hidden">
        {bottomNav.map(item => {
          const Icon = item.icon;
          const isActive = item.href ? location === item.href : false;
          if (!item.href) {
            // "More" opens the drawer
            return (
              <button
                key="more"
                onClick={() => setDrawerOpen(true)}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-slate-500 hover:text-primary transition-colors"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">More</span>
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center justify-center py-2 gap-0.5 flex-1 min-w-0 transition-colors ${isActive ? "text-primary" : "text-slate-500 hover:text-primary"}`}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Floating AI — always visible */}
      <AdminAIAssistant />
    </div>
  );
};
