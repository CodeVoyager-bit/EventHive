import { Star } from "lucide-react";

export default function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          fill={i <= filled ? "currentColor" : "none"}
          style={{ color: i <= filled ? "#f59e0b" : "var(--text-3)" }}
        />
      ))}
    </span>
  );
}
