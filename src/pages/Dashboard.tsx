import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  HardHat,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Activity,
  PackageX,
} from "lucide-react";
import { getKardex } from "@/lib/storage";
import { getValidity } from "@/lib/kardex-utils";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Worker, EppItem, KardexEntry } from "@/types/kardex";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [epps, setEpps] = useState<EppItem[]>([]);
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      getKardex().then(setEntries);
      const [{ data: profilesData }, { data: eppsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,dni,area,cargo,personnel_type,active")
          .eq("active", true),
        supabase
          .from("epps")
          .select("id,nombre,area,actividad,vida_util_dias,requiere_firma,estado"),
      ]);
      const mappedWorkers: Worker[] = (profilesData ?? []).map((p: any) => {
        const parts = (p.full_name ?? "").trim().split(/\s+/);
        return {
          id: p.id,
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" "),
          dni: p.dni ?? "",
          area: p.area ?? "—",
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

  const data = useMemo(() => {
    const eppMap = new Map(epps.map((e) => [e.id, e]));
    const workerMap = new Map(workers.map((w) => [w.id, w]));

    // Movimientos válidos (no anulados)
    const validEntries = entries.filter((e) => !e.voided);

    // EPPs en uso por trabajador (último estado vigente)
    let vigente = 0,
      porVencer = 0,
      vencido = 0;
    const workersConEpp = new Set<string>();
    const upcomingExpirations: Array<{
      worker: Worker;
      epp: EppItem;
      days: number;
      entry: KardexEntry;
    }> = [];

    for (const k of validEntries) {
      if (k.eventType !== "delivery" && k.eventType !== "change") continue;
      if (k.returnDate) continue;
      const epp = eppMap.get(k.eppId);
      const worker = workerMap.get(k.workerId);
      if (!epp || !worker) continue;
      const v = getValidity(k, epp);
      workersConEpp.add(k.workerId);
      if (v.status === "vigente") vigente++;
      else if (v.status === "porVencer") {
        porVencer++;
        upcomingExpirations.push({ worker, epp, days: v.daysRemaining, entry: k });
      } else {
        vencido++;
        upcomingExpirations.push({ worker, epp, days: v.daysRemaining, entry: k });
      }
    }

    upcomingExpirations.sort((a, b) => a.days - b.days);

    // Top EPP entregados
    const eppCounts = new Map<string, number>();
    for (const k of validEntries) {
      if (k.eventType !== "delivery" && k.eventType !== "change") continue;
      eppCounts.set(k.eppId, (eppCounts.get(k.eppId) ?? 0) + (k.quantity || 1));
    }
    const topEpps = Array.from(eppCounts.entries())
      .map(([id, qty]) => ({ name: eppMap.get(id)?.name ?? "—", qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    // Distribución por área (de trabajadores)
    const areaCounts = new Map<string, number>();
    for (const w of workers) {
      areaCounts.set(w.area, (areaCounts.get(w.area) ?? 0) + 1);
    }
    const byArea = Array.from(areaCounts.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);

    // Movimientos últimos 14 días
    const today = startOfDay(new Date());
    const days14 = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(today, 13 - i);
      return { date: d, label: format(d, "d MMM", { locale: es }), count: 0 };
    });
    for (const k of validEntries) {
      try {
        const created = startOfDay(parseISO(k.createdAt));
        const idx = 13 - differenceInDays(today, created);
        if (idx >= 0 && idx < 14) days14[idx].count++;
      } catch {}
    }

    // Tipos de entrega
    const tipos = { A: 0, C: 0, P: 0 } as Record<string, number>;
    for (const k of validEntries) {
      if (k.deliveryType in tipos) tipos[k.deliveryType]++;
    }
    const tipoData = [
      { name: "Asignación inicial", value: tipos.A },
      { name: "Cambio", value: tipos.C },
      { name: "Pérdida", value: tipos.P },
    ];

    const totalEnUso = vigente + porVencer + vencido;
    const cobertura = workers.length > 0 ? (workersConEpp.size / workers.length) * 100 : 0;
    const tasaVencidos = totalEnUso > 0 ? (vencido / totalEnUso) * 100 : 0;

    // Movimientos recientes (últimos 6)
    const recientes = [...validEntries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((k) => ({
        entry: k,
        worker: workerMap.get(k.workerId),
        epp: eppMap.get(k.eppId),
      }));

    return {
      totals: {
        workers: workers.length,
        epps: epps.length,
        eppsActive: epps.filter((e) => e.status === "active").length,
        movements: validEntries.length,
        workersConEpp: workersConEpp.size,
      },
      health: { vigente, porVencer, vencido, totalEnUso },
      cobertura,
      tasaVencidos,
      upcomingExpirations: upcomingExpirations.slice(0, 8),
      topEpps,
      byArea,
      days14,
      tipoData,
      recientes,
    };
  }, [workers, epps, entries]);

  const kpis = [
    {
      label: "Trabajadores activos",
      value: data.totals.workers,
      sub: `${data.totals.workersConEpp} con EPP asignado`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      to: "/trabajadores",
    },
    {
      label: "Catálogo EPP",
      value: data.totals.epps,
      sub: `${data.totals.eppsActive} activos`,
      icon: HardHat,
      color: "text-accent",
      bg: "bg-accent/10",
      to: "/epps",
    },
    {
      label: "Movimientos kardex",
      value: data.totals.movements,
      sub: "Entregas, cambios y devoluciones",
      icon: ClipboardList,
      color: "text-secondary-foreground",
      bg: "bg-secondary",
      to: "/kardex",
    },
    {
      label: "EPPs en uso",
      value: data.health.totalEnUso,
      sub: `${data.health.vigente} vigentes`,
      icon: ShieldCheck,
      color: "text-success",
      bg: "bg-success/10",
      to: "/kardex",
    },
  ];

  const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];
  const TIPO_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))"];

  const healthData = [
    { name: "Vigentes", value: data.health.vigente },
    { name: "Por vencer", value: data.health.porVencer },
    { name: "Vencidos", value: data.health.vencido },
  ];

  return (
    <div>
      <PageHeader
        title="Panel de control"
        description="Indicadores analíticos del sistema Kardex EPP — Livigui Perú S.A.C."
      />
      <section className="p-6 md:p-10 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((c) => (
            <Link key={c.label} to={c.to}>
              <Card className="p-5 hover:shadow-lg transition-shadow card-elevated h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      {c.label}
                    </p>
                    {loading ? (
                      <Skeleton className="h-9 w-16 mt-2" />
                    ) : (
                      <p className="text-3xl font-bold mt-1 tabular-nums">{c.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 truncate">{c.sub}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Indicadores de cumplimiento */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 card-elevated">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Cobertura de EPP
                </h3>
                <p className="text-xs text-muted-foreground">
                  Trabajadores con al menos un EPP asignado vigente
                </p>
              </div>
              <span className="text-2xl font-bold tabular-nums">
                {data.cobertura.toFixed(0)}%
              </span>
            </div>
            <Progress value={data.cobertura} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.totals.workersConEpp} de {data.totals.workers} trabajadores
            </p>
          </Card>

          <Card className="p-5 card-elevated">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Tasa de EPPs vencidos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Porcentaje del total de EPPs en uso que ya vencieron
                </p>
              </div>
              <span className="text-2xl font-bold tabular-nums">
                {data.tasaVencidos.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={data.tasaVencidos}
              className="h-2 [&>div]:bg-destructive"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {data.health.vencido} vencidos de {data.health.totalEnUso} en uso
            </p>
          </Card>
        </div>

        {/* Estado de vida útil */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Estado de vida útil de EPPs en uso
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Vigentes", value: data.health.vigente, icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
              { label: "Por vencer", value: data.health.porVencer, icon: Clock, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
              { label: "Vencidos", value: data.health.vencido, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
            ].map((s) => {
              const pct = data.health.totalEnUso > 0 ? (s.value / data.health.totalEnUso) * 100 : 0;
              return (
                <Card key={s.label} className={`p-5 card-elevated border ${s.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.bg}`}>
                        <s.icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {pct.toFixed(0)}%
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Gráficos analíticos */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tendencia 14 días */}
          <Card className="p-5 card-elevated">
            <h3 className="font-semibold mb-1">Movimientos – últimos 14 días</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Total de entregas, cambios y devoluciones registradas por día
            </p>
            <ChartContainer
              config={{ count: { label: "Movimientos", color: "hsl(var(--primary))" } }}
              className="h-[220px] w-full"
            >
              <LineChart data={data.days14}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </Card>

          {/* Distribución de salud */}
          <Card className="p-5 card-elevated">
            <h3 className="font-semibold mb-1">Distribución por estado</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Vigencia de los EPPs actualmente en uso
            </p>
            {data.health.totalEnUso === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sin EPPs en uso registrados
              </div>
            ) : (
              <ChartContainer config={{}} className="h-[220px] w-full">
                <PieChart>
                  <Pie
                    data={healthData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {healthData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ChartContainer>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top EPPs */}
          <Card className="p-5 card-elevated">
            <h3 className="font-semibold mb-1">EPPs más entregados</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Cantidad acumulada por tipo de EPP
            </p>
            {data.topEpps.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos
              </div>
            ) : (
              <ChartContainer
                config={{ qty: { label: "Cantidad", color: "hsl(var(--primary))" } }}
                className="h-[240px] w-full"
              >
                <BarChart data={data.topEpps} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </Card>

          {/* Tipos de entrega */}
          <Card className="p-5 card-elevated">
            <h3 className="font-semibold mb-1">Tipos de entrega</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Distribución por motivo de movimiento
            </p>
            {data.tipoData.every((d) => d.value === 0) ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                Sin movimientos
              </div>
            ) : (
              <ChartContainer config={{}} className="h-[240px] w-full">
                <PieChart>
                  <Pie
                    data={data.tipoData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={85}
                    label={(e: any) => `${e.value}`}
                  >
                    {data.tipoData.map((_, i) => (
                      <Cell key={i} fill={TIPO_COLORS[i]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ChartContainer>
            )}
          </Card>
        </div>

        {/* Próximos vencimientos + Áreas */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 card-elevated">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  Próximos vencimientos
                </h3>
                <p className="text-xs text-muted-foreground">
                  EPPs por vencer o vencidos que requieren atención
                </p>
              </div>
              <Link to="/kardex" className="text-xs text-primary hover:underline">
                Ver kardex →
              </Link>
            </div>
            {data.upcomingExpirations.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Todos los EPPs en uso están vigentes ✓
              </div>
            ) : (
              <ul className="divide-y">
                {data.upcomingExpirations.map((u, i) => {
                  const overdue = u.days <= 0;
                  return (
                    <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {u.worker.lastName} {u.worker.firstName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.epp.name} · {u.worker.area}
                        </p>
                      </div>
                      <Badge
                        variant={overdue ? "destructive" : "secondary"}
                        className={!overdue ? "bg-warning/15 text-warning hover:bg-warning/20 border-warning/30" : ""}
                      >
                        {overdue ? `Vencido ${Math.abs(u.days)}d` : `${u.days}d`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5 card-elevated">
            <h3 className="font-semibold mb-1">Trabajadores por área</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Distribución del personal activo
            </p>
            {data.byArea.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                Sin trabajadores registrados
              </div>
            ) : (
              <ChartContainer
                config={{ count: { label: "Trabajadores", color: "hsl(var(--accent))" } }}
                className="h-[240px] w-full"
              >
                <BarChart data={data.byArea}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="area" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </Card>
        </div>

        {/* Movimientos recientes */}
        <Card className="p-5 card-elevated">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Movimientos recientes
              </h3>
              <p className="text-xs text-muted-foreground">
                Últimos registros del kardex
              </p>
            </div>
            <Link to="/kardex" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          {data.recientes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
              <PackageX className="h-8 w-8 opacity-50" />
              Sin movimientos registrados
            </div>
          ) : (
            <ul className="divide-y">
              {data.recientes.map(({ entry, worker, epp }) => (
                <li key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {worker ? `${worker.lastName} ${worker.firstName}` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {epp?.name ?? "EPP"} · {format(parseISO(entry.deliveryDate), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {entry.deliveryType === "A" ? "Asignación" : entry.deliveryType === "C" ? "Cambio" : "Pérdida"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
