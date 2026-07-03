import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

interface WhatsAppButtonProps {
  productName?: string;
  productPrice?: number;
  productBrand?: string;
}

function WhatsAppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path
        fillRule="evenodd" clipRule="evenodd"
        d="M34.2 13.7C31.8 11.3 28.6 10 25.2 10C18.1 10 12.4 15.7 12.4 22.8C12.4 25.1 13 27.3 14.2 29.2L12 36L19.1 33.9C20.9 34.9 23 35.5 25.2 35.5C32.3 35.5 38 29.8 38 22.7C38 19.3 36.6 16.1 34.2 13.7ZM25.2 33.3C23.2 33.3 21.3 32.8 19.6 31.8L19.2 31.6L15.1 32.7L16.3 28.7L16 28.3C14.9 26.5 14.3 24.4 14.3 22.2C14.3 16.5 19 11.8 24.7 11.8C27.5 11.8 30.1 12.9 32 14.9C33.9 16.8 35 19.4 35 22.2C35.3 28.3 30.9 33.3 25.2 33.3ZM30.9 25.1C30.6 24.9 29.1 24.2 28.8 24.1C28.5 24 28.3 23.9 28.1 24.2C27.9 24.5 27.3 25.2 27.2 25.4C27 25.6 26.9 25.6 26.6 25.5C26.3 25.3 25.3 25 24.1 23.9C23.2 23.1 22.6 22.1 22.4 21.8C22.2 21.5 22.4 21.3 22.5 21.1C22.7 21 22.8 20.8 23 20.6C23.1 20.4 23.2 20.3 23.3 20.1C23.4 19.9 23.4 19.7 23.3 19.6C23.2 19.4 22.6 17.9 22.3 17.3C22 16.7 21.8 16.8 21.6 16.8H21C20.8 16.8 20.5 16.9 20.2 17.2C20 17.5 19.2 18.2 19.2 19.7C19.2 21.2 20.2 22.6 20.4 22.9C20.6 23.1 22.6 26.1 25.6 27.4C26.3 27.7 26.9 27.9 27.4 28C28.1 28.2 28.7 28.2 29.2 28.1C29.8 28 30.9 27.4 31.2 26.7C31.4 26 31.4 25.4 31.3 25.3C31.2 25.2 31.1 25.2 30.9 25.1Z"
        fill="white"
      />
    </svg>
  );
}

export function WhatsAppFloat({ productName, productPrice, productBrand }: WhatsAppButtonProps) {
  const [waNumber, setWaNumber] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const r = ref(db, "settings/whatsappNumber");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) setWaNumber(snap.val());
    });
    const t = setTimeout(() => setVisible(true), 800);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  if (!waNumber) return null;

  const digits = waNumber.replace(/\D/g, "");
  const isProduct = !!productName;

  const msg = isProduct
    ? `Hello! 👋 I'm interested in the *${productName}*${productBrand ? ` by *${productBrand}*` : ""}.\n\nPrice I saw: *₹${productPrice?.toLocaleString("en-IN")}*\n\nCould you please share more details — availability, warranty, and best price? 🙏`
    : "Hi! I visited the Super Computer website and need some help. 🙏";

  const url = `https://wa.me/91${digits}?text=${encodeURIComponent(msg)}`;

  const tooltipText = isProduct
    ? `Ask about ${productName?.split(" ").slice(0, 3).join(" ")}...`
    : "Chat with us on WhatsApp";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={`fixed bottom-24 right-5 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="relative group">
        {/* Outer pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />

        {/* Button */}
        <div
          className="relative h-14 w-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          style={{
            background: "linear-gradient(145deg, #2ecc71, #25D366, #128C7E)",
            boxShadow: "0 4px 20px rgba(37,211,102,0.5), 0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {/* Real WhatsApp icon — white paths on transparent */}
          <svg viewBox="0 0 48 48" fill="none" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd" clipRule="evenodd"
              d="M34.2 13.7C31.8 11.3 28.6 10 25.2 10C18.1 10 12.4 15.7 12.4 22.8C12.4 25.1 13 27.3 14.2 29.2L12 36L19.1 33.9C20.9 34.9 23 35.5 25.2 35.5C32.3 35.5 38 29.8 38 22.7C38 19.3 36.6 16.1 34.2 13.7ZM25.2 33.3C23.2 33.3 21.3 32.8 19.6 31.8L19.2 31.6L15.1 32.7L16.3 28.7L16 28.3C14.9 26.5 14.3 24.4 14.3 22.2C14.3 16.5 19 11.8 24.7 11.8C27.5 11.8 30.1 12.9 32 14.9C33.9 16.8 35 19.4 35 22.2C35.3 28.3 30.9 33.3 25.2 33.3ZM30.9 25.1C30.6 24.9 29.1 24.2 28.8 24.1C28.5 24 28.3 23.9 28.1 24.2C27.9 24.5 27.3 25.2 27.2 25.4C27 25.6 26.9 25.6 26.6 25.5C26.3 25.3 25.3 25 24.1 23.9C23.2 23.1 22.6 22.1 22.4 21.8C22.2 21.5 22.4 21.3 22.5 21.1C22.7 21 22.8 20.8 23 20.6C23.1 20.4 23.2 20.3 23.3 20.1C23.4 19.9 23.4 19.7 23.3 19.6C23.2 19.4 22.6 17.9 22.3 17.3C22 16.7 21.8 16.8 21.6 16.8H21C20.8 16.8 20.5 16.9 20.2 17.2C20 17.5 19.2 18.2 19.2 19.7C19.2 21.2 20.2 22.6 20.4 22.9C20.6 23.1 22.6 26.1 25.6 27.4C26.3 27.7 26.9 27.9 27.4 28C28.1 28.2 28.7 28.2 29.2 28.1C29.8 28 30.9 27.4 31.2 26.7C31.4 26 31.4 25.4 31.3 25.3C31.2 25.2 31.1 25.2 30.9 25.1Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Tooltip — shows on hover, slides from right */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-xl"
            style={{ background: "linear-gradient(135deg,#075e54,#128C7E)" }}
          >
            <p className="text-[10px] font-bold text-green-200 mb-0.5">WhatsApp Support</p>
            <p>{tooltipText}</p>
            {isProduct && productPrice && (
              <p className="text-[10px] text-green-200 mt-0.5">₹{productPrice.toLocaleString("en-IN")}</p>
            )}
            {/* Arrow */}
            <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-[#075e54]" />
          </div>
        </div>
      </div>
    </a>
  );
}

export function WhatsAppProductButton({ productName, productPrice }: WhatsAppButtonProps) {
  const [waNumber, setWaNumber] = useState<string>("");

  useEffect(() => {
    const r = ref(db, "settings/whatsappNumber");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) setWaNumber(snap.val());
    });
    return () => unsub();
  }, []);

  if (!waNumber) return null;

  const digits = waNumber.replace(/\D/g, "");
  const msg = productName
    ? `Hi! I'm interested in *${productName}*${productPrice ? ` (Price: ₹${productPrice.toLocaleString("en-IN")})` : ""}. I found it on SuperComputer website. Can you please help me?`
    : "Hi! I visited SuperComputer website and need help.";

  const url = `https://wa.me/91${digits}?text=${encodeURIComponent(msg)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
      <button
        className="w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-3 text-base transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-500/30"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        <WhatsAppIcon size={22} />
        Ask on WhatsApp
      </button>
    </a>
  );
}
