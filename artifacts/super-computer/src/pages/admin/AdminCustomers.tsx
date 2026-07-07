import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2, Search, ShoppingBag, Phone, Mail, User, X } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;              // users/ key or synthetic "order_<phone>"
  name: string;
  phone: string;
  email: string;
  role: string;
  createdAt?: number;
  source: "registered" | "order_only"; // where data came from
  orderCount: number;
  lastOrderAt?: number;
  lastOrderId?: string;
}

export default function AdminCustomers() {
  const [rawUsers, setRawUsers]   = useState<Record<string, any>>({});
  const [rawOrders, setRawOrders] = useState<Record<string, any>>({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Subscribe to users/ and orders/ in parallel
  useEffect(() => {
    let usersLoaded  = false;
    let ordersLoaded = false;
    const check = () => { if (usersLoaded && ordersLoaded) setLoading(false); };

    const unsubUsers = onValue(ref(db, "users"), (snap) => {
      setRawUsers(snap.exists() ? snap.val() : {});
      usersLoaded = true; check();
    });
    const unsubOrders = onValue(ref(db, "orders"), (snap) => {
      setRawOrders(snap.exists() ? snap.val() : {});
      ordersLoaded = true; check();
    });
    return () => { unsubUsers(); unsubOrders(); };
  }, []);

  // Merge users/ + orders/ into a single customer list
  const customers = useMemo<Customer[]>(() => {
    // 1. Start from registered users (non-admin)
    const map = new Map<string, Customer>();

    for (const [id, u] of Object.entries(rawUsers)) {
      if ((u as any).role === "admin") continue;
      map.set(id, {
        id,
        name:        (u as any).name  || "",
        phone:       (u as any).phone || "",
        email:       (u as any).email || "",
        role:        (u as any).role  || "user",
        createdAt:   (u as any).createdAt,
        source:      "registered",
        orderCount:  0,
      });
    }

    // 2. Walk orders to count orders per customer + backfill missing customers
    for (const [orderId, o] of Object.entries(rawOrders)) {
      const ord = o as any;
      const phone = (ord.customerPhone || ord.userPhone || "").replace(/\D/g, "");
      const name  = ord.customerName  || ord.userName  || "";
      const email = ord.customerEmail || "";
      const ts    = ord.createdAt     || 0;
      const uid   = ord.userId        || "";

      // Find matching registered user by uid or phone
      const key =
        (uid && map.has(uid))           ? uid :
        (phone && map.has(`phone_${phone}`)) ? `phone_${phone}` :
        phone                            ? `phone_${phone}` :
        uid                              ? uid :
        null;

      if (!key) continue;

      if (map.has(key)) {
        const c = map.get(key)!;
        c.orderCount++;
        if (!c.lastOrderAt || ts > c.lastOrderAt) {
          c.lastOrderAt  = ts;
          c.lastOrderId  = orderId;
        }
        // Backfill missing fields from order data
        if (!c.name  && name)  c.name  = name;
        if (!c.phone && phone) c.phone = phone;
        if (!c.email && email) c.email = email;
      } else {
        // Customer placed order but never registered (pre-fix logins)
        map.set(key, {
          id:          key,
          name,
          phone,
          email,
          role:        "user",
          source:      "order_only",
          orderCount:  1,
          lastOrderAt: ts,
          lastOrderId: orderId,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Registered first, then by most recent order / signup
      const tA = a.lastOrderAt || a.createdAt || 0;
      const tB = b.lastOrderAt || b.createdAt || 0;
      return tB - tA;
    });
  }, [rawUsers, rawOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q)  ||
      c.phone.includes(q)               ||
      c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const toggleSelect    = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const handleBulkDelete = async () => {
    const registeredOnly = Array.from(selectedIds).filter(id => (rawUsers[id] as any)?.role !== "admin" && rawUsers[id]);
    if (!window.confirm(`Delete ${registeredOnly.length} registered customer(s)?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(registeredOnly.map(id => remove(ref(db, `users/${id}`))));
      setSelectedIds(new Set());
      toast.success(`${registeredOnly.length} customer(s) deleted`);
    } catch (e: any) { toast.error("Failed: " + e.message); }
    finally { setBulkDeleting(false); }
  };

  const handleDeleteOne = async (c: Customer) => {
    if (c.source === "order_only") {
      toast.error("Ye customer sirf order se aaya hai — isko delete nahi kar sakte");
      return;
    }
    if (!window.confirm("Delete this customer permanently?")) return;
    try {
      await remove(ref(db, `users/${c.id}`));
      toast.success("Customer deleted");
    } catch (e: any) { toast.error("Failed: " + e.message); }
  };

  const fmt = (ts?: number) =>
    ts ? new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800">Customers</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered users + customers who placed orders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">{customers.length} total</span>
            {search && <span className="text-xs text-slate-400">· {filtered.length} matching</span>}
          </div>
        </div>

        {/* Search + bulk actions */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Name, phone ya email se search karo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1.5">
                {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete {selectedIds.size} selected
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="rounded cursor-pointer"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    {search ? "Koi customer nahi mila is search se" : "Abhi koi customer nahi hai"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c.id} className={selectedIds.has(c.id) ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                    <TableCell>
                      <input type="checkbox" className="rounded cursor-pointer"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)} />
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{c.name || <span className="text-slate-400 italic">No name</span>}</p>
                          {c.createdAt && (
                            <p className="text-[10px] text-slate-400">Joined {fmt(c.createdAt)}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Phone */}
                    <TableCell>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-sm text-slate-700 hover:text-blue-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {c.phone}
                        </a>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-sm text-slate-600">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[160px]">{c.email}</span>
                        </a>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </TableCell>

                    {/* Orders */}
                    <TableCell className="text-center">
                      {c.orderCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                          <ShoppingBag className="h-3 w-3" /> {c.orderCount}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">0</span>
                      )}
                    </TableCell>

                    {/* Last order */}
                    <TableCell className="text-xs text-slate-500">{fmt(c.lastOrderAt)}</TableCell>

                    {/* Source badge */}
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.source === "registered"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {c.source === "registered" ? "Registered" : "Order only"}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteOne(c)}
                        title={c.source === "order_only" ? "Cannot delete order-only customer" : "Delete customer"}
                        disabled={c.source === "order_only"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block" /> Registered — login karke aaye hain
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Order only — order diya par registered nahi
          </span>
        </div>
      </div>
    </AdminLayout>
  );
}
