import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Ban, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selective delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setCustomers(Object.entries(data).map(([id, val]: any) => ({ id, ...val })).filter(c => c.role !== 'admin'));
      } else {
        setCustomers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => setSelectedIds(
    selectedIds.size === customers.length ? new Set() : new Set(customers.map(c => c.id))
  );

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} customer(s) permanently? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => remove(ref(db, `users/${id}`))));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} customer(s) deleted`);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!window.confirm("Delete this customer permanently?")) return;
    try {
      await remove(ref(db, `users/${id}`));
      toast.success("Customer deleted");
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <span className="text-sm text-slate-500">{customers.length} total</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
          <span className="text-sm text-red-700 font-semibold">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="gap-1.5"
          >
            {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete Selected
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="rounded cursor-pointer"
                  checked={customers.length > 0 && selectedIds.size === customers.length}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">No customers found.</TableCell></TableRow>
            ) : (
              customers.map(customer => (
                <TableRow key={customer.id} className={selectedIds.has(customer.id) ? "bg-red-50/40" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded cursor-pointer"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{customer.name || "N/A"}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                      {customer.role || "user"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteOne(customer.id)}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
