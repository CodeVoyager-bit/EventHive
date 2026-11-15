"use client";

import { useSyncExternalStore } from "react";
import s from "./Countdown.module.css";

// A 1-second clock shared by every countdown on the page
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);
const pad = (n: number) => String(n).padStart(2, "0");

// Live time-to-start. Renders a placeholder on the server, then ticks on the client;
// each digit that changes re-mounts and flips in.
export default function Countdown({ to }: { to: string }) {
  const now = useSyncExternalStore(subscribe, nowSeconds, () => null);
  const left = now === null ? null : Math.max(0, Math.floor(new Date(to).getTime() / 1000) - now);

  if (left === 0) return <span className={s.live}>Happening now</span>;

  const text =
    left === null
      ? "--d --:--:--"
      : `${Math.floor(left / 86400)}d ${pad(Math.floor((left % 86400) / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;

  return (
    <span className={s.clock} role="timer" aria-live="off">
      {[...text].map((ch, i) => (
        <span key={`${i}-${ch}`} className={/\d/.test(ch) ? s.digit : s.sep}>
          {ch}
        </span>
      ))}
    </span>
  );
}
