import { Link } from "wouter";
import { Phone, Mail, MapPin, Instagram, Youtube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 text-slate-500">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <span className="text-black font-black text-sm">S</span>
              </div>
              <div>
                <span className="text-gray-900 font-black text-base">SUPER </span>
                <span className="font-black text-base" style={{ color: "#16a34a" }}>COMPUTER</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              {t("footer_tagline")}
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
            <h4 className="font-bold text-gray-800 mb-5 text-sm uppercase tracking-wider">{t("quick_links")}</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/about",              label: t("about_us") },
                { href: "/contact",            label: t("contact_page") },
                { href: "/products",           label: t("all_products") },
                { href: "/products?deals=true",label: t("todays_deals") },
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
            <h4 className="font-bold text-gray-800 mb-5 text-sm uppercase tracking-wider">{t("categories_label")}</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/products?category=cat-1", label: t("laptops_cat") },
                { href: "/products?category=cat-2", label: t("gaming_laptops") },
                { href: "/products?category=cat-3", label: t("accessories_cat") },
                { href: "/products",                label: t("desktop_pcs") },
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
            <h4 className="font-bold text-gray-800 mb-5 text-sm uppercase tracking-wider">{t("contact_us")}</h4>
            <div className="space-y-2 text-sm mb-6">
              <p className="text-slate-400">📞 +91 9761809960</p>
              <p className="text-slate-400">📧 info@supercomputer.in</p>
              <p className="text-slate-400">🕐 Mon–Sat: 9AM – 8PM</p>
            </div>
            <div className="flex gap-3">
              {[
                { Icon: Instagram, href: "#", color: "hover:text-pink-400",  name: "instagram" },
                { Icon: Youtube,   href: "#", color: "hover:text-red-400",   name: "youtube" },
              ].map(({ Icon, href, color, name }) => (
                <a key={name} href={href}
                  className={`h-9 w-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-slate-500 ${color} transition-all hover:border-gray-300`}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 py-5 text-center">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Super Computer. {t("rights_reserved")} | Mirehachi, Kasganj Road, Distt. Etah
        </p>
      </div>
    </footer>
  );
};
