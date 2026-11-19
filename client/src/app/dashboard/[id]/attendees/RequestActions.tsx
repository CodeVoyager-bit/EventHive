"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "@phosphor-icons/react";
import { api } from "@/lib/api";

// Approve (charges and issues tickets) or decline (frees the seats and promotes the waitlist)
export default function RequestActions({ bookingId, name }: { bookingId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "approve" | "decline">("");
  const [error, setError] = useState("");

  async function act(kind: "approve" | "decline") {
    setBusy(kind);
    setError("");
    try {
      await (kind === "approve" ? api.approveBooking(bookingId) : api.declineBooking(bookingId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => act("decline")} aria-label={`Decline ${name}`}>
          <X size={15} weight="bold" aria-hidden="true" /> {busy === "decline" ? "Declining…" : "Decline"}
        </button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act("approve")} aria-label={`Approve ${name}`}>
          <Check size={15} weight="bold" aria-hidden="true" /> {busy === "approve" ? "Approving…" : "Approve"}
        </button>
      </div>
      {error && <p className="small" style={{ color: "var(--danger-text)" }} role="alert">{error}</p>}
    </div>
  );
}
