import { differenceInDays, parseISO } from "date-fns";
import type { EppItem, KardexEntry } from "@/types/kardex";

export type ValidityStatus = "vigente" | "porVencer" | "vencido";

export function getValidity(entry: KardexEntry, epp: EppItem): {
  status: ValidityStatus;
  daysRemaining: number;
} {
  const delivered = parseISO(entry.deliveryDate);
  const elapsed = differenceInDays(new Date(), delivered);
  const remaining = epp.usefulLifeDays - elapsed;
  if (remaining <= 0) return { status: "vencido", daysRemaining: remaining };
  if (remaining <= Math.max(7, epp.usefulLifeDays * 0.15))
    return { status: "porVencer", daysRemaining: remaining };
  return { status: "vigente", daysRemaining: remaining };
}

export const validityColor: Record<ValidityStatus, string> = {
  vigente: "bg-success",
  porVencer: "bg-warning",
  vencido: "bg-destructive",
};

export const validityLabel: Record<ValidityStatus, string> = {
  vigente: "Vigente",
  porVencer: "Por vencer",
  vencido: "Vencido",
};

export const deliveryTypeLabel: Record<string, string> = {
  A: "Asignado (1ra entrega)",
  C: "Cambio",
  P: "Pérdida",
};

export const reasonLabel: Record<string, string> = {
  deterioro: "Deterioro",
  fin_vida_util: "Fin de vida útil",
  perdida: "Pérdida",
  entrega_inicial: "Entrega inicial",
  otro: "Otro",
};
