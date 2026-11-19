import Link from "next/link";
import Logo from "./Logo";
import { CATEGORY_META } from "@/lib/categories";
import s from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`container ${s.inner}`}>
        <div className={s.brand}>
          <Link href="/" className={s.logo} translate="no">
            <Logo size={34} /> EventHive
          </Link>
          <p>Gigs, meetups, runs and supper clubs across India. Book a seat, get a live ticket, walk in.</p>
        </div>
        <nav className={s.col} aria-label="Explore">
          <h2 className="tag">Explore</h2>
          <Link href="/events">All events</Link>
          {Object.entries(CATEGORY_META).slice(0, 5).map(([key, meta]) => (
            <Link key={key} href={`/events?category=${key}`}>{meta.label}</Link>
          ))}
        </nav>
        <nav className={s.col} aria-label="Hosts">
          <h2 className="tag">Hosts</h2>
          <Link href="/dashboard/create">Create an event</Link>
          <Link href="/dashboard">Host dashboard</Link>
          <Link href="/#hosts">Featured hosts</Link>
        </nav>
        <nav className={s.col} aria-label="Account">
          <h2 className="tag">Account</h2>
          <Link href="/bookings">My tickets</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </div>
      <div className={`container ${s.bottom}`}>
        <span>© {new Date().getFullYear()} EventHive</span>
        <span>Prices in ₹. Fees and GST shown before you pay.</span>
      </div>
    </footer>
  );
}
