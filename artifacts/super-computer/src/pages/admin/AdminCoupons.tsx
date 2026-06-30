import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue, remove, push, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash, Loader2, Tag, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

const EMPTY_FORM = {
  code: "",
  discountType: "percentage" as "percentage" | "flat",
  discountValue: 10,
  minOrderValue: 0,
  maxUses: 100,
  expiryDate: "",
  isActive: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const couponsRef = ref(db, "coupons");
    const unsubscribe = onValue(couponsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setCoupons(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      } else {
        setCoupons([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowDialog(true);
  };

  const openEdit = (coupon: any) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code || "",
      discountType: coupon.discountType || "percentage",
      discountValue: coupon.discountValue || 10,
      minOrderValue: coupon.minOrderValue || 0,
      maxUses: coupon.maxUses || 100,
      expiryDate: coupon.expiryDate || "",
      isActive: coupon.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    if (!form.discountValue || form.discountValue <= 0) { toast.error("Discount value must be greater than 0"); return; }
    if (form.discountType === "percentage" && form.discountValue > 100) { toast.error("Percentage discount cannot exceed 100%"); return; }

    setSaving(true);
    try {
      const data = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxUses: Number(form.maxUses) || 0,
        usedCount: editingId ? undefined : 0,
        expiryDate: form.expiryDate || "",
        isActive: form.isActive,
      };

      if (editingId) {
        const updateData: any = { ...data };
        delete updateData.usedCount;
        await update(ref(db, `coupons/${editingId}`), updateData);
        toast.success("Coupon updated");
      } else {
        await push(ref(db, "coupons"), { ...data, usedCount: 0 });
        toast.success("Coupon created");
      }
      setShowDialog(false);
    } catch {
      toast.error("Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await remove(ref(db, `coupons/${id}`));
      toast.success("Coupon deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleActive = async (coupon: any) => {
    await update(ref(db, `coupons/${coupon.id}`), { isActive: !coupon.isActive });
    toast.success(`Coupon ${!coupon.isActive ? "activated" : "deactivated"}`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupons & Offers</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Create Coupon</Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Tag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">No coupons yet. Create one to offer discounts.</p>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm">{coupon.code}</span>
                      <button onClick={() => copyCode(coupon.code)} className="text-slate-400 hover:text-slate-600"><Copy className="h-3 w-3" /></button>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${formatINR(coupon.discountValue)} off`}
                  </TableCell>
                  <TableCell>{coupon.minOrderValue > 0 ? formatINR(coupon.minOrderValue) : "—"}</TableCell>
                  <TableCell>{coupon.usedCount || 0} / {coupon.maxUses || "∞"}</TableCell>
                  <TableCell>
                    {coupon.expiryDate ? (
                      <span className={isExpired(coupon.expiryDate) ? "text-red-500 font-medium" : "text-slate-600"}>
                        {new Date(coupon.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {isExpired(coupon.expiryDate) && " (Expired)"}
                      </span>
                    ) : <span className="text-slate-400">No expiry</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={coupon.isActive && !isExpired(coupon.expiryDate)} onCheckedChange={() => toggleActive(coupon)} disabled={isExpired(coupon.expiryDate)} />
                      <Badge variant={coupon.isActive && !isExpired(coupon.expiryDate) ? "default" : "secondary"} className="text-xs">
                        {isExpired(coupon.expiryDate) ? "Expired" : coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(coupon)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(coupon.id)}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Coupon Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE10"
                className="font-mono uppercase"
              />
              <p className="text-xs text-slate-400">Code is automatically uppercased</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v: "percentage" | "flat") => setForm((f) => ({ ...f, discountType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  min={1}
                  max={form.discountType === "percentage" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                  placeholder={form.discountType === "percentage" ? "10" : "500"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Min Order Value (₹)</Label>
                <Input type="number" min={0} value={form.minOrderValue} onChange={(e) => setForm((f) => ({ ...f, minOrderValue: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Max Uses</Label>
                <Input type="number" min={1} value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))} placeholder="100" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} min={new Date().toISOString().split("T")[0]} />
              <p className="text-xs text-slate-400">Leave blank for no expiry</p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              <Label>Active (usable by customers)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : editingId ? "Update Coupon" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
