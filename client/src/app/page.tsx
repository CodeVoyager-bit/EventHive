"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Event } from "@/types";
import EventCard from "@/components/EventCard";

export default function HomePage() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await api.getEvents() as Event[];
      setFeaturedEvents(data.slice(0, 6));
    } catch {
      // API might not be running
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/events?q=${encodeURIComponent(searchQuery)}`;
    }
  }

  const categories = [
    { icon: "🎵", name: "Music", color: "#FF006E", count: "120+" },
    { icon: "💻", name: "Tech", color: "#4361EE", count: "85+" },
    { icon: "⚽", name: "Sports", color: "#38B000", count: "60+" },
    { icon: "🎨", name: "Art", color: "#FFBE0B", count: "45+" },
    { icon: "🍕", name: "Food", color: "#FF5A36", count: "75+" },
    { icon: "💼", name: "Business", color: "#7B2FF7", count: "50+" },
  ];

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container hero-content fade-in-up">
          <div className="hero-tag">
            <span className="tag-dot"></span>
            Live Now — Find Events Near You
          </div>
          <h1 className="hero-title">
            Find Your Next<br />
            <span className="gradient-text">Unforgettable</span> Event
          </h1>
          <p className="hero-subtitle">
            Discover concerts, tech meetups, sports, art shows, and more.
            Book tickets in seconds.
          </p>

          <form className="hero-search" onSubmit={handleSearch}>
            <div className="search-box">
              <svg className="search-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Search events, artists, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">Search</button>
            </div>
          </form>

          
        </div>
      </section>

      {/* Categories */}
      <section className="categories container">
        <h2 className="section-title">Browse by <span className="gradient-text">Category</span></h2>
        <p className="section-subtitle">Find exactly what excites you</p>
        <div className="cat-grid">
          {categories.map((cat) => (
            <Link key={cat.name} href={`/events?category=${cat.name.toLowerCase()}`} className="cat-card">
              <div className="cat-color-bar" style={{ background: cat.color }}></div>
              <div className="cat-body">
                <span className="cat-icon">{cat.icon}</span>
                <div className="cat-info">
                  <strong>{cat.name}</strong>
                  <span className="cat-count">Browse events</span>
                </div>
              </div>
              <div className="cat-arrow">→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Events */}
      <section className="featured container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Trending <span className="gradient-text">Events</span></h2>
            <p className="section-subtitle">Don&apos;t miss out on what&apos;s hot right now</p>
          </div>
          <Link href="/events" className="btn btn-outline">View All →</Link>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading events...</div>
        ) : featuredEvents.length > 0 ? (
          <div className="events-grid">
            {featuredEvents.map((event, i) => (
              <EventCard key={event._id} event={event} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎪</div>
            <h3>No events yet</h3>
            <p>Start the backend server and create your first event!</p>
            <Link href="/auth/register" className="btn btn-primary mt-2" style={{ display: "inline-flex" }}>
              Get Started
            </Link>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="cta container">
        <div className="cta-card">
          <div className="cta-bg-dots"></div>
          <div className="cta-content">
            <h2>Ready to Host Your Own Event?</h2>
            <p>Join EventHive as an organizer and reach thousands of attendees.</p>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Start Organizing →
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        .home-page { overflow-x: hidden; }

        /* ---- HERO ---- */
        .hero {
          position: relative;
          padding: 100px 0 80px;
          text-align: center;
          overflow: hidden;
        }
        .hero-shapes { position: absolute; inset: 0; pointer-events: none; }
        .shape {
          position: absolute;
          border-radius: 50%;
        }
        .shape-1 {
          width: 300px; height: 300px;
          background: var(--brand);
          opacity: 0.07;
          top: -80px; right: -60px;
          filter: blur(60px);
        }
        .shape-2 {
          width: 200px; height: 200px;
          background: var(--electric-blue);
          opacity: 0.08;
          top: 40%; left: -40px;
          filter: blur(50px);
        }
        .shape-3 {
          width: 140px; height: 140px;
          background: var(--hot-pink);
          opacity: 0.06;
          bottom: 10%; right: 15%;
          filter: blur(40px);
        }
        .shape-4 {
          width: 100px; height: 100px;
          background: var(--sunny-yellow);
          opacity: 0.08;
          top: 20%; left: 20%;
          filter: blur(35px);
        }
        .hero-content { position: relative; z-index: 1; }
        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 28px;
        }
        .tag-dot {
          width: 8px; height: 8px;
          background: var(--bright-green);
          border-radius: 50%;
          animation: pulse-glow 2s infinite;
          box-shadow: 0 0 0 0 rgba(56,176,0,0.3);
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56,176,0,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(56,176,0,0); }
        }
        .hero-title {
          font-size: 3.8rem;
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.04em;
          margin-bottom: 20px;
        }
        .hero-subtitle {
          font-size: 1.15rem;
          color: var(--text-secondary);
          max-width: 520px;
          margin: 0 auto 36px;
          line-height: 1.7;
        }

        /* Search */
        .hero-search { max-width: 600px; margin: 0 auto 48px; }
        .search-box {
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 6px 6px 6px 16px;
          transition: border-color 0.2s;
        }
        .search-box:focus-within {
          border-color: var(--brand);
        }
        .search-svg {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-right: 10px;
        }
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.95rem;
          color: var(--text-primary);
          padding: 12px 0;
        }
        .search-input::placeholder { color: var(--text-muted); }
        .search-btn {
          background: var(--brand);
          color: white;
          padding: 12px 28px;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.9rem;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .search-btn:hover { background: var(--brand-dark); }

        /* Stats */
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
        }
        .hstat { display: flex; flex-direction: column; align-items: center; }
        .hstat-num {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--brand);
        }
        .hstat-label {
          font-size: 0.78rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        /* ---- CATEGORIES ---- */
        .categories { padding: 80px 0; }
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .cat-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: all 0.25s ease;
          position: relative;
        }
        .cat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-hover);
        }
        .cat-color-bar {
          height: 4px;
          width: 100%;
        }
        .cat-body {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px 18px;
        }
        .cat-icon { font-size: 2rem; flex-shrink: 0; }
        .cat-info { display: flex; flex-direction: column; }
        .cat-info strong {
          font-size: 0.95rem;
          font-weight: 700;
        }
        .cat-count {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .cat-arrow {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .cat-card:hover .cat-arrow {
          color: var(--brand);
          transform: translateY(-50%) translateX(4px);
        }

        /* ---- FEATURED ---- */
        .featured { padding: 40px 0 80px; }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        /* ---- CTA ---- */
        .cta { padding: 0 0 60px; }
        .cta-card {
          position: relative;
          text-align: center;
          padding: 72px 24px;
          border-radius: var(--radius-xl);
          background: var(--brand);
          overflow: hidden;
        }
        .cta-bg-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .cta-content { position: relative; z-index: 1; }
        .cta-card h2 {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin-bottom: 12px;
        }
        .cta-card p {
          color: rgba(255,255,255,0.85);
          margin-bottom: 28px;
          font-size: 1.05rem;
        }
        .cta-card .btn-primary {
          background: white;
          color: var(--brand);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .cta-card .btn-primary:hover {
          background: #f0f0f0;
        }

        @media (max-width: 768px) {
          .hero { padding: 60px 0 50px; }
          .hero-title { font-size: 2.2rem; }
          .hero-subtitle { font-size: 1rem; }
          .hero-stats { gap: 24px; }
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
          .section-header { flex-direction: column; gap: 16px; }
          .cta-card { padding: 48px 20px; }
          .cta-card h2 { font-size: 1.4rem; }
        }
        @media (max-width: 480px) {
          .cat-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
