"use client";

import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AddressBook, Bank, Bell, CaretDown, Compass, GearSix, Heart, House, IdentificationCard, MagnifyingGlass, MapPin, Moon, Plus, ShieldCheck, SignIn, SignOut, SquaresFour, Sun, Ticket, UserCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import Logo from "./Logo";
import CommandPalette from "./CommandPalette";
import { forgetOfflineTickets } from "./ServiceWorker";
import type { SessionUser } from "@/types";
import s from "./Navbar.module.css";

type Props = {
  user: SessionUser | null;
  initialTheme: "dark" | "light";
  unread: number;
  cities: { city: string; count: number }[];
  city: string;
};

const noSubscribe = () => () => {};
const THEME_COLOR = { light: "#f6f6f3", dark: "#111113" };

export default function NavbarClient({ user, initialTheme, unread, cities, city }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);
  const [searching, setSearching] = useState(false);
  const isMac = useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true);

  // ⌘K / Ctrl+K toggles quick search; "/" opens it when not typing somewhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable='true']");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleTheme(e: MouseEvent<HTMLButtonElement>) {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
      document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
    };
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    // The new theme is printed over the old one from the toggle outward
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.finished.catch(() => {}); // skipped transitions (e.g. hidden tab) still apply the theme
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }, () => {});
  }

  function pickCity(next: string) {
    document.getElementById("city-menu")?.hidePopover();
    document.cookie = `city=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    router.push(next ? `/events?city=${encodeURIComponent(next)}` : "/events?city=all");
    router.refresh();
  }

  async function logout() {
    await api.logout();
    await forgetOfflineTickets();
    router.push("/");
    router.refresh();
  }

  const organizer = user?.role === "organizer" || user?.role === "admin";
  const links = [
    { href: "/events", label: "Explore", active: pathname.startsWith("/events") },
    ...(user && !organizer ? [{ href: "/bookings", label: "My Tickets", active: pathname.startsWith("/bookings") }] : []),
    ...(user && !organizer ? [{ href: "/saved", label: "Saved", active: pathname.startsWith("/saved") }] : []),
    ...(organizer ? [{ href: "/dashboard", label: "Dashboard", active: pathname.startsWith("/dashboard") }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", active: pathname.startsWith("/admin") }] : []),
    ...(!user ? [{ href: "/#host", label: "Host an event", active: false }] : []),
  ];

  const navLinks = links.map(({ href, label, active }) => (
    <Link key={href} href={href} className={s.link} aria-current={active ? "page" : undefined}>
      {label}
    </Link>
  ));

  const cityLabel = city || "All cities";

  // Phones get an app-style tab bar instead of a menu: the four places people go most, by role
  const tabs = !user
    ? [
        { href: "/", label: "Home", icon: House, active: pathname === "/" },
        { href: "/events", label: "Explore", icon: Compass, active: pathname.startsWith("/events") },
        { href: "/auth/login", label: "Log in", icon: SignIn, active: pathname.startsWith("/auth") },
      ]
    : organizer
      ? [
          { href: "/events", label: "Explore", icon: Compass, active: pathname.startsWith("/events") },
          { href: "/dashboard", label: "Dashboard", icon: SquaresFour, active: pathname.startsWith("/dashboard") && pathname !== "/dashboard/create" },
          { href: "/dashboard/create", label: "Create", icon: Plus, active: pathname === "/dashboard/create" },
          { href: "/notifications", label: "Alerts", icon: Bell, active: pathname.startsWith("/notifications"), badge: unread },
        ]
      : [
          { href: "/events", label: "Explore", icon: Compass, active: pathname.startsWith("/events") || pathname === "/" },
          { href: "/bookings", label: "Tickets", icon: Ticket, active: pathname.startsWith("/bookings") },
          { href: "/saved", label: "Saved", icon: Heart, active: pathname.startsWith("/saved") },
          { href: "/notifications", label: "Alerts", icon: Bell, active: pathname.startsWith("/notifications"), badge: unread },
        ];

  return (
    <>
    <header className={s.header}>
      <div className={`container ${s.bar}`}>
        <Link href="/" className={s.logo} aria-label="EventHive home" translate="no">
          <Logo size={30} />
          <span>EventHive</span>
        </Link>

        <button type="button" className={s.city} popoverTarget="city-menu" aria-label={`City: ${cityLabel}. Change city`}>
          <MapPin size={16} weight="bold" aria-hidden="true" />
          <span className={s.cityName}>{cityLabel}</span>
          <CaretDown size={12} weight="bold" aria-hidden="true" />
        </button>
        <div id="city-menu" popover="auto" className={`pop ${s.cityMenu}`}>
          <button type="button" className="pop-item" aria-current={!city} onClick={() => pickCity("")}>
            All cities
          </button>
          <div className="pop-sep" />
          {cities.map((c) => (
            <button key={c.city} type="button" className="pop-item" aria-current={c.city === city} onClick={() => pickCity(c.city)}>
              <span>{c.city}</span>
              <span className={s.count}>{c.count}</span>
            </button>
          ))}
        </div>

        <nav className={s.links} aria-label="Main">{navLinks}</nav>

        <div className={s.right}>
          <button type="button" className={s.search} onClick={() => setSearching(true)} aria-label="Search (opens quick search)" aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}>
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <span className={s.searchText}>Search events</span>
            <kbd className={s.kbd}>{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>

          {organizer && (
            <Link href="/dashboard/create" className={`btn btn-primary btn-sm ${s.desktopOnly}`}>
              <Plus size={16} weight="bold" aria-hidden="true" /> Create event
            </Link>
          )}

          {user && (
            <Link href="/notifications" className={`icon-btn ${s.bell} ${s.desktopOnly}`} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
              <Bell size={20} weight={unread ? "fill" : "regular"} aria-hidden="true" />
              {unread > 0 && <span className={s.dot}>{unread > 9 ? "9+" : unread}</span>}
            </Link>
          )}

          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>

          {user ? (
            <>
              <button type="button" className={s.account} popoverTarget="account-menu" aria-label={`Account menu for ${user.name}`}>
                <span className={s.avatar} aria-hidden="true">{initials(user.name)}</span>
              </button>
              <div id="account-menu" popover="auto" className={`pop ${s.accountMenu}`}>
                <div className={s.who}>
                  <strong translate="no">{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="pop-sep" />
                {organizer ? (
                  <>
                    <Link href="/dashboard" className="pop-item"><SquaresFour size={18} aria-hidden="true" /> Dashboard</Link>
                    <Link href={`/hosts/${user.id}`} className="pop-item"><UserCircle size={18} aria-hidden="true" /> My host page</Link>
                    <Link href="/dashboard/audience" className="pop-item"><AddressBook size={18} aria-hidden="true" /> Audience</Link>
                    <Link href="/dashboard/payouts" className="pop-item"><Bank size={18} aria-hidden="true" /> Payouts</Link>
                  </>
                ) : (
                  <>
                    <Link href="/bookings" className="pop-item"><Ticket size={18} aria-hidden="true" /> My tickets</Link>
                    <Link href="/saved" className="pop-item"><Heart size={18} aria-hidden="true" /> Saved</Link>
                    <Link href="/passport" className="pop-item"><IdentificationCard size={18} aria-hidden="true" /> Your passport</Link>
                  </>
                )}
                {user.role === "admin" && <Link href="/admin" className="pop-item"><ShieldCheck size={18} aria-hidden="true" /> Admin console</Link>}
                <Link href="/settings" className="pop-item"><GearSix size={18} aria-hidden="true" /> Account and settings</Link>
                <div className="pop-sep" />
                <button type="button" className="pop-item" onClick={logout}><SignOut size={18} aria-hidden="true" /> Log out</button>
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={`btn btn-ghost btn-sm ${s.desktopOnly}`}>Log in</Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>

      {searching && <CommandPalette user={user} onClose={() => setSearching(false)} />}

    </header>

    <nav className={s.tabbar} aria-label="Quick navigation">
      {tabs.map(({ href, label, icon: Icon, active, ...rest }) => {
        const badge = "badge" in rest ? (rest.badge as number) : 0;
        return (
          <Link key={href} href={href} className={s.tab} aria-current={active ? "page" : undefined}>
            <span className={s.tabIcon}>
              <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden="true" />
              {badge > 0 && <span className={s.tabBadge}>{badge > 9 ? "9+" : badge}</span>}
            </span>
            <span>{label}</span>
            {badge > 0 && <span className="sr-only">, {badge} unread</span>}
          </Link>
        );
      })}
      {user && (
        <Link href="/settings" className={s.tab} aria-current={pathname.startsWith("/settings") ? "page" : undefined}>
          <span className={s.tabIcon}><UserCircle size={22} weight={pathname.startsWith("/settings") ? "fill" : "regular"} aria-hidden="true" /></span>
          <span>Account</span>
        </Link>
      )}
    </nav>
    </>
  );
}
