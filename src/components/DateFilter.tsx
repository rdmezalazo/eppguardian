import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";

export type DateFilterPreset = "all" | "today" | "week" | "month" | "date" | "range";

export interface DateFilterValue {
  preset: DateFilterPreset;
  date?: string;     // YYYY-MM-DD
  from?: string;     // YYYY-MM-DD
  to?: string;       // YYYY-MM-DD
}

const PRESET_LABELS: Record<DateFilterPreset, string> = {
  all: "Todas las fechas",
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  date: "Fecha específica",
  range: "Rango de fechas",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getDateFilterRange(value: DateFilterValue): { from?: string; to?: string } {
  const now = new Date();
  switch (value.preset) {
    case "today": {
      const d = toISODate(now);
      return { from: d, to: d };
    }
    case "week": {
      const day = now.getDay(); // 0=Dom
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: toISODate(monday), to: toISODate(sunday) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toISODate(first), to: toISODate(last) };
    }
    case "date":
      return value.date ? { from: value.date, to: value.date } : {};
    case "range":
      return { from: value.from, to: value.to };
    default:
      return {};
  }
}

export function isDateInFilter(dateStr: string | undefined | null, value: DateFilterValue): boolean {
  if (value.preset === "all") return true;
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  const { from, to } = getDateFilterRange(value);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

interface Props {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
  className?: string;
}

export default function DateFilter({ value, onChange, className }: Props) {
  const summary = useMemo(() => {
    if (value.preset === "date" && value.date) return value.date;
    if (value.preset === "range" && (value.from || value.to)) {
      return `${value.from ?? "…"} → ${value.to ?? "…"}`;
    }
    return PRESET_LABELS[value.preset];
  }, [value]);

  const isActive = value.preset !== "all";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Select
        value={value.preset}
        onValueChange={(p) => onChange({ ...value, preset: p as DateFilterPreset })}
      >
        <SelectTrigger className="md:w-48">
          <CalendarIcon className="h-4 w-4 mr-1 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABELS) as DateFilterPreset[]).map((k) => (
            <SelectItem key={k} value={k}>{PRESET_LABELS[k]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "date" && (
        <Input
          type="date"
          value={value.date ?? ""}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className="md:w-44"
        />
      )}

      {value.preset === "range" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="md:w-64 justify-start font-normal">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {value.from || value.to ? `${value.from ?? "…"} → ${value.to ?? "…"}` : "Selecciona rango"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-2 pointer-events-auto" align="start">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={value.from ?? ""}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={value.to ?? ""}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}

      {isActive && (
        <Button
          variant="ghost"
          size="icon"
          title="Limpiar filtro"
          onClick={() => onChange({ preset: "all" })}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <span className="sr-only">{summary}</span>
    </div>
  );
}
