import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Phone, ShieldCheck, ChevronLeft, ArrowRight,
} from "lucide-react";

type Step = "phone" | "otp";

function generateDeviceId(): string {
  return "WebBrowser" + Date.now() + Math.random().toString(36).slice(2, 14);
}

export function LoginDialog() {
  const { isOpen, closeLoginDialog } = useLoginDialog();
  const { setExtUser } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const deviceIdRef = useRef(generateDeviceId());
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhone("");
      setOtp(["", "", "", ""]);
      setStep("phone");
      setLoading(false);
      setResendCountdown(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("10 अंकों का मोबाइल नंबर डालें");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/sendotp?phone=${encodeURIComponent(digits)}`);
      const data = await res.json();
      if (data.status === 200 || res.ok) {
        setStep("otp");
        startResendTimer(30);
        toast.success(`OTP भेजा गया +91 ${digits} पर`);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        toast.error(data.message || "OTP भेजने में विफल। फिर से कोशिश करें।");
      }
    } catch {
      toast.error("नेटवर्क त्रुटि। कनेक्शन जांचें।");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 4) {
      verifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter") verifyOtp();
  };

  const saveUserToDb = async (phoneNumber: string, userData: {
    name: string;
    email: string;
    userid: string;
  }) => {
    try {
      const userKey = `phone_${phoneNumber}`;
      const userRef = ref(db, `users/${userKey}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        await set(userRef, {
          name: userData.name || `User ${phoneNumber.slice(-4)}`,
          email: userData.email || "",
          phone: phoneNumber,
          role: "user",
          createdAt: Date.now(),
          wishlist: [],
        });
      }
    } catch {
    }
  };

  const verifyOtp = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 4) {
      toast.error("4 अंकों का OTP पूरा डालें");
      return;
    }
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const params = new URLSearchParams({
        phone: digits,
        otp: otpCode,
        device_id: deviceIdRef.current,
      });
      const res = await fetch(`/api/proxy/otpverify?${params.toString()}`);
      const data = await res.json();

      if (data.status === 200 && data.user) {
        const extUserData = {
          userid: data.user.userid,
          token: data.user.token,
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || digits,
          is_paid_user: data.user.is_paid_user || "0",
          username: data.user.username || "",
          state: data.user.state || "",
        };
        setExtUser(extUserData);
        await saveUserToDb(digits, {
          name: extUserData.name,
          email: extUserData.email,
          userid: extUserData.userid,
        });
        toast.success("Login सफल! स्वागत है।");
        closeLoginDialog();
      } else {
        toast.error(data.message || "OTP गलत है। फिर से कोशिश करें।");
        setOtp(["", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      }
    } catch {
      toast.error("नेटवर्क त्रुटि। कनेक्शन जांचें।");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtp(["", "", "", ""]);
    deviceIdRef.current = generateDeviceId();
    await handleSendOtp();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeLoginDialog(); }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-center space-y-2">
          <div className="flex justify-center mb-1">
            <div className="h-12 w-12 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
              {step === "otp"
                ? <ShieldCheck className="h-6 w-6 text-white" />
                : <Phone className="h-6 w-6 text-white" />
              }
            </div>
          </div>
          <DialogTitle className="text-xl font-bold">
            {step === "phone" ? "Login / Sign Up" : "OTP Verify करें"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            {step === "phone"
              ? "अपना मोबाइल नंबर डालें — OTP आएगा"
              : <>+91 {phone} पर OTP भेजा गया</>
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {step === "phone" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">मोबाइल नंबर</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-slate-100 border rounded-lg text-slate-600 font-bold text-sm shrink-0 dark:bg-slate-800 dark:border-slate-700">
                    🇮🇳 +91
                  </div>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 अंकों का नंबर"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="flex-1 text-lg tracking-widest font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                className="w-full h-11 text-base"
                onClick={handleSendOtp}
                disabled={loading || phone.replace(/\D/g, "").length !== 10}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />OTP भेजा जा रहा है...</>
                  : <>OTP भेजें <ArrowRight className="ml-2 h-4 w-4" /></>
                }
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label className="text-sm text-slate-500 block text-center">4-अंकीय OTP डालें</Label>
                <div className="flex gap-3 justify-center">
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
                      className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                        ${digit
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                        }
                        focus:border-primary focus:ring-2 focus:ring-primary/20`}
                    />
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-11 text-base"
                onClick={() => verifyOtp()}
                disabled={loading || otp.join("").length !== 4}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verify हो रहा है...</>
                  : <>Verify & Login <ShieldCheck className="ml-2 h-4 w-4" /></>
                }
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  className="text-primary hover:underline flex items-center gap-1 text-xs"
                  onClick={() => { setStep("phone"); setOtp(["", "", "", ""]); }}
                  disabled={loading}
                >
                  <ChevronLeft className="h-3 w-3" />नंबर बदलें
                </button>

                {resendCountdown > 0 ? (
                  <p className="text-slate-500 text-xs">
                    Resend in <span className="font-bold text-primary">{resendCountdown}s</span>
                  </p>
                ) : (
                  <button
                    className="text-primary hover:underline text-xs font-medium"
                    onClick={handleResend}
                    disabled={loading}
                  >
                    OTP फिर भेजें
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
