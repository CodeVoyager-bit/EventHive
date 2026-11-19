"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChatCircleText, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/api";

// Ask the host: guests post a question, the host answers in public, either can remove it.
// Each form refreshes the server-rendered list when it succeeds.

function useSubmit(action: () => Promise<unknown>, fallback: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function AskForm({ eventId }: { eventId: string }) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useSubmit(() => api.askHost(eventId, body.trim()), "Could not send your question");

  async function submit(e: FormEvent) {
    if (await run(e)) {
      setBody("");
      setSent(true);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, marginTop: 16 }}>
      <label className="label" htmlFor="ask-host">Ask the host</label>
      <textarea
        id="ask-host"
        className="input"
        rows={2}
        required
        maxLength={500}
        value={body}
        onChange={(e) => { setBody(e.target.value); setSent(false); }}
        placeholder="Parking, accessibility, what to bring…"
      />
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={busy || !body.trim()}>
          {busy ? "Sending…" : "Send question"}
        </button>
        <span className="small muted" role="status">
          {sent ? "Sent. You'll get a notification when the host answers." : "Only you and the host see it until it's answered."}
        </span>
      </div>
    </form>
  );
}

export function AnswerForm({ eventId, questionId }: { eventId: string; questionId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const { busy, error, run } = useSubmit(() => api.answerQuestion(eventId, questionId, body.trim()), "Could not post the answer");

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        <ChatCircleText size={16} weight="bold" aria-hidden="true" /> Answer
      </button>
    );
  }
  return (
    <form onSubmit={run} style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <label className="sr-only" htmlFor={`answer-${questionId}`}>Your answer</label>
      <textarea id={`answer-${questionId}`} className="input" rows={2} required maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Everyone will see this answer" autoFocus />
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>{busy ? "Posting…" : "Post answer"}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export function RemoveQuestion({ eventId, questionId, label }: { eventId: string; questionId: string; label: string }) {
  const { busy, error, run } = useSubmit(() => api.removeQuestion(eventId, questionId), "Could not remove it");
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => run()} disabled={busy}>
        <Trash size={15} weight="bold" aria-hidden="true" /> {busy ? "Removing…" : label}
      </button>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
    </>
  );
}
