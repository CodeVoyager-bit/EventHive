"use client";

import { useEffect } from "react";

// One delegated listener drives every pointer effect on the page, outside React state:
//   [data-spotlight]  --mx/--my (%), --px/--py (px), --nx/--ny (-1..1) for follow and parallax effects
//   [data-tilt]       --rx/--ry (deg) for a 3D tilt
//   [data-magnetic]   --tx/--ty (px) to pull an element toward the cursor
// Mouse only; tilt and magnetism are skipped under reduced motion.
export default function PointerFX() {
  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      const e = last;
      const target = e?.target as Element | null;
      if (!e || !target?.closest) return;

      const spot = target.closest<HTMLElement>("[data-spotlight]");
      if (spot) {
        const r = spot.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        spot.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        spot.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        spot.style.setProperty("--px", `${(e.clientX - r.left).toFixed(0)}px`);
        spot.style.setProperty("--py", `${(e.clientY - r.top).toFixed(0)}px`);
        spot.style.setProperty("--nx", (x * 2 - 1).toFixed(3));
        spot.style.setProperty("--ny", (y * 2 - 1).toFixed(3));
      }
      if (reduce.matches) return;

      const tilt = target.closest<HTMLElement>("[data-tilt]");
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tilt.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
        tilt.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
      }
      const mag = target.closest<HTMLElement>("[data-magnetic]");
      if (mag) {
        const r = mag.getBoundingClientRect();
        mag.style.setProperty("--tx", `${((e.clientX - (r.left + r.width / 2)) * 0.35).toFixed(1)}px`);
        mag.style.setProperty("--ty", `${((e.clientY - (r.top + r.height / 2)) * 0.45).toFixed(1)}px`);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches) return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
