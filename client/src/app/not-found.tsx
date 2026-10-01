import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <SearchX size={36} aria-hidden="true" />
        <h2 className="h3">Page not found</h2>
        <p className="muted">The page you are looking for does not exist or has been removed.</p>
        <Link href="/events" className="btn btn-primary">
          Browse events
        </Link>
      </div>
    </div>
  );
}
