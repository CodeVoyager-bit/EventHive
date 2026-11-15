"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClockCounterClockwise, Compass, GridFour, Heart, House, MagnifyingGlass, PlusCircle, SignIn, Ticket, UserPlus } from "@phosphor-icons/react";
import { CATEGORY_META } from "@/lib/categories";
import type { Event, SessionUser } from "@/types";
import s from "./CommandPalette.module.css";

type Item = { key: string; group: string; label: string; hint?: string; href: string; icon: ReactNode; tone?: string };

// Quick search (⌘K): live event search, categories and pages, fully keyboard driven.
// Mounted only while open, so every opening starts fresh.
export default function CommandPalette({ user, onClose }: { user: SessionUser | null; onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
    input.current?.focus();
  }, []);

  // Live event results (debounced; the browser talks to our /api proxy)
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const query = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";
      const json = await fetch(`/api/events?limit=6${query}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .catch(() => null);
      if (json?.success) setEvents(json.data);
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const items = useMemo<Item[]>(() => {
    const needle = q.trim().toLowerCase();
    const match = (text: string) => !needle || text.toLowerCase().includes(needle);
    const organizer = user?.role === "organizer" || user?.role === "admin";
    const today = new Date().toISOString().slice(0, 10);

    const eventItems: Item[] = events.map((e) => {
      const d = new Date(e.date);
      return {
        key: `e-${e._id}`,
        group: needle ? "Events" : "Coming up",
        label: e.title,
        hint: `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${e.location}`,
        href: `/events/${e._id}`,
        tone: CATEGORY_META[e.category]?.tone,
        icon: (
          <span className={s.date}>
            <b>{d.getDate()}</b>
            {d.toLocaleDateString("en-US", { month: "short" })}
          </span>
        ),
      };
    });
    const categoryItems: Item[] = Object.entries(CATEGORY_META)
      .filter(([, m]) => match(m.label))
      .map(([key, m]) => ({ key: `c-${key}`, group: "Categories", label: m.label, href: `/events?category=${key}`, tone: m.tone, icon: <m.icon size={18} weight="bold" /> }));
    const pages: Item[] = [
      { key: "p-home", group: "Pages", label: "Home", href: "/", icon: <House size={18} /> },
      { key: "p-explore", group: "Pages", label: "Explore events", href: "/events", icon: <Compass size={18} /> },
      { key: "p-past", group: "Pages", label: "Past events", href: `/events?to=${today}`, icon: <ClockCounterClockwise size={18} /> },
      ...(user
        ? [
            { key: "p-saved", group: "Pages", label: "Saved events", href: "/saved", icon: <Heart size={18} /> },
            { key: "p-tickets", group: "Pages", label: "My tickets", href: "/bookings", icon: <Ticket size={18} /> },
          ]
        : [
            { key: "p-login", group: "Pages", label: "Log in", href: "/auth/login", icon: <SignIn size={18} /> },
            { key: "p-signup", group: "Pages", label: "Sign up", href: "/auth/register", icon: <UserPlus size={18} /> },
          ]),
      ...(organizer
        ? [
            { key: "p-dash", group: "Pages", label: "Dashboard", href: "/dashboard", icon: <GridFour size={18} /> },
            { key: "p-create", group: "Pages", label: "Create an event", href: "/dashboard/create", icon: <PlusCircle size={18} /> },
          ]
        : []),
    ].filter((p) => match(p.label));
    const searchAll: Item[] = needle
      ? [{ key: "s-all", group: "Search", label: `Search all events for “${q.trim()}”`, href: `/events?q=${encodeURIComponent(q.trim())}`, icon: <MagnifyingGlass size={18} /> }]
      : [];

    return [...eventItems, ...categoryItems, ...pages, ...searchAll];
  }, [events, q, user]);

  const current = Math.min(active, Math.max(items.length - 1, 0));

  function go(item?: Item) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = (current + step + items.length) % Math.max(items.length, 1);
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[current]);
    }
  }

  let lastGroup = "";
  return (
    <dialog
      ref={dialog}
      className={s.palette}
      aria-label="Search EventHive"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <div className={s.panel}>
        <div className={s.inputRow}>
          <MagnifyingGlass size={20} aria-hidden="true" />
          <input
            ref={input}
            className={s.input}
            placeholder="Search events, categories, pages…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items.length ? `${listId}-${current}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={s.kbd}>esc</kbd>
        </div>

        <ul id={listId} role="listbox" className={s.list} aria-label="Results">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.key} role="presentation">
                {header && <span className={s.group} role="presentation">{header}</span>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  className={s.option}
                  data-tone={item.tone}
                  onMouseMove={() => i !== current && setActive(i)}
                  onClick={() => go(item)}
                >
                  <span className={s.icon} aria-hidden="true">{item.icon}</span>
                  <span className={s.text}>
                    <span className={s.label}>{item.label}</span>
                    {item.hint && <span className={s.hint}>{item.hint}</span>}
                  </span>
                  <ArrowRight size={16} className={s.go} aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ul>
        {items.length === 0 && <p className={s.none}>No matches. Try a city, a category or an event name.</p>}

        <div className={s.footer} aria-hidden="true">
          <span><kbd className={s.kbd}>↑</kbd><kbd className={s.kbd}>↓</kbd> move</span>
          <span><kbd className={s.kbd}>↵</kbd> open</span>
          <span><kbd className={s.kbd}>esc</kbd> close</span>
        </div>
      </div>
    </dialog>
  );
}
