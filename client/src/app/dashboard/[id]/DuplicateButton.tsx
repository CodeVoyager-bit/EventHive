"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "@phosphor-icons/react";
import { api } from "@/lib/api";

// Run it again: a draft copy a week later, opened straight in the editor
export default function DuplicateButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span style={{ display: "grid", gap: 4, justifyItems: "end" }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const copy = await api.duplicateEvent(eventId);
            router.push(`/dashboard/${copy._id}/edit`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not duplicate");
            setBusy(false);
          }
        }}
      >
        <Copy size={16} weight="bold" aria-hidden="true" /> {busy ? "Copying…" : "Run it again"}
      </button>
      {error && <span className="small" role="alert" style={{ color: "var(--danger-text)" }}>{error}</span>}
    </span>
  );
}
