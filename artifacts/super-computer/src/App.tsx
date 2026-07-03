import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { LoginDialogProvider } from "@/contexts/LoginDialogContext";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { useEffect } from "react";
import { seedData } from "@/lib/seedData";
import { AdminRoute, ProtectedRoute } from "@/components/auth/RouteGuards";

// Customer Pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProductListing from "@/pages/ProductListing";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Wishlist from "@/pages/Wishlist";
import Checkout from "@/pages/Checkout";
import Profile from "@/pages/Profile";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Play from "@/pages/Play";
import Search from "@/pages/Search";
import Orders from "@/pages/Orders";
import Wallet from "@/pages/Wallet";
import CheckoutDone from "@/pages/CheckoutDone";

// Admin Pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminBanners from "@/pages/admin/AdminBanners";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminCoupons from "@/pages/admin/AdminCoupons";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminReports from "@/pages/admin/AdminReports";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminPayment from "@/pages/admin/AdminPayment";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import AdminCustomerPhotos from "@/pages/admin/AdminCustomerPhotos";
import AdminWallet from "@/pages/admin/AdminWallet";
import AdminAccounting from "@/pages/admin/AdminAccounting";
import { AdminLayout } from "@/components/layout/AdminLayout";

const queryClient = new QueryClient();

const Placeholder = ({ name }: { name: string }) => <div className="p-8 text-xl">{name}</div>;

function Router() {
  return (
    <Switch>
      {/* Customer Routes */}
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/play" component={Play} />
      <Route path="/products" component={ProductListing} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/checkout">
        <ProtectedRoute>
          <Checkout />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout/done" component={CheckoutDone} />
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      </Route>
      <Route path="/wallet">
        <ProtectedRoute>
          <Wallet />
        </ProtectedRoute>
      </Route>
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      
      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      
      <Route path="/admin/dashboard">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>

      <Route path="/admin/products">
        <AdminRoute>
          <AdminProducts />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/orders">
        <AdminRoute>
          <AdminOrders />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/categories">
        <AdminRoute>
          <AdminCategories />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/banners">
        <AdminRoute>
          <AdminBanners />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/customers">
        <AdminRoute>
          <AdminCustomers />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/coupons">
        <AdminRoute>
          <AdminCoupons />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/reviews">
        <AdminRoute>
          <AdminReviews />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/reports">
        <AdminRoute>
          <AdminReports />
        </AdminRoute>
      </Route>
      
      <Route path="/admin/settings">
        <AdminRoute>
          <AdminSettings />
        </AdminRoute>
      </Route>

      <Route path="/admin/payment">
        <AdminRoute>
          <AdminPayment />
        </AdminRoute>
      </Route>

      <Route path="/admin/announcements">
        <AdminRoute>
          <AdminAnnouncements />
        </AdminRoute>
      </Route>

      <Route path="/admin/customer-photos">
        <AdminRoute>
          <AdminCustomerPhotos />
        </AdminRoute>
      </Route>

      <Route path="/admin/wallet">
        <AdminRoute>
          <AdminWallet />
        </AdminRoute>
      </Route>

      <Route path="/admin/accounting">
        <AdminRoute>
          <AdminAccounting />
        </AdminRoute>
      </Route>

      <Route path="/admin/:page">
        <AdminRoute>
          <AdminLayout>
            <Placeholder name="Admin Work In Progress..." />
          </AdminLayout>
        </AdminRoute>
      </Route>
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    seedData();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoginDialogProvider>
            <CartProvider>
              <WishlistProvider>
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                  </WouterRouter>
                  <LoginDialog />
                  <Toaster />
                </TooltipProvider>
              </WishlistProvider>
            </CartProvider>
          </LoginDialogProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;