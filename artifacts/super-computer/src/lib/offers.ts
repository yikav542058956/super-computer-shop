/**
 * Shared "Offer" types used by both the admin product form and the
 * customer-facing pages (Home, Search, Product Detail).
 *
 * A product can have multiple offers attached — e.g. a seasonal sale
 * ("Summer Sale"), a free gift, a warranty promise, or a festival offer.
 */

export type OfferType = "sale" | "gift" | "warranty" | "festival" | "custom";

export interface ProductOffer {
  id: string;
  type: OfferType;
  /** Short headline shown to the customer, e.g. "Summer Sale", "Free Wireless Mouse" */
  name: string;
  /** Optional extra detail, e.g. "20% off on all gaming laptops" or "Worth ₹999, free with this order" */
  description?: string;
}

export const OFFER_TYPE_META: Record<
  OfferType,
  { label: string; emoji: string; color: string; bg: string; border: string; placeholder: string; descPlaceholder: string }
> = {
  sale: {
    label: "Sale / Discount Offer",
    emoji: "🔥",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    placeholder: "e.g. Summer Sale, Republic Day Sale",
    descPlaceholder: "e.g. Flat 20% off, valid till 31 July",
  },
  gift: {
    label: "Free Gift",
    emoji: "🎁",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    placeholder: "e.g. Free Wireless Mouse",
    descPlaceholder: "e.g. Worth ₹999 — free with this order",
  },
  warranty: {
    label: "Warranty",
    emoji: "🛡️",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    placeholder: "e.g. 1 Year Warranty, 2 Year Extended Warranty",
    descPlaceholder: "e.g. Covers manufacturing defects, onsite service",
  },
  festival: {
    label: "Festival Offer",
    emoji: "🎉",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    placeholder: "e.g. Diwali Dhamaka, Holi Special",
    descPlaceholder: "e.g. Extra 10% cashback + free gift wrap",
  },
  custom: {
    label: "Other Offer",
    emoji: "✨",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    placeholder: "e.g. Student Offer, Exchange Bonus",
    descPlaceholder: "Details of the offer",
  },
};

export const OFFER_TYPE_ORDER: OfferType[] = ["sale", "festival", "gift", "warranty", "custom"];

export function newOfferId(): string {
  return `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalize whatever comes back from Firebase (array or null) into a ProductOffer[] */
export function normalizeOffers(raw: any): ProductOffer[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  return (arr as any[])
    .filter((o) => o && o.name)
    .map((o) => ({
      id: o.id || newOfferId(),
      type: (o.type as OfferType) || "custom",
      name: String(o.name),
      description: o.description ? String(o.description) : undefined,
    }));
}
