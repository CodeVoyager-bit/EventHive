"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";
import { Event, Review } from "@/types";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [ticketType, setTicketType] = useState<"general" | "vip">("general");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [message, setMessage] = useState("");

  const user = getUser();
  const id = params.id as string;

  useEffect(() => {
    loadEvent();
    loadReviews();
  }, [id]);

  async function loadEvent() {
    try {
      const data = await api.getEvent(id) as Event;
      setEvent(data);
    } catch {
      setMessage("Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const data = await api.getEventReviews(id) as { reviews: Review[]; averageRating: number };
      setReviews(data.reviews);
      setAvgRating(data.averageRating);
    } catch {
      // reviews might not exist yet
    }
  }

  async function handleBook() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setBooking(true);
    try {
      await api.createBooking({ eventId: id, ticketType });
      setMessage("🎉 Booking confirmed! Check My Tickets for details.");
      loadEvent();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    try {
      await api.createReview({ eventId: id, ...reviewForm });
      setReviewForm({ rating: 5, comment: "" });
      loadReviews();
      setMessage("Review submitted!");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to submit review");
    }
  }

  if (loading) return <div className="loading-spinner">Loading event...</div>;
  if (!event) return <div className="error-message">Event not found</div>;

  const available = event.capacity - event.bookedCount;
  const orgName = typeof event.organizerId === "object" ? event.organizerId.name : "Organizer";
  const categoryEmoji = event.category === "music" ? "🎵" : event.category === "tech" ? "💻" : event.category === "sports" ? "⚽" : event.category === "art" ? "🎨" : event.category === "food" ? "🍕" : event.category === "business" ? "💼" : "🎉";

  return (
    <div className="event-detail container">
      <div className="detail-grid">
        {/* Main Content */}
        <div className="detail-main fade-in-up">
          <div className="detail-hero">
            <div className="detail-hero-bg">
              <span className="detail-emoji">{categoryEmoji}</span>
            </div>
            <div className="detail-badges">
              <span className={`badge badge-${event.category}`}>{event.category}</span>
              <span className={`badge badge-${event.eventType}`}>{event.eventType}</span>
            </div>
          </div>

          <h1 className="detail-title">{event.title}</h1>
          <p className="detail-description">{event.description}</p>

          <div className="detail-info glass-card" style={{ transform: "none" }}>
            <div className="info-row">
              <span className="info-icon">📅</span>
              <div>
                <strong>Date & Time</strong>
                <p>{new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric"
                })}</p>
              </div>
            </div>
            <div className="info-row">
              <span className="info-icon">📍</span>
              <div>
                <strong>Location</strong>
                <p>{event.location}</p>
                {event.eventType === "online" && event.meetingLink && (
                  <p style={{ color: "var(--accent-secondary)", fontSize: "0.85rem" }}>🔗 {event.meetingLink}</p>
                )}
                {event.eventType === "venue" && event.address && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{event.address}</p>
                )}
              </div>
            </div>
            <div className="info-row">
              <span className="info-icon">👤</span>
              <div>
                <strong>Organized by</strong>
                <p>{orgName}</p>
              </div>
            </div>
            <div className="info-row">
              <span className="info-icon">🎟️</span>
              <div>
                <strong>Capacity</strong>
                <p>{event.bookedCount} / {event.capacity} booked</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="reviews-section">
            <h2>Reviews {avgRating > 0 && <span className="avg-rating">⭐ {avgRating}/5</span>}</h2>

            {reviews.length > 0 ? (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-card glass-card" style={{ transform: "none" }}>
                    <div className="review-header">
                      <span className="review-author">
                        {typeof review.userId === "object" ? review.userId.name : "User"}
                      </span>
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`star ${s <= review.rating ? "filled" : ""}`}>★</span>
                        ))}
                      </div>
                    </div>
                    <p className="review-comment">{review.comment}</p>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No reviews yet. Be the first to review!</p>
            )}

            {user && (
              <form className="review-form glass-card" onSubmit={handleReview} style={{ transform: "none" }}>
                <h3>Leave a Review</h3>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <div className="rating-select">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`star-btn ${s <= reviewForm.rating ? "active" : ""}`}
                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      >★</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Comment</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Share your experience..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">Submit Review</button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar — Booking */}
        <div className="detail-sidebar fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="booking-card glass-card" style={{ transform: "none" }}>
            <div className="booking-price">
              <span className="price-label">Price</span>
              <div style={{ textAlign: "right" }}>
                <span className="price-amount gradient-text">
                  {event.price === 0
                    ? "FREE"
                    : `$${ticketType === "vip" ? event.price * 2 : event.price}`}
                </span>
                {ticketType === "vip" && event.price > 0 && (
                  <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    ✨ VIP — includes perks
                  </span>
                )}
              </div>
            </div>

            <div className="ticket-select">
              <label className="form-label">Ticket Type</label>
              <div className="ticket-options">
                <button
                  type="button"
                  className={`ticket-option ${ticketType === "general" ? "active" : ""}`}
                  onClick={() => setTicketType("general")}
                >
                  <span className="ticket-name">General</span>
                  <span className="ticket-price">${event.price}</span>
                </button>
                <button
                  type="button"
                  className={`ticket-option ${ticketType === "vip" ? "active" : ""}`}
                  onClick={() => setTicketType("vip")}
                >
                  <span className="ticket-name">VIP ✨</span>
                  <span className="ticket-price">${event.price * 2}</span>
                </button>
              </div>
            </div>

            <div className="availability-bar">
              <div className="availability-fill" style={{ width: `${(event.bookedCount / event.capacity) * 100}%` }}></div>
            </div>
            <p className="availability-text">
              {available > 0 ? `${available} tickets remaining` : "Sold Out"}
            </p>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={handleBook}
              disabled={booking || available <= 0}
            >
              {booking ? "Processing..." : available <= 0 ? "Sold Out" : "Book Now"}
            </button>

            {message && (
              <p className="booking-message" style={{
                color: message.includes("🎉") ? "var(--success)" : "var(--danger)",
                marginTop: "12px",
                fontSize: "0.9rem",
                textAlign: "center"
              }}>{message}</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .event-detail {
          padding: 48px 0;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
          align-items: start;
        }
        .detail-hero {
          position: relative;
          height: 280px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 28px;
        }
        .detail-hero-bg {
          width: 100%;
          height: 100%;
          background: var(--accent-gradient-soft);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .detail-emoji {
          font-size: 5rem;
          animation: float 4s ease-in-out infinite;
        }
        .detail-badges {
          position: absolute;
          top: 16px;
          left: 16px;
          display: flex;
          gap: 8px;
        }
        .detail-title {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }
        .detail-description {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.8;
          margin-bottom: 28px;
        }
        .detail-info {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
        }
        .info-row {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .info-icon {
          font-size: 1.3rem;
          margin-top: 2px;
        }
        .info-row strong {
          font-size: 0.85rem;
          font-weight: 600;
          display: block;
          margin-bottom: 2px;
        }
        .info-row p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        /* Sidebar */
        .booking-card {
          padding: 28px;
          position: sticky;
          top: 80px;
        }
        .booking-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .price-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .price-amount {
          font-size: 2rem;
          font-weight: 900;
        }
        .ticket-select {
          margin-bottom: 24px;
        }
        .ticket-options {
          display: flex;
          gap: 10px;
        }
        .ticket-option {
          flex: 1;
          padding: 14px;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          text-align: center;
          transition: all 0.3s ease;
          color: var(--text-primary);
        }
        .ticket-option.active {
          border-color: var(--accent-primary);
          background: rgba(255,90,54,0.08);
        }
        .ticket-name {
          display: block;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .ticket-price {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .availability-bar {
          height: 6px;
          background: var(--bg-glass);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .availability-fill {
          height: 100%;
          background: var(--accent-gradient);
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .availability-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 20px;
        }
        /* Reviews */
        .reviews-section h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avg-rating {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--warning);
        }
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .review-card {
          padding: 16px 20px;
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .review-author {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .review-comment {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 6px;
        }
        .review-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .review-form {
          padding: 24px;
        }
        .review-form h3 {
          font-size: 1.1rem;
          margin-bottom: 16px;
        }
        .rating-select {
          display: flex;
          gap: 4px;
        }
        .star-btn {
          background: none;
          font-size: 1.5rem;
          color: var(--text-muted);
          transition: color 0.2s;
          padding: 4px;
        }
        .star-btn.active {
          color: #f59e0b;
        }

        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .detail-hero {
            height: 200px;
          }
          .detail-title {
            font-size: 1.5rem;
          }
          .booking-card {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
