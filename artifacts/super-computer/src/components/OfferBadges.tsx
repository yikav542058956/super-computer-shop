import { OFFER_TYPE_META, type ProductOffer } from "@/lib/offers";

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
          return (
            <span
              key={offer.id}
              className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
              title={offer.description}
            >
              <span>{meta.emoji}</span>
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
        return (
          <div
            key={offer.id}
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
          >
            <span className="text-lg leading-none mt-0.5">{meta.emoji}</span>
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
