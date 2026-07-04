import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ref, push, set, remove, get, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  Sparkles, X, Mic, MicOff, Send, Loader2, RotateCcw,
  Volume2, VolumeX, Phone, IndianRupee, AlertCircle,
  Menu, Plus, Trash2, MessageSquare, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

const ADMIN_TOKEN = "sc-admin-ai-2026";
const SESSIONS_KEY = "sc-ai-sessions";
const MAX_SESSIONS = 20;

// ── Types ──────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; url: string }[];
}
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
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

// ── Helpers ────────────────────────────────────────────────────────────
function buildWhatsAppLink(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, "");
  const num = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch { /* ignore */ }
}

function sessionTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === "user");
  if (!first) return "Naya Chat";
  return first.content.slice(0, 36) + (first.content.length > 36 ? "…" : "");
}

// ── Component ──────────────────────────────────────────────────────────
export function AdminAIAssistant() {
  const [open, setOpen]             = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions]     = useState<ChatSession[]>(() => loadSessions());
  const [currentId, setCurrentId]   = useState<string>("");
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [listening, setListening]   = useState(false);
  const [micError, setMicError]     = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [dues, setDues]             = useState<LedgerEntry[]>([]);
  const [adminStats, setAdminStats] = useState({ totalOrders: 0, totalProducts: 0, totalRevenue: 0 });

  const [, setLocation] = useLocation();

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const recognitionRef  = useRef<any>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const pendingCtx      = useRef<any>({});
  const loadingRef      = useRef(false);
  const ttsEnabledRef   = useRef(true);
  const openRef         = useRef(false);
  const listeningRef    = useRef(false);
  const messagesRef     = useRef<ChatMessage[]>([]);
  // voiceModeRef: true jab user ne mic se baat ki ho — tab auto-loop chalta hai
  const voiceModeRef    = useRef(false);
  // ttsActiveRef: true jab TTS bol raha ho
  const ttsActiveRef    = useRef(false);

  useEffect(() => { loadingRef.current  = loading;   }, [loading]);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { openRef.current     = open;       }, [open]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);
  useEffect(() => { messagesRef.current  = messages;  }, [messages]);

  // ── Fallback: jab loading false ho aur voiceMode on ho ──────────────
  // Agar TTS ka onend fire na kare (Chrome bug), tab bhi mic restart ho
  useEffect(() => {
    if (!loading && voiceModeRef.current && openRef.current && !ttsActiveRef.current) {
      // TTS nahi chal rahi aur loading bhi khatam — mic start karo
      const t = setTimeout(() => {
        if (voiceModeRef.current && openRef.current && !loadingRef.current) {
          startMicRef.current();
        }
      }, 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading]);

  // ── Persist sessions whenever they change ──────────────────────────
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  // ── Sync messages → session store ─────────────────────────────────
  const syncSession = useCallback((id: string, msgs: ChatMessage[]) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === id);
      if (!exists) return prev;
      return prev.map(s => s.id === id
        ? { ...s, messages: msgs, title: sessionTitle(msgs) }
        : s
      );
    });
  }, []);

  // ── Firebase ───────────────────────────────────────────────────────
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

  // ── TTS ────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, afterSpeak?: () => void) => {
    if (!ttsEnabledRef.current || !window.speechSynthesis) {
      ttsActiveRef.current = false;
      afterSpeak?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[✅❌⚠️🎉👋📊💬🔔📱↩️]/g, "")
      .replace(/\n+/g, ". ")
      .trim()
      .slice(0, 400);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "hi-IN";
    u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith("hi")) || voices.find(v => v.lang.startsWith("en-IN"));
    if (v) u.voice = v;
    ttsActiveRef.current = true;
    u.onstart = () => { ttsActiveRef.current = true; };
    u.onend   = () => {
      ttsActiveRef.current = false;
      afterSpeak?.();
    };
    u.onerror = () => {
      ttsActiveRef.current = false;
      afterSpeak?.();
    };
    window.speechSynthesis.speak(u);
  }, []);

  // ── Mic ────────────────────────────────────────────────────────────
  const startMicRef = useRef<() => void>(() => {});

  const startMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError("Voice support nahi hai. Chrome use karein."); return; }
    setMicError("");
    try {
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
      const rec = new SR();
      rec.lang            = "hi-IN";
      rec.interimResults  = false;
      rec.maxAlternatives = 1;
      rec.continuous      = false;
      recognitionRef.current = rec;

      rec.onstart  = () => { setListening(true); voiceModeRef.current = true; };
      rec.onend    = () => setListening(false);
      rec.onerror  = (e: any) => {
        setListening(false);
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          setMicError("Mic permission do — browser mein Allow karein.");
          voiceModeRef.current = false; // permission nahi mili — loop band
        }
      };
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript.trim();
        setListening(false);
        if (transcript) sendMsgRef.current(transcript);
      };
      rec.start();
    } catch (err: any) {
      setListening(false);
      if (!err.message?.includes("already started"))
        setMicError("Mic start nahi hua: " + err.message);
    }
  }, []);

  useEffect(() => { startMicRef.current = startMic; }, [startMic]);

  // Manual stop — voice loop band karo
  const stopMic = useCallback((keepVoiceMode = false) => {
    if (!keepVoiceMode) voiceModeRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  // ── Build context ──────────────────────────────────────────────────
  const duesRef  = useRef<LedgerEntry[]>([]);
  const statsRef = useRef(adminStats);
  useEffect(() => { duesRef.current  = dues;       }, [dues]);
  useEffect(() => { statsRef.current = adminStats; }, [adminStats]);

  const buildContext = useCallback(() => {
    const d = duesRef.current;
    const s = statsRef.current;
    const totalDue  = d.reduce((acc, x) => acc + x.amount, 0);
    const overdue   = d.filter(x => x.dueDate && new Date(x.dueDate) < new Date());
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

  // ── Add message ────────────────────────────────────────────────────
  const addMsg = useCallback((role: "user" | "assistant", content: string, links?: ChatMessage["links"]) => {
    setMessages(prev => {
      const next = [...prev, { role, content, links }];
      // sync to session after state update
      if (currentId) setTimeout(() => syncSession(currentId, next), 0);
      return next;
    });
    if (role === "assistant") {
      speak(content, () => {
        // Auto-restart mic only when user is in voice mode
        if (openRef.current && !loadingRef.current && voiceModeRef.current) {
          startMicRef.current();
        }
      });
    }
  }, [speak, syncSession, currentId]);

  // ── Send message ───────────────────────────────────────────────────
  const sendMsg = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || loadingRef.current) return;
    setInput("");
    window.speechSynthesis?.cancel();
    stopMic(true); // keepVoiceMode=true so voice loop stays alive if user spoke

    // Add user message
    let newMessages: ChatMessage[] = [];
    setMessages(prev => {
      newMessages = [...prev, { role: "user", content: userText }];
      return newMessages;
    });
    setLoading(true);

    try {
      const history = messagesRef.current.slice(-12).map(m => ({ role: m.role, content: m.content }));
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
          if (wl.phone) links.push({
            label: `📱 WhatsApp — ${wl.customerName || wl.phone}`,
            url: buildWhatsAppLink(wl.phone, wl.message || ""),
          });
        }
      }

      setMessages(prev => {
        const next = [...prev, { role: "assistant" as const, content: aiMsg, links: links.length ? links : undefined }];
        if (currentId) setTimeout(() => syncSession(currentId, next), 0);
        return next;
      });

      // TTS + auto-mic (only in voice mode)
      speak(aiMsg, () => {
        if (openRef.current && !loadingRef.current && voiceModeRef.current) startMicRef.current();
      });

      if (data.action && data.action !== "none" && !data.needsMoreInfo) {
        await execAction(data.action, data.data || {});
      } else if (data.needsMoreInfo && data.data) {
        pendingCtx.current = { ...pendingCtx.current, ...data.data, pendingAction: data.action };
      }
    } catch {
      setMessages(prev => {
        const next = [...prev, { role: "assistant" as const, content: "Network error. API se connect nahi hua — please retry." }];
        if (currentId) setTimeout(() => syncSession(currentId, next), 0);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [buildContext, stopMic, speak, syncSession, currentId]);

  const sendMsgRef = useRef<(t: string) => void>(() => {});
  useEffect(() => { sendMsgRef.current = sendMsg; }, [sendMsg]);

  // ── Firebase actions ───────────────────────────────────────────────
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
          setMessages(prev => [...prev, { role: "assistant", content: `✅ "${data.name}" catalog mein add ho gaya!\nPrice: ${formatINR(Number(price))}\nBrand: ${brand || "—"}` }]);
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
          setMessages(prev => [...prev, { role: "assistant", content: `✅ Sale record ho gaya!\nCustomer: ${data.customerName}\nProduct: ${data.productName}\nAmount: ${formatINR(final)}` }]);
          toast.success(`Sale recorded for ${data.customerName}!`);
          break;
        }

        case "revert": {
          if (!lastAction) {
            setMessages(prev => [...prev, { role: "assistant", content: "Koi recent action nahi mila jo revert kar sakein." }]);
            break;
          }
          if (lastAction.firebasePath && lastAction.key) await remove(ref(db, `${lastAction.firebasePath}/${lastAction.key}`));
          setMessages(prev => [...prev, { role: "assistant", content: `↩️ "${lastAction.description}" delete ho gaya!` }]);
          toast.success("Last action reverted");
          setLastAction(null);
          break;
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Action mein error: ${e.message}` }]);
    }
  }, [lastAction, setLocation]);

  // ── New Chat ───────────────────────────────────────────────────────
  const startNewChat = useCallback((withGreeting = false) => {
    stopMic();
    window.speechSynthesis?.cancel();
    const id = genId();
    const session: ChatSession = { id, title: "Naya Chat", messages: [], createdAt: Date.now() };
    setSessions(prev => [session, ...prev]);
    setCurrentId(id);
    setMessages([]);
    pendingCtx.current = {};
    setLastAction(null);
    setDrawerOpen(false);

    if (withGreeting) {
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
          const msg = data.message || "Namaste! Ready hoon. Bolo kya karna hai?";
          setMessages([{ role: "assistant", content: msg }]);
          setSessions(prev => prev.map(s => s.id === id ? { ...s, messages: [{ role: "assistant", content: msg }] } : s));
          speak(msg, () => { if (openRef.current) startMicRef.current(); });
        } catch {
          const msg = "Namaste! 👋 Bolo kya karna hai!";
          setMessages([{ role: "assistant", content: msg }]);
          startMicRef.current();
        } finally {
          setLoading(false);
        }
      };
      doGreet();
      startMic();
    }
  }, [buildContext, stopMic, speak, startMic]);

  // ── Load existing session ──────────────────────────────────────────
  const loadSession = useCallback((session: ChatSession) => {
    stopMic();
    window.speechSynthesis?.cancel();
    setCurrentId(session.id);
    setMessages(session.messages);
    pendingCtx.current = {};
    setDrawerOpen(false);
  }, [stopMic]);

  // ── Delete session ─────────────────────────────────────────────────
  const deleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentId === id) startNewChat(false);
  }, [currentId, startNewChat]);

  // ── Open handler ───────────────────────────────────────────────────
  const handleOpen = useCallback(() => {
    setOpen(true);
    const existing = loadSessions();
    if (existing.length > 0) {
      // Load last session
      const last = existing[0];
      setCurrentId(last.id);
      setMessages(last.messages);
    } else {
      // First time — start new chat with greeting
      startNewChat(true);
      return;
    }
    // Start mic immediately (user gesture)
    startMic();
  }, [startNewChat, startMic]);

  const handleClose = useCallback(() => {
    setOpen(false);
    stopMic();
    window.speechSynthesis?.cancel();
  }, [stopMic]);

  const totalDue     = dues.reduce((s, d) => s + d.amount, 0);
  const overdueCount = dues.filter(d => d.dueDate && new Date(d.dueDate) < new Date()).length;

  // ── Closed FAB ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 relative"
        style={{ position: "fixed", bottom: 80, right: 20, zIndex: 50, background: "linear-gradient(135deg,#2e1065,#1e1b4b)", boxShadow: "0 0 0 2px rgba(139,92,246,0.6), 0 8px 32px rgba(124,58,237,0.7)" }}
        title="AI Assistant — Click to talk"
      >
        <img src="/images/ai-fab-icon.png" alt="AI" className="h-full w-full object-cover rounded-full" />
        {dues.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
            {dues.length}
          </span>
        )}
      </button>
    );
  }

  // ── Full-Screen Chat Page ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#0f0a1e" }}>

      {/* ── History Drawer (slides in from left) ── */}
      {drawerOpen && (
        <div className="absolute inset-0 z-10 flex" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-72 h-full flex flex-col overflow-hidden"
            style={{ background: "#1a1030", borderRight: "1px solid rgba(124,58,237,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-purple-900/40">
              <span className="text-sm font-bold text-white">Chat History</span>
              <button
                onClick={() => { startNewChat(true); setOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Naya Chat
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto py-2">
              {sessions.length === 0 ? (
                <div className="px-4 py-8 text-center text-purple-400 text-xs">
                  Abhi koi chat nahi hai
                </div>
              ) : sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => loadSession(s)}
                  className={`group flex items-center gap-2 px-3 py-3 mx-2 rounded-xl cursor-pointer transition-all mb-1 ${
                    s.id === currentId ? "bg-purple-800/50 border border-purple-600/40" : "hover:bg-white/5"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{s.title}</p>
                    <p className="text-[10px] text-purple-400 mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {" · "}{s.messages.length} msgs
                    </p>
                  </div>
                  <button
                    onClick={e => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-all shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" />
        </div>
      )}

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: "linear-gradient(135deg,#1a0a3e,#0f1a40)", borderBottom: "1px solid rgba(124,58,237,0.2)" }}
      >
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(d => !d)}
          className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/10 transition-colors relative"
        >
          <Menu className="h-5 w-5" />
          {sessions.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-500" />
          )}
        </button>

        {/* Title */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">AI Assistant</p>
            <p className="text-[10px] text-purple-400 mt-0.5 truncate">
              {listening ? "🎙 Sun raha hoon..." : loading ? "Soch raha hoon..." : "Super Computer Store"}
            </p>
          </div>
        </div>

        {/* Revert */}
        {lastAction && (
          <button
            onClick={() => execAction("revert", {})}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-300 border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Revert
          </button>
        )}

        {/* New chat shortcut */}
        <button
          onClick={() => startNewChat(true)}
          className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Naya Chat"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* TTS toggle */}
        <button
          onClick={() => { setTtsEnabled(e => !e); window.speechSynthesis?.cancel(); }}
          className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Voice toggle"
        >
          {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Due bar ── */}
      {dues.length > 0 && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2"
          style={{ background: "rgba(180,83,9,0.15)", borderBottom: "1px solid rgba(180,83,9,0.2)" }}>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">Due: {formatINR(totalDue)} ({dues.length} customers)</span>
          </div>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
              <AlertCircle className="h-3 w-3" /> {overdueCount} overdue
            </span>
          )}
        </div>
      )}

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 0 }}>
        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))", border: "2px solid rgba(124,58,237,0.4)" }}>
              <Sparkles className="h-10 w-10 text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Kya puchhna hai?</p>
              <p className="text-purple-400 text-sm mt-1">Voice ya text — dono se baat karo</p>
            </div>
            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {["Sabka due batao", "Overdue kaun hai?", "HP laptop add karo", "Offline sale banao", "Total revenue kitna hai?"].map(cmd => (
                <button
                  key={cmd}
                  onClick={() => { voiceModeRef.current = false; sendMsg(cmd); }}
                  className="px-3 py-2 rounded-full text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                  style={{ borderColor: "rgba(124,58,237,0.4)", color: "#c4b5fd", background: "rgba(124,58,237,0.1)" }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Initial loading */}
        {messages.length === 0 && loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            <p className="text-purple-400 text-sm">Connecting...</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            {msg.role === "assistant" && (
              <div className="flex items-center gap-1.5 mb-1 ml-1">
                <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </div>
                <span className="text-[10px] text-purple-400 font-medium">AI Assistant</span>
              </div>
            )}
            <div
              className="max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
              style={msg.role === "user"
                ? { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", borderBottomRightRadius: 4 }
                : { background: "rgba(255,255,255,0.07)", color: "#e2e8f0", borderBottomLeftRadius: 4, border: "1px solid rgba(124,58,237,0.15)" }
              }
            >
              {msg.content}
            </div>
            {msg.links?.map((lnk, j) => (
              <a
                key={j}
                href={lnk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 mt-1.5 rounded-xl text-xs font-bold shadow transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", maxWidth: "85%" }}
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lnk.label}</span>
                <ChevronRight className="h-3 w-3 shrink-0 ml-auto" />
              </a>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && messages.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Mic error ── */}
      {micError && (
        <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-red-300 font-medium"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          ⚠️ {micError}
        </div>
      )}

      {/* ── Bottom input area ── */}
      <div
        className="shrink-0 px-4 pt-3 pb-5"
        style={{ background: "rgba(15,10,30,0.95)", borderTop: "1px solid rgba(124,58,237,0.15)" }}
      >
        {/* Voice call button — centered, large */}
        <div className="flex justify-center mb-4">
          <div className="relative flex items-center justify-center">
            {/* Ripple rings when listening */}
            {listening && (
              <>
                <div className="absolute h-20 w-20 rounded-full animate-ping" style={{ background: "rgba(124,58,237,0.2)" }} />
                <div className="absolute h-24 w-24 rounded-full animate-ping" style={{ background: "rgba(124,58,237,0.1)", animationDelay: "0.3s" }} />
              </>
            )}
            <button
              onClick={listening ? () => stopMic() : startMic}
              className="relative h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95"
              style={listening
                ? { background: "linear-gradient(135deg,#dc2626,#b91c1c)", boxShadow: "0 0 0 4px rgba(220,38,38,0.3), 0 8px 32px rgba(220,38,38,0.4)" }
                : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 0 4px rgba(124,58,237,0.2), 0 8px 32px rgba(124,58,237,0.4)" }
              }
            >
              {listening
                ? <MicOff className="h-7 w-7 text-white" />
                : <Mic className="h-7 w-7 text-white" />
              }
            </button>
          </div>
        </div>

        {/* Listening status text */}
        <p className="text-center text-xs font-medium mb-3" style={{ color: listening ? "#4ade80" : "#6b7280" }}>
          {listening ? "🎙 Sun raha hoon... (band karne ke liye dabao)" : loading ? "Jawab aa raha hai..." : "Mic dabao aur bolna shuru karo"}
        </p>

        {/* Text input row */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 rounded-2xl px-4 py-2.5 border transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: listening ? "rgba(74,222,128,0.4)" : "rgba(124,58,237,0.25)" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && input.trim()) { e.preventDefault(); voiceModeRef.current = false; sendMsg(input); } }}
              placeholder="Ya type karke bhi poochh sakte ho..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              disabled={loading}
              style={{ caretColor: "#7c3aed" }}
            />
          </div>
          <button
            onClick={() => { if (input.trim()) { voiceModeRef.current = false; sendMsg(input); } }}
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-30 shrink-0 active:scale-95"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
