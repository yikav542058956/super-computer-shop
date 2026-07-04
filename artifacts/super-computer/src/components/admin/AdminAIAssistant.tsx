import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ref, push, set, remove, get, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  Sparkles, X, Mic, MicOff, Send, Loader2, RotateCcw,
  ChevronDown, Volume2, VolumeX, ExternalLink, IndianRupee,
  AlertCircle, Phone
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; url: string; type: "whatsapp" | "navigate" | "link" }[];
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
  const cleaned = phone.replace(/\D/g, "").replace(/^0+/, "");
  const num = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function AdminAIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! 👋 Main hoon Super Computer ka AI assistant.\n\nMujhe bolo — mujhe poori store ki jankari hai: dues, customers, orders, products sab!\n\nBoliye ya mic press karo...",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [, setLocation] = useLocation();

  // Admin data loaded from Firebase
  const [dues, setDues] = useState<LedgerEntry[]>([]);
  const [adminStats, setAdminStats] = useState({ totalOrders: 0, totalProducts: 0, totalRevenue: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingContextRef = useRef<any>({});
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Load Firebase data ────────────────────────────────────────
  useEffect(() => {
    const ledgerRef = ref(db, "ledger");
    const handleLedger = (snap: any) => {
      if (snap.exists()) {
        const entries: LedgerEntry[] = Object.entries(snap.val())
          .map(([id, v]: any) => ({ id, ...v }))
          .filter((e: LedgerEntry) => e.status === "pending");
        setDues(entries);
      } else {
        setDues([]);
      }
    };
    onValue(ledgerRef, handleLedger);

    // One-time fetch for stats
    Promise.all([
      get(ref(db, "orders")),
      get(ref(db, "products")),
    ]).then(([ordersSnap, productsSnap]) => {
      let totalOrders = 0, totalRevenue = 0;
      if (ordersSnap.exists()) {
        const orders = Object.values(ordersSnap.val()) as any[];
        totalOrders = orders.length;
        totalRevenue = orders.reduce((s: number, o: any) => s + (Number(o.finalAmount) || 0), 0);
      }
      const totalProducts = productsSnap.exists() ? Object.keys(productsSnap.val()).length : 0;
      setAdminStats({ totalOrders, totalProducts, totalRevenue });
    });

    return () => off(ledgerRef, "value", handleLedger);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ── Auto-start voice when panel opens ────────────────────────
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => {
        inputRef.current?.focus();
        startListening();
      }, 400);
    } else if (!open) {
      stopListening();
      window.speechSynthesis?.cancel();
    }
  }, [open, minimized]);

  // ── Text-to-Speech ────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Strip markdown-like syntax for cleaner speech
    const clean = text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[✅❌⚠️🎉👋📊💬🔔]/g, "")
      .replace(/\*+/g, "")
      .replace(/\n+/g, ". ")
      .trim()
      .slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "hi-IN";
    utterance.rate = 1.05;
    utterance.pitch = 1;
    // Prefer Hindi voice if available
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find(v => v.lang.startsWith("hi")) || voices.find(v => v.lang.startsWith("en-IN"));
    if (hiVoice) utterance.voice = hiVoice;
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const addMessage = useCallback((role: "user" | "assistant", content: string, links?: Message["links"]) => {
    setMessages(prev => [...prev, { role, content, links }]);
    if (role === "assistant") speak(content);
  }, [speak]);

  // ── Voice Recognition ─────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    try {
      if (recognitionRef.current) recognitionRef.current.abort();
      const recognition = new SR();
      recognition.lang = "hi-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript.trim();
        setListening(false);
        if (transcript) {
          setInput(transcript);
          // Auto-send after a short pause
          setTimeout(() => sendMessageRef.current(transcript), 100);
        }
      };
      recognition.start();
    } catch { setListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort();
    setListening(false);
  }, []);

  // Keep sendMessage in a ref so the voice callback can access latest version
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  const buildContext = useCallback(() => {
    const totalDue = dues.reduce((s, d) => s + d.amount, 0);
    const overdue = dues.filter(d => d.dueDate && new Date(d.dueDate) < new Date());
    return {
      storeInfo: { name: "Super Computer", location: "India" },
      stats: adminStats,
      dues: {
        total: totalDue,
        count: dues.length,
        overdueCount: overdue.length,
        entries: dues.map(d => ({
          id: d.id,
          customer: d.customerName,
          phone: d.phone || "",
          amount: d.amount,
          dueDate: d.dueDate || null,
          billNo: d.billNo || "",
          product: d.productName || "",
          isOverdue: d.dueDate ? new Date(d.dueDate) < new Date() : false,
        })),
      },
      adminPanelRoutes: {
        dashboard: "/admin/dashboard",
        products: "/admin/products",
        orders: "/admin/orders",
        offlineSale: "/admin/offline-sale",
        ledger: "/admin/ledger",
      },
    };
  }, [dues, adminStats]);

  const sendMessage = useCallback(async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    window.speechSynthesis?.cancel();
    addMessage("user", userText);
    setLoading(true);

    const context = { ...buildContext(), ...pendingContextRef.current };

    try {
      const chatMessages: Message[] = [
        ...messages.filter(m => m.role === "user" || m.role === "assistant").slice(-10),
        { role: "user", content: userText },
      ];

      const res = await fetch("/api/admin-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-ai-token": import.meta.env.VITE_ADMIN_AI_TOKEN || "super-computer-admin",
        },
        body: JSON.stringify({ messages: chatMessages, context }),
      });

      const data = await res.json();
      const aiMsg: string = data.message || "Kuch error hua, dobara try karo.";
      const links: Message["links"] = [];

      // Build WhatsApp links if AI returned them
      if (data.whatsappLinks && Array.isArray(data.whatsappLinks)) {
        for (const wl of data.whatsappLinks) {
          if (wl.phone) {
            links.push({
              label: `📱 WhatsApp: ${wl.customerName || wl.phone}`,
              url: buildWhatsAppLink(wl.phone, wl.message || ""),
              type: "whatsapp",
            });
          }
        }
      }

      addMessage("assistant", aiMsg, links.length > 0 ? links : undefined);

      if (data.action && data.action !== "none" && !data.needsMoreInfo) {
        await executeAction(data.action, data.data || {});
      } else if (data.needsMoreInfo && data.data) {
        pendingContextRef.current = { ...pendingContextRef.current, ...data.data, pendingAction: data.action };
      }
    } catch {
      addMessage("assistant", "Network error. API se connect nahi hua, please retry.");
    } finally {
      setLoading(false);
      // Resume listening after response
      setTimeout(() => {
        if (open && !minimized) startListening();
      }, 800);
    }
  }, [input, loading, messages, addMessage, buildContext, open, minimized, startListening]);

  // Keep ref in sync
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const executeAction = useCallback(async (action: string, data: any) => {
    try {
      switch (action) {
        case "navigate": {
          const path = data.path || "/admin/dashboard";
          setLocation(path);
          pendingContextRef.current = {};
          break;
        }

        case "add_product": {
          if (!data.name) break;
          let specs = data.specs || {};
          let price = data.price;

          if (!price || Object.keys(specs).length === 0) {
            try {
              const specRes = await fetch("/api/fetch-specs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: data.name, brand: data.brand }),
              });
              const specData = await specRes.json();
              if (specData.mrp) price = specData.mrp;
              if (specData.specs) specs = specData.specs;
              if (!data.brand && specData.brand) data.brand = specData.brand;
              if (!data.category && specData.category) data.category = specData.category;
            } catch { /* spec fetch optional */ }
          }

          const productRef = push(ref(db, "products"));
          await set(productRef, {
            name: data.name, brand: data.brand || "", category: data.category || "Laptops",
            price: Number(price) || 0, discountPrice: Number(price) || 0,
            stock: 1, description: "", specs, images: [], status: "active",
            isFeatured: false, isNewArrival: true,
            createdAt: Date.now(), updatedAt: Date.now(), addedByAI: true,
          });
          setLastAction({ type: "add_product", firebasePath: "products", key: productRef.key!, description: `"${data.name}" added` });
          pendingContextRef.current = {};
          addMessage("assistant", `✅ "${data.name}" catalog mein add ho gaya!\nPrice: ${formatINR(Number(price))}\nBrand: ${data.brand || "—"}`);
          toast.success(`AI: "${data.name}" added!`);
          break;
        }

        case "create_sale": {
          if (!data.customerName || !data.productName || !data.amount) break;
          const saleRef = push(ref(db, "orders"));
          const gstRate = Number(data.gstRate) || 0;
          const subtotal = Number(data.amount);
          const gstAmount = Math.round((subtotal * gstRate) / 100);
          const finalAmount = subtotal + gstAmount;
          await set(saleRef, {
            source: "offline", orderStatus: "delivered", paymentStatus: "paid",
            paymentMethod: data.paymentMethod || "cash",
            finalAmount, subtotal, gstAmount, gstRate, deliveryCharge: 0,
            createdAt: Date.now(), updatedAt: Date.now(), addedByAI: true,
            address: { name: data.customerName, phone: data.phone || "", city: "Walk-in", state: "", pincode: "", address: "In-store / Offline sale" },
            items: [{ name: data.productName, qty: Number(data.qty) || 1, price: subtotal }],
            statusHistory: [{ status: "delivered", timestamp: Date.now(), note: "Added by AI assistant" }],
          });
          setLastAction({ type: "create_sale", firebasePath: "orders", key: saleRef.key!, description: `Sale: ${data.customerName}` });
          pendingContextRef.current = {};
          addMessage("assistant", `✅ Sale record ho gaya!\nCustomer: ${data.customerName}\nProduct: ${data.productName}\nAmount: ${formatINR(finalAmount)}`);
          toast.success(`AI: Sale recorded for ${data.customerName}!`);
          break;
        }

        case "revert": {
          if (!lastAction) { addMessage("assistant", "Koi recent action nahi mila jo revert kar sakein."); break; }
          if (lastAction.firebasePath && lastAction.key) {
            await remove(ref(db, `${lastAction.firebasePath}/${lastAction.key}`));
          }
          addMessage("assistant", `↩️ Revert ho gaya! "${lastAction.description}" delete kar diya.`);
          toast.success("Last action reverted");
          setLastAction(null);
          break;
        }

        default:
          pendingContextRef.current = {};
      }
    } catch (e: any) {
      addMessage("assistant", `Action mein error: ${e.message}`);
    }
  }, [lastAction, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const totalDue = dues.reduce((s, d) => s + d.amount, 0);
  const overdueCount = dues.filter(d => d.dueDate && new Date(d.dueDate) < new Date()).length;

  const quickCommands = [
    "Sabka due amount batao",
    "Kaun overdue hai?",
    "HP laptop add karo",
    "Offline sale banao",
  ];

  // ── Closed button ─────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center justify-center h-16 w-16 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 8px 32px rgba(124,58,237,0.45)" }}
        title="AI Assistant — Voice + Chat"
      >
        <Sparkles className="h-6 w-6 text-white" />
        {dues.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow">
            {dues.length}
          </span>
        )}
      </button>
    );
  }

  // ── Open panel ────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
      style={{
        width: 370,
        maxHeight: minimized ? 56 : 560,
        background: "#fff",
        border: "1.5px solid rgba(124,58,237,0.2)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        transition: "max-height 0.3s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 cursor-pointer select-none"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        onClick={() => setMinimized(m => !m)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">AI Assistant</span>
          {loading && <Loader2 className="h-3.5 w-3.5 text-purple-200 animate-spin ml-1" />}
          {listening && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-300 animate-pulse ml-1">
              <span className="h-2 w-2 rounded-full bg-green-400 inline-block" /> Sun raha hoon...
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          {lastAction && (
            <button
              onClick={() => executeAction("revert", {})}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
              title={`Revert: ${lastAction.description}`}
            >
              <RotateCcw className="h-3 w-3" /> Revert
            </button>
          )}
          <button
            onClick={() => { setTtsEnabled(e => !e); window.speechSynthesis?.cancel(); }}
            className="p-1.5 text-purple-200 hover:text-white transition-colors"
            title={ttsEnabled ? "Mute voice" : "Unmute voice"}
          >
            {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setMinimized(m => !m)} className="p-1.5 text-purple-200 hover:text-white transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
          </button>
          <button onClick={() => { setOpen(false); setMinimized(false); stopListening(); window.speechSynthesis?.cancel(); }} className="p-1.5 text-purple-200 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── Due summary bar ── */}
          {dues.length > 0 && (
            <div className="shrink-0 px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-800">
                  Total due: {formatINR(totalDue)} ({dues.length} customers)
                </span>
              </div>
              {overdueCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                  <AlertCircle className="h-3 w-3" /> {overdueCount} overdue
                </span>
              )}
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0, maxHeight: 340 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[87%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "text-slate-800 rounded-bl-sm"
                  }`}
                  style={{
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                      : "#f1f5f9",
                  }}
                >
                  {msg.content}
                </div>
                {/* Action links (WhatsApp, navigate) */}
                {msg.links && msg.links.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1.5 max-w-[87%] w-full">
                    {msg.links.map((lnk, j) => (
                      <a
                        key={j}
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95 ${
                          lnk.type === "whatsapp"
                            ? "bg-green-500 text-white shadow"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {lnk.type === "whatsapp" ? <Phone className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        {lnk.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
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

          {/* ── Quick commands (first visit) ── */}
          {messages.length <= 1 && (
            <div className="shrink-0 px-3 pb-2 flex flex-wrap gap-1.5">
              {quickCommands.map(cmd => (
                <button
                  key={cmd}
                  onClick={() => sendMessage(cmd)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:bg-purple-50"
                  style={{ borderColor: "rgba(124,58,237,0.3)", color: "#7c3aed" }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}

          {/* ── Input row ── */}
          <div className="shrink-0 p-3 border-t border-slate-100 flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${
              listening ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-200 focus-within:border-purple-300"
            }`}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? "🎙 Sun raha hoon..." : "Type karo ya mic dabao..."}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                disabled={loading}
              />
            </div>
            <button
              onClick={listening ? stopListening : startListening}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                listening
                  ? "bg-red-500 text-white shadow-lg scale-110 animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-600"
              }`}
              title={listening ? "Stop listening" : "Start voice"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
