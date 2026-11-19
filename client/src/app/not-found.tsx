import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <span className="empty-art" style={{ width: 120, height: 120, fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 800 }} aria-hidden="true">404</span>
        <h1 className="h2">This page isn&apos;t on the bill</h1>
        <p>It may have moved, or the event was removed by its host.</p>
        <Link href="/events" className="btn btn-primary">Browse events</Link>
      </div>
    </div>
  );
}
