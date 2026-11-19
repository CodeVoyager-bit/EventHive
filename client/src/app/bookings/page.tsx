import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, DoorOpen, Gift, Hourglass, IdentificationCard, Receipt, Scan, SealCheck, ShieldCheck, Ticket as TicketIcon, WifiSlash } from "@phosphor-icons/react/ssr";
import CancelBookingButton from "./CancelBookingButton";
import CalendarSync from "./CalendarSync";
import { SaveTicketsOffline } from "@/components/ServiceWorker";
import { LeaveWaitlist, ShowTicket, TransferTicket } from "./TicketActions";
import ShareButton from "@/components/ShareButton";
import { apiFetch, getSessionUser } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatDateTime, formatMoney, formatTime, host, isPast, plural } from "@/lib/format";
import { refundPreview } from "@/lib/policies";
import type { Booking, Event, Ticket, WaitlistEntry } from "@/types";
import s from "./bookings.module.css";

export const metadata: Metadata = { title: "My tickets" };

type TicketEvent = Exclude<Ticket["eventId"], string>;
type Group = { id: string; event: TicketEvent | NonNullable<Booking["eventId"]>; tickets: Ticket[]; booking?: Booking };

type TabKey = "upcoming" | "waitlist" | "past" | "cancelled";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const requested = (await searchParams).tab as TabKey | undefined;
  const [tickets, bookings, waitlist, user, duty] = await Promise.all([
    apiFetch<Ticket[]>("/tickets/my"),
    apiFetch<Booking[]>("/bookings/my"),
    apiFetch<WaitlistEntry[]>("/me/waitlist").catch(() => [] as WaitlistEntry[]),
    getSessionUser(),
    apiFetch<Event[]>("/me/door").catch(() => [] as Event[]), // events I help check in at
  ]);

  // One card per event: the tickets I hold, plus my booking for it (if I'm the buyer)
  const groups = new Map<string, Group>();
  for (const t of tickets) {
    if (t.status !== "valid" || typeof t.eventId !== "object") continue;
    const g = groups.get(t.eventId._id) ?? { id: t.eventId._id, event: t.eventId, tickets: [] };
    g.tickets.push(t);
    groups.set(g.id, g);
  }
  for (const b of bookings) {
    if (!b.eventId || !["pending", "confirmed"].includes(b.status)) continue;
    const g = groups.get(b.eventId._id) ?? { id: b.eventId._id, event: b.eventId, tickets: [] };
    g.booking = b;
    groups.set(g.id, g);
  }
  const all = [...groups.values()].sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
  const upcoming = all.filter((g) => !isPast(g.event.date) && g.event.status !== "cancelled");
  const past = all.filter((g) => isPast(g.event.date)).reverse();
  const history = bookings.filter((b) => b.status === "cancelled" || b.status === "declined");
  const ticketCount = upcoming.reduce((n, g) => n + g.tickets.length, 0);
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "waitlist", label: "Waitlist", count: waitlist.length },
    { key: "past", label: "Been there", count: past.length },
    { key: "cancelled", label: "Cancelled", count: history.length },
  ];
  const tab: TabKey = tabs.some((t) => t.key === requested && (t.count > 0 || t.key === "upcoming")) ? requested! : "upcoming";

  const card = (g: Group, ended: boolean, index = 9) => {
    const meta = categoryMeta(g.event.category);
    const b = g.booking;
    const where = "address" in g.event && g.event.address ? `${g.event.address}, ${g.event.location}` : g.event.location;
    const received = !b && g.tickets.some((t) => t.transferredAt);
    return (
      <article key={g.id} className={`${s.card} riso-host`} data-tone={meta.tone}>
        <Link href={`/events/${g.id}`} className={`${s.media} riso`} aria-label={g.event.title}>
          {g.event.imageUrl && <Image src={g.event.imageUrl} alt="" fill sizes="220px" loading={index < 2 ? "eager" : undefined} />}
          <span className={s.stamp} aria-hidden="true">
            <span>{formatDate(g.event.date, { month: "short" })}</span>
            <strong>{formatDate(g.event.date, { day: "numeric" })}</strong>
          </span>
        </Link>

        <div className={s.info}>
          <div className={s.top}>
            <p className="tag" style={{ color: "var(--tone-deep)" }}>{meta.label} / {g.event.location}</p>
            <div className={s.badges}>
              {b?.status === "pending" && <span className="badge"><Hourglass size={12} weight="bold" aria-hidden="true" /> Awaiting approval</span>}
              {received && <span className="badge badge-quiet"><Gift size={12} weight="bold" aria-hidden="true" /> From a friend</span>}
              {b?.viaWaitlist && <span className="badge badge-quiet">From the waitlist</span>}
              {b?.protection && <span className="badge badge-quiet"><ShieldCheck size={12} weight="bold" aria-hidden="true" /> Protected</span>}
            </div>
          </div>
          <h2 className={s.title}><Link href={`/events/${g.id}`}>{g.event.title}</Link></h2>
          <p className={s.when}>
            {formatDate(g.event.date, { weekday: "long", day: "numeric", month: "long" })}, {formatTime(g.event.date)}
            <span aria-hidden="true"> / </span>
            {where}
          </p>

          {g.tickets.length > 0 && (
            <ul className={s.stubs}>
              {g.tickets.map((t) => (
                <li key={t._id} className={s.stub}>
                  <span className={s.stubName}>
                    <strong>{t.holderName}</strong>
                    <span className="mono small muted">{t.tierName} · {t.ref}</span>
                  </span>
                  {t.checkedInAt ? (
                    <span className="badge badge-success"><SealCheck size={12} weight="fill" aria-hidden="true" /> In at {formatTime(t.checkedInAt)}</span>
                  ) : ended ? (
                    <span className="badge badge-quiet">Not scanned</span>
                  ) : (
                    <span className={s.stubActions}>
                      <ShowTicket ticket={{ _id: t._id, ref: t.ref, secret: t.secret, holderName: t.holderName, tierName: t.tierName, checkedInAt: t.checkedInAt, eventTitle: g.event.title, eventDate: g.event.date, where }} />
                      <TransferTicket ticketId={t._id} eventTitle={g.event.title} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {b && (
            <div className={s.order}>
              <span className="mono small">
                {plural(b.quantity, "ticket")} · {b.tierName} · {b.pricing.total === 0 ? "Free" : formatMoney(b.pricing.total)}
                {b.promoCode && ` · ${b.promoCode}`}
              </span>
              <span className={s.orderActions}>
                {b.status === "confirmed" && b.pricing.total > 0 && (
                  <Link href={`/bookings/${b._id}/invoice`} className="btn btn-ghost btn-sm"><Receipt size={16} weight="bold" aria-hidden="true" /> Invoice</Link>
                )}
                {!ended && b.status === "confirmed" && user && <ShareButton title={g.event.title} path={`/events/${g.id}?ref=${user.id}`} label="Invite friends" />}
                {!ended && (
                  <CancelBookingButton id={b._id} pending={b.status === "pending"} paid={b.pricing.total > 0} refund={refundPreview(b, g.event.date, b.refundPolicy ?? ("refundPolicy" in g.event ? g.event.refundPolicy : undefined))} />
                )}
              </span>
            </div>
          )}
          {ended && g.tickets.some((t) => t.checkedInAt) && (
            <Link href={`/events/${g.id}#reviews`} className="text-link">How was it? Leave a review <ArrowRight size={14} aria-hidden="true" /></Link>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="container">
      <header className={s.head}>
        <h1 className="h1">My tickets</h1>
        <p className="muted">{plural(ticketCount, "ticket")} for {plural(upcoming.length, "event")} coming up</p>
        <div className={s.headLinks}>
          <CalendarSync />
          <Link href="/passport" className="text-link">
            <IdentificationCard size={18} weight="bold" aria-hidden="true" /> Your event passport
          </Link>
        </div>
      </header>
      {duty.length > 0 && (
        <section className={s.duty} aria-labelledby="duty-title">
          <h2 id="duty-title" className="h3"><DoorOpen size={22} weight="bold" aria-hidden="true" /> Door duty</h2>
          <ul>
            {duty.map((e) => (
              <li key={e._id}>
                <div>
                  <strong>{e.title}</strong>
                  <span className="small muted">{formatDateTime(e.date)} · {e.location} · for {host(e).name}</span>
                </div>
                <Link href={`/door/${e._id}`} className="btn btn-primary btn-sm">
                  <Scan size={16} weight="bold" aria-hidden="true" /> Open door desk
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <SaveTicketsOffline />
      {ticketCount > 0 && (
        <p className={s.offline}>
          <WifiSlash size={16} weight="bold" aria-hidden="true" /> Works offline: once this page has loaded, your live tickets open even without signal.
        </p>
      )}

      <nav className={s.tabs} aria-label="Ticket lists">
        {tabs.filter((t) => t.key === "upcoming" || t.count > 0).map((t) => (
          <Link key={t.key} href={t.key === "upcoming" ? "/bookings" : `/bookings?tab=${t.key}`} className={s.tab} aria-current={t.key === tab ? "page" : undefined}>
            {t.label} <span className={s.tabCount}>{t.count}</span>
          </Link>
        ))}
      </nav>

      {tab === "upcoming" && (upcoming.length === 0 ? (
        <div className="empty">
          <span className="empty-art"><TicketIcon size={32} weight="bold" aria-hidden="true" /></span>
          <h2 className="h3">Nothing booked yet</h2>
          <p>When you book, your live tickets appear here. They refresh every 30 seconds, so keep this page handy at the door.</p>
          <Link href="/events" className="btn btn-primary">Find something to do</Link>
        </div>
      ) : (
        <div className={s.list}>{upcoming.map((g, i) => card(g, false, i))}</div>
      ))}

      {tab === "waitlist" && (
        <section>
          <ul className={s.waitlist}>
            {waitlist.map((w) => w.eventId && (
              <li key={w._id} className={s.waitItem} data-tone={categoryMeta(w.eventId.category).tone}>
                <Hourglass size={22} weight="bold" aria-hidden="true" />
                <div>
                  <Link href={`/events/${w.eventId._id}`} className={s.waitTitle}>{w.eventId.title}</Link>
                  <p className="small muted">
                    {plural(w.quantity, "ticket")} · {formatDate(w.eventId.date)} · We book you in automatically if seats free up.
                  </p>
                </div>
                <LeaveWaitlist eventId={w.eventId._id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "past" && <div className={s.list}>{past.map((g, i) => card(g, true, i))}</div>}

      {tab === "cancelled" && (
        <div className={s.history}>
          <ul>
            {history.map((b) => (
              <li key={b._id}>
                <span>{b.eventId?.title ?? "Deleted event"}</span>
                <span className="mono small muted">
                  {b.status === "declined" ? "Declined by host, not charged" : b.refundAmount ? `Refunded ${formatMoney(b.refundAmount)}` : "No refund"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
