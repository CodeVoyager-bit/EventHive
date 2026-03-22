"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Event } from "@/types";
import EventCard from "@/components/EventCard";

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [eventType, setEventType] = useState("");

  useEffect(() => {
    loadEvents();
  }, [category, eventType]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearch(q);
      searchEvents(q);
    }
  }, [searchParams]);

  async function loadEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (eventType) params.set("eventType", eventType);
      const data = await api.getEvents(params.toString()) as Event[];
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function searchEvents(q: string) {
    if (!q.trim()) {
      loadEvents();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchEvents(q) as Event[];
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchEvents(search);
  }

  const categories = ["", "music", "tech", "sports", "art", "food", "business", "other"];

  return (
    <div className="events-page container">
      <div className="page-header fade-in-up">
        <h1 className="section-title">Explore <span className="gradient-text">Events</span></h1>
        <p className="section-subtitle">Find your next unforgettable experience</p>
      </div>

      {/* Filters */}
      <div className="filters fade-in-up">
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-input"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <div className="filter-row">
          <div className="filter-chips">
            {categories.map((cat) => (
              <button
                key={cat || "all"}
                className={`chip ${category === cat ? "active" : ""}`}
                onClick={() => { setCategory(cat); setSearch(""); }}
              >
                {cat || "All"}
              </button>
            ))}
          </div>
          <select
            className="form-select type-filter"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="online">Online</option>
            <option value="venue">Venue</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="loading-spinner">Loading events...</div>
      ) : events.length > 0 ? (
        <>
          <p className="results-count">{events.length} event{events.length !== 1 ? "s" : ""} found</p>
          <div className="events-grid">
            {events.map((event, i) => (
              <EventCard key={event._id} event={event} index={i} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>No events found</h3>
          <p>Try a different search or category, or check back later.</p>
        </div>
      )}

      <style jsx>{`
        .events-page {
          padding: 48px 0;
        }
        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .filters {
          margin-bottom: 40px;
        }
        .search-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .search-bar .form-input {
          flex: 1;
        }
        .filter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .filter-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chip {
          padding: 8px 16px;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: capitalize;
          transition: all 0.3s ease;
        }
        .chip:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }
        .chip.active {
          background: var(--accent-gradient);
          border-color: transparent;
          color: white;
        }
        .type-filter {
          width: auto;
          min-width: 140px;
        }
        .results-count {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .search-bar {
            flex-direction: column;
          }
          .filter-row {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-chips {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 8px;
          }
          .chip {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}
