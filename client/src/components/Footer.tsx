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
            <Logo size={24} /> EventHive
          </Link>
          <p>Concerts, meetups, workshops and supper clubs. Find one, book a seat, show the QR at the door.</p>
        </div>
        <nav className={s.col} aria-label="Explore">
          <h2>Explore</h2>
          <Link href="/events">All events</Link>
          {Object.entries(CATEGORY_META).slice(0, 5).map(([key, meta]) => (
            <Link key={key} href={`/events?category=${key}`}>{meta.label}</Link>
          ))}
        </nav>
        <nav className={s.col} aria-label="Account">
          <h2>Account</h2>
          <Link href="/auth/login">Log in</Link>
          <Link href="/auth/register">Sign up</Link>
          <Link href="/bookings">My tickets</Link>
          <Link href="/dashboard">Organizer dashboard</Link>
        </nav>
      </div>
      <div className={`container ${s.bottom}`}>
        <span>© {new Date().getFullYear()} EventHive. Built for SESD.</span>
      </div>
    </footer>
  );
}
