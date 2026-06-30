import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, Plus, Pencil, Trash2, Bell, AlertTriangle,
  Info, CheckCircle, Star, Zap,
} from "lucide-react";
import { toast } from "sonner";

type AnnouncementType = "info" | "warning" | "success" | "promo" | "new_product";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  showAsPopup: boolean;
  showAsTicker: boolean;
  createdAt: number;
  link?: string;
}

const TYPE_CONFIG: Record<AnnouncementType, { label: string; icon: any; color: string }> = {
  info: { label: "Info", icon: Info, color: "bg-blue-100 text-blue-700 border-blue-200" },
  warning: { label: "Alert", icon: AlertTriangle, color: "bg-amber-100 text-amber-700 border-amber-200" },
  success: { label: "Success", icon: CheckCircle, color: "bg-green-100 text-green-700 border-green-200" },
  promo: { label: "Promo", icon: Zap, color: "bg-purple-100 text-purple-700 border-purple-200" },
  new_product: { label: "New Product", icon: Star, color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const BLANK: Omit<Announcement, "id" | "createdAt"> = {
  title: "",
  message: "",
  type: "info",
  isActive: true,
  showAsPopup: false,
  showAsTicker: true,
  link: "",
};

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const r = ref(db, "announcements");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .sort((a: any, b: any) => b.createdAt - a.createdAt);
        setItems(list as Announcement[]);
      } else {
        setItems([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(BLANK);
    setDialogOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setForm({
      title: item.title,
      message: item.message,
      type: item.type,
      isActive: item.isActive,
      showAsPopup: item.showAsPopup,
      showAsTicker: item.showAsTicker,
      link: item.link || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, updatedAt: Date.now() };
      if (editing) {
        await update(ref(db, `announcements/${editing.id}`), payload);
        toast.success("Announcement updated");
      } else {
        await push(ref(db, "announcements"), { ...payload, createdAt: Date.now() });
        toast.success("Announcement created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: Announcement) => {
    await update(ref(db, `announcements/${item.id}`), { isActive: !item.isActive });
    toast.success(item.isActive ? "Deactivated" : "Activated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await remove(ref(db, `announcements/${id}`));
    toast.success("Deleted");
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-slate-500 text-sm">Manage alerts, tickers & popups shown to users</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />New Announcement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: items.length, icon: Bell, color: "text-blue-600" },
          { label: "Active", value: items.filter(i => i.isActive).length, icon: CheckCircle, color: "text-green-600" },
          { label: "Ticker", value: items.filter(i => i.showAsTicker && i.isActive).length, icon: Megaphone, color: "text-purple-600" },
          { label: "Popups", value: items.filter(i => i.showAsPopup && i.isActive).length, icon: Zap, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white animate-pulse rounded-xl border" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">No announcements yet</h3>
            <p className="text-slate-500 text-sm mb-4">Create your first announcement to show users alerts, promos & new products.</p>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Create Announcement</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            const Icon = cfg.icon;
            return (
              <Card key={item.id} className={`border ${item.isActive ? "" : "opacity-60"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-slate-900">{item.title}</h3>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        {item.showAsTicker && <Badge variant="outline" className="text-xs">Ticker</Badge>}
                        {item.showAsPopup && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Popup</Badge>}
                        <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-sm line-clamp-2">{item.message}</p>
                      {item.link && (
                        <p className="text-xs text-primary mt-1 truncate">🔗 {item.link}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => toggleActive(item)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. New Stock Arrived! 🎉"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Message *</Label>
              <Textarea
                placeholder="Write your announcement message..."
                rows={3}
                value={form.message}
                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as AnnouncementType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_CONFIG) as [AnnouncementType, any][]).map(([key, cfg]) => {
                    const TIcon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <TIcon className="h-4 w-4" />{cfg.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Link (optional)</Label>
              <Input
                placeholder="e.g. /products or https://..."
                value={form.link}
                onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))}
              />
            </div>
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Show in Ticker Bar</p>
                  <p className="text-xs text-slate-500">Scrolling text at top of homepage</p>
                </div>
                <Switch checked={form.showAsTicker} onCheckedChange={(v) => setForm(f => ({ ...f, showAsTicker: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Show as Popup</p>
                  <p className="text-xs text-slate-500">Modal shown once per session</p>
                </div>
                <Switch checked={form.showAsPopup} onCheckedChange={(v) => setForm(f => ({ ...f, showAsPopup: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Active</p>
                  <p className="text-xs text-slate-500">Visible to users right now</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
