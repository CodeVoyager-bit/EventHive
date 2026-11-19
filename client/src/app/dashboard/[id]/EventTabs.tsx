import Link from "next/link";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/ssr";

// "All events" link that sits above an event's title on every host page
export function BackToEvents() {
  return (
    <Link href="/dashboard" className={s.back}>
      <ArrowLeft size={16} weight="bold" aria-hidden="true" /> All events
    </Link>
  );
}
import s from "../dashboard.module.css";

type Tab = "overview" | "guests" | "edit";

// One bar for everything about one event: overview, guests and check-in, edit, and the public page
export default function EventTabs({ eventId, current, pending = 0 }: { eventId: string; current: Tab; pending?: number }) {
  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: `/dashboard/${eventId}` },
    { key: "guests", label: "Guests and check-in", href: `/dashboard/${eventId}/attendees` },
    { key: "edit", label: "Edit", href: `/dashboard/${eventId}/edit` },
  ];
  return (
    <div className={s.eventNav}>
      <nav className={s.tabs} aria-label="Manage this event">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={s.tabLink} aria-current={t.key === current ? "page" : undefined}>
            {t.label}
            {t.key === "guests" && pending > 0 && <span className={s.tabCount}>{pending}</span>}
          </Link>
        ))}
        <Link href={`/events/${eventId}`} className={`${s.tabLink} ${s.tabExternal}`}>
          Event page <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
