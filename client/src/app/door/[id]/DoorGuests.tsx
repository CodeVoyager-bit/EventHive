"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Users } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import type { DoorDesk } from "@/types";
import s from "./door.module.css";

// Everyone with a valid ticket, people still to arrive first. Admit by name when a guest's phone has died.
export default function DoorGuests({ guests }: { guests: DoorDesk["guests"] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const q = query.trim().toLowerCase();
  const shown = guests
    .filter((g) => !q || `${g.holderName} ${g.ref}`.toLowerCase().includes(q))
    .sort((a, b) => Number(!!a.checkedInAt) - Number(!!b.checkedInAt) || a.holderName.localeCompare(b.holderName));

  async function admit(id: string) {
    setBusy(id);
    setError("");
    try {
      await api.admit(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not admit this guest");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={s.section} aria-labelledby="door-guests">
      <div className={s.listHead}>
        <h2 id="door-guests" className="h2">Guests</h2>
        {guests.length > 0 && (
          <>
            <label className="sr-only" htmlFor="guest-search">Search guests</label>
            <input id="guest-search" type="search" className="input" placeholder="Name or ticket reference" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
          </>
        )}
      </div>
      {error && <p className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {guests.length === 0 ? (
        <div className="empty">
          <span className="empty-art"><Users size={32} weight="bold" aria-hidden="true" /></span>
          <h3 className="h3">No tickets yet</h3>
          <p>Guests show up here as soon as they book.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="muted">Nobody matches “{query}”.</p>
      ) : (
        <ul className={s.guests}>
          {shown.map((g) => (
            <li key={g._id} className={s.guest} data-in={!!g.checkedInAt}>
              <div>
                <strong>{g.holderName}</strong>
                <span className="mono small muted">{g.tierName} · {g.ref}</span>
              </div>
              {g.checkedInAt ? (
                <span className="badge badge-success"><CheckCircle size={14} weight="bold" aria-hidden="true" /> In at {formatTime(g.checkedInAt)}</span>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => admit(g._id)}>
                  {busy === g._id ? "Admitting…" : "Admit"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
