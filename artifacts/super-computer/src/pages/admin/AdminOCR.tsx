import { AdminLayout } from "@/components/layout/AdminLayout";
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ScanText, Upload, Loader2, Copy, Download, Trash2,
  ImageIcon, CheckCheck, Languages, X,
} from "lucide-react";

type LangMode = "auto" | "hindi" | "english";

const LANG_OPTIONS: { value: LangMode; label: string }[] = [
  { value: "auto",    label: "Auto Detect" },
  { value: "hindi",   label: "Hindi / हिंदी" },
  { value: "english", label: "English" },
];

export default function AdminOCR() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lang, setLang] = useState<LangMode>("auto");
  const [extracting, setExtracting] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image files allowed hain (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File bahut badi hai — max 10 MB allowed hai (tumhari file: ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    setImageFile(file);
    setOcrText("");
    setWarning("");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleExtract = async () => {
    if (!imageFile) { toast.error("Pehle photo upload karo"); return; }
    setExtracting(true);
    setWarning("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const res = await fetch("/api/groq/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type, lang }),
      });
      // Guard against non-JSON responses (413, 502, network proxy errors)
      const contentType = res.headers.get("content-type") || "";
      let data: any;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const raw = await res.text();
        if (!res.ok) throw new Error(res.status === 413 ? "Photo bahut badi hai — chhoti photo try karo" : raw || "OCR failed");
        data = { text: raw };
      }
      if (!res.ok) throw new Error(data?.error || "OCR failed");

      if (data.warning) {
        setWarning(data.warning);
        if (data.text) setOcrText(data.text);
        toast.warning(data.warning);
      } else {
        setOcrText(data.text || "");
        if (data.text) {
          toast.success(`Text extract ho gaya! (${data.chars || data.text.length} characters)`);
        } else {
          toast.info("Koi text nahi mila is photo mein");
        }
      }
    } catch (e: any) {
      const msg = e.message?.includes("fetch") ? "Network error — internet check karo" : e.message;
      toast.error("OCR failed: " + msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setCopied(true);
      toast.success("Text clipboard mein copy ho gaya!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard API
      const ta = document.createElement("textarea");
      ta.value = ocrText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      toast.success("Text copy ho gaya!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!ocrText) return;
    const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Text file download ho gayi!");
  };

  const handleClear = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setOcrText("");
    setWarning("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <ScanText className="h-6 w-6 text-violet-600" />
            <h1 className="text-xl font-black text-slate-800">Extract Text (OCR)</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Koi bhi photo upload karo — printed, handwritten, Hindi ya English — AI text nikal dega.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Left: Upload + Settings ── */}
          <div className="space-y-4">
            {/* Language select */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" /> Language / Bhasha
              </Label>
              <div className="flex gap-2">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLang(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      lang === opt.value
                        ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !imageFile && fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                ${dragOver ? "border-violet-400 bg-violet-50" : imageFile ? "border-slate-200 cursor-default" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/40"}
              `}
              style={{ minHeight: 260 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Uploaded"
                    className="w-full object-contain max-h-72 rounded-xl"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                    {imageFile?.name}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 select-none">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600">Photo yahan drop karo</p>
                    <p className="text-xs text-slate-400 mt-0.5">ya click karke select karo</p>
                    <p className="text-[10px] text-slate-300 mt-2">JPG, PNG, WEBP — max 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload button if no file, else Extract button */}
            {!imageFile ? (
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Upload className="h-4 w-4" /> Photo Select Karo
              </Button>
            ) : (
              <Button
                onClick={handleExtract}
                disabled={extracting}
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white text-base font-bold h-12"
              >
                {extracting
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Text Extract Ho Raha Hai…</>
                  : <><ScanText className="h-5 w-5" /> Extract Text</>
                }
              </Button>
            )}

            {/* Tips */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">📷 Best Results Ke Liye:</p>
              <ul className="space-y-0.5 list-disc list-inside text-amber-600">
                <li>Seedha, clear photo lo — blur nahi</li>
                <li>Achhi roshni mein photo lo</li>
                <li>Text pura frame mein aana chahiye</li>
                <li>Hindi text ke liye "Hindi" option select karo</li>
              </ul>
            </div>
          </div>

          {/* ── Right: Extracted Text ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500 flex items-center gap-1">
                <ScanText className="h-3.5 w-3.5" />
                Extracted Text
                {ocrText && (
                  <span className="ml-1.5 text-slate-400 font-normal">
                    ({ocrText.length} chars)
                  </span>
                )}
              </Label>
              {ocrText && (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      copied
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600"
                    }`}
                  >
                    {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" /> .txt
                  </button>
                  <button
                    onClick={() => setOcrText("")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {warning && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium">
                ⚠️ {warning}
              </div>
            )}

            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder={
                extracting
                  ? "Text extract ho raha hai…"
                  : "Text yahan dikhega jab aap photo upload karke Extract karoge.\n\nAap yahan manually bhi type/edit kar sakte ho."
              }
              className={`w-full rounded-xl border text-sm p-4 resize-none font-mono leading-relaxed outline-none transition-colors
                ${ocrText ? "border-violet-200 bg-violet-50/30 text-slate-800" : "border-slate-200 bg-slate-50 text-slate-400"}
                focus:border-violet-400 focus:bg-white
              `}
              style={{ minHeight: 380 }}
            />

            {!ocrText && !extracting && (
              <div className="text-center py-2">
                <p className="text-xs text-slate-400">
                  Photo upload karo → Extract Text dabao → Text yahan aayega
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
