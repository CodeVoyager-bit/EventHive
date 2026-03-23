"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken, setUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = (await api.login(form)) as { user: Record<string, unknown>; token: string };
      setToken(data.token);
      setUser(data.user);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>Welcome back to<br /><span>EventHive</span></h2>
          <p>Your gateway to amazing events. Sign in to access your tickets and discover new experiences.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap fade-in-up">
          <h1>Sign In</h1>
          <p className="auth-sub">Enter your credentials to continue</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="auth-switch">
            New here? <Link href="/auth/register">Create an account</Link>
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
          background: var(--brand);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        .auth-left-content {
          position: relative;
          z-index: 1;
          color: white;
          max-width: 400px;
        }
        .auth-left-content h2 {
          font-size: 2.4rem;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .auth-left-content h2 span { opacity: 0.9; }
        .auth-left-content p {
          font-size: 1rem;
          opacity: 0.8;
          line-height: 1.7;
        }
        .auth-shapes { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .a-shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }
        .a-shape-1 { width: 200px; height: 200px; top: -60px; right: -40px; }
        .a-shape-2 { width: 120px; height: 120px; bottom: 20%; left: -30px; }
        .a-shape-3 { width: 80px; height: 80px; bottom: -20px; right: 30%; }
        .auth-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: var(--bg-primary);
        }
        .auth-form-wrap {
          width: 100%;
          max-width: 400px;
        }
        .auth-form-wrap h1 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .auth-sub {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 28px;
        }
        .auth-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 20px;
        }
        .auth-switch {
          text-align: center;
          margin-top: 20px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .auth-switch a {
          color: var(--brand);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .auth-page { flex-direction: column; }
          .auth-left {
            padding: 40px 24px;
            min-height: auto;
          }
          .auth-left-content h2 { font-size: 1.6rem; }
          .auth-right { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
