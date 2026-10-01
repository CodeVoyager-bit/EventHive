"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarPlus, Eye, EyeOff, Ticket } from "lucide-react";
import { api } from "@/lib/api";
import s from "../auth.module.css";

export default function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "attendee" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.register(form);
      router.push(form.role === "organizer" && next === "/" ? "/dashboard" : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <h1>Create account</h1>
      <p className={s.sub}>It takes less than a minute.</p>
      {error && (
        <p className="alert alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="field">
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" autoComplete="name" className="input" placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
      </div>
      <div className="field">
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <div className={s.passwordWrap}>
          <input id="password" type={show ? "text" : "password"} autoComplete="new-password" className="input" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          <button type="button" className={s.eye} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="field">
        <span className="label" id="role-label">I want to</span>
        <div className={s.roles} role="group" aria-labelledby="role-label">
          <button type="button" className={s.role} aria-pressed={form.role === "attendee"} onClick={() => setForm({ ...form, role: "attendee" })}>
            <strong><Ticket size={16} aria-hidden="true" /> Attend events</strong>
            <span>Book tickets and leave reviews</span>
          </button>
          <button type="button" className={s.role} aria-pressed={form.role === "organizer"} onClick={() => setForm({ ...form, role: "organizer" })}>
            <strong><CalendarPlus size={16} aria-hidden="true" /> Organize events</strong>
            <span>Create events and sell tickets</span>
          </button>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
      <p className={s.switch}>
        Already have an account? <Link href={`/auth/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link>
      </p>
    </form>
  );
}
