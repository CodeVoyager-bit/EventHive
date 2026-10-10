"use client";

import { useEffect } from "react";

// One delegated listener drives every pointer effect on the page, outside React state:
//   [data-spotlight] gets --mx/--my (cursor position, %) and --px/--py (px) for follow effects
//   [data-tilt] also gets --rx/--ry (degrees) for a subtle 3D tilt
// Mouse only, and tilt is skipped under reduced motion.
export default function PointerFX() {
  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      const e = last;
      const el = (e?.target as Element | null)?.closest<HTMLElement>("[data-spotlight], [data-tilt]");
      if (!e || !el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--px", `${(e.clientX - r.left).toFixed(0)}px`);
      el.style.setProperty("--py", `${(e.clientY - r.top).toFixed(0)}px`);
      if (el.hasAttribute("data-tilt") && !reduce.matches) {
        el.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
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
