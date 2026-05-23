import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileDown,
  FileText,
  History,
  PackageCheck,
  Search,
  ShieldAlert,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import WorkerAnalysisDialog from "@/components/WorkerAnalysisDialog";
import { getKardex, getCompany } from "@/lib/storage";
import { generateKardexPDF } from "@/lib/pdf";
import type { Worker, EppItem, KardexEntry } from "@/types/kardex";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import DateFilter, { type DateFilterValue, isDateInFilter } from "@/components/DateFilter";

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  A: "Asignado",
  C: "Cambio",
  P: "Pérdida",
};

const REASON_LABEL: Record<string, string> = {
  entrega_inicial: "Entrega inicial",
  deterioro: "Deterioro",
  fin_vida_util: "Fin de vida útil",
  perdida: "Pérdida",
  otro: "Otro",
};

const EVENT_LABEL: Record<string, string> = {
  delivery: "Entrega",
  change_request: "Solicitud de cambio",
  change: "Cambio",
  retire: "Retiro",
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const dateOnly = String(iso).slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export default function ReportsPage() {
  const { can, loading: permissionsLoading } = useModulePermissions();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [epps, setEpps] = useState<EppItem[]>([]);
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKardex().then(setEntries);
    (async () => {
      const [{ data: profilesData, error: pErr }, { data: eppsData, error: eErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,dni,area,cargo,personnel_type,active")
          .eq("active", true)
          .order("full_name", { ascending: true }),
        supabase
          .from("epps")
          .select("id,nombre,area,actividad,vida_util_dias,requiere_firma,estado")
          .order("nombre", { ascending: true }),
      ]);
      if (pErr) toast.error("Error al cargar trabajadores: " + pErr.message);
      if (eErr) toast.error("Error al cargar EPPs: " + eErr.message);

      const mappedWorkers: Worker[] = (profilesData ?? []).map((p: any) => {
        const parts = (p.full_name ?? "").trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ");
        return {
          id: p.id,
          firstName,
          lastName,
          dni: p.dni ?? "",
          area: p.area ?? "",
          position: p.cargo ?? (p.personnel_type === "operativo" ? "Operativo" : "Administrativo"),
          createdAt: new Date().toISOString(),
        };
      });
      const mappedEpps: EppItem[] = (eppsData ?? []).map((e: any) => ({
        id: e.id,
        name: e.nombre,
        type: e.area ?? e.actividad ?? "—",
        usefulLifeDays: e.vida_util_dias ?? 0,
        requiresSignature: !!e.requiere_firma,
        status: e.estado === "active" ? "active" : "retired",
        createdAt: new Date().toISOString(),
      }));
      setWorkers(mappedWorkers);
      setEpps(mappedEpps);
      setLoading(false);
    })();
  }, []);

  const filteredEntries = useMemo(
    () => entries.filter((e) => isDateInFilter(e.deliveryDate, dateFilter)),
    [entries, dateFilter]
  );

  const countsByWorker = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filteredEntries) m.set(e.workerId, (m.get(e.workerId) ?? 0) + 1);
    return m;
  }, [filteredEntries]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = workers
      .map((w) => ({ w, count: countsByWorker.get(w.id) ?? 0 }))
      .filter(({ w, count }) => {
        if (!term) return count > 0;
        const hay = `${w.firstName} ${w.lastName} ${w.dni} ${w.position} ${w.area}`.toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => b.count - a.count || a.w.lastName.localeCompare(b.w.lastName));
    return list;
  }, [workers, countsByWorker, q]);

  const [historyWorker, setHistoryWorker] = useState<Worker | null>(null);
  const [analysisWorker, setAnalysisWorker] = useState<Worker | null>(null);

  const eppMap = useMemo(() => {
    const m = new Map<string, EppItem>();
    for (const e of epps) m.set(e.id, e);
    return m;
  }, [epps]);

  const historyEntries = useMemo(() => {
    if (!historyWorker) return [];
    return entries
      .filter((e) => e.workerId === historyWorker.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, historyWorker]);

  // Group entries by header (each "registro" of the kardex). Entries without header become standalone groups.
  const historyGroups = useMemo(() => {
    const map = new Map<string, KardexEntry[]>();
    for (const e of historyEntries) {
      const key = e.headerId ?? `single:${e.id}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      // representative entry (first one) is used for header info
      head: items[0],
    }));
  }, [historyEntries]);

  const exportPdf = async (worker: Worker) => {
    if (!can("reportes", "download")) {
      toast.error("No tienes permiso para descargar PDF");
      return;
    }
    const all = entries
      .filter((e) => e.workerId === worker.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (all.length === 0) {
      toast.error("Sin registros de Kardex para este trabajador");
      return;
    }
    const company = await getCompany();
    await generateKardexPDF({ company, worker, entries: all, epps });
    toast.success("PDF generado");
  };

  const totalEntries = filteredEntries.length;
  const workersWithEntries = countsByWorker.size;
  const canDownloadReports = !permissionsLoading && can("reportes", "download");

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Genera el acta oficial de Kardex EPP por trabajador a partir de los registros guardados"
      />
      <section className="p-6 md:p-10 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{totalEntries} registros de Kardex</Badge>
            <Badge variant="secondary">{workersWithEntries} trabajadores con historial</Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI, cargo o área…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {loading && (
            <Card className="p-10 text-center text-muted-foreground">Cargando trabajadores…</Card>
          )}
          {!loading && filtered.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              {q
                ? "No se encontraron trabajadores con ese criterio."
                : "Aún no hay registros de Kardex. Crea entregas en la sección Kardex para generar reportes."}
            </Card>
          )}
          {filtered.map(({ w, count }) => (
            <Card
              key={w.id}
              role={count > 0 ? "button" : undefined}
              tabIndex={count > 0 ? 0 : undefined}
              onClick={() => { if (count > 0) setHistoryWorker(w); }}
              onKeyDown={(ev) => { if (count > 0 && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); setHistoryWorker(w); } }}
              className={`relative card-elevated overflow-hidden pr-12 transition-all ${count > 0 ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5" : ""}`}
            >
              <div className="p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {w.lastName}
                      {w.lastName && w.firstName ? ", " : ""}
                      {w.firstName}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>{w.dni}</span>
                      {w.position && <span>• {w.position}</span>}
                      {w.area && (
                        <Badge variant="outline" className="text-xs">
                          {w.area}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant={count > 0 ? "default" : "secondary"} className="shrink-0">
                  {count} {count === 1 ? "registro" : "registros"}
                </Badge>
              </div>
              {/* Barra de acciones vertical */}
              <div className="absolute top-0 right-0 h-full w-12 bg-[hsl(195_45%_22%)] flex flex-col items-stretch text-white" onClick={(ev) => ev.stopPropagation()}>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setHistoryWorker(w); }}
                  disabled={count === 0}
                  title="Ver historial"
                  className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors border-b border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <History className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setAnalysisWorker(w); }}
                  disabled={count === 0}
                  title="Análisis inteligente"
                  className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors border-b border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                {canDownloadReports && (
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); exportPdf(w); }}
                    disabled={count === 0}
                    title="Generar acta PDF"
                    className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={!!historyWorker} onOpenChange={(open) => !open && setHistoryWorker(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
          {historyWorker && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/5 via-background to-background">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <History className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl">
                      Historial de Kardex —{" "}
                      {historyWorker.lastName}
                      {historyWorker.lastName && historyWorker.firstName ? ", " : ""}
                      {historyWorker.firstName}
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {historyWorker.dni && <span>DNI: {historyWorker.dni}</span>}
                      {historyWorker.position && <span>• {historyWorker.position}</span>}
                      {historyWorker.area && (
                        <Badge variant="outline" className="text-xs">
                          {historyWorker.area}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {historyEntries.length}{" "}
                        {historyEntries.length === 1 ? "ítem" : "ítems"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {historyGroups.length}{" "}
                        {historyGroups.length === 1 ? "registro" : "registros"}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh]">
                <div className="px-6 py-5 space-y-4">
                  {historyGroups.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      Sin registros para este trabajador.
                    </div>
                  )}

                  {historyGroups.map((group, idx) => {
                    const head = group.head;
                    const isVoided = !!head.voided;
                    return (
                      <div
                        key={group.key}
                        className="relative rounded-xl border bg-card shadow-sm hover:shadow-md transition-smooth overflow-hidden"
                      >
                        {/* Left accent bar */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            isVoided ? "bg-destructive" : "bg-primary"
                          }`}
                          aria-hidden
                        />

                        <div className="pl-5 pr-4 py-4">
                          {/* Header: número + fecha/hora */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold">
                                #{historyGroups.length - idx}
                              </div>
                              <div>
                                <p className="text-sm font-semibold flex items-center gap-2">
                                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                                  {formatDateTime(head.createdAt)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1">
                                    <PackageCheck className="h-3.5 w-3.5" />
                                    Entrega: {formatDate(head.deliveryDate)}
                                  </span>
                                  {head.responsibleName && (
                                    <span className="inline-flex items-center gap-1">
                                      <UserIcon className="h-3.5 w-3.5" />
                                      {head.responsibleName}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isVoided ? (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" /> Anulado
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-primary" /> Vigente
                                </Badge>
                              )}
                              <Badge variant="outline" className="gap-1">
                                <FileText className="h-3 w-3" />
                                {group.items.length}{" "}
                                {group.items.length === 1 ? "EPP" : "EPPs"}
                              </Badge>
                            </div>
                          </div>

                          {isVoided && head.voidReason && (
                            <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-start gap-2">
                              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium">Motivo de anulación:</span>{" "}
                                {head.voidReason}
                                {head.voidedAt && (
                                  <span className="text-muted-foreground ml-1">
                                    ({formatDateTime(head.voidedAt)})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Items list */}
                          <div className="mt-4 grid gap-2">
                            {group.items.map((it) => {
                              const epp = eppMap.get(it.eppId);
                              return (
                                <div
                                  key={it.id}
                                  className="flex items-start justify-between gap-3 rounded-lg border bg-background/50 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                      {epp?.name ?? "EPP eliminado"}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {EVENT_LABEL[it.eventType] ?? it.eventType}
                                      </span>
                                      <span>
                                        Tipo:{" "}
                                        <span className="font-medium text-foreground">
                                          {DELIVERY_TYPE_LABEL[it.deliveryType] ??
                                            it.deliveryType}
                                        </span>
                                      </span>
                                      <span>
                                        Motivo:{" "}
                                        <span className="font-medium text-foreground">
                                          {REASON_LABEL[it.reason] ?? it.reason}
                                        </span>
                                      </span>
                                      {it.returnDate && (
                                        <span>Devolución: {formatDate(it.returnDate)}</span>
                                      )}
                                    </div>
                                    {it.observations && (
                                      <p className="mt-1.5 text-xs text-muted-foreground italic">
                                        “{it.observations}”
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="shrink-0">
                                    x{it.quantity}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>

                          {head.observations && (
                            <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Observaciones: </span>
                              {head.observations}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Ordenado por fecha de registro (más reciente primero)
                </p>
                {canDownloadReports && (
                  <Button onClick={() => exportPdf(historyWorker)} size="sm">
                    <FileDown className="h-4 w-4 mr-2" /> Generar acta PDF
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <WorkerAnalysisDialog
        worker={analysisWorker}
        entries={entries}
        epps={epps}
        onClose={() => setAnalysisWorker(null)}
      />
    </div>
  );
}
