import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import { toast } from "sonner";
import { Loader2, ChevronDown, ShieldCheck, ArrowLeft, X } from "lucide-react";

type Step = "phone" | "otp";

function generateDeviceId(): string {
  return "WebBrowser" + Date.now() + Math.random().toString(36).slice(2, 14);
}

function HexLogo() {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <polygon
          points="32,4 58,18 58,46 32,60 6,46 6,18"
          stroke="#22c55e"
          strokeWidth="2.5"
          fill="rgba(34,197,94,0.08)"
        />
        <polygon
          points="32,10 53,22 53,42 32,54 11,42 11,22"
          stroke="#22c55e"
          strokeWidth="1"
          fill="none"
          opacity="0.4"
        />
        <text
          x="32"
          y="38"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fill="#22c55e"
          fontFamily="monospace"
        >
          S
        </text>
        <circle cx="50" cy="14" r="2.5" fill="#22c55e" opacity="0.8" />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-black tracking-[0.15em] leading-none">
          <span className="text-white">SUPER </span>
          <span className="text-green-400">COMPUTER</span>
        </div>
        <div className="text-[10px] tracking-[0.25em] text-slate-400 mt-1 font-medium">
          LAPTOPS | ACCESSORIES | SOLUTIONS
        </div>
      </div>
    </div>
  );
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
        toast.success(`OTP sent to +91 ${digits}`);
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      } else {
        toast.error(data.message || "OTP भेजने में विफल। फिर से कोशिश करें।");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
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

  const saveUserToDb = async (phoneNumber: string, userData: { name: string; email: string; userid: string }) => {
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
    } catch { }
  };

  const verifyOtp = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 4) { toast.error("4 अंकों का OTP पूरा डालें"); return; }
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const params = new URLSearchParams({ phone: digits, otp: otpCode, device_id: deviceIdRef.current });
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
        await saveUserToDb(digits, { name: extUserData.name, email: extUserData.email, userid: extUserData.userid });
        toast.success("Login successful! Welcome.");
        closeLoginDialog();
      } else {
        toast.error(data.message || "OTP गलत है। फिर से कोशिश करें।");
        setOtp(["", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      }
    } catch {
      toast.error("Network error. Please check your connection.");
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

  if (!isOpen) return null;

  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.length === 10
    ? `${digits.slice(0, 5)} ${digits.slice(5)}`
    : digits;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/images/store/s1.jpeg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        {/* Green dot pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, #22c55e 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Green corner glow */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={closeLoginDialog}
        className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all"
      >
        <X className="h-4 w-4 text-white" />
      </button>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div
          className="rounded-2xl border border-green-500/20 overflow-hidden shadow-2xl shadow-black/60"
          style={{ background: "rgba(5, 10, 15, 0.85)", backdropFilter: "blur(20px)" }}
        >
          {/* Top green accent line */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent" />

          <div className="p-7">
            <HexLogo />

            {step === "phone" ? (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-green-400 mb-1">Welcome Back!</h2>
                  <p className="text-slate-400 text-sm">Login to your account</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-3 rounded-lg border border-white/15 bg-white/5 text-white text-sm font-semibold shrink-0 cursor-default select-none">
                      <span>+91</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      autoFocus
                      className="flex-1 bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm font-mono tracking-widest outline-none focus:border-green-500/60 focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={loading || digits.length !== 10}
                  className="w-full py-3.5 rounded-xl font-bold text-base text-black transition-all
                    bg-green-500 hover:bg-green-400 active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500
                    shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Sending OTP...</>
                    : "Send OTP"
                  }
                </button>

                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-500/60" />
                  <span>Your information is safe with us</span>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <button
                  onClick={() => { setStep("phone"); setOtp(["", "", "", ""]); }}
                  className="flex items-center gap-1.5 text-green-400 hover:text-green-300 text-sm font-medium transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="text-center">
                  <h2 className="text-2xl font-bold text-green-400 mb-1">Verify OTP</h2>
                  <p className="text-slate-400 text-sm">Enter the 4-digit code sent to</p>
                  <p className="text-green-400 font-semibold text-sm mt-0.5">+91 {formattedPhone}</p>
                </div>

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
                      className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all
                        ${digit
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-white/20 bg-white/5 text-white"
                        }
                        focus:border-green-400 focus:bg-green-500/10 focus:text-green-300`}
                    />
                  ))}
                </div>

                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <p className="text-slate-400 text-sm">
                      Resend OTP in{" "}
                      <span className="text-green-400 font-bold tabular-nums">
                        00:{String(resendCountdown).padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      className="text-green-400 hover:text-green-300 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  onClick={() => verifyOtp()}
                  disabled={loading || otp.join("").length !== 4}
                  className="w-full py-3.5 rounded-xl font-bold text-base text-black transition-all
                    bg-green-500 hover:bg-green-400 active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500
                    shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying...</>
                    : "Verify & Login"
                  }
                </button>

                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-500/60" />
                  <span>Your information is safe with us</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom green accent line */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
