"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import s from "./SaveButton.module.css";

type Props = { eventId: string; saved: boolean; signedIn: boolean; variant?: "overlay" | "inline" };

// Heart toggle with an optimistic update; signed-out visitors are sent to log in first
export default function SaveButton({ eventId, saved: initial, signedIn, variant = "overlay" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initial);
  const [pops, setPops] = useState(0);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    if (next) setPops((n) => n + 1);
    setPending(true);
    try {
      await (next ? api.saveEvent(eventId) : api.unsaveEvent(eventId));
      if (pathname === "/saved") router.refresh(); // the saved list itself changed
    } catch {
      setSaved(!next); // roll back
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={`${s.button} ${s[variant]} ${saved ? s.on : ""}`}
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={variant === "overlay" ? (saved ? "Remove from saved" : "Save event") : undefined}
    >
      <span key={pops} className={pops ? s.pop : undefined}>
        <Heart size={variant === "overlay" ? 20 : 18} weight={saved ? "fill" : "bold"} aria-hidden="true" />
      </span>
      {variant === "inline" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
