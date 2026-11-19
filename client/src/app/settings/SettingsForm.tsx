"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { User } from "@/types";

// Profile: name (re-issues the session so the navbar updates), home city, and a bio for hosts
export default function SettingsForm({ me, cities }: { me: User; cities: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(me.name);
  const [city, setCity] = useState(me.city ?? "");
  const [bio, setBio] = useState(me.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const host = me.role === "organizer";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await api.updateProfile({ name, city, ...(host ? { bio } : {}) });
      document.cookie = `city=${encodeURIComponent(city)}; path=/; max-age=31536000; samesite=lax`;
      setStatus({ ok: true, text: "Saved." });
      router.refresh();
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card card-pad" onSubmit={submit} style={{ display: "grid", gap: 18 }} aria-label="Profile">
      <div className="field">
        <label className="label" htmlFor="name">Name</label>
        <input id="name" className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="field">
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" value={me.email} disabled />
        <span className="help">Used to sign in, and by friends sending you tickets.</span>
      </div>
      <div className="field">
        <label className="label" htmlFor="city">Home city</label>
        <input id="city" className="input" list="cities" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru" />
        <datalist id="cities">
          {cities.map((c) => <option key={c} value={c} />)}
        </datalist>
        <span className="help">The home page and Explore start with events here.</span>
      </div>
      {host && (
        <div className="field">
          <label className="label" htmlFor="bio">Host bio</label>
          <textarea id="bio" className="input" maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What kind of events do you run?" />
          <span className="help">Shown on your host page and every event you run. {400 - bio.length} characters left.</span>
        </div>
      )}
      {!host && me.referrals !== undefined && (
        <p className="alert">
          <UsersThree size={18} weight="bold" aria-hidden="true" />
          <span>{me.referrals ? `${me.referrals} ${me.referrals === 1 ? "booking has" : "bookings have"} come through your shared links.` : "Share an event with “Share your link” and hosts can see who you brought."}</span>
        </p>
      )}
      {status && (
        <p className={`alert ${status.ok ? "alert-success" : "alert-error"}`} role="status">
          {status.ok ? <CheckCircle size={16} aria-hidden="true" /> : <WarningCircle size={16} aria-hidden="true" />} {status.text}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        {host && <Link href={`/hosts/${me._id}`} className="btn btn-secondary">View your host page</Link>}
      </div>
    </form>
  );
}
