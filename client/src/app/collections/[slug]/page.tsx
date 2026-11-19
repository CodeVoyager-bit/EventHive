import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import EventCard from "@/components/EventCard";
import { apiFetchPaged, getSavedIds, getSessionUser } from "@/lib/server";
import { COLLECTIONS, collectionBySlug } from "@/lib/collections";
import { plural } from "@/lib/format";
import type { Event } from "@/types";
import s from "./collection.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = collectionBySlug((await params).slug);
  return c ? { title: c.title, description: c.blurb } : {};
}

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

// A curated list: a rule over upcoming events (see lib/collections.ts)
export default async function CollectionPage({ params }: Props) {
  const c = collectionBySlug((await params).slug);
  if (!c) notFound();
  const [events, user, savedIds] = await Promise.all([
    apiFetchPaged<Event>("/events?limit=50").then((r) => r.items).catch(() => [] as Event[]),
    getSessionUser(),
    getSavedIds(),
  ]);
  const matches = events.filter(c.match);

  return (
    <>
      <header className={s.head} data-tone={c.tone}>
        <div className="container">
          <Link href="/" className={s.back}><ArrowLeft size={16} weight="bold" aria-hidden="true" /> Home</Link>
          <h1 className="display">{c.title}</h1>
          <p className={s.blurb}>{c.blurb}</p>
          <p className="mono">{plural(matches.length, "event")}</p>
        </div>
      </header>
      <div className="container">
        <nav className={s.others} aria-label="Other lists">
          {COLLECTIONS.filter((o) => o.slug !== c.slug).map((o) => (
            <Link key={o.slug} href={`/collections/${o.slug}`} className="chip">{o.title}</Link>
          ))}
        </nav>
        {matches.length === 0 ? (
          <div className="empty">
            <h2 className="h3">Nothing on this list right now</h2>
            <p>Lists refresh as hosts publish new events.</p>
            <Link href="/events" className="btn btn-primary">Browse everything</Link>
          </div>
        ) : (
          <div className="grid-cards">
            {matches.map((e, i) => (
              <EventCard key={e._id} event={e} priority={i === 0} eager={i < 3} saved={savedIds.has(e._id)} signedIn={!!user} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
