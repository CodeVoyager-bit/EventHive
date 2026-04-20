"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getUser } from "@/lib/api";
import { Event, Booking } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!user || (user.role !== "organizer" && user.role !== "admin")) {
      router.push("/auth/login");
      return;
    }
    loadMyEvents();
  }, []);

  async function loadMyEvents() {
    try {
      const data = (await api.getMyEvents()) as Event[];
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.deleteEvent(id);
      setEvents(events.filter((e) => e._id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const totalRevenue = events.reduce((sum, e) => sum + ((e as any).revenue ?? e.bookedCount * e.price), 0);
  const totalBookings = events.reduce((sum, e) => sum + e.bookedCount, 0);
  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0);

  return (
    <div className="dashboard-page container">
      <div className="dash-header fade-in-up">
        <div>
          <h1 className="section-title">Organizer <span className="gradient-text">Dashboard</span></h1>
          <p className="section-subtitle">Manage your events and track performance</p>
        </div>
        <Link href="/dashboard/create" className="btn btn-primary">
          ✨ Create Event
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid fade-in-up">
        <div className="stat-card glass-card" style={{ transform: "none" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(255,90,54,0.1)" }}>
            <span>📊</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{events.length}</span>
            <span className="stat-label">Total Events</span>
          </div>
          <div className="stat-accent" style={{ background: "#FF5A36" }}></div>
        </div>
        <div className="stat-card glass-card" style={{ transform: "none" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
            <span>🎟️</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalBookings}</span>
            <span className="stat-label">Tickets Sold</span>
          </div>
          <div className="stat-accent" style={{ background: "#3b82f6" }}></div>
        </div>
        <div className="stat-card glass-card" style={{ transform: "none" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
            <span>💰</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">${totalRevenue.toLocaleString()}</span>
            <span className="stat-label">Revenue</span>
          </div>
          <div className="stat-accent" style={{ background: "#38B000" }}></div>
        </div>
        <div className="stat-card glass-card" style={{ transform: "none" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
            <span>👥</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalCapacity}</span>
            <span className="stat-label">Total Capacity</span>
          </div>
          <div className="stat-accent" style={{ background: "#FFBE0B" }}></div>
        </div>
      </div>

      {/* Events Table */}
      <div className="events-table-wrapper glass-card fade-in-up" style={{ transform: "none", animationDelay: "0.2s" }}>
        <div className="table-header">
          <h2>My Events</h2>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : events.length > 0 ? (
          <div className="table-scroll">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event._id}>
                    <td>
                      <div className="event-cell">
                        <span className="event-emoji">
                          {event.category === "music" ? "🎵" : event.category === "tech" ? "💻" : event.category === "sports" ? "⚽" : "🎉"}
                        </span>
                        <div>
                          <strong>{event.title}</strong>
                          <span className="event-location">{event.location}</span>
                        </div>
                      </div>
                    </td>
                    <td>{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td><span className={`badge badge-${event.category}`}>{event.category}</span></td>
                    <td>
                      <div className="booking-bar-cell">
                        <span>{event.bookedCount}/{event.capacity}</span>
                        <div className="mini-bar">
                          <div className="mini-bar-fill" style={{ width: `${(event.bookedCount / event.capacity) * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="revenue-cell">${((event as any).revenue ?? event.bookedCount * event.price).toLocaleString()}</td>
                    <td><span className={`badge badge-${event.status === "published" ? "confirmed" : "cancelled"}`}>{event.status}</span></td>
                    <td>
                      <div className="action-btns">
                        <Link href={`/events/${event._id}`} className="btn btn-secondary btn-sm">View</Link>
                        <button onClick={() => handleDelete(event._id)} className="btn btn-danger btn-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No events yet</h3>
            <p>Create your first event to get started!</p>
            <Link href="/dashboard/create" className="btn btn-primary mt-2" style={{ display: "inline-flex" }}>
              Create Event
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-page {
          padding: 48px 0;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 36px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 36px;
        }
        .stat-card {
          position: relative;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          overflow: hidden;
        }
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .stat-accent {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          opacity: 0.6;
        }
        .events-table-wrapper {
          padding: 0;
          overflow: hidden;
        }
        .table-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }
        .table-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .table-scroll {
          overflow-x: auto;
        }
        .events-table {
          width: 100%;
          border-collapse: collapse;
        }
        .events-table th {
          text-align: left;
          padding: 14px 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid var(--border-color);
          white-space: nowrap;
        }
        .events-table td {
          padding: 16px 20px;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          vertical-align: middle;
        }
        .events-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        .event-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .event-emoji {
          font-size: 1.3rem;
        }
        .event-cell strong {
          display: block;
          font-size: 0.9rem;
        }
        .event-location {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .booking-bar-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.85rem;
        }
        .mini-bar {
          height: 4px;
          width: 80px;
          background: var(--bg-glass);
          border-radius: 2px;
          overflow: hidden;
        }
        .mini-bar-fill {
          height: 100%;
          background: var(--accent-gradient);
          border-radius: 2px;
        }
        .revenue-cell {
          font-weight: 700;
          color: var(--success);
        }
        .action-btns {
          display: flex;
          gap: 6px;
        }

        @media (max-width: 768px) {
          .dash-header {
            flex-direction: column;
            gap: 16px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .events-table th,
          .events-table td {
            padding: 12px 14px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
