import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CreditCard, Eye, EyeOff, Smartphone, AlertTriangle, Info, Save, CheckCircle,
} from "lucide-react";

export default function AdminPayment() {
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
      await set(ref(db, "settings/storeUpi"), upiId.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Payment settings saved!");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Payment Settings</h1>
          <p className="text-slate-500 text-sm">Manage payment gateway and UPI configuration</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-indigo-500" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-5">

          {/* Gateway Toggle */}
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
                    Gateway is off — customers will see the UPI ID below and pay manually, then share a payment screenshot.
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
                : <><Save className="h-5 w-5" />Save Payment Settings</>}
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
