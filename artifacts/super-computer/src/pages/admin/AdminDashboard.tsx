import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Package, Users, ShoppingCart, DollarSign } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0
  });

  useEffect(() => {
    const productsRef = ref(db, 'products');
    const ordersRef = ref(db, 'orders');
    const usersRef = ref(db, 'users');

    const unsubscribeProducts = onValue(productsRef, (snap) => {
      setStats(s => ({ ...s, products: snap.exists() ? Object.keys(snap.val()).length : 0 }));
    });

    const unsubscribeOrders = onValue(ordersRef, (snap) => {
      if (snap.exists()) {
        const orders = Object.values(snap.val()) as any[];
        const total = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
        setStats(s => ({ ...s, orders: orders.length, revenue: total }));
      }
    });

    const unsubscribeUsers = onValue(usersRef, (snap) => {
      setStats(s => ({ ...s, customers: snap.exists() ? Object.keys(snap.val()).length : 0 }));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeUsers();
    };
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Orders</p>
            <p className="text-2xl font-bold">{stats.orders}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Products</p>
            <p className="text-2xl font-bold">{stats.products}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Customers</p>
            <p className="text-2xl font-bold">{stats.customers}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <div className="text-slate-500 flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
          Activity feed will appear here...
        </div>
      </div>
    </AdminLayout>
  );
}