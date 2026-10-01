"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Moon, Sun, Ticket, X } from "lucide-react";
import { api } from "@/lib/api";
import type { SessionUser } from "@/types";
import s from "./Navbar.module.css";

type Props = { user: SessionUser | null; initialTheme: "dark" | "light" };

export default function NavbarClient({ user, initialTheme }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  async function logout() {
    await api.logout();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const canOrganize = user?.role === "organizer" || user?.role === "admin";
  const links = [
    { href: "/", label: "Home", active: pathname === "/" },
    { href: "/events", label: "Events", active: pathname.startsWith("/events") },
    ...(canOrganize ? [{ href: "/dashboard", label: "Dashboard", active: pathname.startsWith("/dashboard"), icon: LayoutDashboard }] : []),
    ...(user ? [{ href: "/bookings", label: "My Tickets", active: pathname.startsWith("/bookings"), icon: Ticket }] : []),
  ];

  const navLinks = links.map(({ href, label, active, icon: Icon }) => (
    <Link key={href} href={href} className={`${s.link} ${active ? s.active : ""}`} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </Link>
  ));

  const authControls = user ? (
    <>
      <span className={s.chip}>
        <span className={s.avatar} aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
        {user.name.split(" ")[0]}
      </span>
      <button className="btn btn-ghost btn-sm" onClick={logout}>
        <LogOut size={16} aria-hidden="true" /> Log out
      </button>
    </>
  ) : (
    <>
      <Link href="/auth/login" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Log in</Link>
      <Link href="/auth/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Sign up</Link>
    </>
  );

  return (
    <header className={s.header}>
      <div className={`container ${s.inner}`}>
        <Link href="/" className={s.logo} aria-label="EventHive home">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.5L3.5 7.5V16.5L12 21.5L20.5 16.5V7.5L12 2.5Z" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M10 9V15L15 12L10 9Z" fill="var(--brand)" />
          </svg>
          <span>Event<b>Hive</b></span>
        </Link>

        <nav className={s.links} aria-label="Main">{navLinks}</nav>

        <div className={s.right}>
          <div className={s.desktopOnly}>{authControls}</div>
          <button className={s.iconBtn} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <button className={`${s.iconBtn} ${s.burger}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu">
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className={s.mobile} aria-label="Mobile">
          {navLinks}
          <div className={s.mobileAuth}>{authControls}</div>
        </nav>
      )}
    </header>
  );
}
