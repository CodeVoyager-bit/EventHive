import type { CSSProperties } from "react";
import { MagnifyingGlass, Sparkle } from "@phosphor-icons/react/ssr";
import TicketQR from "@/components/TicketQR";
import { CATEGORY_META } from "@/lib/categories";
import s from "./how.module.css";

const vars = (v: Record<string, string | number>) => v as CSSProperties;

// Three cards that stick and stack as you scroll. Each carries a small working preview of the
// real UI (category chips, the booking ticket, a scannable QR) rather than a picture of it.
export default function HowItWorks({ sampleCode }: { sampleCode: string }) {
  const cards = [
    {
      tone: "pink",
      title: "Find your thing",
      body: "Search by city, date or vibe. Filters live in the link, so you can send a friend exactly what you found.",
      visual: (
        <div className={s.find}>
          <div className={s.fakeSearch}>
            <MagnifyingGlass size={18} aria-hidden="true" /> live music in Mumbai
          </div>
          <div className={s.chips}>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <span key={key} className={s.chip} data-tone={meta.tone}>
                <meta.icon size={15} aria-hidden="true" /> {meta.label}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      tone: "yellow",
      title: "Grab a seat",
      body: "General or VIP in one tap. Seats are held atomically, so two people never end up with the same one.",
      visual: (
        <div className={s.ticket}>
          <div className={`${s.ticketTop} notch-b`}>
            <span className={s.small}>VIP ticket</span>
            <span className={s.price}>₹2,398</span>
            <span className={s.toggle}>
              <span>General</span>
              <span className={s.on}>
                <Sparkle size={12} weight="fill" aria-hidden="true" /> VIP
              </span>
            </span>
          </div>
          <div className={`${s.ticketBottom} notch-t perf-t`}>
            <span className={s.small}>149 of 150 seats left</span>
          </div>
          <span className={s.stamp}>Booked</span>
        </div>
      ),
    },
    {
      tone: "blue",
      title: "Walk right in",
      body: "Your ticket lives under My Tickets with a QR code for the door. Plans changed? Cancel and the seat goes back.",
      visual: (
        <div className={s.qrTicket}>
          <span className={s.qr}>
            <TicketQR code={sampleCode} size={128} />
          </span>
          <span className={`mono ${s.code}`}>{sampleCode}</span>
        </div>
      ),
    },
  ];

  return (
    <section className={`container ${s.section}`} aria-labelledby="how-title">
      <h2 id="how-title" className={`display ${s.heading}`}>How it works</h2>
      <ol className={s.stack}>
        {cards.map((c, i) => (
          <li key={c.title} className={s.card} data-tone={c.tone} style={vars({ "--i": i, "--end": 1 - (cards.length - 1 - i) * 0.05 })}>
            <div className={s.text}>
              <h3 className={`display ${s.title}`}>{c.title}</h3>
              <p>{c.body}</p>
            </div>
            <div className={s.visual} aria-hidden="true">
              {c.visual}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
