import type { RefundPolicy } from "@/types";

// Mirrors server/src/domain/policies.ts (shown to buyers before they pay)
export const REFUND_COPY: Record<RefundPolicy, { label: string; detail: string }> = {
  flexible: { label: "Flexible", detail: "Full ticket refund up to 24 hours before the start." },
  moderate: { label: "Moderate", detail: "Full ticket refund up to 7 days before the start." },
  strict: { label: "Strict", detail: "No refunds. You can transfer your ticket to a friend instead." },
};
export const policyCopy = (p: string | undefined) => REFUND_COPY[(p as RefundPolicy) ?? "flexible"] ?? REFUND_COPY.flexible;

export const FEE_COPY = "Platform fee is 2.5% + ₹10 per ticket, plus 18% GST on the fee. Free tickets have no fees.";

// What cancelling would give back right now (mirrors refundFor on the server)
export function refundPreview(b: { status: string; protection: boolean; pricing: { subtotal: number; discount: number; total: number; protection: number } }, eventDate: string, policy: string | undefined): number {
  const start = new Date(eventDate).getTime();
  const now = Date.now();
  if (b.status === "pending" || now >= start) return 0;
  if (b.protection) return Math.round((b.pricing.total - b.pricing.protection) * 100) / 100;
  const hours = policy === "moderate" ? 24 * 7 : policy === "strict" ? null : 24;
  return hours !== null && now <= start - hours * 3_600_000 ? b.pricing.subtotal - b.pricing.discount : 0;
}
