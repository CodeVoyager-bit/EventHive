import type { Tone } from "./categories";

// Category colours as hex, for places CSS variables can't reach (generated share images)
export const TONE_HEX: Record<Tone, { fill: string; on: string }> = {
  pink: { fill: "#ff4fa3", on: "#16161d" },
  blue: { fill: "#3a5bff", on: "#ffffff" },
  green: { fill: "#14b26a", on: "#16161d" },
  orange: { fill: "#ff7a29", on: "#16161d" },
  red: { fill: "#f2483b", on: "#16161d" },
  violet: { fill: "#6c4cf0", on: "#ffffff" },
  teal: { fill: "#00a6a6", on: "#16161d" },
};
