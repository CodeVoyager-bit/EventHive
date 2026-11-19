"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Buildings, CheckCircle, Circle, Globe, Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { CATEGORY_META } from "@/lib/categories";
import { REFUND_COPY } from "@/lib/policies";
import EventCard from "./EventCard";
import type { Category, Event, RefundPolicy } from "@/types";
import s from "./EventForm.module.css";

type TierForm = { _id?: string; name: string; description: string; price: string; capacity: string; salesEnd: string; maxPerOrder: string; sold: number };
type PromoForm = { code: string; kind: "percent" | "flat"; amount: string; limit: string; expiresAt: string; used: number };
type QuestionForm = { _id?: string; label: string; required: boolean };
type Form = {
  title: string;
  description: string;
  category: Category;
  date: string;
  eventType: "online" | "venue";
  location: string;
  address: string;
  platform: string;
  meetingLink: string;
  imageUrl: string;
  secretLocation: boolean;
  requiresApproval: boolean;
  showGuests: boolean;
  absorbFees: boolean;
  refundPolicy: RefundPolicy;
  salesStart: string; // empty = on sale as soon as it's published
  group: boolean;
  groupMin: string;
  groupPercent: string;
  tiers: TierForm[];
  promoCodes: PromoForm[];
  questions: QuestionForm[];
};

const pad = (n: number) => String(n).padStart(2, "0");
// Hosts type times in India time whatever their browser's zone (IST is UTC+5:30 all year, no DST),
// and the server renders the same values, so the form never shifts or mismatches on hydration.
const IST_MS = 330 * 60_000;
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + IST_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const toIso = (local: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - IST_MS).toISOString() : null;
};
const newTier = (name = "General", price = "", capacity = ""): TierForm => ({ name, description: "", price, capacity, salesEnd: "", maxPerOrder: "6", sold: 0 });

function fromEvent(e?: Event): Form {
  return {
    title: e?.title ?? "",
    description: e?.description ?? "",
    category: e?.category ?? "music",
    date: toLocalInput(e?.date),
    eventType: e?.eventType ?? "venue",
    location: e?.location ?? "",
    address: e?.address ?? "",
    platform: e?.platform ?? "",
    meetingLink: e?.meetingLink ?? "",
    imageUrl: e?.imageUrl ?? "",
    secretLocation: e?.secretLocation ?? false,
    requiresApproval: e?.requiresApproval ?? false,
    showGuests: e?.showGuests ?? true,
    absorbFees: e?.absorbFees ?? false,
    refundPolicy: e?.refundPolicy ?? "flexible",
    salesStart: toLocalInput(e?.salesStart ?? undefined),
    group: !!e?.groupDiscount,
    groupMin: String(e?.groupDiscount?.minQty ?? 4),
    groupPercent: String(e?.groupDiscount?.percent ?? 10),
    tiers: e?.tiers?.length
      ? e.tiers.map((t) => ({ _id: t._id, name: t.name, description: t.description ?? "", price: String(t.price), capacity: String(t.capacity), salesEnd: toLocalInput(t.salesEnd), maxPerOrder: String(t.maxPerOrder), sold: t.capacity - t.remaining }))
      : [newTier()],
    promoCodes: (e?.promoCodes ?? []).map((p) => ({ code: p.code, kind: p.kind, amount: String(p.amount), limit: String(p.limit), expiresAt: toLocalInput(p.expiresAt), used: p.limit - p.remaining })),
    questions: (e?.questions ?? []).map((q) => ({ _id: q._id, label: q.label, required: q.required })),
  };
}

// The event studio: everything the host controls, a live preview, and a pre-publish checklist
// (the Whova "setup review" idea). Drafts can be saved at any point.
export default function EventForm({ initial, tabs }: { initial?: Event; tabs?: React.ReactNode }) {
  const router = useRouter();
  const editing = !!initial;
  const [form, setForm] = useState<Form>(() => fromEvent(initial));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "draft" | "published" | "save">("");

  const set = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggle = (key: "secretLocation" | "requiresApproval" | "showGuests" | "absorbFees" | "group") => setForm({ ...form, [key]: !form[key] });
  const setTier = (i: number, patch: Partial<TierForm>) => setForm({ ...form, tiers: form.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setPromo = (i: number, patch: Partial<PromoForm>) => setForm({ ...form, promoCodes: form.promoCodes.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setQuestion = (i: number, patch: Partial<QuestionForm>) => setForm({ ...form, questions: form.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  const online = form.eventType === "online";
  const capacity = form.tiers.reduce((n, t) => n + (Number(t.capacity) || 0), 0);
  const prices = form.tiers.map((t) => Number(t.price) || 0);
  const checklist = [
    { ok: form.title.trim().length >= 3, label: "A title", required: true },
    { ok: !!form.date && new Date(form.date).getTime() > Date.now(), label: "A date in the future", required: true },
    { ok: online ? /^https?:\/\//.test(form.meetingLink) : !!form.address.trim() && !!form.location.trim(), label: online ? "A join link" : "A city and venue address", required: true },
    { ok: form.tiers.length > 0 && form.tiers.every((t) => t.name.trim() && Number(t.capacity) >= 1 && t.price !== ""), label: "Ticket tiers with a price and capacity", required: true },
    ...(form.salesStart ? [{ ok: (toIso(form.salesStart) ?? "") < (toIso(form.date) ?? ""), label: "Sales open before the event starts", required: true }] : []),
    { ok: form.description.trim().length >= 80, label: "A description of 80+ characters", required: false },
    { ok: !!form.imageUrl, label: "A cover image", required: false },
  ];
  const ready = checklist.filter((c) => c.required).every((c) => c.ok);

  async function save(status?: "draft" | "published") {
    setError("");
    setBusy(status ?? "save");
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        category: form.category,
        date: toIso(form.date),
        eventType: form.eventType,
        location: online ? "Online" : form.location,
        address: online ? undefined : form.address,
        platform: online ? form.platform : undefined,
        meetingLink: online ? form.meetingLink : undefined,
        imageUrl: form.imageUrl,
        secretLocation: !online && form.secretLocation,
        requiresApproval: form.requiresApproval,
        showGuests: form.showGuests,
        absorbFees: form.absorbFees,
        refundPolicy: form.refundPolicy,
        salesStart: toIso(form.salesStart), // null clears it
        groupDiscount: form.group ? { minQty: Number(form.groupMin), percent: Number(form.groupPercent) } : null,
        tiers: form.tiers.map((t) => ({
          ...(t._id ? { _id: t._id } : {}),
          name: t.name.trim(),
          description: t.description.trim() || undefined,
          price: Number(t.price),
          capacity: Number(t.capacity),
          salesEnd: toIso(t.salesEnd),
          maxPerOrder: Number(t.maxPerOrder) || 6,
        })),
        promoCodes: form.promoCodes.map((p) => ({ code: p.code, kind: p.kind, amount: Number(p.amount), limit: Number(p.limit) || 100, expiresAt: toIso(p.expiresAt) })),
        questions: form.questions.filter((q) => q.label.trim()).map((q) => ({ ...(q._id ? { _id: q._id } : {}), label: q.label.trim(), required: q.required })),
        ...(status ? { status } : {}),
      };
      const saved = initial ? await api.updateEvent(initial._id, body) : await api.createEvent(body);
      router.push(`/dashboard/${saved._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event. Check the fields and try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy("");
    }
  }

  // Live preview, built from the form as it is now
  const preview: Event = {
    _id: initial?._id ?? "preview",
    title: form.title || "Your event title",
    description: form.description,
    date: form.date ? new Date(form.date).toISOString() : "",
    location: online ? "Online" : form.location || "Your city",
    capacity: capacity || 1,
    bookedCount: initial?.bookedCount ?? 0,
    price: Math.min(...prices),
    tiers: form.tiers.map((t, i) => ({ _id: t._id ?? String(i), name: t.name, price: Number(t.price) || 0, capacity: Number(t.capacity) || 0, remaining: (Number(t.capacity) || 0) - t.sold, salesEnd: toIso(t.salesEnd) ?? undefined, maxPerOrder: 6 })),
    questions: [],
    category: form.category,
    imageUrl: form.imageUrl,
    organizerId: { _id: "me", name: "You" },
    eventType: form.eventType,
    requiresApproval: form.requiresApproval,
    secretLocation: form.secretLocation,
    showGuests: form.showGuests,
    absorbFees: form.absorbFees,
    refundPolicy: form.refundPolicy,
    salesStart: toIso(form.salesStart),
    status: "published",
    createdAt: "",
  };
  const published = initial?.status === "published";

  return (
    <div className={`container ${s.wrap}`}>
      <Link href="/dashboard" className={s.back}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> All events
      </Link>
      <h1 className={`h1 ${s.title}`}>{editing ? initial!.title : "Create an event"}</h1>
      {tabs}

      {error && (
        <p className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
          <WarningCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}

      <div className={s.layout}>
        <form
          id="event-form"
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            const which = ((e.nativeEvent as SubmitEvent).submitter as HTMLElement | null)?.dataset.status;
            save(which === "published" ? "published" : which === "draft" ? "draft" : undefined);
          }}
        >
          <section className={s.section}>
            <h2>Basics</h2>
            <div className={s.grid}>
              <div className={`field ${s.full}`}>
                <label className="label" htmlFor="title">Title</label>
                <input id="title" name="title" className="input" value={form.title} onChange={set} placeholder="e.g. Rooftop Indie Night" required minLength={3} maxLength={120} />
              </div>
              <div className={`field ${s.full}`}>
                <label className="label" htmlFor="description">Description</label>
                <textarea id="description" name="description" className="input" rows={5} value={form.description} onChange={set} placeholder="What happens, who it's for, what to bring" required minLength={10} maxLength={5000} />
              </div>
              <div className="field">
                <label className="label" htmlFor="category">Category</label>
                <select id="category" name="category" className="input" value={form.category} onChange={set}>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="imageUrl">Cover image URL</label>
                <input id="imageUrl" name="imageUrl" type="url" className="input" value={form.imageUrl} onChange={set} placeholder="https://images.unsplash.com/…" />
              </div>
            </div>
          </section>

          <section className={s.section}>
            <h2>When and where</h2>
            <div className={s.grid}>
              <div className="field">
                <label className="label" htmlFor="date">Starts <span className="muted">(India time)</span></label>
                <input id="date" name="date" type="datetime-local" className="input" value={form.date} onChange={set} required suppressHydrationWarning />
              </div>
              <div className="field">
                <span className="label" id="type-label">Format</span>
                <div className={s.seg} role="group" aria-labelledby="type-label">
                  <button type="button" aria-pressed={!online} onClick={() => setForm({ ...form, eventType: "venue" })}><Buildings size={16} weight="bold" aria-hidden="true" /> In person</button>
                  <button type="button" aria-pressed={online} onClick={() => setForm({ ...form, eventType: "online" })}><Globe size={16} weight="bold" aria-hidden="true" /> Online</button>
                </div>
              </div>
              {online ? (
                <>
                  <div className="field">
                    <label className="label" htmlFor="platform">Platform</label>
                    <input id="platform" name="platform" className="input" value={form.platform} onChange={set} placeholder="Zoom, Google Meet" maxLength={80} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="meetingLink">Join link</label>
                    <input id="meetingLink" name="meetingLink" type="url" className="input" value={form.meetingLink} onChange={set} placeholder="https://…" maxLength={500} />
                    <span className="help">Only ticket holders see it.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label className="label" htmlFor="location">City</label>
                    <input id="location" name="location" className="input" value={form.location} onChange={set} placeholder="Bengaluru" maxLength={120} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="address">Venue address</label>
                    <input id="address" name="address" className="input" value={form.address} onChange={set} placeholder="Street, area" maxLength={300} />
                  </div>
                  <label className={`check ${s.full}`}>
                    <input type="checkbox" checked={form.secretLocation} onChange={() => toggle("secretLocation")} />
                    <span><strong>Secret location.</strong> Only confirmed guests see the address; everyone else sees the city.</span>
                  </label>
                </>
              )}
            </div>
          </section>

          <section className={s.section}>
            <h2>Tickets</h2>
            <p className="help">Each tier has its own price and capacity. An end date turns a tier into an early bird.</p>
            <div className={s.rows}>
              {form.tiers.map((t, i) => (
                <fieldset key={t._id ?? `new-${i}`} className={s.tier}>
                  <legend className="sr-only">Tier {i + 1}</legend>
                  <div className={s.tierGrid}>
                    <div className="field">
                      <label className="label" htmlFor={`tn-${i}`}>Name</label>
                      <input id={`tn-${i}`} className="input" value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} maxLength={40} required />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor={`tp-${i}`}>Price (₹)</label>
                      <input id={`tp-${i}`} className="input" type="number" min={0} step={1} inputMode="numeric" value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} placeholder="0 = free" required />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor={`tc-${i}`}>Capacity</label>
                      <input id={`tc-${i}`} className="input" type="number" min={Math.max(1, t.sold)} step={1} inputMode="numeric" value={t.capacity} onChange={(e) => setTier(i, { capacity: e.target.value })} required />
                      {t.sold > 0 && <span className="help">{t.sold} sold already</span>}
                    </div>
                    <div className="field">
                      <label className="label" htmlFor={`tm-${i}`}>Max per order</label>
                      <input id={`tm-${i}`} className="input" type="number" min={1} max={10} value={t.maxPerOrder} onChange={(e) => setTier(i, { maxPerOrder: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor={`ts-${i}`}>Sales end <span className="muted">(optional)</span></label>
                      <input id={`ts-${i}`} className="input" type="datetime-local" value={t.salesEnd} onChange={(e) => setTier(i, { salesEnd: e.target.value })} suppressHydrationWarning />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor={`td-${i}`}>Perks <span className="muted">(optional)</span></label>
                      <input id={`td-${i}`} className="input" value={t.description} onChange={(e) => setTier(i, { description: e.target.value })} maxLength={160} placeholder="Balcony access" />
                    </div>
                  </div>
                  <button type="button" className={`btn btn-ghost btn-sm ${s.remove}`} disabled={form.tiers.length === 1 || t.sold > 0} onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, j) => j !== i) })} title={t.sold > 0 ? "Tickets were sold in this tier" : undefined}>
                    <Trash size={15} weight="bold" aria-hidden="true" /> Remove tier
                  </button>
                </fieldset>
              ))}
            </div>
            {form.tiers.length < 6 && (
              <div className={s.adds}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, tiers: [...form.tiers, newTier("")] })}><Plus size={15} weight="bold" aria-hidden="true" /> Add tier</button>
                {!form.tiers.some((t) => /early/i.test(t.name)) && <button type="button" className="chip" onClick={() => setForm({ ...form, tiers: [{ ...newTier("Early bird"), salesEnd: "" }, ...form.tiers] })}>+ Early bird</button>}
                {!form.tiers.some((t) => /vip/i.test(t.name)) && <button type="button" className="chip" onClick={() => setForm({ ...form, tiers: [...form.tiers, { ...newTier("VIP"), maxPerOrder: "4" }] })}>+ VIP</button>}
              </div>
            )}
            <div className={s.grid} style={{ marginTop: 18 }}>
              <div className="field">
                <label className="label" htmlFor="refundPolicy">Refund policy</label>
                <select id="refundPolicy" name="refundPolicy" className="input" value={form.refundPolicy} onChange={set}>
                  {Object.entries(REFUND_COPY).map(([k, v]) => <option key={k} value={k}>{v.label}: {v.detail}</option>)}
                </select>
              </div>
              <label className="check" style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={form.absorbFees} onChange={() => toggle("absorbFees")} />
                <span><strong>I&apos;ll pay the fees.</strong> Buyers see your ticket price; the 2.5% + ₹10 fee and its GST come out of your sales.</span>
              </label>
            </div>
            <div className={s.grid} style={{ marginTop: 18 }}>
              <div className="field">
                <label className="label" htmlFor="salesStart">Tickets go on sale <span className="muted">(optional, India time)</span></label>
                <input id="salesStart" name="salesStart" type="datetime-local" className="input" value={form.salesStart} onChange={set} />
                <span className="small muted">Leave empty to sell as soon as you publish. Until then guests see a countdown and can tap Notify me.</span>
              </div>
              <div className="field">
                <label className="check">
                  <input type="checkbox" checked={form.group} onChange={() => toggle("group")} />
                  <span><strong>Group discount.</strong> Applied automatically to bigger orders, before any promo code.</span>
                </label>
                {form.group && (
                  <div className={s.groupDeal}>
                    <label>
                      <span className="sr-only">Percent off</span>
                      <input name="groupPercent" type="number" min={1} max={50} className="input" value={form.groupPercent} onChange={set} required />
                    </label>
                    <span>% off orders of</span>
                    <label>
                      <span className="sr-only">Minimum tickets</span>
                      <select name="groupMin" className="input" value={form.groupMin} onChange={set}>
                        {[2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </label>
                    <span>tickets</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={s.section}>
            <h2>Guests and access</h2>
            <div className={s.toggles}>
              <label className="check">
                <input type="checkbox" checked={form.requiresApproval} onChange={() => toggle("requiresApproval")} />
                <span><strong>Approve each guest.</strong> People request a spot; you approve or decline. They&apos;re charged only when approved.</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={form.showGuests} onChange={() => toggle("showGuests")} />
                <span><strong>Show who&apos;s going.</strong> First names on the event page. The count is always shown.</span>
              </label>
            </div>
            <h3 className={s.sub}>Questions for guests</h3>
            <div className={s.rows}>
              {form.questions.map((q, i) => (
                <div key={q._id ?? `q-${i}`} className={s.question}>
                  <label className="sr-only" htmlFor={`ql-${i}`}>Question {i + 1}</label>
                  <input id={`ql-${i}`} className="input" value={q.label} onChange={(e) => setQuestion(i, { label: e.target.value })} placeholder="e.g. T-shirt size" maxLength={120} />
                  <label className="check"><input type="checkbox" checked={q.required} onChange={(e) => setQuestion(i, { required: e.target.checked })} /> Required</label>
                  <button type="button" className="icon-btn" onClick={() => setForm({ ...form, questions: form.questions.filter((_, j) => j !== i) })} aria-label={`Remove question ${i + 1}`}><Trash size={16} weight="bold" aria-hidden="true" /></button>
                </div>
              ))}
            </div>
            {form.questions.length < 5 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, questions: [...form.questions, { label: "", required: false }] })}><Plus size={15} weight="bold" aria-hidden="true" /> Add question</button>
            )}
          </section>

          <section className={s.section}>
            <h2>Promo codes</h2>
            <p className="help">Share <code className="mono">/events/…?code=CODE</code> and the code applies itself at checkout.</p>
            <div className={s.rows}>
              {form.promoCodes.map((p, i) => (
                <div key={i} className={s.promo}>
                  <div className="field">
                    <label className="label" htmlFor={`pc-${i}`}>Code</label>
                    <input id={`pc-${i}`} className="input mono" value={p.code} onChange={(e) => setPromo(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} maxLength={20} required placeholder="EARLY20" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`pk-${i}`}>Type</label>
                    <select id={`pk-${i}`} className="input" value={p.kind} onChange={(e) => setPromo(i, { kind: e.target.value as "percent" | "flat" })}>
                      <option value="percent">% off</option>
                      <option value="flat">₹ off</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`pa-${i}`}>Amount</label>
                    <input id={`pa-${i}`} className="input" type="number" min={1} max={p.kind === "percent" ? 100 : undefined} value={p.amount} onChange={(e) => setPromo(i, { amount: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`pl-${i}`}>Uses</label>
                    <input id={`pl-${i}`} className="input" type="number" min={Math.max(1, p.used)} value={p.limit} onChange={(e) => setPromo(i, { limit: e.target.value })} />
                    {p.used > 0 && <span className="help">{p.used} used</span>}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`pe-${i}`}>Expires</label>
                    <input id={`pe-${i}`} className="input" type="datetime-local" value={p.expiresAt} onChange={(e) => setPromo(i, { expiresAt: e.target.value })} suppressHydrationWarning />
                  </div>
                  <button type="button" className={`icon-btn ${s.promoRemove}`} onClick={() => setForm({ ...form, promoCodes: form.promoCodes.filter((_, j) => j !== i) })} aria-label={`Remove code ${p.code || i + 1}`}><Trash size={16} weight="bold" aria-hidden="true" /></button>
                </div>
              ))}
            </div>
            {form.promoCodes.length < 10 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, promoCodes: [...form.promoCodes, { code: "", kind: "percent", amount: "10", limit: "100", expiresAt: "", used: 0 }] })}><Plus size={15} weight="bold" aria-hidden="true" /> Add promo code</button>
            )}
          </section>

          {/* Pressing Enter in a field saves: a draft stays a draft, a live event stays live */}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} data-status={published ? "keep" : "draft"} />
        </form>

        <aside className={s.side}>
          <div className={s.previewBox} inert>
            <p className="tag muted">Preview</p>
            {preview.date ? (
              <EventCard event={preview} eager />
            ) : (
              <div className="empty" style={{ padding: 32 }}>
                <p>Pick a date and your event card appears here, exactly as guests will see it.</p>
              </div>
            )}
          </div>
          <div className={s.check}>
            <p className="tag">Before you publish</p>
            <ul>
              {checklist.map((c) => (
                <li key={c.label} data-ok={c.ok || undefined}>
                  {c.ok ? <CheckCircle size={18} weight="fill" aria-hidden="true" /> : <Circle size={18} weight="bold" aria-hidden="true" />}
                  <span>{c.label}{!c.required && <span className="muted"> (recommended)</span>}</span>
                  <span className="sr-only">{c.ok ? "done" : "missing"}</span>
                </li>
              ))}
            </ul>
            <p className="mono small muted">{capacity} seats across {form.tiers.length} {form.tiers.length === 1 ? "tier" : "tiers"}</p>
            {published ? (
              <button type="submit" form="event-form" data-status="keep" className="btn btn-primary btn-lg btn-block" disabled={!!busy || !ready}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            ) : (
              <>
                <button type="submit" form="event-form" data-status="published" className="btn btn-primary btn-lg btn-block" disabled={!!busy || !ready}>
                  {busy === "published" ? "Publishing…" : "Publish"}
                </button>
                <button type="submit" form="event-form" data-status="draft" className="btn btn-secondary btn-block" disabled={!!busy}>
                  {busy === "draft" ? "Saving…" : "Save draft"}
                </button>
              </>
            )}
            {published && <p className="help">Changing the date or venue notifies every ticket holder.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
