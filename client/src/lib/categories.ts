import type { CSSProperties } from "react";
import { Briefcase, Cpu, Music, Palette, Sparkles, Trophy, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { Category } from "@/types";

// Single source for category label, colour and icon. Colours keep >=3:1 against white
// so white glyphs on them stay readable.
export const CATEGORY_META: Record<Category, { label: string; color: string; icon: LucideIcon }> = {
  music: { label: "Music", color: "#E6005F", icon: Music },
  tech: { label: "Tech", color: "#4361EE", icon: Cpu },
  sports: { label: "Sports", color: "#2A8C00", icon: Trophy },
  art: { label: "Art", color: "#C26A00", icon: Palette },
  food: { label: "Food", color: "#E04928", icon: UtensilsCrossed },
  business: { label: "Business", color: "#6F28E0", icon: Briefcase },
  other: { label: "Other", color: "#0E8A94", icon: Sparkles },
};

export const categoryMeta = (category: string) => CATEGORY_META[category as Category] ?? CATEGORY_META.other;

// Exposes the category colour to CSS as --cat
export const catStyle = (category: string): CSSProperties =>
  ({ "--cat": categoryMeta(category).color } as CSSProperties);
