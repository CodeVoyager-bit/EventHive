"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { List, Moon, SignOut, Sun, X } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import Logo from "./Logo";
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f5f5f7" : "#0b0b0f");
  }

  async function logout() {
    await api.logout();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const canOrganize = user?.role === "organizer" || user?.role === "admin";
  const links = [
    { href: "/events", label: "Explore", active: pathname.startsWith("/events") },
    ...(user ? [{ href: "/bookings", label: "My Tickets", active: pathname.startsWith("/bookings") }] : []),
    ...(canOrganize ? [{ href: "/dashboard", label: "Dashboard", active: pathname.startsWith("/dashboard") }] : []),
  ];

  const navLinks = links.map(({ href, label, active }) => (
    <Link key={href} href={href} className={s.link} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
      {label}
    </Link>
  ));

  const authControls = user ? (
    <>
      <span className={s.chip} translate="no">
        <span className={s.avatar} aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
        {user.name.split(" ")[0]}
      </span>
      <button className="btn btn-ghost btn-sm" onClick={logout}>
        <SignOut size={16} aria-hidden="true" /> Log Out
      </button>
    </>
  ) : (
    <>
      <Link href="/auth/login" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Log In</Link>
      <Link href="/auth/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Sign Up</Link>
    </>
  );

  return (
    <header className={s.header}>
      <div className={`container ${s.wrap}`}>
        <div className={`glass ${s.bar}`}>
          <Link href="/" className={s.logo} aria-label="EventHive home" translate="no">
            <Logo />
            <span>Event<b>Hive</b></span>
          </Link>

          <nav className={s.links} aria-label="Main">{navLinks}</nav>

          <div className={s.right}>
            <div className={s.desktopOnly}>{authControls}</div>
            <button className={s.iconBtn} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button className={`${s.iconBtn} ${s.burger}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu">
              {open ? <X size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" className={`glass ${s.mobile}`} aria-label="Mobile">
            {navLinks}
            <div className={s.mobileAuth}>{authControls}</div>
          </nav>
        )}
      </div>
    </header>
  );
}
