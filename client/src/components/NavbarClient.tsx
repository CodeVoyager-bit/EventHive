"use client";

import { useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { List, MagnifyingGlass, Moon, SignOut, Sun, X } from "@phosphor-icons/react";
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

  function toggleTheme(e: MouseEvent<HTMLButtonElement>) {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
      document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f7f6fb" : "#0b0b0f");
    };
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    // The new theme grows out of the toggle button as an expanding circle
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  }

  async function logout() {
    await api.logout();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const organizer = user?.role === "organizer" || user?.role === "admin";
  const links = [
    { href: "/events", label: "Explore", active: pathname.startsWith("/events") },
    ...(organizer ? [] : [{ href: "/#categories", label: "Categories", active: false }]),
    ...(user ? [{ href: "/bookings", label: "My Tickets", active: pathname.startsWith("/bookings") }] : []),
    ...(organizer ? [{ href: "/dashboard", label: "Dashboard", active: pathname.startsWith("/dashboard") }] : []),
    ...(!user ? [{ href: "/#host", label: "For Hosts", active: false }] : []),
  ];

  const navLinks = links.map(({ href, label, active }) => (
    <Link key={href} href={href} className={s.link} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
      {label}
    </Link>
  ));

  const themeButton = (
    <button className={s.iconBtn} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "dark" ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );

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
      <Link href="/auth/login" className={s.login} onClick={() => setOpen(false)}>Log In</Link>
      <Link href="/auth/register" className="btn btn-primary btn-sm" data-magnetic onClick={() => setOpen(false)}>Sign Up</Link>
    </>
  );

  return (
    <header className={s.header}>
      <div className={`container ${s.wrap}`}>
        <div className={`glass ${s.bar}`}>
          <Link href="/" className={s.logo} aria-label="EventHive home" translate="no">
            <span className={s.logoMark}>
              <Logo size={24} />
            </span>
            <span>Event<b>Hive</b></span>
          </Link>

          <nav className={s.links} aria-label="Main">{navLinks}</nav>

          <div className={s.right}>
            <Link href="/events" className={`${s.iconBtn} ${s.searchBtn}`} aria-label="Search events">
              <MagnifyingGlass size={19} aria-hidden="true" />
            </Link>
            {themeButton}
            <span className={s.divider} aria-hidden="true" />
            <div className={s.desktopOnly}>{authControls}</div>
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
