import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Tag } from "lucide-react";
import { OFFER_TYPE_META, OFFER_TYPE_ORDER, newOfferId, type OfferType, type ProductOffer } from "@/lib/offers";

interface Props {
  offers: ProductOffer[];
  onChange: (offers: ProductOffer[]) => void;
}

/**
 * Admin-side editor to attach one or more offers to a product:
 * seasonal sale (e.g. "Summer Sale"), free gift, warranty, festival offer, etc.
 * Shown on the customer side as badges on the product card & product page.
 */
export default function OffersEditor({ offers, onChange }: Props) {
  const addOffer = () => {
    onChange([...offers, { id: newOfferId(), type: "sale", name: "", description: "" }]);
  };

  const updateOffer = (idx: number, patch: Partial<ProductOffer>) => {
    const next = [...offers];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeOffer = (idx: number) => {
    onChange(offers.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Offers on this product</Label>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Add a sale (e.g. Summer Sale), a free gift, a warranty, or a festival offer — these show as badges to the customer.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOffer}>
          <Plus className="h-3 w-3 mr-1" /> Add Offer
        </Button>
      </div>

      {offers.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
          No offers added. Click "Add Offer" to attach a sale, free gift, warranty, or festival offer.
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer, idx) => {
            const meta = OFFER_TYPE_META[offer.type];
            return (
              <div
                key={offer.id}
                className="rounded-xl p-3 space-y-2 border"
                style={{ background: meta.bg, borderColor: meta.border }}
              >
                <div className="flex gap-2 items-start">
                  <div className="w-40 flex-shrink-0 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-500">Offer Type</Label>
                    <Select
                      value={offer.type}
                      onValueChange={(v: OfferType) => updateOffer(idx, { type: v })}
                    >
                      <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OFFER_TYPE_ORDER.map((t) => (
                          <SelectItem key={t} value={t}>
                            {OFFER_TYPE_META[t].emoji} {OFFER_TYPE_META[t].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-500">Offer Name</Label>
                    <Input
                      value={offer.name}
                      onChange={(e) => updateOffer(idx, { name: e.target.value })}
                      placeholder={meta.placeholder}
                      className="bg-white h-8 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOffer(idx)}
                    className="mt-5 text-slate-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-slate-500">Details (optional)</Label>
                  <Input
                    value={offer.description || ""}
                    onChange={(e) => updateOffer(idx, { description: e.target.value })}
                    placeholder={meta.descPlaceholder}
                    className="bg-white h-8 text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
