"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRinging, CheckCircle, Hourglass, LockSimple, Minus, Plus, ShieldCheck, Tag, Ticket, Timer, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { burstFrom } from "@/lib/confetti";
import { formatDate, formatDateTime, formatMoney, formatPrice, onSale, plural } from "@/lib/format";
import { policyCopy } from "@/lib/policies";
import ShareButton from "@/components/ShareButton";
import Countdown from "@/components/Countdown";
import type { Event, Quote, Viewer } from "@/types";
import s from "./BookingPanel.module.css";

type Props = {
  event: Pick<Event, "_id" | "title" | "tiers" | "questions" | "requiresApproval" | "absorbFees" | "refundPolicy" | "status" | "date" | "salesStart" | "groupDiscount">;
  hostName: string;
  signedIn: boolean;
  userId?: string;
  viewer: Viewer | null;
  initialCode?: string;
  referrer?: string;
};

type Done = { kind: "booked" | "requested" | "waitlisted"; text: string };

// One-step checkout: pick a ticket, see the all-in price (live from the API), pay. Only what an
// event needs is shown (host questions, approval note); promo codes and guest names are tucked
// behind small links. Sold out turns it into a waitlist; approval events send a request instead.
export default function BookingPanel({ event, hostName, signedIn, userId, viewer, initialCode, referrer }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const cta = useRef<HTMLButtonElement>(null);
  const past = new Date(event.date).getTime() <= Date.now();
  const firstOpen = event.tiers.find((t) => onSale(t) && t.remaining > 0) ?? event.tiers.find(onSale) ?? event.tiers[0];

  const [tierId, setTierId] = useState(firstOpen?._id ?? "");
  const [qty, setQty] = useState(1);
  const [codeInput, setCodeInput] = useState(initialCode?.toUpperCase() ?? "");
  const [appliedCode, setAppliedCode] = useState(initialCode?.toUpperCase() ?? "");
  const [promoError, setPromoError] = useState("");
  const [protection, setProtection] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [followHost, setFollowHost] = useState(!viewer?.following);
  const [priced, setPriced] = useState<{ key: string; quote: Quote } | null>(null);
  const [showPromo, setShowPromo] = useState(!!initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const tier = event.tiers.find((t) => t._id === tierId) ?? firstOpen;
  const soldOut = !tier || tier.remaining < qty;
  const maxQty = tier ? Math.max(1, Math.min(tier.maxPerOrder, soldOut ? tier.maxPerOrder : tier.remaining)) : 1;
  const free = (tier?.price ?? 0) === 0;
  const open = event.status === "published" && !past;
  // Sales open later: show a countdown and "Notify me" instead of checkout
  const opensAt = event.salesStart && new Date(event.salesStart).getTime() > Date.now() ? event.salesStart : null;
  const group = event.groupDiscount;

  // Live all-in price: the API applies the promo code, fees, GST and protection. A quote only counts
  // for the exact order it was asked for, so a slow older response can never show (or charge) the
  // wrong amount; while the new one loads the total reads "…" and the button waits.
  const orderKey = `${tier?._id}|${qty}|${appliedCode}|${protection}`;
  const quote = priced?.key === orderKey ? priced.quote : null;
  useEffect(() => {
    if (!open || !tier || soldOut || opensAt) return;
    let stale = false;
    const t = setTimeout(async () => {
      try {
        const q = await api.quote(event._id, { tierId: tier._id, quantity: qty, promoCode: appliedCode || undefined, protection });
        if (stale) return;
        setPriced({ key: `${tier._id}|${qty}|${appliedCode}|${protection}`, quote: q });
        setPromoError("");
        setError("");
      } catch (err) {
        if (stale) return;
        const message = err instanceof Error ? err.message : "Could not price this order";
        if (appliedCode && /promo/i.test(message)) {
          setPromoError(message);
          setAppliedCode("");
        } else setError(message);
      }
    }, 180);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [event._id, open, tier, soldOut, qty, appliedCode, protection, opensAt]);

  // When sales open while the page is up, re-render on the server so checkout appears
  useEffect(() => {
    if (!opensAt) return;
    const ms = new Date(opensAt).getTime() - Date.now();
    if (ms > 2 ** 31 - 1) return; // setTimeout's limit (~24 days); a reload will catch it
    const t = setTimeout(() => router.refresh(), ms + 500);
    return () => clearTimeout(t);
  }, [opensAt, router]);
  const [notify, setNotify] = useState(!!viewer?.saved);
  async function notifyMe() {
    if (!signedIn) return login();
    setBusy(true);
    setError("");
    try {
      await api.saveEvent(event._id);
      setNotify(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the reminder");
    } finally {
      setBusy(false);
    }
  }

  const login = () => router.push(`/auth/login?next=${encodeURIComponent(pathname + location.search)}`);

  function pickTier(id: string) {
    setTierId(id);
    setQty(1);
    setError("");
  }

  async function joinWaitlist() {
    if (!signedIn) return login();
    setBusy(true);
    setError("");
    try {
      const res = await api.joinWaitlist(event._id, { tierId: tier?._id, quantity: qty });
      setDone({ kind: "waitlisted", text: `You're number ${res.position} in line. If seats free up, we'll book them for you and let you know.` });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the waitlist");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!signedIn) return login();
    setBusy(true);
    setError("");
    try {
      const booking = await api.createBooking({
        eventId: event._id,
        tierId: tier?._id,
        quantity: qty,
        names: Array.from({ length: qty }, (_, i) => names[i]?.trim() ?? ""), // no holes: a blank slot is ""
        promoCode: appliedCode || undefined,
        protection,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        ref: referrer && /^[a-f\d]{24}$/i.test(referrer) && referrer !== userId ? referrer : undefined, // ignore ?ref=instagram etc.
        followHost,
      });
      if (booking.status === "pending") {
        setDone({ kind: "requested", text: `Request sent to ${hostName}. You won't be charged unless you're approved.` });
      } else {
        setDone({ kind: "booked", text: `${plural(booking.quantity, "ticket")} booked. Your live ${booking.quantity === 1 ? "ticket is" : "tickets are"} in My Tickets.` });
        if (cta.current) burstFrom(cta.current);
      }
      router.refresh(); // seat counts, who's going, and the viewer state are rendered on the server
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- States where there is nothing to buy ----------
  const shell = (children: React.ReactNode, tone?: string) => (
    <div className={s.panel} data-tone={tone}>
      <div className={s.band}>
        <Ticket size={20} weight="bold" aria-hidden="true" />
        <span>Tickets</span>
      </div>
      <div className={s.body}>{children}</div>
    </div>
  );

  if (done) {
    return shell(
      <div className={s.state} aria-live="polite">
        <span className={`${s.stateIcon} stamp`} aria-hidden="true">
          {done.kind === "waitlisted" ? <Hourglass size={28} weight="bold" /> : <CheckCircle size={28} weight="bold" />}
        </span>
        <h3 className="h3">{done.kind === "booked" ? "You're in." : done.kind === "requested" ? "Request sent." : "You're on the list."}</h3>
        <p>{done.text}</p>
        <Link href="/bookings" className="btn btn-primary btn-block">Go to My Tickets</Link>
        {done.kind === "booked" && userId && <ShareButton title={event.title} path={`/events/${event._id}?ref=${userId}`} label="Invite friends" />}
      </div>
    );
  }
  if (viewer?.isHost) {
    return shell(
      <div className={s.state}>
        <h3 className="h3">You&apos;re hosting this</h3>
        <p>Manage tiers, guests and check-in from your dashboard.</p>
        <Link href={`/dashboard/${event._id}`} className="btn btn-primary btn-block">Manage event</Link>
        <Link href={`/dashboard/${event._id}/attendees`} className="btn btn-secondary btn-block">Guest list and check-in</Link>
      </div>
    );
  }
  if (viewer?.booking) {
    const pending = viewer.booking.status === "pending";
    return shell(
      <div className={s.state}>
        <span className={s.stateIcon} aria-hidden="true">{pending ? <Hourglass size={28} weight="bold" /> : <CheckCircle size={28} weight="bold" />}</span>
        <h3 className="h3">{pending ? "Waiting for the host" : "You're going"}</h3>
        <p>
          {pending
            ? `Your request for ${plural(viewer.booking.quantity, "ticket")} is with ${hostName}. You won't be charged unless you're approved.`
            : `${plural(viewer.booking.quantity, "ticket")}, ${viewer.booking.tierName}. Show the live QR at the door.`}
        </p>
        <Link href="/bookings" className="btn btn-primary btn-block">{pending ? "View request" : "Open my tickets"}</Link>
        {!pending && userId && <ShareButton title={event.title} path={`/events/${event._id}?ref=${userId}`} label="Invite friends" />}
      </div>
    );
  }
  if (viewer?.hasTicket) {
    return shell(
      <div className={s.state}>
        <span className={s.stateIcon} aria-hidden="true"><CheckCircle size={28} weight="bold" /></span>
        <h3 className="h3">A friend sent you a ticket</h3>
        <p>It&apos;s in My Tickets with its own live QR.</p>
        <Link href="/bookings" className="btn btn-primary btn-block">Open my tickets</Link>
      </div>
    );
  }
  if (viewer?.waitlist) {
    return shell(
      <div className={s.state}>
        <span className={s.stateIcon} aria-hidden="true"><Hourglass size={28} weight="bold" /></span>
        <h3 className="h3">Number {viewer.waitlist.position} in line</h3>
        <p>Waiting for {plural(viewer.waitlist.quantity, "ticket")}. If seats free up we book them for you automatically, with free Refund Protection.</p>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api.leaveWaitlist(event._id);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not leave the waitlist");
            } finally {
              setBusy(false);
            }
          }}
        >
          Leave the waitlist
        </button>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </div>
    );
  }
  if (!open || !tier) {
    return shell(
      <div className={s.state}>
        <h3 className="h3">{event.status === "cancelled" ? "Cancelled" : event.status === "draft" ? "Not on sale yet" : "This event has ended"}</h3>
        <p>{event.status === "cancelled" ? "The host cancelled this event. Everyone who booked has been refunded." : past ? "Reviews are open for people who went." : "The host hasn't published this event."}</p>
        <Link href="/events" className="btn btn-secondary btn-block">Find something else</Link>
      </div>
    );
  }

  if (opensAt) {
    const cheapest = Math.min(...event.tiers.map((t) => t.price));
    return shell(
      <div className={s.state}>
        <span className={s.stateIcon} aria-hidden="true"><Timer size={28} weight="bold" /></span>
        <h3 className="h3">On sale {formatDateTime(opensAt)}</h3>
        <Countdown to={opensAt} doneLabel="On sale now" />
        <p>
          {cheapest === 0 ? "Free to attend." : `Tickets from ${formatPrice(cheapest)}.`}
          {group && ` Groups of ${group.minQty}+ save ${group.percent}%.`}
        </p>
        {notify ? (
          <p className={`alert alert-success ${s.note}`} role="status">
            <BellRinging size={18} weight="bold" aria-hidden="true" /> We&apos;ll notify you when tickets go on sale. It&apos;s in your Saved list too.
          </p>
        ) : (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={notifyMe} disabled={busy}>
            <BellRinging size={18} weight="bold" aria-hidden="true" /> {busy ? "Saving…" : signedIn ? "Notify me" : "Sign in to get notified"}
          </button>
        )}
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </div>
    );
  }

  // ---------- Checkout ----------
  const policy = policyCopy(event.refundPolicy);
  const single = event.tiers.length === 1;
  const ctaLabel = event.requiresApproval ? "Request to join" : quote && quote.total > 0 ? `Pay ${formatMoney(quote.total)}` : "Get free ticket";

  return (
    <form className={s.panel} onSubmit={submit}>
      <div className={s.band}>
        <Ticket size={20} weight="bold" aria-hidden="true" />
        <span>Tickets</span>
      </div>

      <div className={s.body}>
        {single ? (
          <div className={s.oneTier}>
            <span>
              <strong>{tier.name}</strong>
              <span className={s.tierMeta}>{tier.remaining === 0 ? "Sold out, waitlist open" : tier.remaining <= 10 ? `${tier.remaining} left` : `${tier.remaining} available`}</span>
            </span>
            <span className={`mono ${s.tierPrice}`}>{formatPrice(tier.price)}</span>
          </div>
        ) : (
          <fieldset className={s.tiers}>
            <legend className="sr-only">Choose a ticket</legend>
            {event.tiers.map((t) => {
              const ended = !onSale(t);
              const gone = t.remaining === 0;
              return (
                <label key={t._id} className={s.tier} data-disabled={ended || undefined}>
                  <input type="radio" name="tier" value={t._id} checked={t._id === tier._id} onChange={() => pickTier(t._id)} disabled={ended} />
                  <span className={s.tierMain}>
                    <strong>{t.name}</strong>
                    {t.description && <span className={s.tierDesc}>{t.description}</span>}
                    <span className={s.tierMeta}>
                      {ended ? "Sales ended" : gone ? "Sold out, waitlist open" : t.remaining <= 10 ? `${t.remaining} left` : `${t.remaining} available`}
                      {!ended && t.salesEnd && ` · ends ${formatDate(t.salesEnd, { day: "numeric", month: "short" })}`}
                    </span>
                  </span>
                  <span className={`mono ${s.tierPrice}`}>{formatPrice(t.price)}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        <div className={s.qtyRow}>
          <span className="label" id="qty-label">How many?</span>
          <div className={s.stepper} role="group" aria-labelledby="qty-label">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="One fewer ticket">
              <Minus size={16} weight="bold" aria-hidden="true" />
            </button>
            <output className="mono" aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="One more ticket">
              <Plus size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
        {group && tier.price > 0 && group.minQty <= tier.maxPerOrder && (
          <p className={s.groupHint} data-on={qty >= group.minQty || undefined}>
            <UsersThree size={16} weight="bold" aria-hidden="true" />
            {qty >= group.minQty
              ? `Group discount applied: ${group.percent}% off`
              : `Bring ${plural(group.minQty - qty, "more friend")} and save ${group.percent}% (${group.minQty}+ tickets)`}
          </p>
        )}

        {soldOut ? (
          <>
            <p className={`alert ${s.note}`}>
              <Hourglass size={18} weight="bold" aria-hidden="true" />
              <span>{tier.remaining > 0 ? `Only ${tier.remaining} left in ${tier.name}.` : `${tier.name} is sold out.`} Join the waitlist and we&apos;ll book you in automatically if seats free up.</span>
            </p>
            {error && <p className="alert alert-error" role="alert"><WarningCircle size={16} aria-hidden="true" /> {error}</p>}
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={joinWaitlist} disabled={busy}>
              {busy ? "Joining…" : signedIn ? `Join waitlist for ${plural(qty, "ticket")}` : "Sign in to join the waitlist"}
            </button>
          </>
        ) : (
          <>
            {event.questions.map((q) => (
              <div key={q._id} className="field">
                <label className="label" htmlFor={`q-${q._id}`}>
                  {q.label} {q.required ? <span aria-hidden="true">*</span> : <span className="muted">(optional)</span>}
                </label>
                <input id={`q-${q._id}`} className="input" required={q.required} maxLength={500} value={answers[q._id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q._id]: e.target.value }))} />
              </div>
            ))}

            {!free && (
              <label className={`check ${s.protect}`}>
                <input type="checkbox" checked={protection} onChange={(e) => setProtection(e.target.checked)} />
                <span>
                  <strong><ShieldCheck size={16} weight="bold" aria-hidden="true" /> Refund Protection</strong>
                  <span className={s.protectText}>Cancel any time before doors for a full refund. 6% of the ticket price.</span>
                </span>
              </label>
            )}

            <dl className={s.breakdown} aria-live="polite">
              {quote ? (
                <>
                  <div><dt>{qty} × {quote.tierName}</dt><dd>{formatMoney(quote.subtotal)}</dd></div>
                  {(quote.group ?? 0) > 0 && <div className={s.discount}><dt>Group of {qty}, {group?.percent}% off</dt><dd>−{formatMoney(quote.group!)}</dd></div>}
                  {quote.discount - (quote.group ?? 0) > 0.005 && <div className={s.discount}><dt>Promo {quote.promoCode}</dt><dd>−{formatMoney(quote.discount - (quote.group ?? 0))}</dd></div>}
                  {quote.fee > 0 && (quote.absorbFees ? (
                    <div><dt>Fees</dt><dd>Covered by host</dd></div>
                  ) : (
                    <div><dt>Fees and GST</dt><dd>{formatMoney(quote.fee + quote.gst)}</dd></div>
                  ))}
                  {quote.protection > 0 && <div><dt>Refund Protection</dt><dd>{formatMoney(quote.protection)}</dd></div>}
                  <div className={s.total}><dt>Total</dt><dd>{quote.total === 0 ? "Free" : formatMoney(quote.total)}</dd></div>
                </>
              ) : (
                <div className={s.total}><dt>Total</dt><dd>…</dd></div>
              )}
            </dl>

            {/* The optional extras, out of the way until someone wants them */}
            <div className={s.extras}>
              {!free && !showPromo && (
                <button type="button" className={s.extraLink} onClick={() => setShowPromo(true)}>
                  <Tag size={15} weight="bold" aria-hidden="true" /> Have a promo code?
                </button>
              )}
              {qty > 1 && (
                <details className={s.namesBox}>
                  <summary className={s.extraLink}>Add names to the tickets (optional)</summary>
                  <div className={s.names}>
                    {Array.from({ length: qty }, (_, i) => (
                      <input
                        key={i}
                        className="input"
                        placeholder={i === 0 ? "Your name" : `Guest ${i + 1}`}
                        aria-label={`Name on ticket ${i + 1}`}
                        value={names[i] ?? ""}
                        maxLength={80}
                        onChange={(e) => setNames((n) => Object.assign([...n], { [i]: e.target.value }))}
                      />
                    ))}
                    <span className="help">You can also send tickets to friends later.</span>
                  </div>
                </details>
              )}
            </div>
            {!free && showPromo && (
              <div className={s.promo}>
                <label className="sr-only" htmlFor="promo">Promo code</label>
                <Tag size={18} weight="bold" aria-hidden="true" />
                <input id="promo" className={s.promoInput} placeholder="Promo code" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} autoFocus={!initialCode} />
                {appliedCode && appliedCode === codeInput ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAppliedCode(""); setCodeInput(""); }}>Remove</button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={!codeInput.trim()} onClick={() => { setPromoError(""); setAppliedCode(codeInput.trim()); }}>Apply</button>
                )}
              </div>
            )}
            {promoError && <p className={s.promoError} role="alert">{promoError}</p>}

            {event.requiresApproval && (
              <p className={`alert ${s.note}`}>
                <LockSimple size={18} weight="bold" aria-hidden="true" />
                <span>{hostName} approves each guest. Your seat is held while they decide, and you&apos;re only charged if approved.</span>
              </p>
            )}

            {error && (
              <p className="alert alert-error" role="alert">
                <WarningCircle size={16} aria-hidden="true" /> {error}
              </p>
            )}

            {signedIn ? (
              <button ref={cta} type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !quote}>
                {busy ? "Booking…" : ctaLabel}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={login}>
                Sign in to book
              </button>
            )}

            {signedIn && !viewer?.following && (
              <label className={`check ${s.follow}`}>
                <input type="checkbox" checked={followHost} onChange={(e) => setFollowHost(e.target.checked)} />
                <span>Follow {hostName} for their next events</span>
              </label>
            )}
          </>
        )}

        <p className={s.small}>
          {policy.label} refunds: {policy.detail} <span className="badge badge-quiet">Test mode</span>
        </p>
      </div>
    </form>
  );
}
