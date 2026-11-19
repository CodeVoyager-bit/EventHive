import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowsClockwise, Compass, Confetti, Heart, MapTrifold, MoonStars, Shapes, Stamp, Star } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react/lib";
import { apiFetch } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Passport } from "@/types";
import s from "./passport.module.css";

export const metadata: Metadata = { title: "Your passport" };

const BADGE_ICONS: Record<string, Icon> = {
  first: Confetti,
  regular: ArrowsClockwise,
  explorer: MapTrifold,
  allrounder: Shapes,
  nightowl: MoonStars,
  critic: Star,
  fan: Heart,
};
const TILT = [-4, 3, -2, 5, -3, 2, -5, 4];

// Event passport: a stamp for every event you've been to, badges to earn, and the scenes you go out for
export default async function PassportPage() {
  const p = await apiFetch<Passport>("/me/passport");
  const since = p.stamps.at(-1)?.date ?? p.memberSince;
  const earned = p.badges.filter((b) => b.earned).length;
  const top = p.categories[0]?.count ?? 1;
  const stats = [
    { label: "Events", value: p.stats.events },
    { label: "Cities", value: p.stats.cities },
    { label: "Hosts", value: p.stats.hosts },
    { label: "Coming up", value: p.stats.upcoming },
  ];

  return (
    <div className={`container ${s.wrap}`}>
      <section className={s.cover} aria-labelledby="passport-title">
        <div className={s.coverTop}>
          <span className={s.emblem} aria-hidden="true"><Stamp size={30} weight="fill" /></span>
          <div>
            <p className={s.kicker}>EventHive passport</p>
            <h1 id="passport-title" className={s.name}>{p.name}</h1>
            <p className={s.since}>Going out since {formatDate(since, { month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <dl className={s.stats}>
          {stats.map((st) => (
            <div key={st.label}>
              <dt>{st.label}</dt>
              <dd>{st.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={s.section} aria-labelledby="stamps-title">
        <div className={s.sectionHead}>
          <h2 id="stamps-title" className="h2">Stamps</h2>
          <span className="mono muted">One for every event you&apos;ve been to</span>
        </div>
        {p.stamps.length === 0 ? (
          <div className="empty">
            <span className="empty-art"><Stamp size={32} weight="bold" aria-hidden="true" /></span>
            <h3 className="h3">Your first stamp is waiting</h3>
            <p>Go to an event and it lands here the day after.</p>
            <Link href="/events" className="btn btn-primary"><Compass size={18} weight="bold" aria-hidden="true" /> Find something on</Link>
          </div>
        ) : (
          <ul className={s.stamps}>
            {p.stamps.map((st, i) => (
              <li key={st._id} data-tone={categoryMeta(st.category).tone} style={{ "--tilt": `${TILT[i % TILT.length]}deg` } as CSSProperties}>
                <Link href={`/events/${st._id}`} className={s.stamp}>
                  <span className={s.stampDate}>{formatDate(st.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <strong className={s.stampTitle}>{st.title}</strong>
                  <span className={s.stampPlace}>{st.location}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={s.section} aria-labelledby="badges-title">
        <div className={s.sectionHead}>
          <h2 id="badges-title" className="h2">Badges</h2>
          <span className="mono muted">{earned} of {p.badges.length} earned</span>
        </div>
        <ul className={s.badges}>
          {p.badges.map((b) => {
            const BadgeIcon = BADGE_ICONS[b.id] ?? Star;
            return (
              <li key={b.id} className={s.badge} data-earned={b.earned}>
                <span className={s.badgeIcon} aria-hidden="true"><BadgeIcon size={24} weight={b.earned ? "fill" : "bold"} /></span>
                <div className={s.badgeBody}>
                  <strong>{b.label}</strong>
                  <span className="small muted">{b.hint}</span>
                  <span className={s.progress}>
                    <span className={s.meter} aria-hidden="true"><span style={{ width: `${(b.value / b.goal) * 100}%` }} /></span>
                    <span className="mono small">{b.earned ? "Earned" : `${b.value} of ${b.goal}`}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {p.categories.length > 0 && (
        <section className={s.section} aria-labelledby="scenes-title">
          <div className={s.sectionHead}>
            <h2 id="scenes-title" className="h2">Your scenes</h2>
            {p.cities.length > 0 && <span className="mono muted">{p.cities.join(" · ")}</span>}
          </div>
          <ul className={s.scenes}>
            {p.categories.map((c) => {
              const meta = categoryMeta(c.category);
              return (
                <li key={c.category} data-tone={meta.tone}>
                  <span className={s.sceneLabel}><meta.icon size={18} weight="bold" aria-hidden="true" /> {meta.label}</span>
                  <span className={s.bar} aria-hidden="true"><span style={{ width: `${(c.count / top) * 100}%` }} /></span>
                  <span className="mono">{c.count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
