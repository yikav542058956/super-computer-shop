import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Share2, Bookmark, Eye, Volume2, VolumeX,
  ShoppingCart, MessageCircle, Play as PlayIcon, Pause, ChevronUp, ChevronDown,
  Star, BadgeCheck, ArrowLeft,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Video data ──────────────────────────── */
const VIDEOS = [
  {
    id: "v1",
    src: "/videos/promo.mp4",
    title: "HP EliteBook 840 G5 — Full Condition Test",
    type: "Condition Test",
    views: "24.5K",
    likes: 1842,
    seller: "Super Computer",
    location: "Kasganj Road, Etah UP",
    product: {
      name: "HP EliteBook 840 G5",
      price: 32999,
      oldPrice: 42000,
      rating: 4.7,
      reviews: 128,
      image: "/images/laptops/hp-elitebook.png",
    },
  },
  {
    id: "v2",
    src: "/videos/promo.mp4",
    title: "Dell Latitude 5490 — Keyboard & Speed Test",
    type: "Speed Test",
    views: "18.2K",
    likes: 976,
    seller: "Super Computer",
    location: "Kasganj Road, Etah UP",
    product: {
      name: "Dell Latitude 5490 i5",
      price: 28500,
      oldPrice: 36000,
      rating: 4.5,
      reviews: 94,
      image: "/images/laptops/dell-latitude.png",
    },
  },
  {
    id: "v3",
    src: "/videos/promo.mp4",
    title: "Lenovo ThinkPad X1 — Battery Backup Test",
    type: "Battery Test",
    views: "31.1K",
    likes: 2310,
    seller: "Super Computer",
    location: "Kasganj Road, Etah UP",
    product: {
      name: "Lenovo ThinkPad X1 Carbon",
      price: 45999,
      oldPrice: 58000,
      rating: 4.8,
      reviews: 203,
      image: "/images/laptops/lenovo-thinkpad.png",
    },
  },
  {
    id: "v4",
    src: "/videos/promo.mp4",
    title: "ASUS Gaming Laptop — FPS & Display Test",
    type: "Gaming Test",
    views: "42.8K",
    likes: 3190,
    seller: "Super Computer",
    location: "Kasganj Road, Etah UP",
    product: {
      name: "ASUS TUF Gaming F15",
      price: 54999,
      oldPrice: 68000,
      rating: 4.6,
      reviews: 317,
      image: "/images/laptops/asus-gaming.png",
    },
  },
];

/* ─── Single Reel ─────────────────────────── */
function Reel({ video, isActive }: { video: typeof VIDEOS[0]; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addToCart } = useCart();
  const [, setLocation] = useLocation();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const disc = Math.round(((video.product.oldPrice - video.product.price) / video.product.oldPrice) * 100);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ productId: video.id, name: video.product.name, price: video.product.price, qty: 1, image: video.product.image });
    toast.success("Added to cart!");
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = `Hi! I saw the video and I'm interested in *${video.product.name}* at ${formatINR(video.product.price)}. Please share more details.`;
    window.open(`https://wa.me/919761809960?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="relative w-full h-full bg-black flex-shrink-0" onClick={togglePlay}>
      {/* Video */}
      <video
        ref={videoRef}
        src={video.src}
        className="w-full h-full object-cover"
        loop playsInline muted={muted}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.4) 100%)" }} />

      {/* Play/Pause center indicator */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <PlayIcon size={28} className="fill-white text-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 pointer-events-none">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
          🎬 {video.type}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
          <Eye size={11} /> {video.views}
        </span>
      </div>

      {/* Right action buttons */}
      <div className="absolute right-3 bottom-52 flex flex-col gap-5 items-center pointer-events-auto" onClick={e => e.stopPropagation()}>
        {/* Like */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className={`h-11 w-11 rounded-full flex items-center justify-center ${liked ? "bg-red-500" : "bg-black/50 backdrop-blur-sm border border-white/20"}`}>
            <Heart size={20} className={liked ? "fill-white text-white" : "text-white"} />
          </div>
          <span className="text-white text-[10px] font-bold">{likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}</span>
        </motion.button>

        {/* Share */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={e => { e.stopPropagation(); toast("Share link copied!"); }} className="flex flex-col items-center gap-1">
          <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Share2 size={20} className="text-white" />
          </div>
          <span className="text-white text-[10px] font-bold">Share</span>
        </motion.button>

        {/* Save */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={e => { e.stopPropagation(); setSaved(s => !s); toast(saved ? "Removed from saved" : "Video saved!"); }} className="flex flex-col items-center gap-1">
          <div className={`h-11 w-11 rounded-full flex items-center justify-center ${saved ? "bg-[#22C55E]" : "bg-black/50 backdrop-blur-sm border border-white/20"}`}>
            <Bookmark size={20} className={saved ? "fill-white text-white" : "text-white"} />
          </div>
          <span className="text-white text-[10px] font-bold">Save</span>
        </motion.button>

        {/* Mute */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={e => { e.stopPropagation(); setMuted(m => !m); }} className="flex flex-col items-center gap-1">
          <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            {muted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
          </div>
        </motion.button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
        {/* Seller */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center font-black text-black text-sm flex-shrink-0"
            style={{ background: "#22C55E" }}>S</div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm leading-none">{video.seller}</p>
            <p className="text-white/80 text-[10px] mt-0.5">{video.location}</p>
          </div>
          <button className="px-3 py-1 rounded-full text-[11px] font-bold border border-white/40 text-white">
            Follow
          </button>
        </div>

        {/* Video title */}
        <p className="text-white font-semibold text-[13px] leading-snug mb-3">{video.title}</p>

        {/* Product card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-3 flex gap-3"
          style={{ background: "rgba(17,24,39,0.92)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
        >
          {/* Image */}
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: "#F8FAFC" }}>
            <img src={video.product.image} alt={video.product.name}
              className="w-full h-full object-contain p-1"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[12px] leading-snug line-clamp-1">{video.product.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex items-center gap-0.5 bg-[#16A34A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                <Star size={7} className="fill-white" /> {video.product.rating}
              </span>
              <span className="text-white/70 text-[10px]">({video.product.reviews})</span>
              <BadgeCheck size={11} className="text-[#3B82F6]" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-white font-black text-[14px]">{formatINR(video.product.price)}</span>
              <span className="text-white/60 line-through text-[10px]">{formatINR(video.product.oldPrice)}</span>
              <span className="text-[#22C55E] text-[10px] font-bold">{disc}% off</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 justify-center flex-shrink-0">
            <button
              onClick={handleCart}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-black"
              style={{ background: "#22C55E" }}
            >
              <ShoppingCart size={11} /> Add
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-white"
              style={{ background: "#25D366" }}
            >
              <MessageCircle size={11} /> Book
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Main Play Page ──────────────────────── */
export default function Play() {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touching, setTouching] = useState(false);
  const touchStart = useRef(0);

  const goNext = useCallback(() => setCurrent(c => Math.min(c + 1, VIDEOS.length - 1)), []);
  const goPrev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  /* Scroll wheel */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (e.deltaY > 30) goNext();
        else if (e.deltaY < -30) goPrev();
      }, 50);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [goNext, goPrev]);

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-safe">
        <button onClick={() => window.history.back()} className="h-9 w-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 mt-2">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-5 w-5 rounded-lg flex items-center justify-center" style={{ background: "#22C55E" }}>
            <PlayIcon size={10} className="fill-black text-black ml-0.5" />
          </div>
          <span className="text-white font-black text-base">Play</span>
          <span className="text-[9px] font-bold text-red-400 bg-red-400/20 border border-red-400/30 px-1.5 py-0.5 rounded-full">LIVE</span>
        </div>
        <div className="w-9 mt-2" />
      </div>

      {/* Reel container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={e => { touchStart.current = e.touches[0].clientY; setTouching(true); }}
        onTouchEnd={e => {
          if (!touching) return;
          const diff = touchStart.current - e.changedTouches[0].clientY;
          if (diff > 60) goNext();
          else if (diff < -60) goPrev();
          setTouching(false);
        }}
      >
        <motion.div
          className="flex flex-col"
          animate={{ y: `-${current * 100}%` }}
          transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: `${VIDEOS.length * 100}%` }}
        >
          {VIDEOS.map((video, i) => (
            <div key={video.id} style={{ height: `${100 / VIDEOS.length}%` }}>
              <Reel video={video} isActive={i === current} />
            </div>
          ))}
        </motion.div>

        {/* Side scroll indicators */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none z-10">
          {current > 0 && (
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronUp size={14} className="text-white" />
            </div>
          )}
          {current < VIDEOS.length - 1 && (
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronDown size={14} className="text-white" />
            </div>
          )}
        </div>

        {/* Dot indicators */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-none z-10 mt-16">
          {VIDEOS.map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: i === current ? 24 : 6, opacity: i === current ? 1 : 0.4 }}
              transition={{ duration: 0.25 }}
              className="w-1 rounded-full"
              style={{ background: i === current ? "#22C55E" : "#fff" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
