import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import {
  Loader2, Phone, Mail, Lock, User, ArrowRight,
  ShieldCheck, ChevronLeft, Eye, EyeOff, AlertTriangle,
} from "lucide-react";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

type PhoneStep = "phone" | "otp";

export default function Login() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState<"domain" | "not-enabled" | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recaptchaInitialized = useRef(false);

  useEffect(() => {
    if (currentUser) setLocation("/");
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupRecaptcha();
    };
  }, []);

  const cleanupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } catch { /* ignore */ }
    recaptchaInitialized.current = false;
  };

  const startResendTimer = (seconds = 30) => {
    setResendCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown((v) => {
        if (v <= 1) { clearInterval(timerRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const setupRecaptcha = async (): Promise<boolean> => {
    try {
      cleanupRecaptcha();
      const container = document.getElementById("recaptcha-container");
      if (!container) {
        toast.error("reCAPTCHA container not found. Please refresh.");
        return false;
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          cleanupRecaptcha();
        },
      });
      await window.recaptchaVerifier.render();
      recaptchaInitialized.current = true;
      return true;
    } catch (err: any) {
      console.error("Recaptcha setup error:", err);
      cleanupRecaptcha();
      return false;
    }
  };

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setPhoneLoading(true);
    setPhoneError(null);
    try {
      const ready = await setupRecaptcha();
      if (!ready) {
        toast.error("Could not initialize reCAPTCHA. Please refresh and try again.");
        return;
      }
      const fullNumber = "+91" + digits;
      const confirmation = await signInWithPhoneNumber(auth, fullNumber, window.recaptchaVerifier!);
      window.confirmationResult = confirmation;
      setPhoneStep("otp");
      startResendTimer(30);
      toast.success(`OTP sent to +91 ${digits}`);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error("Send OTP error:", err?.code, err);
      cleanupRecaptcha();

      if (err.code === "auth/operation-not-allowed") {
        setPhoneError("not-enabled");
        toast.error("Phone sign-in is not enabled in Firebase.");
      } else if (err.code === "auth/unauthorized-domain") {
        setPhoneError("domain");
        toast.error("This domain is not authorized in Firebase.");
      } else if (err.code === "auth/too-many-requests") {
        toast.error("Too many requests. Please wait a few minutes and try again.");
      } else if (err.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number. Please enter a valid Indian mobile number.");
      } else if (err.code === "auth/captcha-check-failed") {
        toast.error("reCAPTCHA check failed. Please refresh and try again.");
      } else {
        toast.error(`Failed to send OTP. (${err.code || "unknown"})`);
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setPhoneStep("phone");
    await handleSendOtp();
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      verifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter") verifyOtp();
  };

  const verifyOtp = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 6) { toast.error("Enter the complete 6-digit OTP"); return; }
    if (!window.confirmationResult) { toast.error("Session expired. Please resend OTP."); return; }
    setPhoneLoading(true);
    try {
      const result = await window.confirmationResult.confirm(otpCode);
      const user = result.user;
      const userRef = ref(db, `users/${user.uid}`);
      const snap = await get(userRef);
      if (!snap.exists()) {
        await set(userRef, {
          name: "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          role: "user",
          createdAt: Date.now(),
        });
      }
      toast.success("Phone verified! Welcome to Super Computer.");
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-verification-code") {
        toast.error("Wrong OTP. Please check and try again.");
      } else if (err.code === "auth/code-expired") {
        toast.error("OTP expired. Please request a new one.");
      } else {
        toast.error("Verification failed. Please try again.");
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully");
      setLocation("/");
    } catch (err: any) {
      if (["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"].includes(err.code)) {
        toast.error("Invalid email or password");
      } else {
        toast.error(err.message || "Failed to log in");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setEmailLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `users/${cred.user.uid}`), {
        name, email, phone: "", role: "user", createdAt: Date.now(),
      });
      toast.success("Account created! Welcome.");
      setLocation("/");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("This email is already registered. Please log in.");
      } else {
        toast.error(err.message || "Failed to sign up");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email address"); return; }
    setEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
      setForgotMode(false);
    } catch {
      toast.error("Failed to send reset email");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <Layout>
      {/* reCAPTCHA invisible mount point - must be in DOM */}
      <div id="recaptcha-container" style={{ position: "fixed", bottom: 0, right: 0, zIndex: 9999 }} />

      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 mb-4">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Super Computer</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account or create a new one</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <Tabs defaultValue="phone" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-auto p-0 bg-slate-50">
                <TabsTrigger
                  value="phone"
                  className="rounded-none h-12 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary font-medium"
                >
                  <Phone className="h-4 w-4 mr-2" />Phone OTP
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="rounded-none h-12 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary font-medium"
                >
                  <Mail className="h-4 w-4 mr-2" />Email
                </TabsTrigger>
              </TabsList>

              {/* ── PHONE OTP TAB ── */}
              <TabsContent value="phone" className="p-5 md:p-6 space-y-0 mt-0">
                {/* Firebase setup error banners */}
                {phoneError === "not-enabled" && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="font-semibold text-amber-800">Phone Auth Not Enabled</p>
                    </div>
                    <p className="text-amber-700 text-xs mb-2">Enable it in Firebase Console:</p>
                    <ol className="text-xs text-amber-700 space-y-0.5 list-decimal ml-4">
                      <li>Go to <strong>console.firebase.google.com</strong></li>
                      <li>Select your project → <strong>Authentication</strong></li>
                      <li>Click <strong>Sign-in method</strong> tab</li>
                      <li>Enable <strong>Phone</strong> provider → Save</li>
                    </ol>
                  </div>
                )}

                {phoneError === "domain" && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="font-semibold text-red-800">Domain Not Authorized</p>
                    </div>
                    <p className="text-red-700 text-xs mb-2">Add this domain in Firebase Console:</p>
                    <ol className="text-xs text-red-700 space-y-0.5 list-decimal ml-4">
                      <li>Go to <strong>Authentication → Settings</strong></li>
                      <li>Click <strong>Authorized domains</strong></li>
                      <li>Add: <strong className="font-mono">{window.location.hostname}</strong></li>
                      <li>Save and try again</li>
                    </ol>
                  </div>
                )}

                {phoneStep === "phone" ? (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="font-bold text-lg">Login with Phone</h2>
                      <p className="text-slate-500 text-sm mt-1">We'll send a 6-digit OTP to your number</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-slate-100 border rounded-lg text-slate-600 font-bold text-sm shrink-0">
                          🇮🇳 +91
                        </div>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="Enter 10-digit number"
                          value={phone}
                          onChange={(e) => {
                            setPhoneError(null);
                            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                          className="flex-1 text-lg tracking-widest font-mono"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-slate-400">Standard SMS charges may apply</p>
                    </div>

                    <Button
                      className="w-full h-12 text-base"
                      onClick={handleSendOtp}
                      disabled={phoneLoading || phone.length !== 10}
                    >
                      {phoneLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending OTP...</>
                        : <>Send OTP <ArrowRight className="ml-2 h-4 w-4" /></>
                      }
                    </Button>

                    <p className="text-center text-xs text-slate-400">
                      Phone OTP requires Firebase Phone Auth to be enabled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="h-6 w-6 text-green-600" />
                      </div>
                      <h2 className="font-bold text-lg">Verify OTP</h2>
                      <p className="text-slate-500 text-sm mt-1">
                        Sent to <span className="font-semibold text-slate-700">+91 {phone}</span>
                      </p>
                      <button
                        className="text-xs text-primary hover:underline mt-1 flex items-center gap-1 mx-auto"
                        onClick={() => { setPhoneStep("phone"); setOtp(["", "", "", "", "", ""]); }}
                      >
                        <ChevronLeft className="h-3 w-3" />Change number
                      </button>
                    </div>

                    <div>
                      <Label className="mb-3 block text-center text-sm text-slate-500">Enter 6-digit OTP</Label>
                      <div className="flex gap-1.5 sm:gap-2 justify-center">
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                              ${digit ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-slate-50"}
                              focus:border-primary focus:ring-2 focus:ring-primary/20`}
                          />
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 text-base"
                      onClick={() => verifyOtp()}
                      disabled={phoneLoading || otp.join("").length !== 6}
                    >
                      {phoneLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</>
                        : <>Verify & Login <ShieldCheck className="ml-2 h-4 w-4" /></>
                      }
                    </Button>

                    <div className="text-center">
                      {resendCountdown > 0 ? (
                        <p className="text-sm text-slate-500">
                          Resend in <span className="font-bold text-primary">{resendCountdown}s</span>
                        </p>
                      ) : (
                        <button
                          className="text-sm text-primary hover:underline font-medium"
                          onClick={handleResend}
                          disabled={phoneLoading}
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── EMAIL TAB ── */}
              <TabsContent value="email" className="p-5 md:p-6 mt-0">
                <Tabs defaultValue="login">
                  <TabsList className="grid w-full grid-cols-2 mb-5">
                    <TabsTrigger value="login" onClick={() => setForgotMode(false)}>Login</TabsTrigger>
                    <TabsTrigger value="signup" onClick={() => setForgotMode(false)}>Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-0">
                    {forgotMode ? (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="text-center mb-2">
                          <p className="text-sm text-slate-600">Enter your email and we'll send a reset link.</p>
                        </div>
                        <div className="space-y-1">
                          <Label>Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={emailLoading}>
                          {emailLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : "Send Reset Link"}
                        </Button>
                        <button type="button" className="text-sm text-primary hover:underline w-full text-center" onClick={() => setForgotMode(false)}>
                          ← Back to Login
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-1">
                          <Label>Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <Label>Password</Label>
                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForgotMode(true)}>Forgot password?</button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPass(!showPass)}>
                              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={emailLoading}>
                          {emailLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Logging in...</> : "Log In"}
                        </Button>
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-1">
                        <Label>Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input required placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type={showPass ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPass(!showPass)}>
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">Minimum 6 characters</p>
                      </div>
                      <Button type="submit" className="w-full h-11" disabled={emailLoading}>
                        {emailLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            By continuing, you agree to Super Computer's{" "}
            <a href="/terms" className="underline hover:text-slate-600">Terms</a> &{" "}
            <a href="/privacy" className="underline hover:text-slate-600">Privacy Policy</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
