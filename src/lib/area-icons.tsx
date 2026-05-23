import * as Icons from "lucide-react";
import { HardHat, type LucideIcon } from "lucide-react";

export interface AreaStyle {
  icon: LucideIcon;
  /** Tailwind class set: solid background + foreground for badges */
  badge: string;
  /** Tailwind class set: subtle tinted bg + text for chips/icons */
  soft: string;
}

export interface AreaSetting {
  id: string;
  name: string;
  icon: string;
  badge_class: string;
  soft_class: string;
  sort_order: number;
}

const FALLBACK: AreaStyle = {
  icon: HardHat,
  badge: "bg-primary text-primary-foreground hover:bg-primary/90",
  soft: "bg-primary/10 text-primary",
};

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// In-memory registry, populated by AreaProvider.
let REGISTRY: Record<string, AreaStyle> = {};

export function setAreaRegistry(rows: AreaSetting[]) {
  const next: Record<string, AreaStyle> = {};
  for (const r of rows) {
    const IconComp = (Icons as unknown as Record<string, LucideIcon>)[r.icon] ?? HardHat;
    next[NORMALIZE(r.name)] = {
      icon: IconComp,
      badge: r.badge_class,
      soft: r.soft_class,
    };
  }
  REGISTRY = next;
}

export function getAreaStyle(area: string | null | undefined): AreaStyle {
  if (!area) return FALLBACK;
  return REGISTRY[NORMALIZE(area)] ?? FALLBACK;
}

/** Resolve a Lucide icon component by name with safe fallback. */
export function getLucideIcon(name: string): LucideIcon {
  const map = Icons as unknown as Record<string, LucideIcon>;
  return map[name] ?? HardHat;
}
