// Strategy Pattern: each refund policy decides how long a guest can cancel for a refund.
// Factory Pattern: refundPolicyFor() builds the strategy from the name stored on the event.

export const REFUND_POLICIES = ["flexible", "moderate", "strict"] as const;
export type RefundPolicyName = (typeof REFUND_POLICIES)[number];

const HOUR = 3_600_000;

export interface RefundPolicy {
  name: RefundPolicyName;
  label: string;
  // Last moment a cancellation still gets the ticket price back (null = never)
  refundableUntil(eventDate: Date): Date | null;
}

class WindowPolicy implements RefundPolicy {
  constructor(public name: RefundPolicyName, public label: string, private hoursBefore: number) {}
  refundableUntil(eventDate: Date): Date {
    return new Date(eventDate.getTime() - this.hoursBefore * HOUR);
  }
}

class StrictPolicy implements RefundPolicy {
  name = "strict" as const;
  label = "No refunds. You can transfer your ticket to a friend instead.";
  refundableUntil(): null {
    return null;
  }
}

const POLICIES: Record<RefundPolicyName, RefundPolicy> = {
  flexible: new WindowPolicy("flexible", "Full ticket refund up to 24 hours before the start.", 24),
  moderate: new WindowPolicy("moderate", "Full ticket refund up to 7 days before the start.", 24 * 7),
  strict: new StrictPolicy(),
};

export function refundPolicyFor(name: string | undefined): RefundPolicy {
  return POLICIES[name as RefundPolicyName] ?? POLICIES.flexible;
}

export type Breakdown = {
  subtotal: number;
  discount: number;
  fee: number;
  gst: number;
  protection: number;
  total: number;
  group?: number; // the part of `discount` that came from a group discount
};

// What a cancellation gives back. Refund Protection covers everything except its own fee
// until the event starts; otherwise the policy refunds the ticket price only (fees are kept).
export function refundFor(
  pricing: Breakdown,
  opts: { eventDate: Date; policy: string | undefined; protection: boolean; now?: Date }
): number {
  const now = opts.now ?? new Date();
  if (now >= opts.eventDate) return 0;
  if (opts.protection) return round(pricing.total - pricing.protection);
  const until = refundPolicyFor(opts.policy).refundableUntil(opts.eventDate);
  return until && now <= until ? round(pricing.subtotal - pricing.discount) : 0;
}

export const round = (n: number) => Math.round(n * 100) / 100;
