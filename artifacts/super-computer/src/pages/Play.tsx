import { Layout } from "@/components/layout/Layout";
import { useState, useRef } from "react";
import { PlayCircle, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const PROMO_CARDS = [
  {
    title: "Gaming Laptops",
    subtitle: "RTX Powered • Best Deals",
    href: "/products?category=cat-2",
    gradient: "from-purple-600 to-blue-600",
    emoji: "🎮",
  },
  {
    title: "Premium Laptops",
    subtitle: "Dell, HP, Lenovo & more",
    href: "/products?category=cat-1",
    gradient: "from-green-600 to-teal-600",
    emoji: "💻",
  },
  {
    title: "Today's Deals",
    subtitle: "Limited time offers",
    href: "/products?deals=true",
    gradient: "from-red-600 to-orange-500",
    emoji: "🔥",
  },
];

export default function Play() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0D1117]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0D1117]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <PlayCircle className="h-3.5 w-3.5 fill-green-400 text-green-400" />
            </div>
            <h1 className="text-white font-black text-lg">Play</h1>
            <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
          </div>
        </div>

        <div className="max-w-lg mx-auto">
          {/* Main Promo Video */}
          <div className="relative bg-black">
            <video
              ref={videoRef}
              src="/videos/promo.mp4"
              className="w-full aspect-video object-cover"
              loop
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />

            {/* Video overlay controls */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!playing && (
                <button
                  onClick={togglePlay}
                  className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-black/70 transition-all hover:scale-110"
                >
                  <PlayCircle className="h-7 w-7 fill-white text-white ml-1" />
                </button>
              )}
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end justify-between">
              <div>
                <p className="text-white font-bold text-sm">Super Computer Store</p>
                <p className="text-white/70 text-xs">Kasganj Road — Latest Arrivals & Offers</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleMute}
                  className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4 text-white" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-white" />
                  )}
                </button>
                <button
                  onClick={() => videoRef.current?.requestFullscreen()}
                  className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Maximize2 className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Play/Pause tap area */}
            {playing && (
              <div className="absolute inset-0" onClick={togglePlay} />
            )}
          </div>

          {/* Store info card */}
          <div className="mx-4 my-4 bg-[#161B22]/80 border border-white/8 rounded-2xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/30">
              <span className="text-black font-black text-lg">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white">Super Computer</p>
              <p className="text-slate-400 text-xs">Kasganj Road, Etah, UP</p>
              <p className="text-green-400 text-xs font-semibold mt-0.5">📞 9761809960</p>
            </div>
            <a href="tel:9761809960">
              <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl shrink-0 text-xs">
                Call Now
              </Button>
            </a>
          </div>

          {/* Promo Cards */}
          <div className="px-4 mb-4">
            <p className="text-white font-black mb-3 text-sm">🛍️ Explore Now</p>
            <div className="space-y-3">
              {PROMO_CARDS.map(({ title, subtitle, href, gradient, emoji }) => (
                <Link key={href} href={href}>
                  <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity`}>
                    <div>
                      <p className="text-white font-black text-base">{emoji} {title}</p>
                      <p className="text-white/80 text-xs mt-0.5">{subtitle}</p>
                    </div>
                    <div className="h-9 px-4 bg-white/20 backdrop-blur-sm rounded-xl text-white text-sm font-bold flex items-center">
                      Shop →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Visit Store CTA */}
          <div className="mx-4 mb-24 p-5 bg-gradient-to-br from-green-600/20 to-green-500/10 border border-green-500/30 rounded-2xl text-center">
            <p className="text-white font-black text-lg mb-1">Visit Our Store!</p>
            <p className="text-slate-400 text-sm mb-4">Mirehachi, Kasganj Road, Distt. Etah</p>
            <div className="flex gap-3 justify-center">
              <a href="tel:9761809960">
                <Button className="bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl">
                  📞 Call Us
                </Button>
              </a>
              <a href="https://wa.me/919761809960" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-green-500/40 text-green-400 hover:bg-green-500/10 rounded-xl">
                  💬 WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
