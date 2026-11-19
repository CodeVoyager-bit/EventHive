"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Flag, Prohibit } from "@phosphor-icons/react";
import ConfirmButton from "@/components/ConfirmButton";
import { REPORT_REASONS } from "@/components/ReportButton";
import { api } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import type { ReportGroup } from "@/types";
import s from "./admin.module.css";

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

// Open reports, one card per reported thing (most-reported first). Dismiss keeps it up;
// Take down cancels the event (refunding everyone) or deletes the question.
export default function ReportQueue({ groups }: { groups: ReportGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function resolve(id: string, action: "dismiss" | "remove") {
    setBusy(id);
    setError("");
    try {
      await api.resolveReport(id, action);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the report");
    } finally {
      setBusy("");
    }
  }

  if (groups.length === 0) {
    return (
      <p className={s.clear}>
        <CheckCircle size={20} weight="bold" aria-hidden="true" /> Nothing to review. New reports show up here.
      </p>
    );
  }
  return (
    <>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <ul className={s.reports}>
        {groups.map((g) => (
          <li key={g._id} className={s.report}>
            <div className={s.reportHead}>
              <span className="badge badge-danger"><Flag size={12} weight="bold" aria-hidden="true" /> {plural(g.reports.length, "report")}</span>
              <span className="tag muted">{g.kind === "event" ? "Event" : "Question"}</span>
            </div>
            {g.kind === "question" && <blockquote className={s.quote}>“{g.question ?? "(already removed)"}”</blockquote>}
            {g.event && (
              <p>
                {g.kind === "question" ? "On " : ""}
                <Link href={`/events/${g.event._id}`} className={s.name}>{g.event.title}</Link>
                <span className="small muted"> · by {g.event.organizerId?.name ?? "a host"} · {formatDate(g.event.date, { day: "numeric", month: "short" })}{g.event.status !== "published" ? ` · ${g.event.status}` : ""}</span>
              </p>
            )}
            <ul className={s.reasonList}>
              {g.reports.map((r, i) => (
                <li key={i}>
                  <strong>{reasonLabel(r.reason)}</strong>
                  {r.note && <span> “{r.note}”</span>}
                  <span className="small muted"> · {r.reporter}, {formatDate(r.createdAt, { day: "numeric", month: "short" })}</span>
                </li>
              ))}
            </ul>
            <div className={s.reportActions}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => resolve(g._id, "dismiss")}>
                {busy === g._id ? "Saving…" : "Dismiss"}
              </button>
              <ConfirmButton
                className="btn btn-danger btn-sm"
                title={g.kind === "event" ? "Take this event down?" : "Remove this question?"}
                description={
                  g.kind === "event"
                    ? "It's cancelled straight away. Everyone who booked is refunded in full and told why, and the host is notified."
                    : "The question and its answer are deleted from the event page."
                }
                confirmLabel={g.kind === "event" ? "Take it down" : "Remove it"}
                onConfirm={() => resolve(g._id, "remove")}
              >
                <Prohibit size={15} weight="bold" aria-hidden="true" /> Take down
              </ConfirmButton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
