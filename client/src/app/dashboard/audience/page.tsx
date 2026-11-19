import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import AudienceList from "./AudienceList";
import { apiFetch } from "@/lib/server";
import { formatRupees } from "@/lib/format";
import type { Audience } from "@/types";
import s from "../dashboard.module.css";

export const metadata: Metadata = { title: "Audience" };

// Everyone who has booked with this host: who keeps coming back, who follows, what they spend
export default async function AudiencePage() {
  const { summary, people } = await apiFetch<Audience>("/events/my/audience");
  const kpis = [
    { label: "People", value: String(summary.people), sub: "Have booked with you" },
    { label: "Regulars", value: String(summary.regulars), sub: `${summary.repeatRate}% came to 2+ of your events` },
    { label: "Followers", value: String(summary.followers), sub: "Hear about your new events first" },
    { label: "Average spend", value: formatRupees(summary.averageSpend), sub: "Per person, on tickets" },
  ];

  return (
    <div className="container">
      <Link href="/dashboard" className={s.back}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Dashboard
      </Link>
      <header className={s.head}>
        <div>
          <p className="tag muted">Host dashboard</p>
          <h1 className="h1">Audience</h1>
          <p className="muted">Everyone who has booked one of your events, regulars first. Export it to thank people or plan your next night.</p>
        </div>
      </header>
      <div className={s.kpis}>
        {kpis.map((k, i) => (
          <div key={k.label} className={`rise ${s.kpi}`} style={{ "--i": i } as CSSProperties}>
            <span className="tag muted">{k.label}</span>
            <strong className={s.kpiValue}>{k.value}</strong>
            <span className="small muted">{k.sub}</span>
          </div>
        ))}
      </div>
      <AudienceList people={people} />
    </div>
  );
}
