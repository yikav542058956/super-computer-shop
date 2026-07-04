import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ref, push, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Sparkles, X, Mic, MicOff, Send, Loader2, RotateCcw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LastAction {
  type: string;
  firebasePath?: string;
  key?: string;
  description: string;
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function AdminAIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Namaste! Main aapka admin assistant hoon 🤖\n\nAap mujhse baat kar sakte hain:\n• \"HP laptop add karo\"\n• \"Offline sale banao\"\n• \"Orders dikhao\"\n• \"Dashboard par jao\"\n\nKya karna hai aaj?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track current collection context for multi-turn product/sale creation
  const pendingContextRef = useRef<any>({});

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); return; }
    const recognition = new SR();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    addMessage("user", userText);
    setLoading(true);

    const context = pendingContextRef.current;

    try {
      const chatMessages: Message[] = [
        ...messages,
        { role: "user", content: userText },
      ];

      const res = await fetch("/api/admin-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Shared token to guard the AI endpoint from unauthenticated abuse
          "x-admin-ai-token": import.meta.env.VITE_ADMIN_AI_TOKEN || "super-computer-admin",
        },
        body: JSON.stringify({
          messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      const data = await res.json();
      const aiMsg: string = data.message || "Kuch error hua, dobara try karo.";
      addMessage("assistant", aiMsg);

      // Handle action
      if (data.action && data.action !== "none" && !data.needsMoreInfo) {
        await executeAction(data.action, data.data || {});
      } else if (data.needsMoreInfo) {
        // Store partial data for multi-turn
        if (data.data) {
          pendingContextRef.current = { ...pendingContextRef.current, ...data.data, pendingAction: data.action };
        }
      }
    } catch (e: any) {
      addMessage("assistant", "Sorry, network error hua. API se connect nahi ho paya.");
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, data: any) => {
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
          // First, fetch specs from AI
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
            } catch {}
          }

          const productRef = push(ref(db, "products"));
          const productData = {
            name: data.name,
            brand: data.brand || "",
            category: data.category || "Laptops",
            price: Number(price) || 0,
            discountPrice: Number(price) || 0,
            stock: 1,
            description: "",
            specs,
            images: [],
            status: "active",
            isFeatured: false,
            isNewArrival: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            addedByAI: true,
          };

          await set(productRef, productData);
          setLastAction({
            type: "add_product",
            firebasePath: "products",
            key: productRef.key!,
            description: `Product "${data.name}" added`,
          });
          pendingContextRef.current = {};
          addMessage("assistant", `✅ "${data.name}" catalog mein add ho gaya!\n\nPrice: ${formatINR(Number(price))}\nBrand: ${data.brand || "Unknown"}\n\nProducts page par jaake details edit kar sakte hain.`);
          toast.success(`AI: Product "${data.name}" added!`);
          break;
        }

        case "create_sale": {
          if (!data.customerName || !data.productName || !data.amount) break;
          const saleRef = push(ref(db, "orders"));
          const gstRate = Number(data.gstRate) || 0;
          const subtotal = Number(data.amount) || 0;
          const gstAmount = Math.round((subtotal * gstRate) / 100);
          const finalAmount = subtotal + gstAmount;

          await set(saleRef, {
            source: "offline",
            orderStatus: "delivered",
            paymentStatus: "paid",
            paymentMethod: data.paymentMethod || "cash",
            finalAmount,
            subtotal,
            gstAmount,
            gstRate,
            deliveryCharge: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            addedByAI: true,
            address: {
              name: data.customerName,
              phone: data.phone || "",
              city: "Walk-in",
              state: "",
              pincode: "",
              address: data.address || "In-store / Offline sale",
            },
            items: [{
              name: data.productName,
              qty: Number(data.qty) || 1,
              price: subtotal,
            }],
            statusHistory: [{ status: "delivered", timestamp: Date.now(), note: "Added by AI assistant" }],
          });
          setLastAction({
            type: "create_sale",
            firebasePath: "orders",
            key: saleRef.key!,
            description: `Sale for ${data.customerName} — ${formatINR(finalAmount)}`,
          });
          pendingContextRef.current = {};
          addMessage("assistant", `✅ Sale record ho gaya!\n\nCustomer: ${data.customerName}\nProduct: ${data.productName}\nAmount: ${formatINR(finalAmount)}\nPayment: ${data.paymentMethod || "Cash"}\n\nOrders page mein dekh sakte hain.`);
          toast.success(`AI: Sale recorded for ${data.customerName}!`);
          break;
        }

        case "revert": {
          await handleRevert();
          break;
        }

        default:
          pendingContextRef.current = {};
          break;
      }
    } catch (e: any) {
      addMessage("assistant", `Action execute karne mein error hua: ${e.message}`);
    }
  };

  const handleRevert = async () => {
    if (!lastAction) return;
    try {
      if (lastAction.firebasePath && lastAction.key) {
        await remove(ref(db, `${lastAction.firebasePath}/${lastAction.key}`));
      }
      addMessage("assistant", `↩️ Revert ho gaya! "${lastAction.description}" delete kar diya.`);
      toast.success("Last AI action reverted");
      setLastAction(null);
    } catch (e: any) {
      addMessage("assistant", `Revert nahi hua: ${e.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickCommands = [
    "HP laptop add karo",
    "Dashboard dikhao",
    "Offline sale banao",
    "Orders dikhao",
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}
        title="AI Assistant"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width: 360,
        maxHeight: minimized ? 60 : 520,
        background: "#fff",
        border: "1px solid rgba(124,58,237,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        transition: "max-height 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        onClick={() => setMinimized(m => !m)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">AI Assistant</span>
          {loading && <Loader2 className="h-3.5 w-3.5 text-purple-200 animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          {lastAction && (
            <button
              onClick={e => { e.stopPropagation(); handleRevert(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
              title={`Revert: ${lastAction.description}`}
            >
              <RotateCcw className="h-3 w-3" /> Revert
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setMinimized(m => !m); }} className="text-purple-200 hover:text-white p-1">
            <ChevronDown className={`h-4 w-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
          </button>
          <button onClick={e => { e.stopPropagation(); setOpen(false); setMinimized(false); }} className="text-purple-200 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 340 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
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
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-slate-100 text-slate-400 text-sm flex items-center gap-1.5">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick commands */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
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

          {/* Input */}
          <div className="p-3 border-t border-slate-100 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-purple-300 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? "Sun raha hoon..." : "Type karo ya mic use karo..."}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                disabled={loading}
              />
            </div>
            <button
              onClick={listening ? stopListening : startListening}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                listening ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-600"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
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
