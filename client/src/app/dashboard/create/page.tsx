"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";

export default function CreateEventPage() {
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    capacity: "",
    price: "",
    category: "tech",
    eventType: "venue" as "online" | "venue",
    meetingLink: "",
    platform: "",
    address: "",
  });

  useEffect(() => {
    if (!user || (user.role !== "organizer" && user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createEvent({
        ...form,
        capacity: parseInt(form.capacity),
        price: parseFloat(form.price),
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-page container">
      <div className="create-wrapper fade-in-up">
        <div className="create-header">
          <div className="create-icon">✨</div>
          <h1>Create <span className="gradient-text">New Event</span></h1>
          <p>Fill in the details to publish your event</p>
        </div>

        {error && <div className="create-error">{error}</div>}

        <form className="create-form glass-card" onSubmit={handleSubmit} style={{ transform: "none" }}>
          <div className="form-section">
            <h3 className="form-section-title">📝 Basic Details</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Event Title</label>
                <input className="form-input" name="title" placeholder="e.g. Tech Summit 2025" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea className="form-input" name="description" rows={4} placeholder="Describe your event..." value={form.description} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                  <option value="music">🎵 Music</option>
                  <option value="tech">💻 Tech</option>
                  <option value="sports">⚽ Sports</option>
                  <option value="art">🎨 Art</option>
                  <option value="food">🍕 Food</option>
                  <option value="business">💼 Business</option>
                  <option value="other">🎉 Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="datetime-local" name="date" value={form.date} onChange={handleChange} required />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">📍 Location & Type</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <div className="type-toggle">
                  <button type="button" className={`toggle-btn ${form.eventType === "venue" ? "active" : ""}`} onClick={() => setForm({ ...form, eventType: "venue" })}>
                    🏢 Venue
                  </button>
                  <button type="button" className={`toggle-btn ${form.eventType === "online" ? "active" : ""}`} onClick={() => setForm({ ...form, eventType: "online" })}>
                    🌐 Online
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" name="location" placeholder="City or Platform" value={form.location} onChange={handleChange} required />
              </div>
              {form.eventType === "online" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Meeting Link</label>
                    <input className="form-input" name="meetingLink" placeholder="https://zoom.us/..." value={form.meetingLink} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <input className="form-input" name="platform" placeholder="Zoom, Google Meet..." value={form.platform} onChange={handleChange} />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" name="address" placeholder="Full venue address" value={form.address} onChange={handleChange} />
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">🎟️ Tickets & Pricing</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="form-input" type="number" name="capacity" min="1" placeholder="100" value={form.capacity} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Price (USD)</label>
                <input className="form-input" type="number" name="price" min="0" step="0.01" placeholder="0 for free" value={form.price} onChange={handleChange} required />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Publishing..." : "🚀 Publish Event"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .create-page {
          padding: 48px 0;
        }
        .create-wrapper {
          max-width: 720px;
          margin: 0 auto;
        }
        .create-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .create-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
          animation: float 3s ease-in-out infinite;
        }
        .create-header h1 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .create-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .create-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 20px;
          text-align: center;
        }
        .create-form {
          padding: 36px;
        }
        .form-section {
          margin-bottom: 32px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--border-color);
        }
        .form-section:last-of-type {
          margin-bottom: 24px;
          border-bottom: none;
          padding-bottom: 0;
        }
        .form-section-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 20px;
          color: var(--text-primary);
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        .type-toggle {
          display: flex;
          gap: 8px;
        }
        .toggle-btn {
          flex: 1;
          padding: 12px;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .toggle-btn.active {
          border-color: var(--accent-primary);
          background: rgba(255,90,54,0.08);
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .create-form {
            padding: 24px;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
