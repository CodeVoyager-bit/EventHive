"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, removeToken, removeUser } from "@/lib/api";

export default function Navbar() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => { setUser(getUser()); }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function handleLogout() {
    removeToken();
    removeUser();
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="navbar">
      <div className="nav-inner">
        {/* Logo */}
        <Link href="/" className="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
            <path d="M12 2.5L3.5 7.5V16.5L12 21.5L20.5 16.5V7.5L12 2.5Z" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M10 9V15L15 12L10 9Z" fill="var(--brand)"/>
          </svg>
          <span className="logo-text">Event<span className="logo-highlight">Hive</span></span>
        </Link>
        
        {/* Nav Links — centered distinct buttons */}
        <div className={`nav-menu ${menuOpen ? "open" : ""}`}>
          <div className="nav-links-group">
            <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/events" className={`nav-link ${pathname === "/events" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>Events</Link>
            {user && (user.role === "organizer" || user.role === "admin") && (
              <Link href="/dashboard" className={`nav-link ${pathname?.startsWith("/dashboard") ? "active" : ""}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            )}
            {user && (
              <Link href="/bookings" className={`nav-link ${pathname === "/bookings" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>Tickets</Link>
            )}
          </div>

          {/* Mobile only auth */}
          <div className="mobile-auth">
            {user ? (
              <button onClick={handleLogout} className="btn btn-secondary" style={{ width: "100%" }}>Logout</button>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link href="/auth/register" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setMenuOpen(false)}>Sign Up Free</Link>
              </>
            )}
          </div>
        </div>

        {/* Right: auth + theme */}
        <div className="nav-right">
          {user ? (
            <>
              <span className="user-chip">
                <span className="chip-avatar">{String(user.name).charAt(0).toUpperCase()}</span>
                <span className="chip-name">{String(user.name).split(" ")[0]}</span>
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-outline btn-sm">Log in</Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
          <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Mobile controls */}
        <div className="mobile-controls">
          <button className="theme-btn" onClick={toggleTheme}>{theme === "dark" ? "☀️" : "🌙"}</button>
          <button className="burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={`bar ${menuOpen ? "x" : ""}`}></span>
            <span className={`bar ${menuOpen ? "x" : ""}`}></span>
            <span className={`bar ${menuOpen ? "x" : ""}`}></span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--nav-bg);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          height: 64px;
          gap: 24px;
        }

        /* ---- LOGO ---- */
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .logo:hover {
          transform: translateY(-1px);
        }
        .logo-text {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .logo-highlight {
          color: var(--brand);
        }

        /* ---- NAV LINKS ---- */
        .nav-menu {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .nav-links-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-link {
          padding: 8px 20px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .nav-link.active {
          background: var(--brand);
          color: white;
          border-color: var(--brand);
          box-shadow: 0 4px 12px rgba(255,90,54,0.3);
        }
        .nav-link.active:hover {
          transform: none;
        }

        /* ---- RIGHT ---- */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
        }
        .chip-avatar {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: var(--electric-blue);
          color: white;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .chip-name {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .theme-btn {
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          font-size: 1.1rem;
          transition: all 0.2s;
          cursor: pointer;
          color: var(--text-primary);
        }
        .theme-btn:hover {
          border-color: var(--border-hover);
          background: var(--bg-card-hover);
          transform: translateY(-1px);
        }
        .mobile-auth { display: none; }

        /* ---- MOBILE ---- */
        .mobile-controls {
          display: none;
          align-items: center;
          gap: 8px;
        }
        .burger {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 6px;
          cursor: pointer;
        }
        .bar {
          display: block;
          width: 20px; height: 2px;
          background: var(--text-primary);
          border-radius: 2px;
          transition: all 0.3s;
        }
        .bar.x:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
        .bar.x:nth-child(2) { opacity: 0; }
        .bar.x:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

        @media (max-width: 768px) {
          .mobile-controls { display: flex; }
          .nav-right { display: none; }
          .nav-inner { gap: 0; justify-content: space-between; }
          .nav-menu {
            position: fixed;
            top: 64px; left: 0; right: 0; bottom: 0;
            flex-direction: column;
            justify-content: flex-start;
            align-items: stretch;
            background: var(--bg-primary);
            padding: 24px;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 99;
          }
          .nav-menu.open { transform: translateX(0); }
          .nav-links-group {
            flex-direction: column;
            gap: 12px;
          }
          .nav-link {
            width: 100%;
            padding: 14px 20px;
            font-size: 1.05rem;
            border-radius: var(--radius-md);
            text-align: center;
          }
          .mobile-auth {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid var(--border-color);
          }
        }
      `}</style>
    </nav>
  );
}
