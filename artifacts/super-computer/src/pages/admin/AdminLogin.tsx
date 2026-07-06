import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, get, set as dbSet } from "firebase/database";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/** Check if ANY user in the whole database already has role "admin" */
async function anyAdminExists(): Promise<boolean> {
  try {
    const snap = await get(ref(db, "users"));
    if (!snap.exists()) return false;
    const users = snap.val() as Record<string, any>;
    return Object.values(users).some((u) => u?.role === "admin");
  } catch {
    // If we can't read (e.g. rules), assume an admin may exist to stay safe.
    return true;
  }
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const { isAdmin, isLoggedIn, loading: authLoading } = useAuth();
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string>("");
  const [claiming, setClaiming] = useState(false);

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (!authLoading && isLoggedIn && isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [authLoading, isLoggedIn, isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await get(ref(db, `users/${userCred.user.uid}`));
      if (snap.exists() && snap.val().role === "admin") {
        toast.success("Welcome to Admin Panel!");
        setLocation("/admin/dashboard");
        return;
      }

      // No admin role on this account. If the database has NO admin at all
      // (e.g. after a data wipe), let this account claim the first-admin slot.
      const noAdminYet = await anyAdminExists().then((exists) => !exists);
      if (noAdminYet) {
        setPendingUid(userCred.user.uid);
        setPendingEmail(userCred.user.email || email);
        setPendingName(snap.exists() ? snap.val().name || "" : "");
      } else {
        await auth.signOut();
        toast.error("Access denied. Admin only.");
      }
    } catch (err: any) {
      toast.error(err.code === "auth/invalid-credential" ? "Wrong email or password" : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const claimAdmin = async () => {
    if (!pendingUid) return;
    setClaiming(true);
    try {
      // Double-check right before writing, in case someone else just claimed it.
      const stillNoAdmin = await anyAdminExists().then((exists) => !exists);
      if (!stillNoAdmin) {
        toast.error("An admin was already set up. Please log in with that account.");
        await auth.signOut();
        setPendingUid(null);
        return;
      }
      await dbSet(ref(db, `users/${pendingUid}`), {
        name: pendingName || "Admin",
        email: pendingEmail || "",
        phone: "",
        role: "admin",
        createdAt: Date.now(),
      });
      toast.success("You are now the admin!");
      setLocation("/admin/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to set admin role");
    } finally {
      setClaiming(false);
    }
  };

  if (pendingUid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-500 shadow-lg mb-4">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">No Admin Found</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your database currently has no admin account. Do you want to make{" "}
            <span className="font-semibold text-slate-700">{pendingEmail}</span> the admin?
          </p>
          <Button
            className="w-full h-11 font-bold text-base mb-2"
            style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff" }}
            onClick={claimAdmin}
            disabled={claiming}
          >
            {claiming ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Setting up...</> : "Make me the admin"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={async () => { await auth.signOut(); setPendingUid(null); }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-600 shadow-lg shadow-green-900/40 mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Super Computer Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-7">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">Sign in with your admin account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-medium text-sm">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="admin@supercomputer.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 border-slate-200 focus:border-green-500 focus:ring-green-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-medium text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 border-slate-200 focus:border-green-500 focus:ring-green-500/20"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-bold text-base mt-2" disabled={loading}
              style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff" }}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Authenticating...</> : "Access Dashboard"}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Phone OTP admin? <a href="/" className="text-green-600 font-semibold hover:underline">Login from main site →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
