import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const { isAdmin, isLoggedIn, loading: authLoading } = useAuth();

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
