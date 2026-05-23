import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DateFilter, { type DateFilterValue, isDateInFilter } from "@/components/DateFilter";
import { BarChart3, Package, RefreshCw, AlertTriangle, TrendingUp, Calendar, ShieldCheck, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { differenceInDays, parseISO } from "date-fns";
import type { Worker, EppItem, KardexEntry } from "@/types/kardex";

interface Props {
  worker: Worker | null;
  entries: KardexEntry[];
  epps: EppItem[];
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  A: "Asignación",
  C: "Cambio",
  P: "Pérdida",
};

const REASON_LABELS: Record<string, string> = {
  entrega_inicial: "Entrega inicial",
  deterioro: "Deterioro",
  fin_vida_util: "Fin de vida útil",
  perdida: "Pérdida",
  otro: "Otro",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(195 70% 45%)",
  "hsl(160 60% 45%)",
  "hsl(40 90% 55%)",
  "hsl(0 70% 55%)",
  "hsl(280 60% 55%)",
  "hsl(220 70% 55%)",
];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = String(iso).slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function WorkerAnalysisDialog({ worker, entries, epps, onClose }: Props) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: "all" });

  const eppMap = useMemo(() => {
    const m = new Map<string, EppItem>();
    for (const e of epps) m.set(e.id, e);
    return m;
  }, [epps]);

  const workerEntries = useMemo(() => {
    if (!worker) return [];
    return entries
      .filter((e) => e.workerId === worker.id && !e.voided)
      .filter((e) => isDateInFilter(e.deliveryDate, dateFilter));
  }, [entries, worker, dateFilter]);

  const stats = useMemo(() => {
    const total = workerEntries.reduce((s, e) => s + (e.quantity || 0), 0);
    const distinctEpps = new Set(workerEntries.map((e) => e.eppId)).size;
    const changes = workerEntries.filter((e) => e.deliveryType === "C").length;
    const losses = workerEntries.filter((e) => e.deliveryType === "P").length;
    const initial = workerEntries.filter((e) => e.deliveryType === "A").length;

    // Vigencia hoy
    const today = new Date();
    let vigentes = 0, porVencer = 0, vencidos = 0;
    // Para cada EPP, considerar la última entrega
    const lastByEpp = new Map<string, KardexEntry>();
    for (const e of workerEntries) {
      const prev = lastByEpp.get(e.eppId);
      if (!prev || e.deliveryDate > prev.deliveryDate) lastByEpp.set(e.eppId, e);
    }
    for (const [eppId, e] of lastByEpp) {
      const epp = eppMap.get(eppId);
      if (!epp || !epp.usefulLifeDays) continue;
      const elapsed = differenceInDays(today, parseISO(e.deliveryDate));
      const remaining = epp.usefulLifeDays - elapsed;
      if (remaining <= 0) vencidos++;
      else if (remaining <= Math.max(7, epp.usefulLifeDays * 0.15)) porVencer++;
      else vigentes++;
    }

    return { total, distinctEpps, changes, losses, initial, vigentes, porVencer, vencidos, eventos: workerEntries.length };
  }, [workerEntries, eppMap]);

  // Top EPPs por cantidad
  const topEpps = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of workerEntries) {
      m.set(e.eppId, (m.get(e.eppId) ?? 0) + (e.quantity || 0));
    }
    return Array.from(m.entries())
      .map(([id, qty]) => ({ name: eppMap.get(id)?.name ?? "EPP", qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [workerEntries, eppMap]);

  // Distribución por tipo de entrega
  const typeDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of workerEntries) {
      const k = e.deliveryType || "A";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([k, v]) => ({ name: TYPE_LABELS[k] ?? k, value: v }));
  }, [workerEntries]);

  // Distribución por motivo
  const reasonDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of workerEntries) {
      const k = e.reason || "otro";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([k, v]) => ({ name: REASON_LABELS[k] ?? k, value: v }));
  }, [workerEntries]);

  // Tendencia mensual
  const monthly = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of workerEntries) {
      const key = String(e.deliveryDate).slice(0, 7); // YYYY-MM
      m.set(key, (m.get(key) ?? 0) + (e.quantity || 0));
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ mes: k, cantidad: v }));
  }, [workerEntries]);

  // Vigencia data para pie
  const validityData = [
    { name: "Vigentes", value: stats.vigentes, color: "hsl(160 60% 45%)" },
    { name: "Por vencer", value: stats.porVencer, color: "hsl(40 90% 55%)" },
    { name: "Vencidos", value: stats.vencidos, color: "hsl(0 70% 55%)" },
  ].filter((d) => d.value > 0);

  // Insights
  const insights = useMemo(() => {
    const out: { tone: "info" | "warn" | "danger" | "success"; text: string }[] = [];
    if (stats.eventos === 0) {
      out.push({ tone: "info", text: "No hay registros en el período seleccionado." });
      return out;
    }
    if (stats.vencidos > 0) {
      out.push({ tone: "danger", text: `${stats.vencidos} EPP(s) vencido(s) requieren reposición inmediata.` });
    }
    if (stats.porVencer > 0) {
      out.push({ tone: "warn", text: `${stats.porVencer} EPP(s) próximo(s) a vencer. Programar cambio.` });
    }
    if (stats.losses > 0) {
      const pct = ((stats.losses / stats.eventos) * 100).toFixed(0);
      out.push({ tone: "warn", text: `${stats.losses} pérdida(s) reportada(s) (${pct}% de los eventos). Reforzar cuidado de EPPs.` });
    }
    if (stats.changes > 0) {
      out.push({ tone: "info", text: `${stats.changes} cambio(s) realizado(s) por deterioro o fin de vida útil.` });
    }
    if (topEpps[0]) {
      out.push({ tone: "info", text: `EPP más entregado: ${topEpps[0].name} (${topEpps[0].qty} unidades).` });
    }
    if (stats.vigentes > 0 && stats.vencidos === 0 && stats.porVencer === 0) {
      out.push({ tone: "success", text: "Todos los EPPs activos están vigentes. Excelente cumplimiento." });
    }
    return out;
  }, [stats, topEpps]);

  if (!worker) return null;

  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">
                Análisis de uso de EPPs — {worker.lastName}
                {worker.lastName && worker.firstName ? ", " : ""}
                {worker.firstName}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Dashboard inteligente del kardex del trabajador con métricas y tendencias.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<Package className="h-4 w-4" />} label="Unidades entregadas" value={stats.total} />
              <KpiCard icon={<ShieldCheck className="h-4 w-4" />} label="EPPs distintos" value={stats.distinctEpps} />
              <KpiCard icon={<RefreshCw className="h-4 w-4" />} label="Cambios" value={stats.changes} />
              <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Pérdidas" value={stats.losses} />
            </div>

            {workerEntries.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                Sin datos para mostrar en el período seleccionado.
              </Card>
            ) : (
              <>
                {/* Insights */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Hallazgos clave</h3>
                  </div>
                  <ul className="space-y-2">
                    {insights.map((i, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            i.tone === "danger"
                              ? "bg-destructive"
                              : i.tone === "warn"
                              ? "bg-warning"
                              : i.tone === "success"
                              ? "bg-success"
                              : "bg-primary"
                          }`}
                        />
                        <span>{i.text}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Charts row 1 */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Top EPPs entregados</h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topEpps} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            width={140}
                            tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Vigencia actual de EPPs</h3>
                    </div>
                    <div className="h-64">
                      {validityData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                          Sin datos de vigencia.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={validityData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
                              label={(p) => `${p.name}: ${p.value}`}
                            >
                              {validityData.map((d, i) => (
                                <Cell key={i} fill={d.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Charts row 2 */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Distribución por tipo de evento</h3>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={(p) => `${p.name}: ${p.value}`}>
                            {typeDist.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Motivos de movimiento</h3>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reasonDist}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={60} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* Trend */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Tendencia mensual de unidades entregadas</h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="cantidad" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Detalle por EPP */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Detalle por EPP (última entrega y vigencia)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr>
                          <th className="text-left py-2 px-2 font-medium">EPP</th>
                          <th className="text-right py-2 px-2 font-medium">Unidades</th>
                          <th className="text-left py-2 px-2 font-medium">Última entrega</th>
                          <th className="text-left py-2 px-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const today = new Date();
                          const map = new Map<string, { qty: number; last: KardexEntry }>();
                          for (const e of workerEntries) {
                            const cur = map.get(e.eppId);
                            if (!cur) map.set(e.eppId, { qty: e.quantity || 0, last: e });
                            else {
                              cur.qty += e.quantity || 0;
                              if (e.deliveryDate > cur.last.deliveryDate) cur.last = e;
                            }
                          }
                          return Array.from(map.entries())
                            .map(([eppId, v]) => {
                              const epp = eppMap.get(eppId);
                              const elapsed = differenceInDays(today, parseISO(v.last.deliveryDate));
                              const remaining = (epp?.usefulLifeDays ?? 0) - elapsed;
                              let status: { label: string; tone: string } = { label: "—", tone: "secondary" };
                              if (epp?.usefulLifeDays) {
                                if (remaining <= 0) status = { label: `Vencido (${Math.abs(remaining)}d)`, tone: "destructive" };
                                else if (remaining <= Math.max(7, epp.usefulLifeDays * 0.15)) status = { label: `Por vencer (${remaining}d)`, tone: "warning" };
                                else status = { label: `Vigente (${remaining}d)`, tone: "success" };
                              }
                              return { name: epp?.name ?? "EPP", qty: v.qty, last: v.last.deliveryDate, status };
                            })
                            .sort((a, b) => b.qty - a.qty)
                            .map((r, i) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                                <td className="py-2 px-2">{r.name}</td>
                                <td className="py-2 px-2 text-right font-medium">{r.qty}</td>
                                <td className="py-2 px-2">{fmtDate(r.last)}</td>
                                <td className="py-2 px-2">
                                  <Badge
                                    className={
                                      r.status.tone === "destructive"
                                        ? "bg-destructive text-destructive-foreground"
                                        : r.status.tone === "warning"
                                        ? "bg-warning text-warning-foreground"
                                        : r.status.tone === "success"
                                        ? "bg-success text-success-foreground"
                                        : ""
                                    }
                                    variant={r.status.tone === "secondary" ? "secondary" : undefined}
                                  >
                                    {r.status.label}
                                  </Badge>
                                </td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}
