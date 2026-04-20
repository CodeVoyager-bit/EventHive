"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="flogo-mark">E</span>
              <span className="flogo-name">EventHive</span>
            </div>
            <p className="footer-desc">Discover, create, and attend events that matter. Your gateway to unforgettable experiences.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Explore</h4>
              <Link href="/events">All Events</Link>
              <Link href="/events?category=music">Music</Link>
              <Link href="/events?category=tech">Tech</Link>
              <Link href="/events?category=sports">Sports</Link>
              <Link href="/events?category=art">Art</Link>
              <Link href="/events?category=food">Food</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link href="/auth/login">Log In</Link>
              <Link href="/auth/register">Sign Up</Link>
              <Link href="/bookings">My Tickets</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 EventHive. Built for SESD.</span>
        </div>
      </div>

      <style jsx>{`
        .footer {
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
          margin-top: 20px;
        }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 20px 24px;
        }
        .footer-top {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          margin-bottom: 32px;
        }
        .footer-brand { max-width: 320px; }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 1.2rem;
          margin-bottom: 12px;
        }
        .flogo-mark {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: var(--brand);
          color: white;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 800;
        }
        .footer-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .footer-links { display: flex; gap: 48px; }
        .footer-col { display: flex; flex-direction: column; gap: 8px; }
        .footer-col h4 {
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          font-weight: 700;
          margin-bottom: 4px;
        }
        .footer-col a {
          font-size: 0.88rem;
          color: var(--text-muted);
          transition: color 0.2s;
        }
        .footer-col a:hover { color: var(--brand); }
        .footer-bottom {
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .footer-top { flex-direction: column; }
          .footer-links { gap: 32px; }
        }
      `}</style>
    </footer>
  );
}
