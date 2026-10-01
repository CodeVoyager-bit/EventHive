"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Building2, Globe, ImageIcon, MapPin, NotebookPen, Ticket } from "lucide-react";
import { api } from "@/lib/api";
import { CATEGORY_META } from "@/lib/categories";
import type { Event } from "@/types";
import s from "./EventForm.module.css";

type Form = {
  title: string;
  description: string;
  category: string;
  date: string;
  location: string;
  eventType: "online" | "venue";
  meetingLink: string;
  platform: string;
  address: string;
  capacity: string;
  price: string;
  imageUrl: string;
  status: "published" | "draft" | "cancelled";
};

const pad = (n: number) => String(n).padStart(2, "0");
// ISO -> value for <input type="datetime-local"> in the browser's local time
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const empty: Form = {
  title: "", description: "", category: "tech", date: "", location: "", eventType: "venue",
  meetingLink: "", platform: "", address: "", capacity: "", price: "", imageUrl: "", status: "published",
};

export default function EventForm({ initial }: { initial?: Event }) {
  const router = useRouter();
  const editing = !!initial;
  const [form, setForm] = useState<Form>(() =>
    initial
      ? {
          ...empty,
          title: initial.title, description: initial.description, category: initial.category, date: toLocalInput(initial.date),
          location: initial.location, eventType: initial.eventType, meetingLink: initial.meetingLink ?? "", platform: initial.platform ?? "",
          address: initial.address ?? "", capacity: String(initial.capacity), price: String(initial.price), imageUrl: initial.imageUrl ?? "",
          status: initial.status,
        }
      : empty
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...form, capacity: Number(form.capacity), price: Number(form.price), date: new Date(form.date).toISOString() };
      if (initial) await api.updateEvent(initial._id, body);
      else await api.createEvent(body);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`container section ${s.wrap}`}>
      <Link href="/dashboard" className={s.back}>
        <ArrowLeft size={14} aria-hidden="true" /> Back to dashboard
      </Link>
      <div className={s.head}>
        <p className="eyebrow">{editing ? "Edit" : "New event"}</p>
        <h1 className="h2">{editing ? initial!.title : "Create an event"}</h1>
      </div>

      {error && (
        <p className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}

      <form className={`card ${s.form}`} onSubmit={submit}>
        <section className={s.section}>
          <h2><NotebookPen size={18} aria-hidden="true" /> Basics</h2>
          <div className={s.grid}>
            <div className={`field ${s.full}`}>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" className="input" value={form.title} onChange={set} placeholder="e.g. Tech Summit 2026" required minLength={3} maxLength={120} />
            </div>
            <div className={`field ${s.full}`}>
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" name="description" className="input" rows={5} value={form.description} onChange={set} placeholder="What should attendees expect?" required minLength={10} maxLength={5000} />
            </div>
            <div className="field">
              <label className="label" htmlFor="category">Category</label>
              <select id="category" name="category" className="input" value={form.category} onChange={set}>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="date">Date and time</label>
              <input id="date" name="date" type="datetime-local" className="input" value={form.date} onChange={set} required />
              <span className="help">Must be in the future.</span>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <h2><MapPin size={18} aria-hidden="true" /> Where</h2>
          <div className={s.grid}>
            <div className={`field ${s.full}`}>
              <span className="label" id="type-label">Format</span>
              <div className={s.toggle} role="group" aria-labelledby="type-label">
                <button type="button" className={s.toggleBtn} aria-pressed={form.eventType === "venue"} onClick={() => setForm({ ...form, eventType: "venue" })}>
                  <Building2 size={16} aria-hidden="true" /> In person
                </button>
                <button type="button" className={s.toggleBtn} aria-pressed={form.eventType === "online"} onClick={() => setForm({ ...form, eventType: "online" })}>
                  <Globe size={16} aria-hidden="true" /> Online
                </button>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="location">{form.eventType === "online" ? "Shown as" : "City"}</label>
              <input id="location" name="location" className="input" value={form.location} onChange={set} placeholder={form.eventType === "online" ? "Online" : "Pune"} required maxLength={120} />
            </div>
            {form.eventType === "online" ? (
              <>
                <div className="field">
                  <label className="label" htmlFor="platform">Platform</label>
                  <input id="platform" name="platform" className="input" value={form.platform} onChange={set} placeholder="Zoom, Google Meet…" maxLength={80} />
                </div>
                <div className={`field ${s.full}`}>
                  <label className="label" htmlFor="meetingLink">Meeting link</label>
                  <input id="meetingLink" name="meetingLink" type="url" className="input" value={form.meetingLink} onChange={set} placeholder="https://…" maxLength={500} />
                  <span className="help">Shown to signed-in users on the event page.</span>
                </div>
              </>
            ) : (
              <div className="field">
                <label className="label" htmlFor="address">Venue address</label>
                <input id="address" name="address" className="input" value={form.address} onChange={set} placeholder="Street, area" maxLength={300} />
              </div>
            )}
          </div>
        </section>

        <section className={s.section}>
          <h2><Ticket size={18} aria-hidden="true" /> Tickets</h2>
          <div className={s.grid}>
            <div className="field">
              <label className="label" htmlFor="capacity">Capacity</label>
              <input id="capacity" name="capacity" type="number" inputMode="numeric" className="input" min={1} max={100000} value={form.capacity} onChange={set} placeholder="100" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="price">General ticket price (USD)</label>
              <input id="price" name="price" type="number" inputMode="decimal" className="input" min={0} step="0.01" value={form.price} onChange={set} placeholder="0 for free" required />
              <span className="help">VIP tickets are priced at double this amount.</span>
            </div>
            {editing && (
              <div className="field">
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" className="input" value={form.status} onChange={set}>
                  <option value="published">Published</option>
                  <option value="draft">Draft (hidden)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
        </section>

        <section className={s.section}>
          <h2><ImageIcon size={18} aria-hidden="true" /> Cover image</h2>
          <div className="field">
            <label className="label" htmlFor="imageUrl">Image URL</label>
            <input id="imageUrl" name="imageUrl" type="url" className="input" value={form.imageUrl} onChange={set} placeholder="https://…" />
            <span className="help">Optional. A wide (16:9) image works best.</span>
            {form.imageUrl && (
              <div className={s.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="Cover preview" />
              </div>
            )}
          </div>
        </section>

        <div className={s.actions}>
          <Link href="/dashboard" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Publish event"}
          </button>
        </div>
      </form>
    </div>
  );
}
