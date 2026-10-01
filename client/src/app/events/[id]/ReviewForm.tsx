"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Star } from "lucide-react";
import { api } from "@/lib/api";
import s from "./ReviewForm.module.css";

export default function ReviewForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createReview({ eventId, rating, comment });
      setComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`card card-pad ${s.form}`} onSubmit={submit}>
      <h3 className="h3">Leave a review</h3>
      <div className="field">
        <span className="label" id="rating-label">Rating</span>
        <div className={s.stars} role="radiogroup" aria-labelledby="rating-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={`${s.star} ${n <= rating ? s.on : ""}`}
              onClick={() => setRating(n)}
            >
              <Star size={24} fill={n <= rating ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="comment">Your experience</label>
        <textarea id="comment" className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What stood out?" required maxLength={1000} />
      </div>
      {error && (
        <p className="alert alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
