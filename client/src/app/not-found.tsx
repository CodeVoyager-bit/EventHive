import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <MagnifyingGlass size={40} weight="duotone" aria-hidden="true" />
        <h1 className="h2">Page not found</h1>
        <p className="muted">The page you are looking for does not exist or has been removed.</p>
        <Link href="/events" className="btn btn-primary">Browse Events</Link>
      </div>
    </div>
  );
}
