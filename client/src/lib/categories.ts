import { Briefcase, Cpu, ForkKnife, MusicNotes, Palette, PersonSimpleRun, Sparkle } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react/lib";
import type { Category } from "@/types";
import { photo } from "./photos";

// Single source for category label, icon and cover photo. Categories carry no colour of their
// own: the site uses one accent, and photography supplies the colour.
export const CATEGORY_META: Record<Category, { label: string; icon: Icon; image: string }> = {
  music: { label: "Music", icon: MusicNotes, image: photo("1470229722913-7c0e2dbbafd3") },
  tech: { label: "Tech", icon: Cpu, image: photo("1531058020387-3be344556be6") },
  sports: { label: "Sports", icon: PersonSimpleRun, image: photo("1461896836934-ffe607ba8211") },
  art: { label: "Art", icon: Palette, image: photo("1460661419201-fd4cecdf8a8b") },
  food: { label: "Food", icon: ForkKnife, image: photo("1504674900247-0877df9cc836") },
  business: { label: "Business", icon: Briefcase, image: photo("1515187029135-18ee286d815b") },
  other: { label: "Other", icon: Sparkle, image: photo("1492684223066-81342ee5ff30") },
};

export const categoryMeta = (category: string) => CATEGORY_META[category as Category] ?? CATEGORY_META.other;
