"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DiceFive } from "@phosphor-icons/react";
import { burstFrom } from "@/lib/confetti";
import s from "./SurpriseMe.module.css";

type Pick = { id: string; title: string };

// Slot-machine pick: spins through real upcoming events, slows down, lands on one, celebrates, opens it
export default function SurpriseMe({ events }: { events: Pick[] }) {
  const router = useRouter();
  const button = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState("");
  const [spinning, setSpinning] = useState(false);

  function spin() {
    if (spinning || events.length === 0) return;
    const pick = events[Math.floor(Math.random() * events.length)];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(`/events/${pick.id}`);
      return;
    }
    setSpinning(true);
    let step = 0;
    let delay = 45;
    const tick = () => {
      step += 1;
      if (step < 16) {
        setLabel(events[(step + Math.floor(Math.random() * events.length)) % events.length].title);
        delay *= 1.17;
        setTimeout(tick, delay);
      } else {
        setLabel(pick.title);
        if (button.current) burstFrom(button.current);
        setTimeout(() => router.push(`/events/${pick.id}`), 750);
      }
    };
    tick();
  }

  if (events.length === 0) return null;
  return (
    <div className={s.wrap}>
      <button ref={button} type="button" className={s.button} onClick={spin} disabled={spinning} data-magnetic>
        <DiceFive size={20} weight="fill" className={spinning ? s.rolling : undefined} aria-hidden="true" />
        Surprise Me
      </button>
      <span className={s.slot} aria-live="polite">
        {label ? (
          <span key={label} className={s.title}>
            {label}
          </span>
        ) : (
          <span className={s.hint}>Not sure? Let us pick.</span>
        )}
      </span>
    </div>
  );
}
