"use client";

import { AlertCircle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container section">
      <div className="empty">
        <AlertCircle size={36} aria-hidden="true" />
        <h2 className="h3">Something went wrong</h2>
        <p className="muted">{error.message || "Please try again in a moment."}</p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
