import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Plus, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

const emptyForm = {
  customerName: "", phone: "", productName: "", qty: "1",
  amount: "", paymentMethod: "cash", notes: "",
};

export default function AdminOfflineSale() {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.customerName.trim()) { toast.error("Customer name is required"); return; }
    if (!form.productName.trim()) { toast.error("Product name is required"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    try {
      const newRef = push(ref(db, "orders"));
      await set(newRef, {
        source: "offline",
        orderStatus: "delivered",
        paymentStatus: "paid",
        paymentMethod: form.paymentMethod,
        finalAmount: Number(form.amount),
        subtotal: Number(form.amount),
        gstAmount: 0,
        gstRate: 0,
        deliveryCharge: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        address: {
          name: form.customerName.trim(),
          phone: form.phone.trim(),
          city: "Walk-in",
          state: "",
          pincode: "",
          address: "In-store / Offline sale",
        },
        items: [{
          name: form.productName.trim(),
          qty: Number(form.qty) || 1,
          price: Number(form.amount),
        }],
        notes: form.notes.trim(),
        statusHistory: [{
          status: "delivered",
          timestamp: Date.now(),
          note: "Offline / in-store sale added by admin",
        }],
      });
      setLastSaved(form.customerName.trim());
      toast.success(`✅ Sale recorded for ${form.customerName.trim()}!`);
      setForm({ ...emptyForm });
    } catch {
      toast.error("Failed to save offline sale");
    } finally {
      setSaving(false);
    }
  };

  const paymentIcon: Record<string, string> = { cash: "💵", upi: "📱", card: "💳" };

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Offline / In-Store Sale</h1>
            <p className="text-slate-500 text-sm">Record a walk-in or manual sale — counts in revenue & reports</p>
          </div>
        </div>

        {lastSaved && (
          <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Last saved: <strong>{lastSaved}</strong> — form cleared for next entry
          </div>
        )}

        <Card className="border-2 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 text-base">Sale Details</CardTitle>
            <CardDescription>Saved as <strong>Delivered + Paid</strong> automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Customer Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Ramesh Kumar" value={form.customerName} onChange={f("customerName")} />
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  placeholder="10-digit number"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(p => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="upi">📱 UPI</SelectItem>
                    <SelectItem value="card">💳 Card / Swipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Product Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Lenovo IdeaPad 3 i5 12th Gen 8GB 512GB" value={form.productName} onChange={f("productName")} />
              </div>

              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.qty} onChange={f("qty")} />
              </div>

              <div className="space-y-1.5">
                <Label>Sale Amount (₹) <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" placeholder="e.g. 45000" value={form.amount} onChange={f("amount")} />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any extra info — warranty, accessories, etc." rows={2} value={form.notes} onChange={f("notes")} />
              </div>
            </div>

            {form.amount && Number(form.amount) > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Sale Amount</p>
                  <p className="text-2xl font-black text-orange-700">{formatINR(Number(form.amount))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Payment</p>
                  <p className="text-base font-bold">{paymentIcon[form.paymentMethod]} {form.paymentMethod === "upi" ? "UPI" : form.paymentMethod === "card" ? "Card" : "Cash"}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2 bg-orange-600 hover:bg-orange-700 h-11 text-base font-semibold"
            >
              {saving
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
                : <><Plus className="h-5 w-5" /> Record Sale</>
              }
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
