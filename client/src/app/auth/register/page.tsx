"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken, setUser } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "attendee" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = (await api.register(form)) as { user: Record<string, unknown>; token: string };
      setToken(data.token);
      setUser(data.user);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>Join the<br /><span>EventHive</span> Community</h2>
          <p>Create an account and start discovering incredible events or become an organizer today.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap fade-in-up">
          <h1>Create Account</h1>
          <p className="auth-sub">Fill in your details to get started</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
            </div>

            <div className="form-group">
              <label className="form-label">I want to</label>
              <div className="role-row">
                <button type="button" className={`role-btn ${form.role === "attendee" ? "active" : ""}`} onClick={() => setForm({ ...form, role: "attendee" })}>
                  <span className="role-color" style={{ background: "#4361EE" }}></span>
                  Attend Events
                </button>
                <button type="button" className={`role-btn ${form.role === "organizer" ? "active" : ""}`} onClick={() => setForm({ ...form, role: "organizer" })}>
                  <span className="role-color" style={{ background: "#FF5A36" }}></span>
                  Organize Events
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          display: flex;
          min-height: calc(100vh - 64px);
        }
        .auth-left {
          flex: 1;
          background: var(--electric-blue);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        .auth-left-content {
          position: relative; z-index: 1;
          color: white; max-width: 400px;
        }
        .auth-left-content h2 {
          font-size: 2.4rem;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .auth-left-content p {
          font-size: 1rem; opacity: 0.8; line-height: 1.7;
        }
        .auth-shapes { position: absolute; inset: 0; pointer-events: none; }
        .a-shape { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .a-shape-1 { width: 240px; height: 240px; top: -80px; left: -60px; }
        .a-shape-2 { width: 160px; height: 160px; bottom: -40px; right: -30px; }
        .auth-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: var(--bg-primary);
        }
        .auth-form-wrap { width: 100%; max-width: 420px; }
        .auth-form-wrap h1 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .auth-sub {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 24px;
        }
        .auth-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 16px;
        }
        .role-row { display: flex; gap: 10px; }
        .role-btn {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .role-btn:hover { border-color: var(--border-hover); }
        .role-btn.active {
          border-color: var(--brand);
          background: rgba(255,90,54,0.05);
        }
        .role-color {
          width: 10px; height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .auth-switch {
          text-align: center;
          margin-top: 20px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .auth-switch a { color: var(--electric-blue); font-weight: 600; }

        @media (max-width: 768px) {
          .auth-page { flex-direction: column; }
          .auth-left { padding: 40px 24px; min-height: auto; }
          .auth-left-content h2 { font-size: 1.6rem; }
          .auth-right { padding: 32px 24px; }
          .role-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
