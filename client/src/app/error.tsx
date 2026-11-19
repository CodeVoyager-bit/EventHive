"use client";

import { WarningCircle } from "@phosphor-icons/react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container section">
      <div className="empty">
        <span className="empty-art"><WarningCircle size={32} weight="bold" aria-hidden="true" /></span>
        <h2 className="h3">Something went wrong</h2>
        <p>{error.message || "Please try again in a moment."}</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
