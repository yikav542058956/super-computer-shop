import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Briefcase, Plus, Search, Trash2, Edit, X, CheckCircle2,
  Clock, PackageCheck, Truck, IndianRupee, Phone, User,
  Calendar, StickyNote, Printer, CreditCard, Image as ImageIcon,
  ChevronDown, ChevronUp, BadgeIndianRupee, History, FileText, Download,
  AlertTriangle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

const WORK_TYPES = [
  { value: "flex",          label: "Flex / Banner",            icon: "🖼️" },
  { value: "poster",        label: "Poster / Pamphlet",        icon: "📄" },
  { value: "visiting_card", label: "Visiting Card",            icon: "💳" },
  { value: "wedding_card",  label: "Wedding / Invitation Card",icon: "💌" },
  { value: "photo_frame",   label: "Photo Frame / Print",      icon: "🖼️" },
  { value: "id_card",       label: "ID Card",                  icon: "🪪" },
  { value: "sticker",       label: "Sticker / Label",          icon: "🔖" },
  { value: "custom",        label: "Custom / Other",           icon: "✨" },
];

const STATUSES = [
  { value: "pending",     label: "Pending",     color: "bg-yellow-100 text-yellow-700", icon: Clock },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700",     icon: Printer },
  { value: "ready",       label: "Ready",       color: "bg-purple-100 text-purple-700", icon: PackageCheck },
  { value: "delivered",   label: "Delivered",   color: "bg-green-100 text-green-700",   icon: Truck },
  { value: "cancelled",   label: "Cancelled",   color: "bg-red-100 text-red-600",       icon: X },
];

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Net Banking", "Cheque"];

type WorkStatus = "pending" | "in_progress" | "ready" | "delivered" | "cancelled";

interface PaymentEntry {
  amount: number;
  mode: string;
  note?: string;
  date: number;
}

interface OtherWorkOrder {
  id: string;
  orderNo: number;
  customerName: string;
  customerPhone: string;
  workType: string;
  size?: string;
  quantity?: number;
  description: string;
  totalAmount: number;
  payments: PaymentEntry[];
  deadline?: string;
  status: WorkStatus;
  extraNotes?: string;
  additional_details?: Record<string, string>;
  // Legacy field — kept for backward compat display only
  cardDetails?: Record<string, string>;
  createdAt: number;
}

// ─── Dynamic field definitions ────────────────────────────────────────────────

type FieldType = "text" | "textarea" | "select" | "date" | "number";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  colSpan?: "full";
}

const DYNAMIC_FIELDS: Record<string, FieldDef[]> = {
  flex: [
    { key: "bannerText",  label: "Banner Text",       type: "textarea", placeholder: "Full text to print on the banner…", colSpan: "full" },
    { key: "material",    label: "Material",           type: "select",   options: ["Flex", "Vinyl", "Cloth"] },
    { key: "eyelets",     label: "Eyelets Required?",  type: "select",   options: ["Yes", "No"] },
  ],
  poster: [
    { key: "paperType",      label: "Paper Type",                        type: "select", options: ["Glossy", "Matte"] },
    { key: "numCopies",      label: "Number of Copies",                  type: "text",   placeholder: "e.g. 500" },
    { key: "designProvided", label: "Design File Provided by Customer?", type: "select", options: ["Yes", "No"] },
  ],
  visiting_card: [
    { key: "companyName",    label: "Company Name",                                  type: "text",    placeholder: "e.g. ABC Enterprises" },
    { key: "designation",    label: "Designation",                                   type: "text",    placeholder: "e.g. Manager, Director" },
    { key: "detailsToPrint", label: "Details to Print (Name, Address, Phone, Email)",type: "textarea",placeholder: "Name: …\nAddress: …\nPhone: …\nEmail: …", colSpan: "full" },
    { key: "cardFinish",     label: "Card Finish",                                   type: "select",  options: ["Matte", "Glossy", "Textured"] },
  ],
  wedding_card: [
    { key: "groomName",   label: "Dulha (Groom) Name",            type: "text", placeholder: "e.g. Rahul Sharma" },
    { key: "brideName",   label: "Dulhan (Bride) Name",           type: "text", placeholder: "e.g. Priya Singh" },
    { key: "weddingDate", label: "Wedding Date (Shadi ki Tarikh)",type: "date" },
    { key: "numCards",    label: "Number of Cards",               type: "text", placeholder: "e.g. 200" },
    { key: "venue",       label: "Venue (Jagah)",                 type: "text", placeholder: "e.g. Ramleela Ground, Sector 12, Noida", colSpan: "full" },
    { key: "cardTheme",   label: "Card Design / Theme Reference", type: "textarea", placeholder: "Describe the theme, color scheme, or attach a reference note…", colSpan: "full" },
  ],
  photo_frame: [
    { key: "numPhotos",      label: "Number of Photos", type: "text",   placeholder: "e.g. 5" },
    { key: "frameSize",      label: "Frame Size",       type: "text",   placeholder: 'e.g. 8"×10", A4' },
    { key: "frameType",      label: "Frame Type",       type: "select", options: ["Wooden", "PVC", "Metal"] },
    { key: "photosProvided", label: "Photos Provided via", type: "select", options: ["Physical", "Digital", "WhatsApp"] },
  ],
  id_card: [
    { key: "nameToPrint",      label: "Name to Print",                 type: "text",   placeholder: "Full name to print on card" },
    { key: "designationClass", label: "Designation / Class-Roll No.",  type: "text",   placeholder: "e.g. Class 10-A, Roll No. 25  /  Manager" },
    { key: "photoProvided",    label: "Photo Provided?",               type: "select", options: ["Yes", "No"] },
    { key: "cardType",         label: "Card Type",                     type: "select", options: ["Student", "Employee", "Other"] },
  ],
  sticker: [
    { key: "shape",       label: "Shape",              type: "select", options: ["Round", "Square", "Custom Cut"] },
    { key: "material",    label: "Material",           type: "select", options: ["Paper", "Vinyl", "Transparent"] },
    { key: "numStickers", label: "Number of Stickers", type: "text",   placeholder: "e.g. 100" },
  ],
  custom: [
    { key: "customDescription", label: "Describe Your Order", type: "textarea", placeholder: "Describe your order in full detail — what you need, what to print, dimensions, colors, any special requirements…", colSpan: "full" },
  ],
};

// Section accent colours per type
const TYPE_ACCENT: Record<string, { bg: string; border: string; text: string; label: string }> = {
  flex:          { bg: "bg-orange-50",  border: "border-orange-100",  text: "text-orange-700",  label: "🖼️  Flex / Banner Details" },
  poster:        { bg: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-700",    label: "📄  Poster / Pamphlet Details" },
  visiting_card: { bg: "bg-teal-50",    border: "border-teal-100",    text: "text-teal-700",    label: "💳  Visiting Card Details" },
  wedding_card:  { bg: "bg-pink-50",    border: "border-pink-100",    text: "text-pink-700",    label: "💌  Wedding Card Details" },
  photo_frame:   { bg: "bg-purple-50",  border: "border-purple-100",  text: "text-purple-700",  label: "🖼️  Photo Frame / Print Details" },
  id_card:       { bg: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-700",  label: "🪪  ID Card Details" },
  sticker:       { bg: "bg-lime-50",    border: "border-lime-100",    text: "text-lime-700",    label: "🔖  Sticker / Label Details" },
  custom:        { bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-700",   label: "✨  Custom Order — Describe in Detail" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function amountPaid(order: OtherWorkOrder): number {
  return (order.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
}
function balanceDue(order: OtherWorkOrder): number {
  return Math.max(0, (order.totalAmount || 0) - amountPaid(order));
}
function paymentBadge(order: OtherWorkOrder): { label: string; cls: string } {
  const paid = amountPaid(order);
  if (paid <= 0) return { label: "Unpaid", cls: "bg-red-100 text-red-600" };
  if (paid >= (order.totalAmount || 0)) return { label: "Paid", cls: "bg-green-100 text-green-700" };
  return { label: `Partial (₹${paid})`, cls: "bg-amber-100 text-amber-700" };
}
const workLabel = (type: string) => WORK_TYPES.find(w => w.value === type)?.label || type;
const workIcon  = (type: string) => WORK_TYPES.find(w => w.value === type)?.icon || "📋";
const statusObj = (s: string) => STATUSES.find(st => st.value === s) || STATUSES[0];

/** Build additional_details from legacy cardDetails for old orders.
 *  Includes ALL previously-stored fields so no data is invisible on display/PDF. */
function migrateCardDetails(order: OtherWorkOrder): Record<string, string> {
  if (order.additional_details && Object.keys(order.additional_details).length > 0)
    return order.additional_details;
  if (order.cardDetails && order.workType === "wedding_card") {
    const c = order.cardDetails;
    const result: Record<string, string> = {};
    // Fields that map directly to new DYNAMIC_FIELDS keys
    if (c.groomName   || c.groomname)   result.groomName   = c.groomName   || c.groomname   || "";
    if (c.brideName   || c.bridename)   result.brideName   = c.brideName   || c.bridename   || "";
    if (c.weddingDate || c.weddingdate) result.weddingDate = c.weddingDate || c.weddingdate || "";
    if (c.venue)                        result.venue       = c.venue;
    if (c.functionType)                 result.cardTheme   = c.functionType;
    // Legacy-only fields (not in new form, but preserve for display/PDF on old orders)
    if (c.fatherNameGroom) result.fatherNameGroom = c.fatherNameGroom;
    if (c.fatherNameBride) result.fatherNameBride = c.fatherNameBride;
    if (c.motherNameGroom) result.motherNameGroom = c.motherNameGroom;
    if (c.motherNameBride) result.motherNameBride = c.motherNameBride;
    return result;
  }
  return {};
}

/** Friendly label for a field key — falls back to a humanised version of the key itself */
function fieldLabelFallback(key: string): string {
  const map: Record<string, string> = {
    fatherNameGroom: "Father of Groom",
    fatherNameBride: "Father of Bride",
    motherNameGroom: "Mother of Groom",
    motherNameBride: "Mother of Bride",
  };
  return map[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}

/** Get a display-friendly label for a dynamic field key */
function fieldLabel(workType: string, key: string): string {
  const fd = (DYNAMIC_FIELDS[workType] || []).find(f => f.key === key);
  return fd?.label || fieldLabelFallback(key);
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = () => ({
  customerName:  "",
  customerPhone: "",
  workType:      "flex",
  size:          "",
  quantity:      "",
  description:   "",
  totalAmount:   "",
  advanceAmount: "",
  advanceMode:   "Cash",
  advanceNote:   "",
  deadline:      "",
  status:        "pending" as WorkStatus,
  extraNotes:    "",
});

// ─── DynamicFieldsSection ─────────────────────────────────────────────────────

function DynamicFieldsSection({
  workType,
  values,
  onChange,
}: {
  workType: string;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const fields = DYNAMIC_FIELDS[workType] || [];
  if (fields.length === 0) return null;
  const accent = TYPE_ACCENT[workType] || TYPE_ACCENT.custom;

  return (
    <section className={`${accent.bg} ${accent.border} border rounded-xl p-4 space-y-3`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${accent.text}`}>{accent.label}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map((fd) => {
          const val = values[fd.key] ?? "";
          const cls = `${fd.colSpan === "full" ? "sm:col-span-2" : ""}`;

          if (fd.type === "textarea") {
            return (
              <div key={fd.key} className={cls}>
                <Label className="text-xs mb-1 block">{fd.label}</Label>
                <Textarea
                  rows={3}
                  placeholder={fd.placeholder}
                  value={val}
                  onChange={e => onChange(fd.key, e.target.value)}
                />
              </div>
            );
          }
          if (fd.type === "select") {
            return (
              <div key={fd.key} className={cls}>
                <Label className="text-xs mb-1 block">{fd.label}</Label>
                <select
                  value={val}
                  onChange={e => onChange(fd.key, e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                >
                  <option value="">— select —</option>
                  {(fd.options || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }
          if (fd.type === "date") {
            return (
              <div key={fd.key} className={cls}>
                <Label className="text-xs mb-1 block">{fd.label}</Label>
                <Input type="date" value={val} onChange={e => onChange(fd.key, e.target.value)} />
              </div>
            );
          }
          // text / number
          return (
            <div key={fd.key} className={cls}>
              <Label className="text-xs mb-1 block">{fd.label}</Label>
              <Input
                type={fd.type === "number" ? "number" : "text"}
                placeholder={fd.placeholder}
                value={val}
                onChange={e => onChange(fd.key, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOtherWork() {
  const [orders, setOrders] = useState<OtherWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OtherWorkOrder | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [additionalDetails, setAdditionalDetails] = useState<Record<string, string>>({});

  // Work-type change confirmation (edit mode)
  const [confirmWorkTypeOpen, setConfirmWorkTypeOpen] = useState(false);
  const pendingWorkType = useRef<string>("");

  // Payment dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<OtherWorkOrder | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [payNote, setPayNote] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load orders from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "other_work_orders"), snap => {
      setLoading(false);
      if (!snap.exists()) { setOrders([]); return; }
      const list = Object.entries(snap.val() as Record<string, any>)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list as OtherWorkOrder[]);
    });
    return () => unsub();
  }, []);

  const nextOrderNo = useMemo(() => {
    if (orders.length === 0) return 1;
    return Math.max(...orders.map(o => o.orderNo || 0)) + 1;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterType   !== "all" && o.workType !== filterType)  return false;
      if (q) {
        const s = `${o.customerName} ${o.customerPhone} ${o.description} ${workLabel(o.workType)}`.toLowerCase();
        if (!s.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, filterStatus, filterType]);

  const stats = useMemo(() => {
    const total     = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const collected = orders.reduce((s, o) => s + amountPaid(o), 0);
    const pending   = orders.filter(o => o.status === "pending").length;
    const inprog    = orders.filter(o => o.status === "in_progress").length;
    return { total, collected, pending, inprog };
  }, [orders]);

  // ── Open create dialog ──
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setAdditionalDetails({});
    setDialogOpen(true);
  };

  // ── Open edit dialog ──
  const openEdit = (order: OtherWorkOrder) => {
    setEditing(order);
    setForm({
      customerName:  order.customerName,
      customerPhone: order.customerPhone,
      workType:      order.workType,
      size:          order.size || "",
      quantity:      order.quantity != null ? String(order.quantity) : "",
      description:   order.description,
      totalAmount:   String(order.totalAmount || ""),
      advanceAmount: "",
      advanceMode:   "Cash",
      advanceNote:   "",
      deadline:      order.deadline || "",
      status:        order.status,
      extraNotes:    order.extraNotes || "",
    });
    setAdditionalDetails(migrateCardDetails(order));
    setDialogOpen(true);
  };

  const f = (key: keyof ReturnType<typeof emptyForm>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleAdditionalChange = (key: string, val: string) => {
    setAdditionalDetails(prev => ({ ...prev, [key]: val }));
  };

  // ── Work type change — confirm if editing & has data ──
  const handleWorkTypeChange = (newType: string) => {
    const hasData = Object.values(additionalDetails).some(v => v.trim() !== "");
    if (editing && hasData && newType !== form.workType) {
      pendingWorkType.current = newType;
      setConfirmWorkTypeOpen(true);
    } else {
      setForm(prev => ({ ...prev, workType: newType }));
      setAdditionalDetails({});
    }
  };

  const confirmWorkTypeSwitch = () => {
    setForm(prev => ({ ...prev, workType: pendingWorkType.current }));
    setAdditionalDetails({});
    setConfirmWorkTypeOpen(false);
  };

  // ── Save order ──
  const handleSave = async () => {
    if (!form.customerName.trim())              { toast.error("Customer name required"); return; }
    if (!form.totalAmount || Number(form.totalAmount) <= 0) { toast.error("Total amount required"); return; }
    if (!form.description.trim())              { toast.error("Work description required"); return; }

    const payments: PaymentEntry[] = editing ? (editing.payments || []) : [];
    if (!editing && Number(form.advanceAmount) > 0) {
      payments.push({
        amount: Number(form.advanceAmount),
        mode:   form.advanceMode,
        note:   form.advanceNote || "Advance payment",
        date:   Date.now(),
      });
    }

    // Only save non-empty additional_details values for the CURRENT work type
    const fields = DYNAMIC_FIELDS[form.workType] || [];
    const filteredDetails: Record<string, string> = {};
    for (const fd of fields) {
      const v = (additionalDetails[fd.key] || "").trim();
      if (v) filteredDetails[fd.key] = v;
    }

    const payload: Partial<OtherWorkOrder> = {
      customerName:       form.customerName.trim(),
      customerPhone:      form.customerPhone.trim(),
      workType:           form.workType,
      size:               form.size.trim() || undefined,
      quantity:           form.quantity ? Number(form.quantity) : undefined,
      description:        form.description.trim(),
      totalAmount:        Number(form.totalAmount),
      payments,
      deadline:           form.deadline || undefined,
      status:             form.status,
      extraNotes:         form.extraNotes.trim() || undefined,
      additional_details: Object.keys(filteredDetails).length > 0 ? filteredDetails : undefined,
      cardDetails:        undefined, // clear legacy field on edit
    };

    try {
      if (editing) {
        await update(ref(db, `other_work_orders/${editing.id}`), payload);
        toast.success("Order updated!");
      } else {
        await push(ref(db, "other_work_orders"), { ...payload, orderNo: nextOrderNo, createdAt: Date.now() });
        toast.success("Order created!");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    }
  };

  // ── Quick status change ──
  const setStatus = async (id: string, status: WorkStatus) => {
    await update(ref(db, `other_work_orders/${id}`), { status });
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order permanently?")) return;
    await remove(ref(db, `other_work_orders/${id}`));
    toast.success("Order deleted");
  };

  // ── Record payment ──
  const handleAddPayment = async () => {
    if (!payTarget) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { toast.error("Valid amount required"); return; }
    const existing: PaymentEntry[] = payTarget.payments || [];
    const totalPaid = existing.reduce((s, p) => s + p.amount, 0) + amt;
    if (totalPaid > payTarget.totalAmount) { toast.error("Amount exceeds balance due"); return; }
    const newPayments = [...existing, { amount: amt, mode: payMode, note: payNote || undefined, date: Date.now() }];
    await update(ref(db, `other_work_orders/${payTarget.id}`), { payments: newPayments });
    toast.success(`₹${amt} recorded`);
    setPayDialogOpen(false);
    setPayAmount(""); setPayMode("Cash"); setPayNote("");
  };

  // ── PDF receipt ──
  const printReceipt = (order: OtherWorkOrder) => {
    const doc = new jsPDF({ unit: "mm", format: "a5" });
    doc.setFontSize(16);
    doc.text("Super Computer — Other Work Receipt", 14, 14);
    doc.setFontSize(10);
    doc.text(`Order #${order.orderNo}  |  Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 14, 22);
    doc.line(14, 25, 194, 25);

    const rows: string[][] = [
      ["Customer",    order.customerName],
      ["Phone",       order.customerPhone || "—"],
      ["Work Type",   workLabel(order.workType)],
      ["Description", order.description],
    ];
    if (order.size)      rows.push(["Size",     order.size]);
    if (order.quantity)  rows.push(["Quantity", String(order.quantity)]);
    if (order.deadline)  rows.push(["Deadline", order.deadline]);
    if (order.extraNotes)rows.push(["Notes",    order.extraNotes]);

    // Dynamic additional_details
    const ad = migrateCardDetails(order);
    for (const [key, val] of Object.entries(ad)) {
      if (val) rows.push([fieldLabel(order.workType, key), val]);
    }

    autoTable(doc, {
      startY: 30, body: rows, styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 42 } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: finalY,
      head: [["", "Amount"]],
      body: [
        ["Total Amount", `₹${order.totalAmount}`],
        ["Paid",         `₹${amountPaid(order)}`],
        ["Balance Due",  `₹${balanceDue(order)}`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    if ((order.payments || []).length > 0) {
      const py = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.text("Payment History:", 14, py);
      autoTable(doc, {
        startY: py + 4,
        head: [["Date", "Amount", "Mode", "Note"]],
        body: (order.payments || []).map(p => [
          new Date(p.date).toLocaleDateString("en-IN"), `₹${p.amount}`, p.mode, p.note || "",
        ]),
        styles: { fontSize: 8 },
      });
    }

    doc.save(`order_${order.orderNo}_receipt.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-violet-600" />
            <h1 className="text-xl font-black text-slate-800">Other Work Orders</h1>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Orders",     value: orders.length,                                          color: "text-slate-700" },
            { label: "Pending",          value: stats.pending,                                          color: "text-yellow-600" },
            { label: "In Progress",      value: stats.inprog,                                           color: "text-blue-600" },
            { label: "Total Collected",  value: `₹${stats.collected.toLocaleString("en-IN")}`,         color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search name, phone, work…" className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm bg-white">
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm bg-white">
            <option value="all">All Types</option>
            {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
          {(search || filterStatus !== "all" || filterType !== "all") && (
            <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50">
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} orders</span>
        </div>

        {/* ── Orders List ── */}
        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Briefcase className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-medium">No orders yet</p>
            <p className="text-slate-300 text-sm mt-1">Click "New Order" to create your first other-work job</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const st = statusObj(order.status);
              const StIcon = st.icon;
              const pb = paymentBadge(order);
              const paid = amountPaid(order);
              const balance = balanceDue(order);
              const isExpanded = expandedId === order.id;
              const ad = migrateCardDetails(order);
              const adEntries = Object.entries(ad).filter(([, v]) => v.trim() !== "");

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* ── Card header ── */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-lg">{workIcon(order.workType)}</span>
                        <span className="font-black text-slate-800">#{order.orderNo}</span>
                        <span className="text-sm font-semibold text-slate-500">{workLabel(order.workType)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.color}`}>
                          <StIcon className="h-3 w-3 inline mr-0.5" />{st.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${pb.cls}`}>
                          {pb.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-semibold truncate">{order.description}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{order.customerName}</span>
                        {order.customerPhone && <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 hover:text-blue-600"><Phone className="h-3.5 w-3.5" />{order.customerPhone}</a>}
                        {order.deadline && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Due: {order.deadline}</span>}
                        <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />Total: ₹{order.totalAmount}</span>
                        <span className="text-green-600 font-semibold">Paid: ₹{paid}</span>
                        {balance > 0 && <span className="text-red-500 font-semibold">Balance: ₹{balance}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => { setPayTarget(order); setPayDialogOpen(true); }}
                        title="Record payment"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50">
                        <BadgeIndianRupee className="h-4 w-4" />
                      </button>
                      <button onClick={() => printReceipt(order)} title="Print receipt"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(order)} title="Edit"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(order.id)} title="Delete"
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Status quick-change ── */}
                  <div className="border-t border-slate-100 px-4 py-2 flex gap-1.5 flex-wrap">
                    {STATUSES.map(s => (
                      <button key={s.value}
                        onClick={() => setStatus(order.id, s.value as WorkStatus)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${order.status === s.value ? s.color + " ring-2 ring-offset-1 ring-blue-300" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Expanded details ── */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4 text-sm">

                      {/* Additional Details */}
                      {adEntries.length > 0 && (() => {
                        const accent = TYPE_ACCENT[order.workType] || TYPE_ACCENT.custom;
                        return (
                          <div className={`${accent.bg} ${accent.border} border rounded-xl p-3 space-y-1`}>
                            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${accent.text}`}>
                              {workIcon(order.workType)} Additional Details
                            </p>
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-700">
                              {adEntries.map(([key, val]) => (
                                <p key={key} className={val.length > 60 ? "sm:col-span-2" : ""}>
                                  <span className="font-semibold text-slate-500">{fieldLabel(order.workType, key)}: </span>
                                  {val}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Size / Qty / Notes */}
                      <div className="grid sm:grid-cols-3 gap-3 text-slate-600">
                        {order.size      && <p><span className="font-semibold text-slate-500">Size:</span> {order.size}</p>}
                        {order.quantity  && <p><span className="font-semibold text-slate-500">Quantity:</span> {order.quantity}</p>}
                        {order.extraNotes && (
                          <div className="sm:col-span-3 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                            <p className="text-xs font-bold text-yellow-700 mb-0.5"><StickyNote className="h-3.5 w-3.5 inline mr-1" />Notes</p>
                            <p>{order.extraNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Payment history */}
                      {(order.payments || []).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <History className="h-3.5 w-3.5" /> Payment History
                          </p>
                          <div className="space-y-1.5">
                            {(order.payments || []).map((p, i) => (
                              <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-slate-100 px-3 py-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="font-bold text-green-700">₹{p.amount}</span>
                                <span className="text-slate-400 text-xs">{p.mode}</span>
                                {p.note && <span className="text-slate-400 text-xs">— {p.note}</span>}
                                <span className="ml-auto text-slate-400 text-xs">{new Date(p.date).toLocaleDateString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────── Create / Edit Order Dialog ────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Order #${editing.orderNo}` : "New Other Work Order"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* ── Customer Info ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Customer Details</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Customer Name *</Label>
                  <Input placeholder="e.g. Ramesh Kumar" value={form.customerName} onChange={f("customerName")} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Phone Number</Label>
                  <Input type="tel" placeholder="10-digit mobile" value={form.customerPhone} onChange={f("customerPhone")} />
                </div>
              </div>
            </section>

            {/* ── Work Details ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Work Details</p>
              <div className="space-y-3">

                {/* Work Type — full width, triggers dynamic section below */}
                <div>
                  <Label className="text-xs mb-1 block">Work Type *</Label>
                  <select
                    value={form.workType}
                    onChange={e => handleWorkTypeChange(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                  >
                    {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.icon} {w.label}</option>)}
                  </select>
                </div>

                {/* ── Dynamic Additional Details — right below Work Type ── */}
                <DynamicFieldsSection
                  workType={form.workType}
                  values={additionalDetails}
                  onChange={handleAdditionalChange}
                />

                {/* Remaining common fields */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Status</Label>
                    <select value={form.status} onChange={f("status")}
                      className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Size / Dimensions</Label>
                    <Input placeholder='e.g. 4ft × 2ft, A4, 3.5" × 2"' value={form.size} onChange={f("size")} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Quantity</Label>
                    <Input type="number" min={1} placeholder="How many?" value={form.quantity} onChange={f("quantity")} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Delivery Deadline</Label>
                    <Input type="date" value={form.deadline} onChange={f("deadline")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">Work Description *</Label>
                    <Textarea
                      placeholder="Describe the work in detail — what to print, design instructions, color, etc."
                      value={form.description} onChange={f("description")} rows={2} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">Extra Notes</Label>
                    <Input placeholder="Any special instructions…" value={form.extraNotes} onChange={f("extraNotes")} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Payment ── */}
            <section>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Payment</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Total Amount (₹) *</Label>
                  <Input type="number" min={0} placeholder="Total price" value={form.totalAmount} onChange={f("totalAmount")} />
                </div>
                {!editing && (
                  <>
                    <div>
                      <Label className="text-xs mb-1 block">Advance Received (₹)</Label>
                      <Input type="number" min={0} placeholder="How much received now?" value={form.advanceAmount} onChange={f("advanceAmount")} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Payment Mode</Label>
                      <select value={form.advanceMode} onChange={f("advanceMode")}
                        className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Payment Note</Label>
                      <Input placeholder="e.g. Advance via UPI" value={form.advanceNote} onChange={f("advanceNote")} />
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
              {editing ? "Save Changes" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Work-type change confirmation (edit mode) ── */}
      <Dialog open={confirmWorkTypeOpen} onOpenChange={setConfirmWorkTypeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Change Work Type?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Changing work type will clear the type-specific details you entered. Continue?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmWorkTypeOpen(false)}>Keep Current</Button>
            <Button onClick={confirmWorkTypeSwitch} className="bg-amber-500 hover:bg-amber-600">Yes, Change Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────── Record Payment Dialog ─────────────────────── */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment — Order #{payTarget?.orderNo}</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">₹{payTarget.totalAmount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Paid so far</span><span className="font-bold text-green-600">₹{amountPaid(payTarget)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-600 font-semibold">Balance Due</span><span className="font-black text-red-600">₹{balanceDue(payTarget)}</span></div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Amount Received (₹) *</Label>
                <Input type="number" min={1} max={balanceDue(payTarget)} placeholder={`Max ₹${balanceDue(payTarget)}`}
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Payment Mode</Label>
                <select value={payMode} onChange={e => setPayMode(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Note (optional)</Label>
                <Input placeholder="e.g. Remaining payment on delivery" value={payNote} onChange={e => setPayNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} className="bg-green-600 hover:bg-green-700">Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
