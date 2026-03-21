"use client";

import Link from "next/link";
import { Event } from "@/types";

const categoryColors: Record<string, string> = {
  music: "#FF006E",
  tech: "#4361EE",
  sports: "#38B000",
  art: "#FFBE0B",
  food: "#FF5A36",
  business: "#7B2FF7",
  other: "#6B7280",
};

export default function EventCard({ event, index }: { event: Event; index: number }) {
  const color = categoryColors[event.category] || "#FF5A36";
  const spotsLeft = event.capacity - event.bookedCount;
  const pct = (event.bookedCount / event.capacity) * 100;

  return (
    <Link href={`/events/${event._id}`} className="ev-card fade-in-up" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="ev-top" style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}>
        <div className="ev-cat-dot" style={{ background: color }}></div>
        <span className="ev-category" style={{ color }}>{event.category}</span>
        <span className={`ev-type-pill ${event.eventType}`}>
          {event.eventType === "online" ? "Online" : "In-person"}
        </span>
      </div>

      <div className="ev-body">
        <h3 className="ev-title">{event.title}</h3>

        <div className="ev-meta">
          <div className="ev-meta-item">
            <span className="ev-meta-icon">📅</span>
            {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
          <div className="ev-meta-item">
            <span className="ev-meta-icon">📍</span>
            {event.location}
          </div>
        </div>

        <div className="ev-footer">
          <div className="ev-price">
            {event.price === 0 ? (
              <span className="ev-free">FREE</span>
            ) : (
              <><span className="ev-amount">${event.price}</span><span className="ev-per">/ticket</span></>
            )}
          </div>
          <div className="ev-spots">
            <div className="spots-bar">
              <div className="spots-fill" style={{ width: `${pct}%`, background: color }}></div>
            </div>
            <span className="spots-text">{spotsLeft} left</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ev-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .ev-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-hover);
        }
        .ev-top {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ev-cat-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ev-category {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .ev-type-pill {
          margin-left: auto;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          background: var(--bg-input);
          color: var(--text-secondary);
        }
        .ev-body { padding: 0 20px 20px; }
        .ev-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 14px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ev-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 18px; }
        .ev-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .ev-meta-icon { font-size: 0.9rem; }
        .ev-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 14px;
          border-top: 1px solid var(--border-color);
        }
        .ev-price { display: flex; align-items: baseline; gap: 2px; }
        .ev-amount { font-size: 1.3rem; font-weight: 800; }
        .ev-per { font-size: 0.75rem; color: var(--text-muted); }
        .ev-free {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--bright-green);
          padding: 2px 10px;
          background: rgba(56,176,0,0.1);
          border-radius: var(--radius-full);
        }
        .ev-spots { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .spots-bar {
          width: 64px; height: 4px;
          background: var(--bg-input);
          border-radius: 2px;
          overflow: hidden;
        }
        .spots-fill { height: 100%; border-radius: 2px; }
        .spots-text { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
      `}</style>
    </Link>
  );
}
