"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import s from "../auth.module.css";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.login(form);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <h1>Sign in</h1>
      <p className={s.sub}>Enter your details to continue.</p>
      {error && (
        <p className="alert alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="field">
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <div className={s.passwordWrap}>
          <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="input" placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="button" className={s.eye} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className={s.switch}>
        New here? <Link href={`/auth/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
      </p>
    </form>
  );
}
