"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import type { Announcement } from "@/types";
import s from "../dashboard.module.css";

// Post an update; every ticket holder gets it in their notifications and on the event page
export default function Announcements({ eventId, items, disabled }: { eventId: string; items: Announcement[]; disabled: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.postAnnouncement(eventId, body.trim());
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.announce}>
      {!disabled && (
        <form onSubmit={submit} className={s.announce}>
          <label className="sr-only" htmlFor="update">Update</label>
          <textarea id="update" className="input" rows={3} maxLength={1000} required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Doors moved to 7pm. Bring a photo ID." />
          {error && <p className="alert alert-error" role="alert"><WarningCircle size={16} aria-hidden="true" /> {error}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !body.trim()} style={{ width: "fit-content" }}>
            <Megaphone size={16} weight="bold" aria-hidden="true" /> {busy ? "Posting…" : "Post to ticket holders"}
          </button>
        </form>
      )}
      {items.length === 0 ? (
        <p className="muted small">No updates yet.</p>
      ) : (
        items.map((u) => (
          <div key={u._id} className={s.post}>
            <p>{u.body}</p>
            <span className="tag muted">{formatDate(u.createdAt, { day: "numeric", month: "short" })}, {formatTime(u.createdAt)}</span>
          </div>
        ))
      )}
    </div>
  );
}
