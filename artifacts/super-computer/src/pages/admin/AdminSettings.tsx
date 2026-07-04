import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect, useRef } from "react";
import { ref, get, set, remove, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Settings, MessageCircle, Store, Phone, Mail, Percent, Truck, Save, CheckCircle,
  ShieldCheck, Trash2, UserPlus, MapPin, CreditCard, Eye, EyeOff, Smartphone,
  AlertTriangle, Info, Database, Download, Upload, RotateCcw, PackageX, Search,
  FileText, Building2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path fillRule="evenodd" clipRule="evenodd"
        d="M34.2 13.7C31.8 11.3 28.6 10 25.2 10C18.1 10 12.4 15.7 12.4 22.8C12.4 25.1 13 27.3 14.2 29.2L12 36L19.1 33.9C20.9 34.9 23 35.5 25.2 35.5C32.3 35.5 38 29.8 38 22.7C38 19.3 36.6 16.1 34.2 13.7ZM25.2 33.3C23.2 33.3 21.3 32.8 19.6 31.8L19.2 31.6L15.1 32.7L16.3 28.7L16 28.3C14.9 26.5 14.3 24.4 14.3 22.2C14.3 16.5 19 11.8 24.7 11.8C27.5 11.8 30.1 12.9 32 14.9C33.9 16.8 35 19.4 35 22.2C35.3 28.3 30.9 33.3 25.2 33.3ZM30.9 25.1C30.6 24.9 29.1 24.2 28.8 24.1C28.5 24 28.3 23.9 28.1 24.2C27.9 24.5 27.3 25.2 27.2 25.4C27 25.6 26.9 25.6 26.6 25.5C26.3 25.3 25.3 25 24.1 23.9C23.2 23.1 22.6 22.1 22.4 21.8C22.2 21.5 22.4 21.3 22.5 21.1C22.7 21 22.8 20.8 23 20.6C23.1 20.4 23.2 20.3 23.3 20.1C23.4 19.9 23.4 19.7 23.3 19.6C23.2 19.4 22.6 17.9 22.3 17.3C22 16.7 21.8 16.8 21.6 16.8H21C20.8 16.8 20.5 16.9 20.2 17.2C20 17.5 19.2 18.2 19.2 19.7C19.2 21.2 20.2 22.6 20.4 22.9C20.6 23.1 22.6 26.1 25.6 27.4C26.3 27.7 26.9 27.9 27.4 28C28.1 28.2 28.7 28.2 29.2 28.1C29.8 28 30.9 27.4 31.2 26.7C31.4 26 31.4 25.4 31.3 25.3C31.2 25.2 31.1 25.2 30.9 25.1Z"
        fill="white" />
    </svg>
  );
}

/* ── Data Management Section ────────────────────────────────── */
const DB_NODES = [
  { key: "products",        label: "Products",         icon: "📦", color: "blue" },
  { key: "categories",      label: "Categories",       icon: "🏷️",  color: "purple" },
  { key: "orders",          label: "Orders",           icon: "🧾", color: "orange" },
  { key: "users",           label: "Users",            icon: "👤", color: "green" },
  { key: "productReviews",  label: "Reviews",          icon: "⭐", color: "yellow" },
  { key: "banners",         label: "Banners",          icon: "🖼️",  color: "pink" },
  { key: "wishlist",        label: "Wishlists",        icon: "❤️",  color: "red" },
  { key: "carts",           label: "Carts",            icon: "🛒", color: "cyan" },
  { key: "settings",        label: "Settings",         icon: "⚙️",  color: "slate" },
  { key: "adminPhones",     label: "Admin Phones",     icon: "📱", color: "indigo" },
];

function DataManagement() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPartial, setConfirmPartial] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleNode = (key: string) =>
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  /* ── Export ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const snap = await get(ref(db, "/"));
      const data = snap.exists() ? snap.val() : {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `supercomputer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Database exported successfully!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  /* ── Import file select ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setImportData(parsed);
        toast.success("File loaded — click Import to restore");
      } catch {
        toast.error("Invalid JSON file");
        setImportData(null);
        setImportFileName("");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── Import ── */
  const handleImport = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      await set(ref(db, "/"), importData);
      toast.success("✅ Data restored successfully!");
      setImportData(null);
      setImportFileName("");
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  /* ── Selective delete ── */
  const handlePartialDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map(k => remove(ref(db, k))));
      toast.success(`✅ Deleted: ${[...selected].join(", ")}`);
      setSelected(new Set());
      setConfirmPartial(false);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Factory reset ── */
  const handleFactoryReset = async () => {
    setDeleting(true);
    try {
      await Promise.all(DB_NODES.map(n => remove(ref(db, n.key))));
      toast.success("✅ Factory reset complete — all data deleted");
      setConfirmReset(false);
      setSelected(new Set());
    } catch {
      toast.error("Factory reset failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Export ────────────────────────────────────── */}
      <Card className="border-2 border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Download className="h-5 w-5" /> Export Data
          </CardTitle>
          <CardDescription className="text-blue-700">
            Download a full backup of all Firebase data as a JSON file. Use this before any risky operation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            {exporting
              ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting...</>
              : <><Download className="h-4 w-4" /> Export All Data (JSON)</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* ── Import ────────────────────────────────────── */}
      <Card className="border-2 border-green-200 bg-green-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Upload className="h-5 w-5" /> Import / Restore
          </CardTitle>
          <CardDescription className="text-green-700">
            Restore a previously exported JSON backup. <strong>Warning:</strong> This will overwrite all existing data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 border-green-400 text-green-700 hover:bg-green-50"
            >
              <Upload className="h-4 w-4" /> Choose JSON File
            </Button>
            {importFileName && (
              <span className="text-sm text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
                📄 {importFileName}
              </span>
            )}
          </div>
          {importData && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-green-800">
                ✅ File ready — {Object.keys(importData).length} top-level nodes found:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(importData).map(k => (
                  <span key={k} className="text-xs bg-white border border-green-200 text-green-700 font-medium px-2 py-0.5 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
              <Button
                onClick={handleImport}
                disabled={importing}
                className="gap-2 bg-green-600 hover:bg-green-700 w-full"
              >
                {importing
                  ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Restoring...</>
                  : <><RotateCcw className="h-4 w-4" /> Import & Restore Data</>
                }
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Selective Delete ───────────────────────────── */}
      <Card className="border-2 border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <PackageX className="h-5 w-5" /> Selective Delete
          </CardTitle>
          <CardDescription className="text-orange-700">
            Choose specific data sections to delete. All other data remains untouched.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DB_NODES.map(node => (
              <button
                key={node.key}
                type="button"
                onClick={() => toggleNode(node.key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                  selected.has(node.key)
                    ? "border-orange-500 bg-orange-100 text-orange-900"
                    : "border-gray-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50"
                }`}
              >
                <span className="text-base">{node.icon}</span>
                <span>{node.label}</span>
                {selected.has(node.key) && (
                  <span className="ml-auto h-4 w-4 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Will delete: <strong>{[...selected].join(", ")}</strong></span>
            </div>
          )}

          {!confirmPartial ? (
            <Button
              variant="outline"
              disabled={selected.size === 0}
              onClick={() => setConfirmPartial(true)}
              className="gap-2 border-orange-400 text-orange-700 hover:bg-orange-50 w-full"
            >
              <Trash2 className="h-4 w-4" /> Delete Selected ({selected.size})
            </Button>
          ) : (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handlePartialDelete}
                  disabled={deleting}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 gap-2"
                >
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </Button>
                <Button variant="outline" onClick={() => setConfirmPartial(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Factory Reset ─────────────────────────────── */}
      <Card className="border-2 border-red-300 bg-red-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <RotateCcw className="h-5 w-5" /> Factory Data Reset
          </CardTitle>
          <CardDescription className="text-red-700">
            <strong>Danger Zone.</strong> Deletes ALL data — products, orders, users, settings, everything. Cannot be undone. Export a backup first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!confirmReset ? (
            <Button
              variant="outline"
              onClick={() => setConfirmReset(true)}
              className="gap-2 border-red-400 text-red-700 hover:bg-red-50 w-full"
            >
              <RotateCcw className="h-4 w-4" /> Factory Reset
            </Button>
          ) : (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 space-y-3">
              <p className="text-sm font-black text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> LAST WARNING — All data will be permanently deleted!
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleFactoryReset}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                >
                  {deleting
                    ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                    : "Yes, Delete Everything"
                  }
                </Button>
                <Button variant="outline" onClick={() => setConfirmReset(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

/* ── Admin Management Section ───────────────────────────────── */
function AdminManagement() {
  const [adminPhones, setAdminPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "adminPhones"), (snap) => {
      if (snap.exists()) setAdminPhones(Object.keys(snap.val()));
      else setAdminPhones([]);
    });
    return () => unsub();
  }, []);

  const addAdmin = async () => {
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Enter a valid 10-digit phone number"); return; }
    setAdding(true);
    try {
      await set(ref(db, `adminPhones/${digits}`), "true");
      setNewPhone("");
      toast.success(`+91 ${digits} is now an admin!`);
    } catch { toast.error("Failed to add admin"); }
    finally { setAdding(false); }
  };

  const removeAdmin = async (phone: string) => {
    try {
      await remove(ref(db, `adminPhones/${phone}`));
      toast.success(`${phone} removed from admin`);
    } catch { toast.error("Failed to remove admin"); }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <ShieldCheck className="h-5 w-5" /> Admin Management
        </CardTitle>
        <CardDescription className="text-blue-700">
          Phone numbers added here will receive admin access when logging in via OTP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="font-medium">Add Admin Phone Number</Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-white border rounded-lg text-slate-600 font-bold text-sm shrink-0">
                🇮🇳 +91
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => e.key === "Enter" && addAdmin()}
                className="font-mono tracking-widest text-lg bg-white"
              />
            </div>
          </div>
          <Button onClick={addAdmin} disabled={adding || newPhone.replace(/\D/g, "").length < 10}
            className="h-11 gap-2 bg-blue-600 hover:bg-blue-700 shrink-0">
            <UserPlus className="h-4 w-4" />
            {adding ? "Adding..." : "Add Admin"}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Current Admins ({adminPhones.length})</p>
          {adminPhones.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No admin phones configured.</p>
          ) : (
            <div className="space-y-2">
              {adminPhones.map((phone) => (
                <div key={phone} className="flex items-center justify-between bg-white rounded-xl border border-blue-100 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-slate-800">+91 {phone}</p>
                      <p className="text-xs text-blue-600 font-medium">Admin Access</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAdmin(phone)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Payment Settings Section ─────────────────────────────────── */
function PaymentSettings() {
  const [gatewayEnabled, setGatewayEnabled] = useState(true);
  const [cashfreeAppId, setCashfreeAppId] = useState("");
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState("");
  const [upiId, setUpiId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(ref(db, "settings/payment")).then((snap) => {
      if (snap.exists()) {
        const d = snap.val();
        setGatewayEnabled(d.gatewayEnabled !== false);
        setCashfreeAppId(d.cashfreeAppId || "");
        setCashfreeSecretKey(d.cashfreeSecretKey || "");
        setUpiId(d.upiId || "");
      }
      setLoading(false);
    });
  }, []);

  const savePayment = async () => {
    if (!upiId.trim()) { toast.error("UPI ID is required"); return; }
    setSaving(true);
    try {
      await set(ref(db, "settings/payment"), {
        gatewayEnabled,
        cashfreeAppId: cashfreeAppId.trim(),
        cashfreeSecretKey: cashfreeSecretKey.trim(),
        upiId: upiId.trim(),
        updatedAt: Date.now(),
      });
      // Also update old storeUpi path for backward compat
      await set(ref(db, "settings/storeUpi"), upiId.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Payment settings saved!");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Gateway Toggle Card */}
      <Card className={`border-2 ${gatewayEnabled ? "border-indigo-200 bg-indigo-50/30" : "border-amber-200 bg-amber-50/30"}`}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${gatewayEnabled ? "bg-indigo-100" : "bg-amber-100"}`}>
                <CreditCard className={`h-5 w-5 ${gatewayEnabled ? "text-indigo-600" : "text-amber-600"}`} />
              </div>
              <div>
                <p className="font-bold text-slate-800">Payment Gateway (Cashfree)</p>
                <p className="text-xs text-slate-500">
                  {gatewayEnabled
                    ? "✅ Gateway ON — customers can pay online via Cashfree"
                    : "⚠️ Gateway OFF — only manual UPI payment available"}
                </p>
              </div>
            </div>
            <Switch
              checked={gatewayEnabled}
              onCheckedChange={setGatewayEnabled}
              className={gatewayEnabled ? "data-[state=checked]:bg-indigo-600" : ""}
            />
          </div>
          {!gatewayEnabled && (
            <div className="mt-3 flex items-start gap-2 bg-amber-100/60 rounded-lg px-3 py-2.5 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">
                Gateway is off — customers will see the UPI ID below and pay manually, then share a screenshot.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cashfree Credentials */}
      {gatewayEnabled && (
        <Card className="border-2 border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
              <CreditCard className="h-4 w-4" /> Cashfree Credentials
            </CardTitle>
            <CardDescription className="text-slate-500 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Copy the Production App ID and Secret Key from your Cashfree dashboard.
              These values are stored securely in Firebase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold">Cashfree App ID</Label>
              <Input
                placeholder="CF_XXXXXXXXXXXXXXXX"
                value={cashfreeAppId}
                onChange={(e) => setCashfreeAppId(e.target.value)}
                className="font-mono bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Cashfree Secret Key</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="••••••••••••••••••••••••"
                  value={cashfreeSecretKey}
                  onChange={(e) => setCashfreeSecretKey(e.target.value)}
                  className="font-mono bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Never share your secret key. Only you can see this.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-xs text-indigo-700 space-y-1">
              <p className="font-semibold">📋 Where to find these?</p>
              <p>1. Log in to cashfree.com</p>
              <p>2. Go to Developers → API Keys</p>
              <p>3. Copy the Production keys (Test keys won't work at checkout)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* UPI ID */}
      <Card className="border-2 border-green-200 bg-green-50/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800 text-base">
            <Smartphone className="h-4 w-4" /> UPI ID (Manual Payment)
          </CardTitle>
          <CardDescription className="text-slate-500">
            {gatewayEnabled
              ? "This UPI ID is shown to customers for COD advance payments or as a backup option."
              : "Gateway is OFF — customers will only see this UPI ID and pay manually."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-semibold">UPI ID</Label>
            <Input
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="font-mono text-lg bg-white"
            />
          </div>
          {upiId && (
            <div className="bg-white border border-green-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Customers will see:</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-base">{upiId}</p>
                  <p className="text-xs text-green-600 font-medium">UPI Payment</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={savePayment}
        disabled={saving}
        className={`gap-2 w-full h-12 text-base font-bold ${gatewayEnabled ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-600 hover:bg-amber-700"}`}
      >
        {saved
          ? <><CheckCircle className="h-5 w-5" />Payment Settings Saved!</>
          : saving
            ? "Saving..."
            : <><Save className="h-5 w-5" />Save Payment Settings</>
        }
      </Button>
    </div>
  );
}

/* ── Bill Template Settings ─────────────────────────────────── */
const DEFAULT_STORE_INFO = {
  storeName: "Super Computer",
  tagline: "Laptop & Computer Store | Authorized Reseller",
  phone: "9761809960",
  altPhone: "",
  email: "info@supercomputer.in",
  address: "Mirehachi, Kasganj Road, Distt. Etah, UP - 207001",
  gstin: "",
  billFooter: "Warranty claims — please keep this bill. No returns after 7 days.",
};

function BillTemplateSettings() {
  const [info, setInfo] = useState({ ...DEFAULT_STORE_INFO });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(ref(db, "settings/storeInfo"))
      .then((snap) => { if (snap.exists()) setInfo(i => ({ ...i, ...snap.val() })); })
      .catch(() => toast.error("Could not load bill template settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!info.storeName.trim()) { toast.error("Store name is required"); return; }
    if (!info.phone.trim()) { toast.error("Phone number is required"); return; }
    setSaving(true);
    try {
      await set(ref(db, "settings/storeInfo"), info);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("✅ Bill template settings saved!");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-primary" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Preview Card */}
      <div className="rounded-2xl overflow-hidden border-2 border-purple-200 shadow-lg">
        <div className="px-5 py-4 text-white" style={{ background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)" }}>
          <p className="text-xl font-black tracking-tight">⚡ {info.storeName || "Store Name"}</p>
          <p className="text-purple-200 text-xs mt-0.5">{info.tagline || "Your tagline here"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-purple-100">
            {info.phone && <span>📞 {info.phone}</span>}
            {info.altPhone && <span>📞 {info.altPhone}</span>}
            {info.email && <span>✉ {info.email}</span>}
          </div>
          {info.address && <p className="text-xs text-purple-200 mt-1">📍 {info.address}</p>}
          {info.gstin && <p className="text-xs text-purple-300 mt-1 font-mono">GSTIN: {info.gstin}</p>}
        </div>
        <div className="bg-purple-50 px-5 py-2 text-center text-xs text-purple-600 font-semibold">
          Bill / Invoice Preview — Yahi dikhega customer ke bill par
        </div>
      </div>

      {/* Form */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Building2 className="h-5 w-5" /> Store / Dukaan Ki Jankari
          </CardTitle>
          <CardDescription className="text-slate-500">
            Yeh sab details bill aur invoice par print hogi. Sahi se bharo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-semibold">Dukaan / Store Ka Naam *</Label>
              <Input
                value={info.storeName}
                onChange={e => setInfo(i => ({ ...i, storeName: e.target.value }))}
                placeholder="e.g. Super Computer"
                className="text-base font-bold bg-white"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-semibold">Tagline (optional)</Label>
              <Input
                value={info.tagline}
                onChange={e => setInfo(i => ({ ...i, tagline: e.target.value }))}
                placeholder="e.g. Laptop & Computer Store | Authorized Reseller"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone Number *
              </Label>
              <Input
                value={info.phone}
                onChange={e => setInfo(i => ({ ...i, phone: e.target.value }))}
                placeholder="9761809960"
                inputMode="tel"
                className="bg-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Alt Phone (optional)
              </Label>
              <Input
                value={info.altPhone}
                onChange={e => setInfo(i => ({ ...i, altPhone: e.target.value }))}
                placeholder="Second number (optional)"
                inputMode="tel"
                className="bg-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                value={info.email}
                onChange={e => setInfo(i => ({ ...i, email: e.target.value }))}
                placeholder="info@supercomputer.in"
                type="email"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">GSTIN (optional)</Label>
              <Input
                value={info.gstin}
                onChange={e => setInfo(i => ({ ...i, gstin: e.target.value.toUpperCase() }))}
                placeholder="e.g. 09XXXXX1234X1ZX"
                className="bg-white font-mono tracking-widest"
                maxLength={15}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Address (bill par aayega)
              </Label>
              <Textarea
                value={info.address}
                onChange={e => setInfo(i => ({ ...i, address: e.target.value }))}
                placeholder="Mirehachi, Kasganj Road, Distt. Etah, UP - 207001"
                rows={2}
                className="bg-white resize-none"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-semibold">Bill Footer Message</Label>
              <Textarea
                value={info.billFooter}
                onChange={e => setInfo(i => ({ ...i, billFooter: e.target.value }))}
                placeholder="e.g. Warranty claims — please keep this bill. No returns after 7 days."
                rows={2}
                className="bg-white resize-none"
              />
              <p className="text-[11px] text-slate-400">Bill ke sabse neeche print hoga</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2 w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700">
            {saved
              ? <><CheckCircle className="h-5 w-5" /> Settings Saved!</>
              : saving
                ? "Saving..."
                : <><Save className="h-5 w-5" /> Save Bill Template Settings</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Settings Page ─────────────────────────────────────── */
export default function AdminSettings() {
  const [general, setGeneral] = useState({
    storeName: "Super Computers",
    contactEmail: "supercomputer@gmail.com",
    contactPhone: "9761809960",
    address: "Kasganj Road, Mirehachi, Distt. Etah",
  });
  const [business, setBusiness] = useState({
    taxPercent: "18",
    freeDeliveryAbove: "50000",
  });
  const [whatsapp, setWhatsapp] = useState({ number: "" });
  const [calling, setCalling] = useState({ number: "" });
  const [delivery, setDelivery] = useState({
    localDistricts: "Kasganj, Etah, Kannauj, Aliganj, Soron, Patiyali, Ganj Dundwara",
    localCharge: "0",
    otherCharge: "499",
  });
  const [seo, setSeo] = useState({
    metaTitle: "Super1Computer – Laptop, Desktop & Computer Shop in Kasganj | Best Price",
    metaDescription: "Super1Computer – Kasganj ka No.1 computer store. Buy laptops, desktops, accessories at best prices. HP, Dell, Lenovo, Asus available. Home delivery + easy EMI. Call: 9761809960",
    metaKeywords: "laptop shop kasganj, computer store kasganj, buy laptop kasganj, hp laptop kasganj, lenovo laptop kasganj, super1computer, super1computer.shop",
    canonicalUrl: "https://super1computer.shop/",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await get(ref(db, "settings"));
      if (snap.exists()) {
        const d = snap.val();
        if (d.general) setGeneral(g => ({ ...g, ...d.general }));
        if (d.business) setBusiness(b => ({ ...b, taxPercent: String(d.business.taxPercent || 18), freeDeliveryAbove: String(d.business.freeDeliveryAbove || 50000) }));
        if (d.whatsappNumber) setWhatsapp({ number: d.whatsappNumber });
        if (d.callingNumber) setCalling({ number: d.callingNumber });
        if (d.deliveryZones) setDelivery({
          localDistricts: d.deliveryZones.localDistricts || delivery.localDistricts,
          localCharge: String(d.deliveryZones.localCharge ?? 0),
          otherCharge: String(d.deliveryZones.otherCharge ?? 499),
        });
        if (d.seo) setSeo(s => ({ ...s, ...d.seo }));
      }
    };
    load();
  }, []);

  const flash = (key: string) => { setSaved(key); setTimeout(() => setSaved(null), 2500); };

  const saveGeneral = async () => {
    setSaving("general");
    await set(ref(db, "settings/general"), general);
    setSaving(null); flash("general");
    toast.success("General settings saved!");
  };

  const saveBusiness = async () => {
    setSaving("business");
    await set(ref(db, "settings/business"), {
      taxPercent: Number(business.taxPercent),
      freeDeliveryAbove: Number(business.freeDeliveryAbove),
    });
    setSaving(null); flash("business");
    toast.success("Business settings saved!");
  };

  const saveDelivery = async () => {
    setSaving("delivery");
    await set(ref(db, "settings/deliveryZones"), {
      localDistricts: delivery.localDistricts,
      localCharge: Number(delivery.localCharge),
      otherCharge: Number(delivery.otherCharge),
    });
    setSaving(null); flash("delivery");
    toast.success("Delivery zones saved!");
  };

  const saveWhatsapp = async () => {
    const digits = whatsapp.number.replace(/\D/g, "");
    if (digits.length !== 10) { toast.error("Enter a valid 10-digit WhatsApp number"); return; }
    setSaving("whatsapp");
    await set(ref(db, "settings/whatsappNumber"), digits);
    setSaving(null); flash("whatsapp");
    toast.success("WhatsApp number saved!");
  };

  const saveCalling = async () => {
    const digits = calling.number.replace(/\D/g, "");
    if (digits.length !== 10) { toast.error("Enter a valid 10-digit calling number"); return; }
    setSaving("calling");
    await set(ref(db, "settings/callingNumber"), digits);
    setSaving(null); flash("calling");
    toast.success("Calling number saved!");
  };

  const saveSeo = async () => {
    setSaving("seo");
    await set(ref(db, "settings/seo"), seo);
    setSaving(null); flash("seo");
    toast.success("SEO settings saved! Changes apply live on the site.");
  };

  // Due Alert Days
  const [dueAlertDays, setDueAlertDays] = useState("3");
  useEffect(() => {
    get(ref(db, "settings/dueAlertDays")).then(snap => { if (snap.exists()) setDueAlertDays(String(snap.val())); });
  }, []);
  const saveDueAlertDays = async () => {
    const v = parseInt(dueAlertDays);
    if (isNaN(v) || v < 0) { toast.error("Enter a valid number (0 or more days)"); return; }
    setSaving("dueAlertDays");
    await set(ref(db, "settings/dueAlertDays"), v);
    setSaving(null); flash("dueAlertDays");
    toast.success("Due alert days saved!");
  };

  const previewUrl = whatsapp.number.replace(/\D/g, "").length === 10
    ? `https://wa.me/91${whatsapp.number.replace(/\D/g, "")}?text=${encodeURIComponent("Hi! I need help from SuperComputer.")}`
    : null;

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-500 text-sm">Manage store configuration and integrations</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto bg-slate-100 gap-0.5 p-1">
          <TabsTrigger value="general" className="gap-1 text-xs font-semibold py-2">
            <Store className="h-3.5 w-3.5 hidden sm:block" /> General
          </TabsTrigger>
          <TabsTrigger value="bill" className="gap-1 text-xs font-semibold py-2">
            <FileText className="h-3.5 w-3.5 hidden sm:block" /> Bill
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-1 text-xs font-semibold py-2">
            <Truck className="h-3.5 w-3.5 hidden sm:block" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-1 text-xs font-semibold py-2">
            <ShieldCheck className="h-3.5 w-3.5 hidden sm:block" /> Admin
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1 text-xs font-semibold py-2">
            <Search className="h-3.5 w-3.5 hidden sm:block" /> SEO
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1 text-xs font-semibold py-2">
            <Database className="h-3.5 w-3.5 hidden sm:block" /> Data
          </TabsTrigger>
        </TabsList>

        {/* ── Bill Template Tab ── */}
        <TabsContent value="bill">
          <BillTemplateSettings />
        </TabsContent>

        {/* ── General Tab ── */}
        <TabsContent value="general" className="space-y-5">
          {/* WhatsApp */}
          <Card className="border-2 border-green-200 bg-green-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <WhatsAppIcon size={22} />WhatsApp Business Integration
              </CardTitle>
              <CardDescription className="text-green-700">
                Save your number — a floating button and "Ask on WhatsApp" button will appear on all products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="font-medium">WhatsApp Number (10 digits)</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-white border rounded-lg text-slate-600 font-bold text-sm shrink-0">
                      🇮🇳 +91
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9761809960"
                      value={whatsapp.number}
                      onChange={(e) => setWhatsapp({ number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="font-mono tracking-widest bg-white text-lg"
                    />
                  </div>
                </div>
                <Button onClick={saveWhatsapp} disabled={saving === "whatsapp"}
                  className="h-11 gap-2 bg-green-600 hover:bg-green-700 shrink-0">
                  {saved === "whatsapp"
                    ? <><CheckCircle className="h-4 w-4" />Saved!</>
                    : saving === "whatsapp" ? "Saving..."
                    : <><Save className="h-4 w-4" />Save</>
                  }
                </Button>
              </div>
              {previewUrl && (
                <div className="bg-white rounded-xl border border-green-200 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">✅ WhatsApp button is active</p>
                    <p className="text-xs text-slate-500">Customers can chat from any page or product.</p>
                  </div>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="border-green-400 text-green-700 hover:bg-green-50 gap-2 shrink-0">
                      <WhatsAppIcon size={16} />Test
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Due Alert Days */}
          <Card className="border-2 border-red-200 bg-red-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" /> Due Alert Window
              </CardTitle>
              <CardDescription className="text-red-700">
                Dashboard will alert you when a customer's due date is within this many days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="font-medium">Alert Days Before Due Date</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      max="90"
                      placeholder="e.g. 3"
                      value={dueAlertDays}
                      onChange={e => setDueAlertDays(e.target.value)}
                      className="bg-white w-28 font-mono text-lg"
                    />
                    <span className="text-slate-500 text-sm">days</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Set to <strong>0</strong> to only show overdue customers. Set to <strong>7</strong> to alert 1 week before.
                  </p>
                </div>
                <Button onClick={saveDueAlertDays} disabled={saving === "dueAlertDays"}
                  className="h-11 gap-2 bg-red-600 hover:bg-red-700 shrink-0">
                  {saved === "dueAlertDays"
                    ? <><CheckCircle className="h-4 w-4" />Saved!</>
                    : saving === "dueAlertDays" ? "Saving..."
                    : <><Save className="h-4 w-4" />Save</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calling Number */}
          <Card className="border-2 border-blue-200 bg-blue-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Phone className="h-5 w-5" /> Calling Number
              </CardTitle>
              <CardDescription className="text-blue-700">
                Save your support phone number — a "Call for More Info" button will appear on every product page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="font-medium">Phone Number (10 digits)</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-white border rounded-lg text-slate-600 font-bold text-sm shrink-0">
                      🇮🇳 +91
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9761809960"
                      value={calling.number}
                      onChange={(e) => setCalling({ number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="font-mono tracking-widest bg-white text-lg"
                    />
                  </div>
                </div>
                <Button onClick={saveCalling} disabled={saving === "calling"}
                  className="h-11 gap-2 bg-blue-600 hover:bg-blue-700 shrink-0">
                  {saved === "calling"
                    ? <><CheckCircle className="h-4 w-4" />Saved!</>
                    : saving === "calling" ? "Saving..."
                    : <><Save className="h-4 w-4" />Save</>
                  }
                </Button>
              </div>
              {calling.number.length === 10 && (
                <div className="bg-white rounded-xl border border-blue-200 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">✅ Call button is active</p>
                    <p className="text-xs text-slate-500">+91 {calling.number} — opens dialer on mobile, copies on desktop.</p>
                  </div>
                  <a href={`tel:+91${calling.number}`}>
                    <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-50 gap-2 shrink-0">
                      <Phone className="h-4 w-4" />Test
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General + Business */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Store className="h-5 w-5 text-primary" />General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Store Name</Label>
                  <Input value={general.storeName} onChange={(e) => setGeneral(g => ({ ...g, storeName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Contact Email</Label>
                  <Input type="email" value={general.contactEmail} onChange={(e) => setGeneral(g => ({ ...g, contactEmail: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Contact Phone</Label>
                  <Input value={general.contactPhone} onChange={(e) => setGeneral(g => ({ ...g, contactPhone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Store Address</Label>
                  <Input value={general.address} onChange={(e) => setGeneral(g => ({ ...g, address: e.target.value }))} />
                </div>
                <Button onClick={saveGeneral} disabled={saving === "general"} className="gap-2 w-full">
                  {saved === "general" ? <><CheckCircle className="h-4 w-4" />Saved!</> : saving === "general" ? "Saving..." : <><Save className="h-4 w-4" />Save General</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-5 w-5 text-primary" />Business Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input defaultValue="INR (₹)" disabled className="bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" />Tax Percentage (%)</Label>
                  <Input type="number" value={business.taxPercent} onChange={(e) => setBusiness(b => ({ ...b, taxPercent: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" />Free Delivery Above (₹)</Label>
                  <Input type="number" value={business.freeDeliveryAbove} onChange={(e) => setBusiness(b => ({ ...b, freeDeliveryAbove: e.target.value }))} />
                </div>
                <Button onClick={saveBusiness} disabled={saving === "business"} className="gap-2 w-full">
                  {saved === "business" ? <><CheckCircle className="h-4 w-4" />Saved!</> : saving === "business" ? "Saving..." : <><Save className="h-4 w-4" />Save Business</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Delivery Tab ── */}
        <TabsContent value="delivery">
          <Card className="border-2 border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <MapPin className="h-5 w-5" /> Delivery Zones (District-wise)
              </CardTitle>
              <CardDescription className="text-orange-700">
                Local districts get free or reduced delivery; all other areas pay the standard charge. Calculated automatically at checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-orange-600" /> Local Districts
                  </Label>
                  <Textarea
                    value={delivery.localDistricts}
                    onChange={e => setDelivery(d => ({ ...d, localDistricts: e.target.value }))}
                    placeholder="Kasganj, Etah, Soron, Patiyali..."
                    className="bg-white min-h-[80px] resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">Separate with commas — local rate applies when the customer's city matches</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-green-600" /> Local Delivery Charge (₹)
                  </Label>
                  <Input type="number" min="0" value={delivery.localCharge}
                    onChange={e => setDelivery(d => ({ ...d, localCharge: e.target.value }))}
                    className="bg-white" placeholder="0" />
                  <p className="text-xs text-slate-500">0 = completely free delivery</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-orange-600" /> Other Districts Charge (₹)
                  </Label>
                  <Input type="number" min="0" value={delivery.otherCharge}
                    onChange={e => setDelivery(d => ({ ...d, otherCharge: e.target.value }))}
                    className="bg-white" placeholder="499" />
                  <p className="text-xs text-slate-500">Charge for other districts / states</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-green-700">₹{delivery.localCharge || 0}</p>
                  <p className="text-xs text-green-700 font-semibold mt-0.5">Local Districts</p>
                  <p className="text-[10px] text-slate-500">{delivery.localDistricts.split(",").slice(0, 3).map(s => s.trim()).join(", ")}{delivery.localDistricts.split(",").length > 3 ? "..." : ""}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-orange-700">₹{delivery.otherCharge || 499}</p>
                  <p className="text-xs text-orange-700 font-semibold mt-0.5">Other Districts</p>
                  <p className="text-[10px] text-slate-500">UP, Delhi, Rajasthan, etc.</p>
                </div>
              </div>
              <Button onClick={saveDelivery} disabled={saving === "delivery"} className="gap-2 w-full bg-orange-600 hover:bg-orange-700">
                {saved === "delivery" ? <><CheckCircle className="h-4 w-4" />Saved!</> : saving === "delivery" ? "Saving..." : <><Save className="h-4 w-4" />Save Delivery Zones</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Admin Tab ── */}
        <TabsContent value="admin">
          <AdminManagement />
        </TabsContent>

        {/* ── SEO Tab ── */}
        <TabsContent value="seo" className="space-y-5">
          <Card className="border-2 border-violet-200 bg-violet-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-violet-800">
                <Search className="h-5 w-5" /> SEO & Search Engine Settings
              </CardTitle>
              <CardDescription className="text-violet-700">
                Ye settings Google mein aapki website ka naam, description aur keywords control karti hai. Save karte hi live ho jaati hai.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <Label className="font-semibold">Page Title (Browser Tab + Google Result)</Label>
                <Input
                  value={seo.metaTitle}
                  onChange={e => setSeo(s => ({ ...s, metaTitle: e.target.value }))}
                  placeholder="Super1Computer – Best Laptop Shop in Kasganj"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Ideal: 50–60 characters</span>
                  <span className={seo.metaTitle.length > 60 ? "text-red-500 font-bold" : "text-green-600 font-semibold"}>
                    {seo.metaTitle.length} chars
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Meta Description (Google search snippet)</Label>
                <Textarea
                  value={seo.metaDescription}
                  onChange={e => setSeo(s => ({ ...s, metaDescription: e.target.value }))}
                  placeholder="Kasganj ka No.1 computer store. Buy laptops, desktops at best prices..."
                  rows={3}
                  className="resize-none bg-white"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Ideal: 140–160 characters</span>
                  <span className={seo.metaDescription.length > 160 ? "text-red-500 font-bold" : "text-green-600 font-semibold"}>
                    {seo.metaDescription.length} chars
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Keywords (comma separated)</Label>
                <Textarea
                  value={seo.metaKeywords}
                  onChange={e => setSeo(s => ({ ...s, metaKeywords: e.target.value }))}
                  placeholder="laptop shop kasganj, computer store kasganj, hp laptop kasganj..."
                  rows={2}
                  className="resize-none bg-white"
                />
                <p className="text-xs text-slate-400">Local keywords sabse zyada helpful hain — city name zaroor include karo</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Canonical URL (your main domain)</Label>
                <Input
                  value={seo.canonicalUrl}
                  onChange={e => setSeo(s => ({ ...s, canonicalUrl: e.target.value }))}
                  placeholder="https://super1computer.shop/"
                />
                <p className="text-xs text-slate-400">Jab domain laga lo tab yahan <strong>https://super1computer.shop/</strong> daalo</p>
              </div>

              {/* Google Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">📌 Google Search Preview</p>
                <p className="text-xs text-slate-400 truncate">{seo.canonicalUrl}</p>
                <p className="text-blue-700 font-semibold text-sm leading-snug truncate">{seo.metaTitle || "Page Title"}</p>
                <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{seo.metaDescription || "Meta description will appear here..."}</p>
              </div>

              <Button onClick={saveSeo} disabled={saving === "seo"} className="gap-2 w-full bg-violet-600 hover:bg-violet-700">
                {saved === "seo" ? <><CheckCircle className="h-4 w-4" /> Saved!</> : saving === "seo" ? "Saving..." : <><Save className="h-4 w-4" /> Save SEO Settings</>}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" /> Google Ranking Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Google My Business par apni dukaan register karo — sabse important hai</li>
                <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Domain <strong>super1computer.shop</strong> ko Vercel mein add karo — aaj hi</li>
                <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Har product ka naam aur description detail mein likho</li>
                <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Customer reviews maango — Google reviews ranking mein bahut help karte hain</li>
                <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Sitemap already ready hai: <strong>super1computer.shop/sitemap.xml</strong></li>
                <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Google Search Console mein site submit karo — <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-blue-600 underline">search.google.com/search-console</a></li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Data Tab ── */}
        <TabsContent value="data">
          <DataManagement />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
