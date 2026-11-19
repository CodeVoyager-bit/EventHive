"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadSimple, MagnifyingGlass, SealCheck } from "@phosphor-icons/react";
import { downloadCsv, slug } from "@/lib/csv";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import s from "./attendees.module.css";

export type GuestRow = {
  ticketId: string;
  holder: string;
  buyer: string;
  email: string;
  tier: string;
  ref: string;
  status: "valid" | "void";
  checkedInAt: string | null;
  transferred: boolean;
  answers: string;
  referrer: string;
  bookedAt: string;
};

// Searchable list of every ticket, with a manual admit (after checking ID) and a CSV export
export default function GuestList({ rows, eventTitle }: { rows: GuestRow[]; eventTitle: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? rows.filter((r) => [r.holder, r.buyer, r.email, r.ref, r.tier].some((v) => v.toLowerCase().includes(needle))) : rows;
  }, [q, rows]);

  async function admit(id: string) {
    setBusy(id);
    setError("");
    try {
      await api.admit(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not admit");
    } finally {
      setBusy("");
    }
  }

  function exportCsv() {
    downloadCsv(
      `${slug(eventTitle)}-guests.csv`,
      ["Ticket holder", "Booked by", "Email", "Tier", "Reference", "Status", "Checked in", "Answers", "Referred by", "Booked at"],
      rows.map((r) => [r.holder, r.buyer, r.email, r.tier, r.ref, r.status, r.checkedInAt ?? "", r.answers, r.referrer, r.bookedAt])
    );
  }

  return (
    <div className={s.guests}>
      <div className={s.guestTools}>
        <label className={s.search}>
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
          <span className="sr-only">Search guests</span>
          <input type="search" placeholder="Name, email or ticket reference" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv}>
          <DownloadSimple size={16} weight="bold" aria-hidden="true" /> Export CSV
        </button>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="table-wrap card-flat">
        <table className="table">
          <thead>
            <tr><th>Ticket holder</th><th>Tier</th><th>Ref</th><th>Booked by</th><th>Door</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ticketId} style={r.status === "void" ? { opacity: 0.5 } : undefined}>
                <td>
                  <strong>{r.holder}</strong>
                  {r.transferred && <span className="badge badge-quiet" style={{ marginLeft: 6 }}>Sent by friend</span>}
                  {r.answers && <span className={s.answers}>{r.answers}</span>}
                </td>
                <td>{r.tier}</td>
                <td className="mono">{r.ref}</td>
                <td>
                  {r.buyer}
                  <span className={s.answers}>{r.email}{r.referrer && ` · via ${r.referrer}`}</span>
                </td>
                <td>
                  {r.status === "void" ? (
                    <span className="badge badge-quiet">Cancelled</span>
                  ) : r.checkedInAt ? (
                    <span className="badge badge-success"><SealCheck size={12} weight="fill" aria-hidden="true" /> {formatTime(r.checkedInAt)}</span>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy === r.ticketId} onClick={() => admit(r.ticketId)}>
                      {busy === r.ticketId ? "Admitting…" : "Admit"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="muted small">No guests match “{q}”.</p>}
    </div>
  );
}
