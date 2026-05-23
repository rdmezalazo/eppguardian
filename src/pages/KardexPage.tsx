import { useEffect, useMemo, useRef, useState } from "react";
import DateFilter, { type DateFilterValue, isDateInFilter } from "@/components/DateFilter";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Search,
  FileDown,
  ClipboardList,
  ClipboardEdit,
  ChevronsUpDown,
  Check,
  User,
  ShieldCheck,
  Pencil,
  Trash2,
  Ban,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getKardexHeaders, upsertKardexHeader, deleteKardexHeader, setKardexHeaderVoided,
  uuidGen, getCompany, getKardexDefaults, type KardexDefaults,
} from "@/lib/storage";
import { getValidity, validityColor, validityLabel, deliveryTypeLabel, reasonLabel } from "@/lib/kardex-utils";
import type { KardexHeader, KardexItemInput, Worker, EppItem, DeliveryType, EventType, Reason } from "@/types/kardex";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { generateKardexPDF } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import CardPreviewDialog from "@/components/CardPreviewDialog";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { compareSignatures, SIGNATURE_MATCH_THRESHOLD } from "@/lib/signature-compare";
import { getSignatureSettings } from "@/lib/storage";

interface DraftItem extends KardexItemInput {
  _key: string; // ui-only stable key
}

interface FormState {
  workerId: string;
  deliveryDate: string;
  changeRequestDate: string;
  returnDate: string;
  responsibleName: string;
  observations: string;
  items: DraftItem[];
}

const today = () => format(new Date(), "yyyy-MM-dd");
const emptyForm = (): FormState => ({
  workerId: "",
  deliveryDate: today(),
  changeRequestDate: "",
  returnDate: "",
  responsibleName: "",
  observations: "",
  items: [],
});

const newDraftItem = (): DraftItem => ({
  _key: uuidGen(),
  eppId: "",
  eventType: "delivery",
  deliveryType: "A",
  quantity: 1,
  reason: "entrega_inicial",
  returnDate: "",
  observations: "",
});

export default function KardexPage() {
  const { can, loading: permissionsLoading } = useModulePermissions();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [epps, setEpps] = useState<EppItem[]>([]);
  const [headers, setHeaders] = useState<KardexHeader[]>([]);
  const [q, setQ] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [visibleCount, setVisibleCount] = useState(30);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [workerPopoverOpen, setWorkerPopoverOpen] = useState(false);
  const [eppPopoverItem, setEppPopoverItem] = useState<string | null>(null);
  const workerSigRef = useRef<SignaturePadHandle>(null);
  const respSigRef = useRef<SignaturePadHandle>(null);
  const [kardexDefaults, setKardexDefaults] = useState<KardexDefaults>({});

  // Diálogos de acciones
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<KardexHeader | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [preview, setPreview] = useState<KardexHeader | null>(null);

  useEffect(() => {
    getKardexHeaders().then(setHeaders);
    getKardexDefaults().then(setKardexDefaults).catch(() => {});
    (async () => {
      const [{ data: profilesData, error: pErr }, { data: eppsData, error: eErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,area,cargo,sede,personnel_type,active,dni,validated_signature,signature_validated")
          .eq("active", true)
          .order("full_name", { ascending: true }),
        supabase
          .from("epps")
          .select("id,nombre,area,actividad,vida_util_dias,requiere_firma,estado,imagen_url,norma")
          .eq("estado", "active")
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
          dni: p.dni ?? p.email ?? "",
          area: p.area ?? "",
          position: p.cargo ?? (p.personnel_type === "operativo" ? "Operativo" : "Administrativo"),
          createdAt: new Date().toISOString(),
          validatedSignature: p.validated_signature ?? null,
          signatureValidated: !!p.signature_validated,
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
    })();
  }, []);

  const eppMap = useMemo(() => new Map(epps.map((e) => [e.id, e])), [epps]);
  const workerMap = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);

  const canCreateKardex = !permissionsLoading && can("kardex", "create");
  const canEditKardex = !permissionsLoading && can("kardex", "edit");
  const canVoidKardex = !permissionsLoading && can("kardex", "void");
  const canDeleteKardex = !permissionsLoading && can("kardex", "delete");
  const canDownloadReports = !permissionsLoading && can("reportes", "download");

  const selectedWorkerObj = form.workerId ? workerMap.get(form.workerId) : undefined;

  const filtered = useMemo(() => {
    let list = [...headers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (selectedWorker !== "all") list = list.filter((h) => h.workerId === selectedWorker);
    list = list.filter((h) => isDateInFilter(h.deliveryDate, dateFilter));
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((h) => {
        const w = workerMap.get(h.workerId);
        const matchEpp = h.items.some((it) => eppMap.get(it.eppId)?.name.toLowerCase().includes(t));
        return (
          w?.dni.includes(t) ||
          `${w?.firstName} ${w?.lastName}`.toLowerCase().includes(t) ||
          matchEpp
        );
      });
    }
    return list;
  }, [headers, q, selectedWorker, dateFilter, eppMap, workerMap]);

  // Resetear paginación visual cuando cambian filtros/búsqueda
  useEffect(() => { setVisibleCount(30); }, [q, selectedWorker, dateFilter]);
  const visibleHeaders = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const openNew = () => {
    if (!can("kardex", "create")) {
      toast.error("No tienes permiso para crear Kardex");
      return;
    }
    setEditingId(null);
    setForm({
      ...emptyForm(),
      responsibleName: kardexDefaults.responsibleName ?? "",
      items: [newDraftItem()],
    });
    setOpen(true);
  };

  const startEdit = (h: KardexHeader) => {
    if (!can("kardex", "edit")) {
      toast.error("No tienes permiso para editar Kardex");
      return;
    }
    setEditingId(h.id);
    setForm({
      workerId: h.workerId,
      deliveryDate: h.deliveryDate ? h.deliveryDate.slice(0, 10) : today(),
      changeRequestDate: h.changeRequestDate ? h.changeRequestDate.slice(0, 10) : "",
      returnDate: h.returnDate ? h.returnDate.slice(0, 10) : "",
      responsibleName: h.responsibleName ?? "",
      observations: h.observations ?? "",
      items: h.items.length > 0
        ? h.items.map((it) => ({
            _key: it.id,
            id: it.id,
            eppId: it.eppId,
            eventType: it.eventType,
            deliveryType: it.deliveryType,
            quantity: it.quantity,
            reason: it.reason,
            returnDate: it.returnDate ? it.returnDate.slice(0, 10) : "",
            observations: it.observations ?? "",
          }))
        : [newDraftItem()],
    });
    setOpen(true);
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, newDraftItem()] }));
  const removeItem = (key: string) => setForm((f) => ({ ...f, items: f.items.filter((i) => i._key !== key) }));
  const updateItem = (key: string, patch: Partial<DraftItem>) =>
    setForm((f) => ({ ...f, items: f.items.map((i) => (i._key === key ? { ...i, ...patch } : i)) }));

  const submit = async () => {
    const action = editingId ? "edit" : "create";
    if (!can("kardex", action)) {
      toast.error(`No tienes permiso para ${editingId ? "editar" : "crear"} Kardex`);
      return;
    }
    if (!form.workerId) { toast.error("Selecciona un trabajador"); return; }
    if (form.items.length === 0) { toast.error("Agrega al menos un EPP al detalle"); return; }
    const invalid = form.items.find((i) => !i.eppId || !i.quantity || i.quantity < 1);
    if (invalid) { toast.error("Cada ítem requiere un EPP y una cantidad válida"); return; }

    const requiresSignature = form.items.some((i) => eppMap.get(i.eppId)?.requiresSignature);
    const editingHeader = editingId ? headers.find((h) => h.id === editingId) : null;
    const workerSig = workerSigRef.current?.getDataUrl() ?? editingHeader?.workerSignature;
    const respSig = respSigRef.current?.getDataUrl() ?? editingHeader?.responsibleSignature ?? kardexDefaults.responsibleSignature;
    const respName = form.responsibleName || kardexDefaults.responsibleName || undefined;

    if (requiresSignature && !workerSig) {
      toast.error("Al menos un EPP requiere la firma del trabajador");
      return;
    }

    // Validate worker's signature against the validated pattern
    if (requiresSignature && workerSig) {
      const worker = workerMap.get(form.workerId);
      const editingPad = workerSigRef.current?.getDataUrl();
      // Only validate when the user actually drew/changed the signature in this dialog
      const signatureChanged = !!editingPad;
      if (signatureChanged) {
        if (!worker?.validatedSignature || !worker?.signatureValidated) {
          toast.error(
            "Este trabajador no tiene una firma validada registrada. Regístrala desde Trabajadores antes de continuar.",
          );
          workerSigRef.current?.unlock();
          return;
        }
        try {
          const score = await compareSignatures(worker.validatedSignature, workerSig);
          const cfg = await getSignatureSettings();
          const threshold = cfg.matchThreshold ?? SIGNATURE_MATCH_THRESHOLD;
          if (score < threshold) {
            toast.error(
              `La firma no coincide con la firma validada del trabajador (similitud ${(score * 100).toFixed(0)}% / mínimo ${(threshold * 100).toFixed(0)}%). Vuelve a intentarlo.`,
            );
            workerSigRef.current?.unlock();
            return;
          }
          toast.success(`Firma verificada (${(score * 100).toFixed(0)}% de coincidencia)`);
        } catch (e: any) {
          toast.error("No se pudo validar la firma: " + (e?.message ?? e));
          workerSigRef.current?.unlock();
          return;
        }
      }
    }

    try {
      await upsertKardexHeader({
        id: editingId ?? undefined,
        workerId: form.workerId,
        deliveryDate: form.deliveryDate,
        changeRequestDate: form.changeRequestDate || undefined,
        returnDate: form.returnDate || undefined,
        responsibleName: respName,
        responsibleSignature: respSig || undefined,
        workerSignature: workerSig || undefined,
        observations: form.observations || undefined,
        items: form.items.map((i) => ({
          id: i.id,
          eppId: i.eppId,
          eventType: i.eventType,
          deliveryType: i.deliveryType,
          quantity: i.quantity,
          reason: i.reason,
          returnDate: i.returnDate || undefined,
          observations: i.observations || undefined,
        })),
      });
    } catch (e: any) {
      toast.error("Error al guardar: " + (e?.message ?? e));
      return;
    }

    setHeaders(await getKardexHeaders());
    toast.success(editingId ? "Registro actualizado" : "Registro creado correctamente");
    setOpen(false); setEditingId(null); setForm(emptyForm());
    workerSigRef.current?.clear(); respSigRef.current?.clear();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    if (!can("kardex", "delete")) {
      toast.error("No tienes permiso para eliminar Kardex");
      setDeleteId(null);
      return;
    }
    try { await deleteKardexHeader(deleteId); } catch (e: any) {
      toast.error("Error al eliminar: " + (e?.message ?? e)); return;
    }
    setHeaders(headers.filter((h) => h.id !== deleteId));
    toast.success("Registro eliminado");
    setDeleteId(null);
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    if (!can("kardex", "void")) {
      toast.error("No tienes permiso para anular Kardex");
      setVoidTarget(null);
      setVoidReason("");
      return;
    }
    const willVoid = !voidTarget.voided;
    try {
      await setKardexHeaderVoided(voidTarget.id, willVoid, voidReason.trim() || undefined);
    } catch (e: any) {
      toast.error("Error al actualizar: " + (e?.message ?? e)); return;
    }
    setHeaders(await getKardexHeaders());
    toast.success(voidTarget.voided ? "Anulación revertida" : "Registro anulado");
    setVoidTarget(null);
    setVoidReason("");
  };

  const exportPdf = async (workerId: string) => {
    if (!can("reportes", "download")) {
      toast.error("No tienes permiso para descargar PDF");
      return;
    }
    const worker = workerMap.get(workerId);
    if (!worker) return;
    const list = headers
      .filter((h) => h.workerId === workerId && !h.voided)
      .flatMap((h) => h.items.filter((i) => !i.voided))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (list.length === 0) { toast.error("Este trabajador no tiene registros vigentes"); return; }
    const company = await getCompany();
    const entriesWithDefault = list.map((e) => ({
      ...e,
      responsibleSignature: e.responsibleSignature ?? kardexDefaults.responsibleSignature,
      responsibleName: e.responsibleName ?? kardexDefaults.responsibleName,
    }));
    await generateKardexPDF({ company, worker, entries: entriesWithDefault, epps });
    toast.success("PDF generado");
  };

  return (
    <div>
      <PageHeader
        title="Kardex digital de EPP"
        description="Registro maestro–detalle: una entrega puede incluir varios EPPs"
        actions={
          canCreateKardex ? (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm()); workerSigRef.current?.clear(); respSigRef.current?.clear(); } }}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={openNew}>
                <Plus className="h-5 w-5 mr-2" /> Nuevo registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[95vw] h-[92vh] max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
              <DialogHeader className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg shrink-0">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                  <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
                    <ClipboardEdit className="h-4 w-4" />
                  </div>
                  {editingId ? "Editar registro de Kardex" : "Nuevo registro de Kardex"}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 ml-[42px] text-xs">
                  Una cabecera (trabajador, fechas y firmas) con varios EPPs en el detalle.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0 flex-1 min-h-0 overflow-hidden">
                {/* Columna izquierda: resumen */}
                <div className="bg-muted/30 border-r p-4 space-y-4 overflow-y-auto">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Trabajador
                      </h3>
                    </div>
                    <Card className="p-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {selectedWorkerObj ? (
                          <>
                            <p className="font-medium text-sm truncate">
                              {selectedWorkerObj.firstName} {selectedWorkerObj.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {selectedWorkerObj.position}
                            </p>
                            <p className="text-[11px] text-muted-foreground">DNI {selectedWorkerObj.dni}</p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin trabajador seleccionado</p>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        EPPs en el detalle
                      </h3>
                    </div>
                    <Card className="p-3">
                      <p className="text-2xl font-bold text-primary">{form.items.length}</p>
                      <p className="text-xs text-muted-foreground">
                        Cantidad total: {form.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}
                      </p>
                    </Card>
                  </div>
                </div>

                {/* Columna derecha: formulario */}
                <div className="p-5 space-y-4 overflow-y-auto">
                  {/* Cabecera */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Cabecera del registro
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs font-medium">Trabajador *</Label>
                        <Popover open={workerPopoverOpen} onOpenChange={setWorkerPopoverOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              role="combobox"
                              aria-expanded={workerPopoverOpen}
                              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              <span className={cn("truncate", !selectedWorkerObj && "text-muted-foreground")}>
                                {selectedWorkerObj
                                  ? `${selectedWorkerObj.firstName} ${selectedWorkerObj.lastName} — ${selectedWorkerObj.position}`
                                  : "Buscar por nombre, apellido o cargo…"}
                              </span>
                              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                            <Command
                              filter={(value, search) =>
                                value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                              }
                            >
                              <CommandInput placeholder="Nombre, apellido, cargo o DNI…" />
                              <CommandList>
                                <CommandEmpty>Sin resultados</CommandEmpty>
                                <CommandGroup heading={`${workers.length} trabajador${workers.length === 1 ? "" : "es"}`}>
                                  {workers.map((w) => {
                                    const searchValue = `${w.firstName} ${w.lastName} ${w.position} ${w.dni} ${w.area}`;
                                    const initials = `${w.firstName?.[0] ?? ""}${w.lastName?.[0] ?? ""}`.toUpperCase();
                                    return (
                                      <CommandItem
                                        key={w.id}
                                        value={searchValue}
                                        onSelect={() => {
                                          setForm({ ...form, workerId: w.id });
                                          setWorkerPopoverOpen(false);
                                        }}
                                        className="py-2"
                                      >
                                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2.5 shrink-0 text-xs font-semibold">
                                          {initials || <User className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">
                                              {w.firstName} {w.lastName}
                                            </p>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 shrink-0">
                                              DNI {w.dni}
                                            </Badge>
                                          </div>
                                          <span className="text-xs text-muted-foreground truncate">
                                            {w.position} {w.area && `• ${w.area}`}
                                          </span>
                                        </div>
                                        {form.workerId === w.id && <Check className="h-4 w-4 opacity-70 ml-2 shrink-0" />}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Fecha de entrega *</Label>
                        <Input className="h-9" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Solicitud de cambio</Label>
                        <Input className="h-9" type="date" value={form.changeRequestDate} onChange={(e) => setForm({ ...form, changeRequestDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Fecha de devolución (general)</Label>
                        <Input className="h-9" type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Responsable</Label>
                        <Input
                          className="h-9 bg-muted/50 cursor-not-allowed"
                          placeholder="Definir en Ajustes › Kardex"
                          value={form.responsibleName}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detalle */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-6 rounded-full bg-primary" />
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                          Detalle: EPPs entregados
                        </h3>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={addItem}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar EPP
                      </Button>
                    </div>

                    {form.items.length === 0 ? (
                      <Card className="p-6 text-center text-sm text-muted-foreground">
                        Aún no has agregado EPPs. Haz clic en <strong>Agregar EPP</strong>.
                      </Card>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[30%] text-xs">EPP</TableHead>
                              <TableHead className="text-xs">Tipo</TableHead>
                              <TableHead className="text-xs w-20">Cant.</TableHead>
                              <TableHead className="text-xs">Motivo</TableHead>
                              <TableHead className="text-xs">Devolución</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.items.map((it) => {
                              const eppObj = it.eppId ? eppMap.get(it.eppId) : undefined;
                              return (
                                <TableRow key={it._key}>
                                  <TableCell className="py-2">
                                    <Popover
                                      open={eppPopoverItem === it._key}
                                      onOpenChange={(o) => setEppPopoverItem(o ? it._key : null)}
                                    >
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs"
                                        >
                                          <span className={cn("truncate", !eppObj && "text-muted-foreground")}>
                                            {eppObj ? eppObj.name : "Seleccionar EPP…"}
                                          </span>
                                          <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0 w-[320px]" align="start">
                                        <Command>
                                          <CommandInput placeholder="Buscar EPP…" />
                                          <CommandList>
                                            <CommandEmpty>Sin resultados</CommandEmpty>
                                            <CommandGroup>
                                              {epps.map((e) => (
                                                <CommandItem
                                                  key={e.id}
                                                  value={`${e.name} ${e.type}`}
                                                  onSelect={() => {
                                                    updateItem(it._key, { eppId: e.id });
                                                    setEppPopoverItem(null);
                                                  }}
                                                >
                                                  <ShieldCheck className="h-3.5 w-3.5 mr-2 text-primary" />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{e.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{e.type}</p>
                                                  </div>
                                                  {it.eppId === e.id && <Check className="h-3.5 w-3.5 opacity-70" />}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Select
                                      value={it.deliveryType}
                                      onValueChange={(v: DeliveryType) => updateItem(it._key, { deliveryType: v })}
                                    >
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A">A — Asignado</SelectItem>
                                        <SelectItem value="C">C — Cambio</SelectItem>
                                        <SelectItem value="P">P — Pérdida</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input
                                      className="h-8 text-xs"
                                      type="number"
                                      min={1}
                                      value={it.quantity}
                                      onChange={(e) => updateItem(it._key, { quantity: Number(e.target.value) })}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Select
                                      value={it.reason}
                                      onValueChange={(v: Reason) => updateItem(it._key, { reason: v })}
                                    >
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="entrega_inicial">Entrega inicial</SelectItem>
                                        <SelectItem value="deterioro">Deterioro</SelectItem>
                                        <SelectItem value="fin_vida_util">Fin de vida útil</SelectItem>
                                        <SelectItem value="perdida">Pérdida</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input
                                      className="h-8 text-xs"
                                      type="date"
                                      value={it.returnDate ?? ""}
                                      onChange={(e) => updateItem(it._key, { returnDate: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => removeItem(it._key)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Observaciones y firmas */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Observaciones y firmas
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Observaciones</Label>
                        <Textarea
                          rows={3}
                          className="resize-none text-sm w-full"
                          value={form.observations}
                          onChange={(e) => setForm({ ...form, observations: e.target.value })}
                        />
                      </div>
                      {(() => {
                        const editingHeader = editingId ? headers.find((h) => h.id === editingId) : null;
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                            <div className="flex flex-col h-full">
                              <SignaturePad
                                ref={workerSigRef}
                                label="Firma del trabajador"
                                initialDataUrl={editingHeader?.workerSignature ?? null}
                                height={200}
                                referenceImageUrl={selectedWorkerObj?.signatureValidated ? selectedWorkerObj?.validatedSignature ?? null : null}
                                referenceName={selectedWorkerObj ? `${selectedWorkerObj.firstName} ${selectedWorkerObj.lastName}`.trim() : undefined}
                                onConfirmValidate={async (dataUrl) => {
                                  const worker = selectedWorkerObj;
                                  const cfg = await getSignatureSettings();
                                  const threshold = cfg.matchThreshold ?? SIGNATURE_MATCH_THRESHOLD;
                                  if (!worker?.validatedSignature || !worker?.signatureValidated) {
                                    return { ok: false, score: 0, threshold, message: "El trabajador no tiene firma validada registrada." };
                                  }
                                  try {
                                    const score = await compareSignatures(worker.validatedSignature, dataUrl);
                                    return { ok: score >= threshold, score, threshold };
                                  } catch (e: any) {
                                    return { ok: false, score: 0, threshold, message: e?.message ?? String(e) };
                                  }
                                }}
                              />
                            </div>
                            <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2 min-h-[28px]">
                                <Label className="text-sm font-semibold text-foreground">Firma del responsable</Label>
                              </div>
                              <div
                                className="rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center w-full"
                                style={{ height: 200 }}
                              >
                                {(editingHeader?.responsibleSignature ?? kardexDefaults.responsibleSignature) ? (
                                  <img
                                    src={editingHeader?.responsibleSignature ?? kardexDefaults.responsibleSignature ?? ""}
                                    alt="Firma del responsable"
                                    className="h-full w-full object-contain p-2"
                                  />
                                ) : (
                                  <p className="text-xs text-muted-foreground px-3 text-center">
                                    Sin firma predeterminada. Configure en Ajustes › Kardex.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit}>{editingId ? "Guardar cambios" : "Guardar registro"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          ) : null
        }
      />
      <section className="p-6 md:p-10 space-y-6">
        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Buscar por DNI, nombre o EPP…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10 h-12" />
          </div>
          <Select value={selectedWorker} onValueChange={setSelectedWorker}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los trabajadores</SelectItem>
              {workers.map((w) => (<SelectItem key={w.id} value={w.id}>{w.lastName}, {w.firstName}</SelectItem>))}
            </SelectContent>
          </Select>
          {selectedWorker !== "all" && canDownloadReports && (
            <Button size="lg" variant="outline" onClick={() => exportPdf(selectedWorker)}>
              <FileDown className="h-5 w-5 mr-2" /> PDF acta
            </Button>
          )}
        </div>
        <DateFilter value={dateFilter} onChange={setDateFilter} />

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No hay registros aún. Crea uno desde "Nuevo registro".
            </Card>
          )}
          {visibleHeaders.map((h) => {
            const w = workerMap.get(h.workerId);
            return (
              <Card
                key={h.id}
                role="button"
                tabIndex={0}
                onClick={() => setPreview(h)}
                onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setPreview(h); } }}
                className={cn(
                  "card-elevated overflow-hidden relative pr-14 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all",
                  h.voided && "opacity-70 border-destructive/40 bg-destructive/5"
                )}
              >
                <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn("font-semibold text-base", h.voided && "line-through text-muted-foreground")}>
                        {w ? `${w.lastName}, ${w.firstName}` : "Trabajador eliminado"}
                      </h3>
                      {w && <Badge variant="outline">DNI {w.dni}</Badge>}
                      <Badge variant="secondary">{h.items.length} EPP{h.items.length === 1 ? "" : "s"}</Badge>
                      {h.voided && (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" /> Anulado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entrega: {format(parseISO(h.deliveryDate), "dd/MM/yyyy")}
                      {" · Registrado: "}
                      {format(parseISO(h.createdAt), "dd/MM/yyyy HH:mm")}
                      {h.responsibleName && ` · Responsable: ${h.responsibleName}`}
                    </p>

                    <div className="border rounded-md overflow-hidden mt-2">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-[11px] h-8">EPP</TableHead>
                            <TableHead className="text-[11px] h-8">Tipo</TableHead>
                            <TableHead className="text-[11px] h-8">Cant.</TableHead>
                            <TableHead className="text-[11px] h-8">Motivo</TableHead>
                            <TableHead className="text-[11px] h-8">Vigencia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {h.items.map((it) => {
                            const epp = eppMap.get(it.eppId);
                            const v = epp ? getValidity(it, epp) : null;
                            return (
                              <TableRow key={it.id}>
                                <TableCell className="py-1.5 text-xs">{epp?.name ?? "EPP eliminado"}</TableCell>
                                <TableCell className="py-1.5 text-xs">{deliveryTypeLabel[it.deliveryType]}</TableCell>
                                <TableCell className="py-1.5 text-xs">{it.quantity}</TableCell>
                                <TableCell className="py-1.5 text-xs">{reasonLabel[it.reason]}</TableCell>
                                <TableCell className="py-1.5 text-xs">
                                  {v ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className={`status-dot ${validityColor[v.status]}`} />
                                      {validityLabel[v.status]}
                                      {v.status !== "vencido" && ` · ${v.daysRemaining}d`}
                                    </span>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {h.observations && <p className="text-xs text-muted-foreground italic">{h.observations}</p>}
                    {h.voided && h.voidReason && (
                      <p className="text-xs text-destructive font-medium">
                        Motivo de anulación: {h.voidReason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex flex-col-reverse gap-3 md:flex-col-reverse lg:flex-row">
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-24 w-44 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
                          {h.workerSignature ? (
                            <img src={h.workerSignature} alt="Firma del trabajador" className="h-full w-full object-contain p-2" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Sin firma</span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Trabajador</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-24 w-44 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
                          {h.responsibleSignature ? (
                            <img src={h.responsibleSignature} alt="Firma del responsable" className="h-full w-full object-contain p-2" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Sin firma</span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Responsable</span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                {/* Barra de acciones vertical */}
                {(canDeleteKardex || canVoidKardex || canEditKardex) && (
                  <div className="absolute top-0 right-0 h-full w-12 bg-[hsl(195_45%_22%)] flex flex-col items-stretch text-white" onClick={(ev) => ev.stopPropagation()}>
                    {canDeleteKardex && (
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); setDeleteId(h.id); }}
                        title="Eliminar registro"
                        className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors border-b border-white/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {canVoidKardex && (
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); setVoidTarget(h); setVoidReason(h.voidReason ?? ""); }}
                        title={h.voided ? "Reactivar registro" : "Anular registro"}
                        className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors border-b border-white/10"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                    {canEditKardex && (
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); startEdit(h); }}
                        disabled={h.voided}
                        title={h.voided ? "Reactiva el registro para editarlo" : "Editar registro"}
                        className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        {filtered.length > visibleCount && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {visibleHeaders.length} de {filtered.length} registros
            </p>
            <Button variant="outline" onClick={() => setVisibleCount((n) => n + 30)}>
              Cargar más
            </Button>
          </div>
        )}
      </section>

      {/* Vista previa de solo lectura */}
      <CardPreviewDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        title={(() => {
          if (!preview) return "Registro Kardex";
          const w = workerMap.get(preview.workerId);
          return w ? `${w.lastName}, ${w.firstName}` : "Trabajador eliminado";
        })()}
        description="Vista previa de solo lectura"
        icon={ClipboardList}
        maxWidthClass="max-w-4xl"
      >
        {preview && (() => {
          const w = workerMap.get(preview.workerId);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {w && <Badge variant="outline">DNI {w.dni}</Badge>}
                {w?.area && <Badge variant="secondary">{w.area}</Badge>}
                <Badge variant="secondary">{preview.items.length} EPP{preview.items.length === 1 ? "" : "s"}</Badge>
                {preview.voided && (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="h-3 w-3" /> Anulado
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Fecha entrega</p>
                  <p className="font-medium">{format(parseISO(preview.deliveryDate), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Registrado</p>
                  <p className="font-medium">{format(parseISO(preview.createdAt), "dd/MM/yyyy HH:mm")}</p>
                </div>
                {preview.responsibleName && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Responsable</p>
                    <p className="font-medium">{preview.responsibleName}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-[11px] h-8">EPP</TableHead>
                      <TableHead className="text-[11px] h-8">Tipo</TableHead>
                      <TableHead className="text-[11px] h-8">Cant.</TableHead>
                      <TableHead className="text-[11px] h-8">Motivo</TableHead>
                      <TableHead className="text-[11px] h-8">Vigencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.items.map((it) => {
                      const epp = eppMap.get(it.eppId);
                      const v = epp ? getValidity(it, epp) : null;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="py-1.5 text-xs">{epp?.name ?? "EPP eliminado"}</TableCell>
                          <TableCell className="py-1.5 text-xs">{deliveryTypeLabel[it.deliveryType]}</TableCell>
                          <TableCell className="py-1.5 text-xs">{it.quantity}</TableCell>
                          <TableCell className="py-1.5 text-xs">{reasonLabel[it.reason]}</TableCell>
                          <TableCell className="py-1.5 text-xs">
                            {v ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`status-dot ${validityColor[v.status]}`} />
                                {validityLabel[v.status]}
                                {v.status !== "vencido" && ` · ${v.daysRemaining}d`}
                              </span>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {preview.observations && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Observaciones</p>
                  <p className="text-sm italic text-muted-foreground">{preview.observations}</p>
                </div>
              )}

              {preview.voided && preview.voidReason && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <span className="font-medium">Motivo de anulación:</span> {preview.voidReason}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-24 w-full max-w-[200px] rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
                    {preview.workerSignature ? (
                      <img src={preview.workerSignature} alt="Firma del trabajador" className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin firma</span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Trabajador</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-24 w-full max-w-[200px] rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
                    {preview.responsibleSignature ? (
                      <img src={preview.responsibleSignature} alt="Firma del responsable" className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin firma</span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Responsable</span>
                </div>
              </div>
            </div>
          );
        })()}
      </CardPreviewDialog>

      {/* Diálogo de anulación / reactivación */}
      <Dialog
        open={!!voidTarget}
        onOpenChange={(o) => { if (!o) { setVoidTarget(null); setVoidReason(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-secondary" />
              {voidTarget?.voided ? "Reactivar registro" : "Anular registro"}
            </DialogTitle>
            <DialogDescription>
              {voidTarget?.voided
                ? "El registro y todos sus EPPs volverán a estar vigentes y se incluirán en el acta PDF."
                : "El registro y todos sus EPPs se conservarán en el historial pero quedarán marcados como anulados y no se incluirán en el acta PDF."}
            </DialogDescription>
          </DialogHeader>
          {!voidTarget?.voided && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Motivo de anulación</Label>
              <Textarea
                rows={3}
                placeholder="Ej.: error en la fecha de entrega, EPP duplicado, etc."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoidTarget(null); setVoidReason(""); }}>
              Cancelar
            </Button>
            <Button onClick={confirmVoid}>
              {voidTarget?.voided ? "Reactivar" : "Anular registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro de Kardex?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la cabecera y todos los EPPs asociados al registro.
              Si solo deseas invalidarlo conservando el historial, usa la opción <strong>Anular</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
