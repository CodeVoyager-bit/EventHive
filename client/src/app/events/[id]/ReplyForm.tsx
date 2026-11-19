"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChatCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";

// The host answers a review in public; the reviewer is notified
export default function ReplyForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.replyToReview(reviewId, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the reply");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        <ChatCircle size={16} weight="bold" aria-hidden="true" /> Reply as host
      </button>
    );
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <label className="sr-only" htmlFor={`reply-${reviewId}`}>Your reply</label>
      <textarea id={`reply-${reviewId}`} className="input" rows={2} required maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Thank them, or say what you'll change" />
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Posting…" : "Post reply"}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
