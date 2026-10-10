import { Briefcase, Cpu, ForkKnife, MusicNotes, Palette, PersonSimpleRun, Sparkle } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react/lib";
import type { Category } from "@/types";
import { photo } from "./photos";

// Single source for category label, icon, cover photo and colour tone.
// Tones only show in the light theme (see [data-tone] in globals.css); dark keeps one accent.
export type Tone = "pink" | "orange" | "yellow" | "lime" | "blue" | "violet" | "teal";

export const CATEGORY_META: Record<Category, { label: string; icon: Icon; image: string; tone: Tone }> = {
  music: { label: "Music", icon: MusicNotes, image: photo("1470229722913-7c0e2dbbafd3"), tone: "pink" },
  tech: { label: "Tech", icon: Cpu, image: photo("1531058020387-3be344556be6"), tone: "blue" },
  sports: { label: "Sports", icon: PersonSimpleRun, image: photo("1461896836934-ffe607ba8211"), tone: "lime" },
  art: { label: "Art", icon: Palette, image: photo("1460661419201-fd4cecdf8a8b"), tone: "orange" },
  food: { label: "Food", icon: ForkKnife, image: photo("1504674900247-0877df9cc836"), tone: "yellow" },
  business: { label: "Business", icon: Briefcase, image: photo("1515187029135-18ee286d815b"), tone: "violet" },
  other: { label: "Other", icon: Sparkle, image: photo("1492684223066-81342ee5ff30"), tone: "teal" },
};

export const categoryMeta = (category: string) => CATEGORY_META[category as Category] ?? CATEGORY_META.other;
