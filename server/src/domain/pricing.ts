import { Breakdown, round } from "./policies";

// The platform's cut, shown to buyers as one line plus GST (all-in pricing, no surprise at the end).
export const FEE_RATE = 0.025;
export const FEE_PER_TICKET = 10; // rupees
export const GST_RATE = 0.18; // GST on the platform fee
export const PROTECTION_RATE = 0.06; // Refund Protection add-on

// Strategy Pattern: a promo code is either a percentage or a flat amount off.
type Discount = (subtotal: number, amount: number) => number;
const DISCOUNTS: Record<"percent" | "flat", Discount> = {
  percent: (subtotal, pct) => (subtotal * Math.min(pct, 100)) / 100,
  flat: (_subtotal, rupees) => rupees,
};

export type GroupDiscount = { minQty: number; percent: number };

export type QuoteInput = {
  unitPrice: number;
  quantity: number;
  promo?: { kind: "percent" | "flat"; amount: number } | null;
  group?: GroupDiscount | null; // e.g. 10% off orders of 4 or more
  protection: boolean;
  freeProtection?: boolean; // waitlist bookings get it on the house
  absorbFees: boolean;
};

export type Quote = Breakdown & { payout: number; absorbFees: boolean };

export function quote(input: QuoteInput): Quote {
  const subtotal = round(input.unitPrice * input.quantity);
  // A group discount comes off first; a promo code then applies to what's left
  const group = input.group && input.quantity >= input.group.minQty ? round(DISCOUNTS.percent(subtotal, input.group.percent)) : 0;
  const promo = input.promo ? DISCOUNTS[input.promo.kind](subtotal - group, input.promo.amount) : 0;
  const discount = round(Math.min(subtotal, group + promo));
  const net = round(subtotal - discount);
  const fee = net > 0 ? round(net * FEE_RATE + FEE_PER_TICKET * input.quantity) : 0;
  const gst = round(fee * GST_RATE);
  const protection = input.protection && net > 0 && !input.freeProtection ? round(net * PROTECTION_RATE) : 0;
  const buyerFees = input.absorbFees ? 0 : fee + gst;
  return {
    subtotal,
    discount,
    group,
    fee,
    gst,
    protection,
    total: round(net + buyerFees + protection),
    payout: round(net - (input.absorbFees ? fee + gst : 0)), // what the host receives
    absorbFees: input.absorbFees,
  };
}
