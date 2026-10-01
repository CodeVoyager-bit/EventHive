import Link from "next/link";
import { CATEGORY_META } from "@/lib/categories";
import s from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`container ${s.inner}`}>
        <div className={s.top}>
          <div className={s.brand}>
            <div className={s.logo}>
              <span className={s.mark}>E</span>
              EventHive
            </div>
            <p>Discover, create, and attend events that matter. Your gateway to unforgettable experiences.</p>
          </div>
          <div className={s.col}>
            <h4>Explore</h4>
            <Link href="/events">All events</Link>
            {Object.entries(CATEGORY_META).slice(0, 5).map(([key, meta]) => (
              <Link key={key} href={`/events?category=${key}`}>{meta.label}</Link>
            ))}
          </div>
          <div className={s.col}>
            <h4>Account</h4>
            <Link href="/auth/login">Log in</Link>
            <Link href="/auth/register">Sign up</Link>
            <Link href="/bookings">My tickets</Link>
            <Link href="/dashboard">Organizer dashboard</Link>
          </div>
        </div>
        <div className={s.bottom}>
          <span>© {new Date().getFullYear()} EventHive. Built for SESD.</span>
          <span>Layered Express API · Next.js App Router</span>
        </div>
      </div>
    </footer>
  );
}
