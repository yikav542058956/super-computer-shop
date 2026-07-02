import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Eye, Search, Download, Printer, CheckCircle, XCircle,
  TrendingUp, ShoppingCart, IndianRupee, Clock, Loader2,
  Banknote, Smartphone, RefreshCw, Package, MapPin, User,
  FileText, AlertCircle, ChevronDown, Plus,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "pending",          label: "Pending",            color: "bg-gray-100 text-gray-700" },
  { value: "payment_pending",  label: "Payment Pending",    color: "bg-amber-100 text-amber-700" },
  { value: "confirmed",        label: "Confirmed",          color: "bg-blue-100 text-blue-700" },
  { value: "shipped",          label: "Shipped",            color: "bg-purple-100 text-purple-700" },
  { value: "out_for_delivery", label: "Out for Delivery",   color: "bg-orange-100 text-orange-700" },
  { value: "delivered",        label: "Delivered",          color: "bg-green-100 text-green-700" },
  { value: "cancelled",        label: "Cancelled",          color: "bg-red-100 text-red-700" },
  { value: "returned",         label: "Returned",           color: "bg-pink-100 text-pink-700" },
  { value: "refunded",         label: "Refunded",           color: "bg-teal-100 text-teal-700" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "pending",  label: "Pending",  color: "bg-gray-100 text-gray-700" },
  { value: "partial",  label: "Partial",  color: "bg-amber-100 text-amber-700" },
  { value: "paid",     label: "Paid",     color: "bg-green-100 text-green-700" },
  { value: "refunded", label: "Refunded", color: "bg-teal-100 text-teal-700" },
  { value: "failed",   label: "Failed",   color: "bg-red-100 text-red-700" },
];

function StatusBadge({ status, options }: { status: string; options: typeof STATUS_OPTIONS }) {
  const opt = options.find((o) => o.value === status) || { label: status, color: "bg-gray-100 text-gray-700" };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${opt.color}`}>{opt.label}</span>;
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function printInvoice(order: any) {
  const gstRate = order.gstRate || 0.18;
  const items = Array.isArray(order.items) ? order.items : Object.values(order.items || {});
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice #${order.id?.slice(-8).toUpperCase()}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 900; } .brand span { color: #16a34a; }
    .invoice-no { text-align: right; font-size: 13px; color: #666; }
    .invoice-no strong { font-size: 20px; color: #1a1a1a; display: block; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .info p { margin: 2px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8f8f8; padding: 10px 12px; text-align: left; font-size: 12px; color: #666; border-bottom: 1px solid #eee; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .totals { margin-top: 16px; float: right; min-width: 280px; }
    .totals tr td { border: none; padding: 4px 12px; }
    .totals tr.total td { font-weight: 900; font-size: 15px; border-top: 2px solid #1a1a1a; padding-top: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .paid { background: #dcfce7; color: #166534; } .pending { background: #fef9c3; color: #92400e; }
    .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 16px; text-align: center; font-size: 11px; color: #999; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SUPER <span>COMPUTER</span></div>
      <p style="font-size:12px;color:#666;margin-top:4px;">Tax Invoice</p>
    </div>
    <div class="invoice-no">
      <span>Invoice No.</span>
      <strong>#${order.id?.slice(-8).toUpperCase()}</strong>
      <p>Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
    </div>
  </div>

  <div class="grid">
    <div class="info">
      <p class="section-title">Bill To</p>
      <p><strong>${order.address?.name || order.userName}</strong></p>
      <p>${order.address?.street || ""}</p>
      <p>${order.address?.city || ""}${order.address?.state ? ", " + order.address.state : ""}${order.address?.pincode ? " - " + order.address.pincode : ""}</p>
      <p>📞 ${order.address?.phone || order.userPhone || ""}</p>
    </div>
    <div class="info">
      <p class="section-title">Order Details</p>
      <p><strong>Order ID:</strong> ${order.id?.slice(-8).toUpperCase()}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</p>
      <p><strong>Status:</strong> ${order.orderStatus}</p>
      <p><strong>Payment Status:</strong> <span class="badge ${order.paymentStatus === "paid" ? "paid" : "pending"}">${order.paymentStatus?.toUpperCase()}</span></p>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Product</th><th>Price</th><th>Qty</th><th>Amount</th>
    </tr></thead>
    <tbody>
      ${items.map((item: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td>${formatINR(item.price)}</td>
          <td>${item.qty}</td>
          <td>${formatINR(item.price * item.qty)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal:</td><td style="text-align:right">${formatINR(order.subtotal || order.totalAmount)}</td></tr>
    ${order.discountAmount > 0 ? `<tr><td>Discount:</td><td style="text-align:right;color:#16a34a">− ${formatINR(order.discountAmount)}</td></tr>` : ""}
    <tr><td>GST (${Math.round((order.gstRate || 0.18) * 100)}%):</td><td style="text-align:right">${formatINR(order.gstAmount || 0)}</td></tr>
    <tr><td>Delivery:</td><td style="text-align:right">${order.deliveryCharge === 0 ? "FREE" : formatINR(order.deliveryCharge || 0)}</td></tr>
    ${order.extraCharges > 0 ? `<tr><td>${order.extraChargesNote || "Extra Charges"}:</td><td style="text-align:right">${formatINR(order.extraCharges)}</td></tr>` : ""}
    <tr class="total"><td>Total:</td><td style="text-align:right">${formatINR(order.finalAmount)}</td></tr>
    ${order.paymentMethod === "cod" ? `<tr><td style="color:#92400e">Advance Received:</td><td style="text-align:right;color:#92400e">${order.advanceReceived ? formatINR(order.advanceAmount || 0) : "Pending"}</td></tr>` : ""}
  </table>

  <div style="clear:both"></div>
  <div class="footer">
    <p>Thank you for shopping with Super Computer! 🙏</p>
    <p>For queries call/WhatsApp: +91 97618 09960</p>
  </div>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }
}

function exportCSV(orders: any[]) {
  const rows = [
    ["Order ID", "Date", "Customer", "Phone", "City", "Items", "Subtotal", "GST", "Delivery", "Total", "Payment Method", "Payment Status", "Order Status", "Advance Received", "Notes"],
    ...orders.map((o) => {
      const items = Array.isArray(o.items) ? o.items : Object.values(o.items || {});
      return [
        o.id?.slice(-8).toUpperCase(),
        new Date(o.createdAt).toLocaleDateString("en-IN"),
        o.address?.name || o.userName,
        o.address?.phone || o.userPhone,
        o.address?.city,
        (items as any[]).map((i: any) => `${i.name} x${i.qty}`).join("; "),
        o.subtotal || o.totalAmount,
        o.gstAmount || 0,
        o.deliveryCharge || 0,
        o.finalAmount,
        o.paymentMethod,
        o.paymentStatus,
        o.orderStatus,
        o.advanceReceived ? "Yes" : "No",
        o.notes || "",
      ];
    }),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `orders_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV export ho gaya!");
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [editStatus, setEditStatus] = useState("");
  const [editPayStatus, setEditPayStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editExtraCharge, setEditExtraCharge] = useState("");
  const [editExtraNote, setEditExtraNote] = useState("");
  const [editAdvanceReceived, setEditAdvanceReceived] = useState(false);
  const [editPaidAmount, setEditPaidAmount] = useState("");

  const [refundDialog, setRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "orders"), (snap) => {
      if (snap.exists()) {
        setOrders(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).sort((a, b) => b.createdAt - a.createdAt));
      } else setOrders([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openOrder = (order: any) => {
    setSelected(order);
    setEditStatus(order.orderStatus || "pending");
    setEditPayStatus(order.paymentStatus || "pending");
    setEditNotes(order.notes || "");
    setEditExtraCharge(order.extraCharges ? String(order.extraCharges) : "");
    setEditExtraNote(order.extraChargesNote || "");
    setEditAdvanceReceived(order.advanceReceived || false);
    setEditPaidAmount(order.paidAmount ? String(order.paidAmount) : "");
  };

  const filtered = useMemo(() => orders.filter((o) => {
    const q = search.toLowerCase();
    const matchQ = !q || o.address?.name?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q) || o.address?.phone?.includes(q) || o.address?.city?.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || o.orderStatus === statusFilter;
    const matchP = paymentFilter === "all" || o.paymentMethod === paymentFilter;
    return matchQ && matchS && matchP;
  }), [orders, search, statusFilter, paymentFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + (o.finalAmount || 0), 0);
    const pending = orders.filter((o) => ["pending", "payment_pending"].includes(o.orderStatus)).length;
    const advancePending = orders.filter((o) => o.paymentMethod === "cod" && !o.advanceReceived && !["cancelled", "refunded"].includes(o.orderStatus)).length;
    const thisMonthRevenue = orders.filter((o) => {
      const d = new Date(o.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, o) => s + (o.finalAmount || 0), 0);
    return { total, revenue, pending, advancePending, thisMonthRevenue };
  }, [orders]);

  const saveOrder = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updates: any = {
        orderStatus: editStatus,
        paymentStatus: editPayStatus,
        notes: editNotes,
        advanceReceived: editAdvanceReceived,
        updatedAt: Date.now(),
      };
      if (editExtraCharge) {
        updates.extraCharges = Number(editExtraCharge);
        updates.extraChargesNote = editExtraNote || "Extra charges";
        updates.finalAmount = (selected.finalAmount || 0) + Number(editExtraCharge) - (selected.extraCharges || 0);
      }
      if (editPaidAmount) updates.paidAmount = Number(editPaidAmount);
      if (editAdvanceReceived && selected.paymentMethod === "cod") {
        updates.paidAmount = selected.advanceAmount || 0;
      }
      const history = [...(selected.statusHistory || [])];
      if (editStatus !== selected.orderStatus || editPayStatus !== selected.paymentStatus) {
        history.push({ status: editStatus, paymentStatus: editPayStatus, timestamp: Date.now(), note: `Admin updated: ${editStatus}` });
      }
      updates.statusHistory = history;
      await update(ref(db, `orders/${selected.id}`), updates);
      toast.success("Order updated!");
      setSelected(null);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!selected || !refundAmount) return;
    setRefunding(true);
    try {
      await update(ref(db, `orders/${selected.id}`), {
        paymentStatus: "refunded",
        orderStatus: "refunded",
        refundAmount: Number(refundAmount),
        refundNote,
        refundDate: Date.now(),
        updatedAt: Date.now(),
      });
      toast.success(`Refund of ${formatINR(Number(refundAmount))} recorded!`);
      setRefundDialog(false);
      setSelected(null);
    } catch {
      toast.error("Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  const orderItems = (order: any): any[] => {
    if (!order?.items) return [];
    return Array.isArray(order.items) ? order.items : Object.values(order.items);
  };

  return (
    <AdminLayout>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(stats.revenue)} color="bg-green-100 text-green-600" />
        <StatCard icon={TrendingUp} label="This Month" value={formatINR(stats.thisMonthRevenue)} color="bg-purple-100 text-purple-600" />
        <StatCard icon={Clock} label="Pending Orders" value={stats.pending} color="bg-amber-100 text-amber-600" />
        <StatCard icon={AlertCircle} label="Advance Pending" value={stats.advancePending} color="bg-red-100 text-red-600" />
      </div>

      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search name, order ID, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Order Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="cod">Cash on Delivery</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Order Status</TableHead>
              <TableHead>Pay Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400">No orders found.</TableCell></TableRow>
            ) : filtered.map((order) => (
              <TableRow key={order.id} className="hover:bg-slate-50">
                <TableCell className="font-mono font-bold text-xs">{order.id?.slice(-8).toUpperCase()}</TableCell>
                <TableCell className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                <TableCell>
                  <p className="font-semibold text-sm">{order.address?.name || order.userName}</p>
                  <p className="text-xs text-slate-400">{order.address?.city}</p>
                </TableCell>
                <TableCell className="font-bold">{formatINR(order.finalAmount || order.totalAmount)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {order.paymentMethod === "cod" ? <Banknote className="h-3.5 w-3.5 text-green-500" /> : <Smartphone className="h-3.5 w-3.5 text-blue-500" />}
                    <span className="text-xs">{order.paymentMethod === "cod" ? "COD" : "Online"}</span>
                    {order.paymentMethod === "cod" && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${order.advanceReceived ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {order.advanceReceived ? "Adv ✓" : "Adv ⏳"}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={order.orderStatus} options={STATUS_OPTIONS} /></TableCell>
                <TableCell><StatusBadge status={order.paymentStatus || "pending"} options={PAYMENT_STATUS_OPTIONS} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openOrder(order)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Order #{selected?.id?.slice(-8).toUpperCase()}
              <span className="text-xs font-normal text-slate-500">{selected?.createdAt && new Date(selected.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 py-2">
              {/* Customer + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Customer</p>
                  <p className="font-bold">{selected.address?.name || selected.userName}</p>
                  <p className="text-sm text-slate-500">{selected.address?.phone || selected.userPhone}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Delivery Address</p>
                  <p className="text-sm">{selected.address?.street}</p>
                  <p className="text-sm text-slate-500">{selected.address?.city}{selected.address?.state ? ", " + selected.address.state : ""} {selected.address?.pincode}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Order Items</p>
                <div className="bg-slate-50 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-200">
                      <th className="text-left p-3 font-semibold text-slate-600">Product</th>
                      <th className="text-right p-3 font-semibold text-slate-600">Price</th>
                      <th className="text-right p-3 font-semibold text-slate-600">Qty</th>
                      <th className="text-right p-3 font-semibold text-slate-600">Total</th>
                    </tr></thead>
                    <tbody>
                      {orderItems(selected).map((item: any, i: number) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right">{formatINR(item.price)}</td>
                          <td className="p-3 text-right">{item.qty}</td>
                          <td className="p-3 text-right font-semibold">{formatINR(item.price * item.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Price Breakdown</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{formatINR(selected.subtotal || selected.totalAmount)}</span></div>
                  {selected.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− {formatINR(selected.discountAmount)}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-600">GST ({Math.round((selected.gstRate || 0) * 100)}%)</span><span>{formatINR(selected.gstAmount || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Delivery</span><span>{selected.deliveryCharge === 0 ? "FREE" : formatINR(selected.deliveryCharge || 0)}</span></div>
                  {(selected.extraCharges || Number(editExtraCharge)) > 0 && (
                    <div className="flex justify-between text-orange-600"><span>{selected.extraChargesNote || editExtraNote || "Extra Charges"}</span><span>{formatINR(selected.extraCharges || Number(editExtraCharge))}</span></div>
                  )}
                  <div className="flex justify-between font-black text-base pt-2 border-t border-slate-200"><span>Total</span><span className="text-primary">{formatINR(selected.finalAmount)}</span></div>
                  {selected.paymentMethod === "cod" && (
                    <>
                      <div className="flex justify-between text-amber-700 font-semibold text-xs"><span>Advance (50%)</span><span>{formatINR(selected.advanceAmount || 0)}</span></div>
                      <div className="flex justify-between text-slate-500 text-xs"><span>On Delivery</span><span>{formatINR((selected.finalAmount || 0) - (selected.advanceAmount || 0))}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Management */}
              <div className="border rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Payment Management</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Order Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Payment Status</Label>
                    <Select value={editPayStatus} onValueChange={setEditPayStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selected.paymentMethod === "cod" && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <input
                      type="checkbox"
                      id="advance-received"
                      checked={editAdvanceReceived}
                      onChange={(e) => {
                        setEditAdvanceReceived(e.target.checked);
                        if (e.target.checked) setEditPayStatus("partial");
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="advance-received" className="cursor-pointer text-amber-800 font-semibold">
                      Advance Received — {formatINR(selected.advanceAmount || 0)}
                    </Label>
                    {editAdvanceReceived && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
                  </div>
                )}

                <div>
                  <Label className="text-xs">Paid Amount (manual update)</Label>
                  <Input placeholder={`e.g. ${selected.finalAmount}`} value={editPaidAmount} onChange={(e) => setEditPaidAmount(e.target.value)} className="mt-1" type="number" />
                </div>
              </div>

              {/* Extra Charges + Notes */}
              <div className="border rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Extra Charges & Notes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Extra Charge (₹)</Label>
                    <Input placeholder="0" value={editExtraCharge} onChange={(e) => setEditExtraCharge(e.target.value)} className="mt-1" type="number" />
                  </div>
                  <div>
                    <Label className="text-xs">Charge Description</Label>
                    <Input placeholder="e.g. Installation charges" value={editExtraNote} onChange={(e) => setEditExtraNote(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Internal Notes</Label>
                  <Textarea placeholder="Admin notes..." value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="mt-1" />
                </div>
              </div>

              {/* Refund History */}
              {selected.refundAmount && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-teal-800 uppercase mb-2">Refund Record</p>
                  <p className="text-sm font-bold text-teal-700">Amount: {formatINR(selected.refundAmount)}</p>
                  {selected.refundNote && <p className="text-xs text-slate-500 mt-1">{selected.refundNote}</p>}
                  {selected.refundDate && <p className="text-xs text-slate-400 mt-1">{new Date(selected.refundDate).toLocaleDateString("en-IN")}</p>}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => selected && printInvoice(selected)} className="gap-1">
              <Printer className="h-4 w-4" /> Print Invoice
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRefundDialog(true)}>
              <RefreshCw className="h-4 w-4" /> Refund
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={saveOrder} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onOpenChange={setRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-teal-600" /> Issue Refund</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p>Order: <strong>#{selected?.id?.slice(-8).toUpperCase()}</strong></p>
              <p>Customer: <strong>{selected?.address?.name}</strong></p>
              <p>Order Total: <strong>{formatINR(selected?.finalAmount)}</strong></p>
              {selected?.paidAmount > 0 && <p>Paid: <strong className="text-green-600">{formatINR(selected?.paidAmount)}</strong></p>}
            </div>
            <div>
              <Label>Refund Amount (₹) *</Label>
              <Input placeholder={`Max: ${selected?.finalAmount}`} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} type="number" className="mt-1" />
            </div>
            <div>
              <Label>Refund Note</Label>
              <Textarea placeholder="Reason for refund..." value={refundNote} onChange={(e) => setRefundNote(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ Refund manually process karein — UPI ya bank transfer se customer ko bhejein. Ye record sirf internal tracking ke liye hai.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(false)}>Cancel</Button>
            <Button onClick={handleRefund} disabled={refunding || !refundAmount} className="bg-teal-600 hover:bg-teal-500 text-white">
              {refunding ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing...</> : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
