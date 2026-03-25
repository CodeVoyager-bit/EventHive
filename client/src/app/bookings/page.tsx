"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getUser } from "@/lib/api";
import { Booking, Event } from "@/types";

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data = (await api.getMyBookings()) as Booking[];
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.cancelBooking(id);
      loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel");
    }
  }

  return (
    <div className="bookings-page container">
      <div className="page-header fade-in-up">
        <h1 className="section-title">My <span className="gradient-text">Tickets</span></h1>
        <p className="section-subtitle">Your booking history and active tickets</p>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading bookings...</div>
      ) : bookings.length > 0 ? (
        <div className="bookings-list">
          {bookings.map((booking, i) => {
            const event = booking.eventId as Event;
            const isConfirmed = booking.status === "confirmed";
            return (
              <div
                key={booking._id}
                className="booking-card glass-card fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, transform: "none" }}
              >
                <div className="ticket-strip" style={{ background: isConfirmed ? "var(--accent-gradient)" : "linear-gradient(135deg, #6b7280, #4b5563)" }}></div>

                <div className="booking-content">
                  <div className="booking-main">
                    <div className="booking-event">
                      <div className="event-icon-box">
                        <span>{event.category === "music" ? "🎵" : event.category === "tech" ? "💻" : event.category === "sports" ? "⚽" : "🎉"}</span>
                      </div>
                      <div>
                        <h3>{event.title || "Event"}</h3>
                        <div className="booking-meta">
                          <span>📅 {new Date(event.date || booking.bookingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span>📍 {event.location || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="booking-details">
                      <div className="detail-item">
                        <span className="detail-label">Ticket Type</span>
                        <span className={`badge badge-${booking.ticketType === "vip" ? "business" : "tech"}`}>
                          {booking.ticketType === "vip" ? "✨ VIP" : "General"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Amount</span>
                        <span className="detail-value gradient-text">${booking.amount}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status</span>
                        <span className={`badge badge-${booking.status}`}>{booking.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="booking-ticket-code">
                    <div className="ticket-code-box">
                      <span className="code-label">TICKET CODE</span>
                      <span className="code-value">{booking.ticketCode}</span>
                      <div className="qr-placeholder">
                        <div className="qr-grid">
                          {Array.from({ length: 25 }).map((_, j) => (
                            <div key={j} className={`qr-cell ${Math.random() > 0.4 ? "filled" : ""}`}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isConfirmed && (
                    <div className="booking-actions">
                      <Link href={`/events/${typeof booking.eventId === "object" ? booking.eventId._id : booking.eventId}`} className="btn btn-secondary btn-sm">
                        View Event
                      </Link>
                      <button onClick={() => handleCancel(booking._id)} className="btn btn-danger btn-sm">
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state fade-in-up">
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎟️</div>
          <h3>No bookings yet</h3>
          <p>Explore events and book your first ticket!</p>
          <Link href="/events" className="btn btn-primary mt-2" style={{ display: "inline-flex" }}>
            Browse Events
          </Link>
        </div>
      )}

      <style jsx>{`
        .bookings-page {
          padding: 48px 0;
        }
        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .bookings-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .booking-card {
          position: relative;
          overflow: hidden;
        }
        .ticket-strip {
          height: 4px;
          width: 100%;
        }
        .booking-content {
          padding: 24px;
        }
        .booking-main {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 24px;
          margin-bottom: 20px;
        }
        .booking-event {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .event-icon-box {
          width: 52px;
          height: 52px;
          background: var(--accent-gradient-soft);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .booking-event h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .booking-meta {
          display: flex;
          gap: 16px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .booking-details {
          display: flex;
          gap: 24px;
          flex-shrink: 0;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .detail-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          font-weight: 600;
        }
        .detail-value {
          font-size: 1.1rem;
          font-weight: 800;
        }
        .booking-ticket-code {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
        }
        .ticket-code-box {
          text-align: center;
        }
        .code-label {
          display: block;
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .code-value {
          display: block;
          font-size: 1.2rem;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: 0.1em;
          color: var(--text-primary);
          margin-bottom: 12px;
        }
        .qr-placeholder {
          display: inline-block;
        }
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 2px;
          width: 50px;
          margin: 0 auto;
        }
        .qr-cell {
          width: 8px;
          height: 8px;
          border-radius: 1px;
          background: rgba(255,255,255,0.05);
        }
        .qr-cell.filled {
          background: var(--text-secondary);
        }
        .booking-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .booking-main {
            flex-direction: column;
          }
          .booking-details {
            width: 100%;
            justify-content: space-between;
          }
          .booking-meta {
            flex-direction: column;
            gap: 4px;
          }
          .booking-actions {
            justify-content: stretch;
          }
          .booking-actions .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
