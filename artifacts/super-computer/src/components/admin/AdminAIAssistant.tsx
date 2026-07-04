import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ref, push, set, remove, get, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  Sparkles, X, Mic, MicOff, Send, Loader2, RotateCcw,
  ChevronDown, Volume2, VolumeX, Phone, IndianRupee, AlertCircle, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

const ADMIN_TOKEN = "sc-admin-ai-2026";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; url: string }[];
}

interface LastAction {
  type: string;
  firebasePath?: string;
  key?: string;
  description: string;
}

interface LedgerEntry {
  id: string;
  customerName: string;
  phone?: string;
  amount: number;
  dueDate?: string;
  status: string;
  billNo?: string;
  productName?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function buildWhatsAppLink(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, "");
  const num = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

// Clamp helper
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

export function AdminAIAssistant() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError]   = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [dues, setDues]           = useState<LedgerEntry[]>([]);
  const [adminStats, setAdminStats] = useState({ totalOrders: 0, totalProducts: 0, totalRevenue: 0 });

  // Panel position — bottom/right offsets in px
  const [pos, setPos] = useState({ bottom: 24, right: 24 });

  const [, setLocation] = useLocation();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const pendingCtx     = useRef<any>({});
  const loadingRef     = useRef(false);
  const ttsEnabledRef  = useRef(true);
  const openRef        = useRef(false);
  const minimizedRef   = useRef(false);
  const panelRef       = useRef<HTMLDivElement>(null);

  // Drag state refs (no re-render needed)
  const dragging     = useRef(false);
  const dragStart    = useRef({ px: 0, py: 0, bottom: 24, right: 24 });

  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { minimizedRef.current = minimized; }, [minimized]);

  // ── Firebase ──────────────────────────────────────────────────
  useEffect(() => {
    const ledgerRef = ref(db, "ledger");
    const handleLedger = (snap: any) => {
      if (snap.exists()) {
        const entries: LedgerEntry[] = Object.entries(snap.val())
          .map(([id, v]: any) => ({ id, ...v }))
          .filter((e: LedgerEntry) => e.status === "pending");
        setDues(entries);
      } else setDues([]);
    };
    onValue(ledgerRef, handleLedger);
    Promise.all([get(ref(db, "orders")), get(ref(db, "products"))]).then(([os, ps]) => {
      let totalOrders = 0, totalRevenue = 0;
      if (os.exists()) {
        const orders = Object.values(os.val()) as any[];
        totalOrders = orders.length;
        totalRevenue = orders.reduce((s: number, o: any) => s + (Number(o.finalAmount) || 0), 0);
      }
      setAdminStats({ totalOrders, totalProducts: ps.exists() ? Object.keys(ps.val()).length : 0, totalRevenue });
    });
    return () => off(ledgerRef, "value", handleLedger);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Drag handlers ─────────────────────────────────────────────
  const onDragStart = useCallback((clientX: number, clientY: number) => {
    dragging.current = true;
    dragStart.current = { px: clientX, py: clientY, bottom: pos.bottom, right: pos.right };
  }, [pos]);

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!dragging.current) return;
      const dx = dragStart.current.px - clientX;   // right increases when moving left
      const dy = dragStart.current.py - clientY;   // bottom increases when moving up

      const pw = panelRef.current?.offsetWidth  || 370;
      const ph = panelRef.current?.offsetHeight || 560;
      const newRight  = clamp(dragStart.current.right  + dx, 8, window.innerWidth  - pw - 8);
      const newBottom = clamp(dragStart.current.bottom + dy, 8, window.innerHeight - ph - 8);
      setPos({ right: newRight, bottom: newBottom });
    };
    const onMouseMove = (e: MouseEvent)  => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent)  => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
    const onEnd       = ()               => { dragging.current = false; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend",  onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onEnd);
    };
  }, []); // intentionally empty — onMove reads dragStart ref, not pos state

  // ── TTS ───────────────────────────────────────────────────────
  const speak = useCallback((text: string, afterSpeak?: () => void) => {
    if (!ttsEnabledRef.current || !window.speechSynthesis) {
      afterSpeak?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[✅❌⚠️🎉👋📊💬🔔📱↩️]/g, "")
      .replace(/\n+/g, ". ")
      .trim()
      .slice(0, 280);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang  = "hi-IN";
    u.rate  = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith("hi")) || voices.find(v => v.lang.startsWith("en-IN"));
    if (v) u.voice = v;
    u.onend = () => afterSpeak?.();
    window.speechSynthesis.speak(u);
  }, []);

  // ── Mic ───────────────────────────────────────────────────────
  const startMicRef = useRef<() => void>(() => {});

  const startMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError("Voice support nahi hai. Chrome use karein.");
      return;
    }
    setMicError("");
    try {
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }

      const rec = new SR();
      rec.lang              = "hi-IN";
      rec.interimResults    = false;
      rec.maxAlternatives   = 1;
      rec.continuous        = false;
      recognitionRef.current = rec;

      rec.onstart = () => setListening(true);
      rec.onend   = () => setListening(false);
      rec.onerror = (e: any) => {
        setListening(false);
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          setMicError("Mic permission do — browser mein Allow karein.");
        }
        // "no-speech" and "aborted" are silent — no error shown
      };
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript.trim();
        setListening(false);
        if (transcript) sendMsgRef.current(transcript);
      };
      rec.start();
    } catch (err: any) {
      setListening(false);
      if (!err.message?.includes("already started")) {
        setMicError("Mic start nahi hua: " + err.message);
      }
    }
  }, []);

  // keep ref in sync so TTS callback can call latest startMic
  useEffect(() => { startMicRef.current = startMic; }, [startMic]);

  const stopMic = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  // ── Build context ─────────────────────────────────────────────
  const duesRef = useRef<LedgerEntry[]>([]);
  const statsRef = useRef(adminStats);
  useEffect(() => { duesRef.current = dues; }, [dues]);
  useEffect(() => { statsRef.current = adminStats; }, [adminStats]);

  const buildContext = useCallback(() => {
    const d = duesRef.current;
    const s = statsRef.current;
    const totalDue = d.reduce((acc, x) => acc + x.amount, 0);
    const overdue  = d.filter(x => x.dueDate && new Date(x.dueDate) < new Date());
    return {
      stats: s,
      dues: {
        total: totalDue,
        count: d.length,
        overdueCount: overdue.length,
        entries: d.map(x => ({
          customer: x.customerName,
          phone:    x.phone || "",
          amount:   x.amount,
          dueDate:  x.dueDate || null,
          billNo:   x.billNo || "",
          product:  x.productName || "",
          isOverdue: x.dueDate ? new Date(x.dueDate) < new Date() : false,
        })),
      },
    };
  }, []);

  // ── Send message ──────────────────────────────────────────────
  const addMsg = useCallback((role: "user" | "assistant", content: string, links?: ChatMessage["links"]) => {
    setMessages(prev => [...prev, { role, content, links }]);
    if (role === "assistant") {
      // Speak, then auto-restart mic for continuous conversation
      speak(content, () => {
        if (openRef.current && !minimizedRef.current && !loadingRef.current) {
          startMicRef.current();
        }
      });
    }
  }, [speak]);

  const sendMsg = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || loadingRef.current) return;
    setInput("");
    window.speechSynthesis?.cancel();
    stopMic();
    addMsg("user", userText);
    setLoading(true);

    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/admin-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-ai-token": ADMIN_TOKEN },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: userText }],
          context: { ...buildContext(), ...pendingCtx.current },
        }),
      });
      const data = await res.json();
      const aiMsg: string = data.message || "Kuch error hua, dobara try karo.";
      const links: ChatMessage["links"] = [];
      if (Array.isArray(data.whatsappLinks)) {
        for (const wl of data.whatsappLinks) {
          if (wl.phone) links.push({ label: `📱 WhatsApp — ${wl.customerName || wl.phone}`, url: buildWhatsAppLink(wl.phone, wl.message || "") });
        }
      }
      addMsg("assistant", aiMsg, links.length ? links : undefined);

      if (data.action && data.action !== "none" && !data.needsMoreInfo) {
        await execAction(data.action, data.data || {});
      } else if (data.needsMoreInfo && data.data) {
        pendingCtx.current = { ...pendingCtx.current, ...data.data, pendingAction: data.action };
      }
    } catch {
      addMsg("assistant", "Network error. API se connect nahi hua — please retry.");
    } finally {
      setLoading(false);
    }
  }, [messages, addMsg, buildContext, stopMic]);

  // keep ref in sync so mic callback sees latest sendMsg
  const sendMsgRef = useRef<(t: string) => void>(() => {});
  useEffect(() => { sendMsgRef.current = sendMsg; }, [sendMsg]);

  // ── Firebase actions ──────────────────────────────────────────
  const execAction = useCallback(async (action: string, data: any) => {
    try {
      switch (action) {
        case "navigate":
          setLocation(data.path || "/admin/dashboard");
          pendingCtx.current = {};
          break;

        case "add_product": {
          if (!data.name) break;
          let { specs = {}, price, brand, category } = data;
          if (!price || !Object.keys(specs).length) {
            try {
              const r = await fetch("/api/fetch-specs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.name, brand }) });
              const s = await r.json();
              if (s.mrp)      price    = s.mrp;
              if (s.specs)    specs    = s.specs;
              if (!brand    && s.brand)    brand    = s.brand;
              if (!category && s.category) category = s.category;
            } catch { /* optional */ }
          }
          const pRef = push(ref(db, "products"));
          await set(pRef, { name: data.name, brand: brand || "", category: category || "Laptops", price: Number(price) || 0, discountPrice: Number(price) || 0, stock: 1, description: "", specs, images: [], status: "active", isFeatured: false, isNewArrival: true, createdAt: Date.now(), updatedAt: Date.now(), addedByAI: true });
          setLastAction({ type: "add_product", firebasePath: "products", key: pRef.key!, description: `"${data.name}" added` });
          pendingCtx.current = {};
          addMsg("assistant", `✅ "${data.name}" catalog mein add ho gaya!\nPrice: ${formatINR(Number(price))}\nBrand: ${brand || "—"}`);
          toast.success(`"${data.name}" added!`);
          break;
        }

        case "create_sale": {
          if (!data.customerName || !data.productName || !data.amount) break;
          const sRef = push(ref(db, "orders"));
          const sub = Number(data.amount), gstR = Number(data.gstRate) || 0, gstA = Math.round((sub * gstR) / 100), final = sub + gstA;
          await set(sRef, { source: "offline", orderStatus: "delivered", paymentStatus: "paid", paymentMethod: data.paymentMethod || "cash", finalAmount: final, subtotal: sub, gstAmount: gstA, gstRate: gstR, deliveryCharge: 0, createdAt: Date.now(), updatedAt: Date.now(), addedByAI: true, address: { name: data.customerName, phone: data.phone || "", city: "Walk-in", state: "", pincode: "", address: "In-store / Offline sale" }, items: [{ name: data.productName, qty: Number(data.qty) || 1, price: sub }], statusHistory: [{ status: "delivered", timestamp: Date.now(), note: "Added by AI assistant" }] });
          setLastAction({ type: "create_sale", firebasePath: "orders", key: sRef.key!, description: `Sale: ${data.customerName}` });
          pendingCtx.current = {};
          addMsg("assistant", `✅ Sale record ho gaya!\nCustomer: ${data.customerName}\nProduct: ${data.productName}\nAmount: ${formatINR(final)}`);
          toast.success(`Sale recorded for ${data.customerName}!`);
          break;
        }

        case "revert": {
          if (!lastAction) { addMsg("assistant", "Koi recent action nahi mila jo revert kar sakein."); break; }
          if (lastAction.firebasePath && lastAction.key) await remove(ref(db, `${lastAction.firebasePath}/${lastAction.key}`));
          addMsg("assistant", `↩️ "${lastAction.description}" delete ho gaya!`);
          toast.success("Last action reverted");
          setLastAction(null);
          break;
        }
      }
    } catch (e: any) {
      addMsg("assistant", `Action mein error: ${e.message}`);
    }
  }, [lastAction, addMsg, setLocation]);

  // ── Open button handler — mic starts here (user gesture) ──────
  const handleOpen = () => {
    setOpen(true);
    // Self-test greeting
    const doGreet = async () => {
      setLoading(true);
      try {
        const ctx = buildContext();
        const res = await fetch("/api/admin-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-ai-token": ADMIN_TOKEN },
          body: JSON.stringify({ messages: [{ role: "user", content: "__SELFTEST__" }], context: ctx }),
        });
        const data = await res.json();
        addMsg("assistant", data.message || "Namaste! Ready hoon. Kya karna hai?");
      } catch {
        addMsg("assistant", "Namaste! 👋 Bolo kya karna hai!");
        startMic(); // start mic even if greeting fails
      } finally {
        setLoading(false);
      }
    };
    doGreet();
    // Start mic immediately — this is within the user gesture (click)
    startMic();
  };

  const totalDue    = dues.reduce((s, d) => s + d.amount, 0);
  const overdueCount = dues.filter(d => d.dueDate && new Date(d.dueDate) < new Date()).length;

  // ── Closed FAB ────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed z-50 h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 relative"
        style={{ bottom: pos.bottom, right: pos.right, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 8px 32px rgba(124,58,237,0.5)" }}
        title="AI Assistant — Click to talk"
      >
        <Sparkles className="h-7 w-7 text-white" />
        {dues.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
            {dues.length}
          </span>
        )}
      </button>
    );
  }

  // Panel width — full width on small screens
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const panelW = isMobile ? window.innerWidth - 16 : 370;

  // ── Open panel ────────────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-2xl overflow-hidden"
      style={{
        width: panelW,
        bottom: pos.bottom,
        right: isMobile ? 8 : pos.right,
        maxHeight: minimized ? 56 : 570,
        background: "#fff",
        border: "1.5px solid rgba(124,58,237,0.2)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        transition: "max-height 0.3s cubic-bezier(.4,0,.2,1)",
        touchAction: "none",
      }}
    >
      {/* ── Header (draggable) ── */}
      <div
        className="flex items-center justify-between px-3 py-3 shrink-0 select-none cursor-grab active:cursor-grabbing"
        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
        onMouseDown={e => { if ((e.target as HTMLElement).closest("button")) return; onDragStart(e.clientX, e.clientY); }}
        onTouchStart={e => { if ((e.target as HTMLElement).closest("button")) return; const t = e.touches[0]; onDragStart(t.clientX, t.clientY); }}
        onClick={() => { if (!dragging.current) setMinimized(m => !m); }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-purple-300 opacity-60" />
          <Sparkles className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">AI Assistant</span>
          {loading && <Loader2 className="h-3.5 w-3.5 text-purple-200 animate-spin" />}
          {listening && !loading && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-300 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" /> Sun raha hoon...
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          {lastAction && (
            <button onClick={() => execAction("revert", {})} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-purple-200 hover:text-white hover:bg-white/10 transition-colors">
              <RotateCcw className="h-3 w-3" /> Revert
            </button>
          )}
          <button onClick={() => { setTtsEnabled(e => !e); window.speechSynthesis?.cancel(); }} className="p-1.5 text-purple-200 hover:text-white transition-colors" title="Toggle voice">
            {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setMinimized(m => !m)} className="p-1.5 text-purple-200 hover:text-white transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
          </button>
          <button onClick={() => { setOpen(false); stopMic(); window.speechSynthesis?.cancel(); }} className="p-1.5 text-purple-200 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Due bar */}
          {dues.length > 0 && (
            <div className="shrink-0 px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-800">Due: {formatINR(totalDue)} ({dues.length})</span>
              </div>
              {overdueCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                  <AlertCircle className="h-3 w-3" /> {overdueCount} overdue
                </span>
              )}
            </div>
          )}

          {/* Mic error */}
          {micError && (
            <div className="shrink-0 px-3 py-1.5 bg-red-50 border-b border-red-100 text-xs text-red-700 font-medium">
              ⚠️ {micError}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0, maxHeight: 360 }}>
            {messages.length === 0 && loading && (
              <div className="flex justify-center pt-10">
                <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  <span>Connecting...</span>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[87%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "text-white rounded-br-sm" : "text-slate-800 rounded-bl-sm"}`}
                  style={{ background: msg.role === "user" ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#f1f5f9" }}
                >
                  {msg.content}
                </div>
                {msg.links?.map((lnk, j) => (
                  <a key={j} href={lnk.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 mt-1.5 rounded-xl text-xs font-bold bg-green-500 text-white shadow hover:bg-green-600 transition-colors active:scale-95 max-w-[87%]"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lnk.label}</span>
                  </a>
                ))}
              </div>
            ))}
            {loading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-slate-100 text-slate-400 text-sm flex items-center gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick commands */}
          {messages.length <= 1 && !loading && (
            <div className="shrink-0 px-3 pb-2 flex flex-wrap gap-1.5">
              {["Sabka due batao", "Overdue kaun hai?", "HP laptop add karo", "Offline sale banao"].map(cmd => (
                <button key={cmd} onClick={() => sendMsg(cmd)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border hover:bg-purple-50 transition-colors"
                  style={{ borderColor: "rgba(124,58,237,0.3)", color: "#7c3aed" }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="shrink-0 p-3 border-t border-slate-100 flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${listening ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-200 focus-within:border-purple-300"}`}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && input.trim()) { e.preventDefault(); sendMsg(input); } }}
                placeholder={listening ? "🎙 Sun raha hoon..." : "Type karo ya mic dabao..."}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                disabled={loading}
                autoFocus
              />
            </div>
            {/* Mic — tap to talk */}
            <button
              onClick={listening ? stopMic : startMic}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                listening
                  ? "bg-red-500 text-white shadow-lg scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-600"
              }`}
              title={listening ? "Mic band karo" : "Bolo"}
            >
              {listening
                ? <MicOff className="h-4 w-4" />
                : <Mic className={`h-4 w-4 ${loading ? "opacity-40" : ""}`} />
              }
            </button>
            <button
              onClick={() => { if (input.trim()) sendMsg(input); }}
              disabled={!input.trim() || loading}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
