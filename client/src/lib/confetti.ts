// Tiny confetti burst using the Web Animations API (no dependency). Browser-only.
const COLORS = ["#ff3d8b", "#ffc83d", "#2f5bff", "#8edb4f", "#7a4df5", "#ff7a1a", "#14c8b4"];

export function burst(x: number, y: number, count = 90) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "1000", overflow: "hidden" });
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const size = 6 + Math.random() * 8;
    const shape = Math.random();
    Object.assign(piece.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${shape < 0.5 ? size * 0.45 : size}px`,
      background: COLORS[i % COLORS.length],
      borderRadius: shape > 0.75 ? "50%" : "2px",
    });
    layer.appendChild(piece);

    const angle = Math.random() * Math.PI * 2;
    const speed = 160 + Math.random() * 340;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 240; // bias upward, then gravity pulls it down
    const spin = (Math.random() - 0.5) * 1440;
    piece.animate(
      [
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy + 560}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 900, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" }
    );
  }
  setTimeout(() => layer.remove(), 2600);
}

export const burstFrom = (el: Element) => {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2);
};
