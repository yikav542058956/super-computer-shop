import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { ref, get, set, remove, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, MessageCircle, Store, Phone, Mail, Percent, Truck, Save, CheckCircle, ShieldCheck, Trash2, UserPlus } from "lucide-react";

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

/* ── Admin Management Section ───────────────────────────────── */
function AdminManagement() {
  const [adminPhones, setAdminPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "adminPhones"), (snap) => {
      if (snap.exists()) {
        setAdminPhones(Object.keys(snap.val()));
      } else {
        setAdminPhones([]);
      }
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
    } catch {
      toast.error("Failed to add admin");
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (phone: string) => {
    try {
      await remove(ref(db, `adminPhones/${phone}`));
      toast.success(`${phone} removed from admins`);
    } catch {
      toast.error("Failed to remove admin");
    }
  };

  return (
    <Card className="lg:col-span-2 border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <ShieldCheck className="h-5 w-5" /> Admin Management
        </CardTitle>
        <CardDescription className="text-blue-700">
          Phone numbers listed here get full admin access when they log in via OTP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new admin */}
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

        {/* Current admins list */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Current Admins ({adminPhones.length})</p>
          {adminPhones.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No admin phones set yet.</p>
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
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => removeAdmin(phone)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
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
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await get(ref(db, "settings"));
      if (snap.exists()) {
        const d = snap.val();
        if (d.general) setGeneral(g => ({ ...g, ...d.general }));
        if (d.business) setBusiness(b => ({ ...b, ...b, taxPercent: String(d.business.taxPercent || 18), freeDeliveryAbove: String(d.business.freeDeliveryAbove || 50000) }));
        if (d.whatsappNumber) setWhatsapp({ number: d.whatsappNumber });
      }
    };
    load();
  }, []);

  const flash = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2500);
  };

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

  const saveWhatsapp = async () => {
    const digits = whatsapp.number.replace(/\D/g, "");
    if (digits.length !== 10) { toast.error("Enter a valid 10-digit WhatsApp number"); return; }
    setSaving("whatsapp");
    await set(ref(db, "settings/whatsappNumber"), digits);
    setSaving(null); flash("whatsapp");
    toast.success("WhatsApp number saved! Floating button is now live.");
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp — shown first & prominently */}
        <Card className="lg:col-span-2 border-2 border-green-200 bg-green-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <WhatsAppIcon size={22} />WhatsApp Business Integration
            </CardTitle>
            <CardDescription className="text-green-700">
              Add your WhatsApp number. A floating button appears on the site, and each product page gets an "Ask on WhatsApp" button that sends the product name automatically.
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
              <Button
                onClick={saveWhatsapp}
                disabled={saving === "whatsapp"}
                className="h-11 gap-2 bg-green-600 hover:bg-green-700 shrink-0"
              >
                {saved === "whatsapp" ? (
                  <><CheckCircle className="h-4 w-4" />Saved!</>
                ) : saving === "whatsapp" ? (
                  "Saving..."
                ) : (
                  <><Save className="h-4 w-4" />Save Number</>
                )}
              </Button>
            </div>

            {previewUrl && (
              <div className="bg-white rounded-xl border border-green-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">✅ WhatsApp button is active</p>
                  <p className="text-xs text-slate-500">Customers can now chat on WhatsApp from every page & product.</p>
                </div>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="border-green-400 text-green-700 hover:bg-green-50 gap-2 shrink-0">
                    <WhatsAppIcon size={16} />Test Chat
                  </Button>
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { icon: "📱", title: "Floating Button", desc: "Appears on every page, bottom-right corner" },
                { icon: "🛍️", title: "Product Inquiry", desc: "Product name auto-filled in the message" },
                { icon: "⚡", title: "Instant Connect", desc: "Opens WhatsApp with pre-written message" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white rounded-lg border border-green-100 p-3 text-center">
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="font-semibold text-sm text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* General */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" />General Settings</CardTitle>
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

        {/* Business */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />Business Settings</CardTitle>
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

        {/* Admin Management */}
        <AdminManagement />
      </div>
    </AdminLayout>
  );
}
