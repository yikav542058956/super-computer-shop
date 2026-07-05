import type { ComponentType } from "react";
import { Flame, Gift, ShieldCheck, PartyPopper, Sparkles } from "lucide-react";
import { OFFER_TYPE_META, type ProductOffer, type OfferType } from "@/lib/offers";

const OFFER_TYPE_ICON: Record<OfferType, ComponentType<{ size?: number; className?: string }>> = {
  sale: Flame,
  gift: Gift,
  warranty: ShieldCheck,
  festival: PartyPopper,
  custom: Sparkles,
};

interface Props {
  offers?: ProductOffer[] | null;
  /** "compact" for small product-card tags, "full" for the product detail page */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Customer-facing display of the offers attached to a product:
 * sale/discount, free gift, warranty, festival offer, etc.
 */
export default function OfferBadges({ offers, variant = "compact", className = "" }: Props) {
  if (!offers || offers.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {offers.map((offer) => {
          const meta = OFFER_TYPE_META[offer.type];
          const Icon = OFFER_TYPE_ICON[offer.type];
          return (
            <span
              key={offer.id}
              className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
              title={offer.description}
            >
              <Icon size={11} className="flex-shrink-0" />
              <span className="truncate max-w-[110px]">{offer.name}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {offers.map((offer) => {
        const meta = OFFER_TYPE_META[offer.type];
        const Icon = OFFER_TYPE_ICON[offer.type];
        return (
          <div
            key={offer.id}
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
          >
            <span
              className="flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center"
              style={{ background: "#ffffff", color: meta.color }}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight" style={{ color: meta.color }}>
                {offer.name}
              </p>
              {offer.description && (
                <p className="text-xs mt-0.5 leading-snug" style={{ color: meta.color, opacity: 0.85 }}>
                  {offer.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
