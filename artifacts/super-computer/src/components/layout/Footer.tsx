import { Link } from "wouter";
import { Phone, Mail, MapPin, Instagram, Youtube } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[#0A0E13] border-t border-white/8 text-slate-400">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <span className="text-black font-black text-sm">S</span>
              </div>
              <div>
                <span className="text-white font-black text-base">SUPER </span>
                <span className="text-green-400 font-black text-base">COMPUTER</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Your trusted destination for laptops, gaming gear, and tech accessories in Kasganj.
            </p>
            <div className="space-y-2 text-sm">
              <a href="tel:9761809960" className="flex items-center gap-2 text-slate-400 hover:text-green-400 transition-colors">
                <Phone className="h-4 w-4 text-green-500" />9761809960
              </a>
              <a href="mailto:info@supercomputer.in" className="flex items-center gap-2 text-slate-400 hover:text-green-400 transition-colors">
                <Mail className="h-4 w-4 text-green-500" />info@supercomputer.in
              </a>
              <div className="flex items-start gap-2 text-slate-500">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Mirehachi, Kasganj Road, Distt. Etah, UP</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/about",   label: "About Us" },
                { href: "/contact", label: "Contact Us" },
                { href: "/products",label: "All Products" },
                { href: "/products?deals=true", label: "Today's Deals" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-slate-400 hover:text-green-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">Categories</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/products?category=cat-1", label: "Laptops" },
                { href: "/products?category=cat-2", label: "Gaming Laptops" },
                { href: "/products?category=cat-3", label: "Accessories" },
                { href: "/products",                label: "Desktop PCs" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-slate-400 hover:text-green-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Social */}
          <div>
            <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">Contact Us</h4>
            <div className="space-y-2 text-sm mb-6">
              <p className="text-slate-400">📞 +91 9761809960</p>
              <p className="text-slate-400">📧 info@supercomputer.in</p>
              <p className="text-slate-400">🕐 Mon–Sat: 9AM – 8PM</p>
            </div>
            <div className="flex gap-3">
              {[
                { Icon: Instagram, href: "#", color: "hover:text-pink-400" },
                { Icon: Youtube,   href: "#", color: "hover:text-red-400" },
              ].map(({ Icon, href, color }) => (
                <a key={href} href={href}
                  className={`h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 ${color} transition-all hover:border-white/20`}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["VISA", "Mastercard", "UPI", "Paytm"].map(p => (
                <span key={p} className="text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400 px-2 py-1 rounded">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 py-5 text-center">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} Super Computer. All rights reserved. | Mirehachi, Kasganj Road, Distt. Etah
        </p>
      </div>
    </footer>
  );
};
