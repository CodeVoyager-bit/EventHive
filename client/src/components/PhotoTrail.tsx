"use client";

import { useEffect, useRef, type ReactNode } from "react";
import s from "./PhotoTrail.module.css";

// Moving the mouse across this area leaves a short-lived trail of event photos behind the content.
// Mouse only; off under reduced motion.
export default function PhotoTrail({ images, className = "", children }: { images: string[]; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = images.join("|");

  useEffect(() => {
    const el = ref.current;
    const list = key ? key.split("|") : [];
    if (!el || list.length === 0) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    list.forEach((src) => {
      const img = new Image();
      img.src = src; // warm the cache so the trail never shows empty frames
    });
    let lastX = -999;
    let lastY = -999;
    let n = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches || reduce.matches) return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 110) return;
      lastX = e.clientX;
      lastY = e.clientY;
      const r = el.getBoundingClientRect();
      const img = document.createElement("img");
      img.src = list[n++ % list.length];
      img.alt = "";
      img.className = s.photo;
      img.style.left = `${e.clientX - r.left}px`;
      img.style.top = `${e.clientY - r.top}px`;
      el.appendChild(img);
      const tilt = (Math.random() - 0.5) * 24;
      img
        .animate(
          [
            { opacity: 0, transform: `translate(-50%, -50%) scale(0.5) rotate(${tilt * 2}deg)` },
            { opacity: 1, transform: `translate(-50%, -50%) scale(1) rotate(${tilt}deg)`, offset: 0.15 },
            { opacity: 1, transform: `translate(-50%, -50%) scale(1) rotate(${tilt}deg)`, offset: 0.6 },
            { opacity: 0, transform: `translate(-50%, -30%) scale(0.85) rotate(${tilt * 0.5}deg)` },
          ],
          { duration: 1100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
        )
        .finished.then(() => img.remove(), () => img.remove());
      setTimeout(() => img.remove(), 1600); // safety net if the animation is paused (e.g. background tab)
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [key]);

  return (
    <div ref={ref} className={`${s.area} ${className}`}>
      {children}
    </div>
  );
}
