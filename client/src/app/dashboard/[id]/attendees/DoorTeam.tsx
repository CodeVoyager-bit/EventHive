"use client";

import { useState, type FormEvent } from "react";
import { DoorOpen, UserPlus } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { TeamMember } from "@/types";
import s from "./attendees.module.css";

// Hosts add door helpers by email. Helpers scan and admit from their own phone (Door duty in
// My Tickets) but never see emails, money or settings.
export default function DoorTeam({ eventId, initial }: { eventId: string; initial: TeamMember[] }) {
  const [team, setTeam] = useState(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function change(key: string, action: () => Promise<TeamMember[]>, done: string) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      setTeam(await action());
      setNotice(done);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (await change("add", () => api.addToTeam(eventId, value), `Added. They've been sent a link to the door desk.`)) setEmail("");
  }

  return (
    <section className={s.section} aria-labelledby="door-team">
      <h2 id="door-team" className="h2"><DoorOpen size={28} weight="bold" aria-hidden="true" /> Door team</h2>
      <p className="muted">Busy door? Add helpers by the email they use on EventHive. They can scan tickets and admit guests from their phone, but can&apos;t see emails, money or settings.</p>
      {team.length > 0 && (
        <ul className={s.team}>
          {team.map((m) => (
            <li key={m._id} className={s.member}>
              <span className={s.memberAvatar} aria-hidden="true">{initials(m.name)}</span>
              <div>
                <strong>{m.name}</strong>
                <span className="small muted">{m.email}</span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => change(m._id, () => api.removeFromTeam(eventId, m._id), `${m.name} can no longer check guests in.`)}>
                {busy === m._id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className={s.teamForm}>
        <label className="sr-only" htmlFor="team-email">Helper&apos;s email</label>
        <input id="team-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="helper@example.com" autoComplete="off" spellCheck={false} />
        <button type="submit" className="btn btn-secondary" disabled={!!busy}>
          <UserPlus size={18} weight="bold" aria-hidden="true" /> {busy === "add" ? "Adding…" : "Add to door team"}
        </button>
      </form>
      {error && <p className="alert alert-error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      <p className="small muted" role="status" style={{ marginTop: 8 }}>{notice}</p>
    </section>
  );
}
