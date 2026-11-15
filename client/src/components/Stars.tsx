import { Star } from "@phosphor-icons/react/ssr";

export default function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} style={{ display: "inline-flex", gap: 2, color: "var(--accent-ink)" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} weight={i <= filled ? "fill" : "regular"} aria-hidden="true" style={{ opacity: i <= filled ? 1 : 0.35 }} />
      ))}
    </span>
  );
}
