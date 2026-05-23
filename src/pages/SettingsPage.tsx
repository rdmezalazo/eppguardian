import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Pencil, Trash2, Search, ChevronsUpDown, Check, MapPin, FileText, Save, RotateCcw, Eye, Loader2, Signature, Upload, Eraser, UserCog } from "lucide-react";
import AuthorizedPersonnelSettings from "@/components/AuthorizedPersonnelSettings";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAreaSettings, loadAreaSettings } from "@/hooks/useAreaSettings";
import { getLucideIcon, type AreaSetting } from "@/lib/area-icons";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { getCompany, saveCompany, defaultCompany, getKardexDefaults, saveKardexDefaults, getSignatureSettings, saveSignatureSettings, type KardexDefaults, type SignatureSettings } from "@/lib/storage";
import type { CompanyInfo, KardexEntry, Worker, EppItem } from "@/types/kardex";
import { generateKardexPDF } from "@/lib/pdf";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";


/* ---------- Catálogo de iconos sugeridos ---------- */
const ICON_OPTIONS = [
  "HardHat", "Package", "Wrench", "Factory", "FlaskConical", "Truck", "Sparkles",
  "UserCheck", "ClipboardCheck", "Building2", "Stethoscope", "Cpu", "ShieldCheck",
  "Hammer", "Cog", "Forklift", "Beaker", "TestTube", "Microscope", "Briefcase",
  "Users", "User", "GraduationCap", "Palette", "Box", "Boxes", "Warehouse",
  "Shield", "AlertTriangle", "Construction", "Zap", "Flame", "Droplet",
];

/* ---------- Paleta de colores tailwind para áreas ---------- */
interface ColorPreset {
  name: string;
  badge: string;
  soft: string;
  swatch: string; // for the visual chip in picker
}
const COLOR_PRESETS: ColorPreset[] = [
  { name: "Ámbar", badge: "bg-amber-500 text-white hover:bg-amber-500/90", soft: "bg-amber-500/10 text-amber-700 dark:text-amber-400", swatch: "bg-amber-500" },
  { name: "Naranja", badge: "bg-orange-600 text-white hover:bg-orange-600/90", soft: "bg-orange-600/10 text-orange-700 dark:text-orange-400", swatch: "bg-orange-600" },
  { name: "Rojo", badge: "bg-red-600 text-white hover:bg-red-600/90", soft: "bg-red-600/10 text-red-700 dark:text-red-400", swatch: "bg-red-600" },
  { name: "Rosa", badge: "bg-pink-600 text-white hover:bg-pink-600/90", soft: "bg-pink-600/10 text-pink-700 dark:text-pink-400", swatch: "bg-pink-600" },
  { name: "Fucsia", badge: "bg-fuchsia-600 text-white hover:bg-fuchsia-600/90", soft: "bg-fuchsia-600/10 text-fuchsia-700 dark:text-fuchsia-400", swatch: "bg-fuchsia-600" },
  { name: "Púrpura", badge: "bg-purple-600 text-white hover:bg-purple-600/90", soft: "bg-purple-600/10 text-purple-700 dark:text-purple-400", swatch: "bg-purple-600" },
  { name: "Violeta", badge: "bg-violet-600 text-white hover:bg-violet-600/90", soft: "bg-violet-600/10 text-violet-700 dark:text-violet-400", swatch: "bg-violet-600" },
  { name: "Índigo", badge: "bg-indigo-600 text-white hover:bg-indigo-600/90", soft: "bg-indigo-600/10 text-indigo-700 dark:text-indigo-400", swatch: "bg-indigo-600" },
  { name: "Azul", badge: "bg-blue-600 text-white hover:bg-blue-600/90", soft: "bg-blue-600/10 text-blue-700 dark:text-blue-400", swatch: "bg-blue-600" },
  { name: "Cielo", badge: "bg-sky-600 text-white hover:bg-sky-600/90", soft: "bg-sky-600/10 text-sky-700 dark:text-sky-400", swatch: "bg-sky-600" },
  { name: "Cian", badge: "bg-cyan-600 text-white hover:bg-cyan-600/90", soft: "bg-cyan-600/10 text-cyan-700 dark:text-cyan-400", swatch: "bg-cyan-600" },
  { name: "Verde agua", badge: "bg-teal-600 text-white hover:bg-teal-600/90", soft: "bg-teal-600/10 text-teal-700 dark:text-teal-400", swatch: "bg-teal-600" },
  { name: "Esmeralda", badge: "bg-emerald-600 text-white hover:bg-emerald-600/90", soft: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400", swatch: "bg-emerald-600" },
  { name: "Verde", badge: "bg-green-600 text-white hover:bg-green-600/90", soft: "bg-green-600/10 text-green-700 dark:text-green-400", swatch: "bg-green-600" },
  { name: "Lima", badge: "bg-lime-600 text-white hover:bg-lime-600/90", soft: "bg-lime-600/10 text-lime-700 dark:text-lime-400", swatch: "bg-lime-600" },
  { name: "Amarillo", badge: "bg-yellow-500 text-white hover:bg-yellow-500/90", soft: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", swatch: "bg-yellow-500" },
  { name: "Rosado", badge: "bg-rose-600 text-white hover:bg-rose-600/90", soft: "bg-rose-600/10 text-rose-700 dark:text-rose-400", swatch: "bg-rose-600" },
  { name: "Pizarra", badge: "bg-slate-600 text-white hover:bg-slate-600/90", soft: "bg-slate-600/10 text-slate-700 dark:text-slate-400", swatch: "bg-slate-600" },
  { name: "Gris", badge: "bg-zinc-600 text-white hover:bg-zinc-600/90", soft: "bg-zinc-600/10 text-zinc-700 dark:text-zinc-400", swatch: "bg-zinc-600" },
  { name: "Piedra", badge: "bg-stone-600 text-white hover:bg-stone-600/90", soft: "bg-stone-600/10 text-stone-700 dark:text-stone-400", swatch: "bg-stone-600" },
];

const findColorIndex = (badge: string) =>
  Math.max(0, COLOR_PRESETS.findIndex((c) => c.badge === badge));

/* =================================================================
   Form dialog (create / edit)
   ================================================================= */
interface FormState {
  name: string;
  icon: string;
  colorIndex: number;
  sort_order: number;
}
const emptyForm: FormState = { name: "", icon: "HardHat", colorIndex: 8, sort_order: 0 };

function AreaFormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AreaSetting | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form when editing changes
  useMemo(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          icon: editing.icon,
          colorIndex: findColorIndex(editing.badge_class),
          sort_order: editing.sort_order,
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, editing]);

  const color = COLOR_PRESETS[form.colorIndex] ?? COLOR_PRESETS[8];
  const Icon = getLucideIcon(form.icon);

  const filteredIcons = ICON_OPTIONS.filter((i) =>
    i.toLowerCase().includes(iconQuery.toLowerCase())
  );

  const submit = async () => {
    const name = form.name.trim();
    if (!name) { toast.error("El nombre del área es obligatorio"); return; }
    setSaving(true);
    const payload = {
      name,
      icon: form.icon,
      badge_class: color.badge,
      soft_class: color.soft,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("area_settings").update(payload).eq("id", editing.id)
      : await supabase.from("area_settings").insert(payload);
    setSaving(false);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(editing ? "Área actualizada" : "Área creada");
    await loadAreaSettings();
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {editing ? "Editar área" : "Nueva área"}
          </DialogTitle>
          <DialogDescription>
            Define el nombre, icono semántico y color que representará al área en todo el sistema.
          </DialogDescription>
        </DialogHeader>

        {/* Live preview */}
        <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-4">
          <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center shadow-sm", color.soft)}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa</p>
            <Badge className={cn("gap-1.5 font-medium border-transparent", color.badge)}>
              <Icon className="h-3 w-3" />
              {form.name || "Nombre del área"}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name + sort */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre del área *</Label>
              <Input
                placeholder="Ej. Mantenimiento"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Orden</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Icono semántico</Label>
            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {form.icon}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar icono…"
                    value={iconQuery}
                    onValueChange={setIconQuery}
                  />
                  <CommandList className="max-h-72">
                    <CommandEmpty>Sin resultados</CommandEmpty>
                    <CommandGroup>
                      <div className="grid grid-cols-6 gap-1 p-2">
                        {filteredIcons.map((iconName) => {
                          const I = getLucideIcon(iconName);
                          const active = iconName === form.icon;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              title={iconName}
                              onClick={() => {
                                setForm({ ...form, icon: iconName });
                                setIconPickerOpen(false);
                              }}
                              className={cn(
                                "h-10 w-full rounded-md flex items-center justify-center transition-colors border",
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-transparent hover:bg-accent text-foreground/80"
                              )}
                            >
                              <I className="h-5 w-5" />
                            </button>
                          );
                        })}
                      </div>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Color palette */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <div className="grid grid-cols-10 gap-1.5">
              {COLOR_PRESETS.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => setForm({ ...form, colorIndex: i })}
                  className={cn(
                    "relative h-8 w-full rounded-md transition-all",
                    c.swatch,
                    form.colorIndex === i ? "ring-2 ring-offset-2 ring-foreground scale-105" : "hover:scale-105"
                  )}
                >
                  {form.colorIndex === i && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{color.name}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear área"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =================================================================
   Areas tab
   ================================================================= */
function AreasSettings() {
  const { areas, loading, refresh } = useAreaSettings();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AreaSetting | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AreaSetting | null>(null);

  const filtered = areas.filter((a) =>
    a.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const remove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("area_settings").delete().eq("id", confirmDelete.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Área eliminada");
    setConfirmDelete(null);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center card-elevated">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar área…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Nueva área
        </Button>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Cargando áreas…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          No se encontraron áreas
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const I = getLucideIcon(a.icon);
            return (
              <Card key={a.id} className="p-4 card-elevated group hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", a.soft_class)}>
                    <I className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="font-semibold truncate">{a.name}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {a.icon} · orden {a.sort_order}
                      </p>
                    </div>
                    <Badge className={cn("gap-1 font-medium border-transparent", a.badge_class)}>
                      <I className="h-3 w-3" />
                      {a.name}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDelete(a)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AreaFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={refresh}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta área?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{confirmDelete?.name}</strong> del catálogo. Los registros existentes que la referencian no se modificarán, pero perderán su icono y color personalizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* =================================================================
   PDF Report tab
   ================================================================= */
function PdfReportSettings() {
  const [form, setForm] = useState<CompanyInfo>(defaultCompany);

  useEffect(() => {
    getCompany().then(setForm).catch(() => {});
  }, []);
  const [confirmReset, setConfirmReset] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const update = <K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateHeader = (key: keyof CompanyInfo["headers"], value: string) =>
    setForm((f) => ({ ...f, headers: { ...f.headers, [key]: value } }));

  // Build sample data for preview
  const buildPreviewData = () => {
    const sampleWorker: Worker = {
      id: "preview",
      firstName: "Juan Carlos",
      lastName: "Pérez Quispe",
      dni: "70123456",
      area: "Producción",
      position: "Operario de Planta",
      createdAt: new Date().toISOString(),
    };
    const sampleEpps: EppItem[] = [
      { id: "e1", name: "Casco de seguridad", type: "Cabeza", usefulLifeDays: 365, requiresSignature: true, status: "active", createdAt: "" },
      { id: "e2", name: "Guantes de cuero reforzado", type: "Manos", usefulLifeDays: 90, requiresSignature: true, status: "active", createdAt: "" },
      { id: "e3", name: "Lentes de seguridad anti-impacto", type: "Vista", usefulLifeDays: 180, requiresSignature: true, status: "active", createdAt: "" },
      { id: "e4", name: "Botas punta de acero", type: "Pies", usefulLifeDays: 365, requiresSignature: true, status: "active", createdAt: "" },
    ];
    const today = new Date().toISOString().slice(0, 10);
    const sampleEntries: KardexEntry[] = [
      { id: "k1", workerId: "preview", eppId: "e1", eventType: "delivery", deliveryType: "A", quantity: 1, deliveryDate: today, reason: "entrega_inicial", createdAt: "" },
      { id: "k2", workerId: "preview", eppId: "e2", eventType: "delivery", deliveryType: "C", quantity: 2, deliveryDate: today, reason: "deterioro", createdAt: "" },
      { id: "k3", workerId: "preview", eppId: "e3", eventType: "delivery", deliveryType: "A", quantity: 1, deliveryDate: today, reason: "entrega_inicial", createdAt: "" },
      { id: "k4", workerId: "preview", eppId: "e4", eventType: "delivery", deliveryType: "P", quantity: 1, deliveryDate: today, reason: "perdida", createdAt: "" },
    ];
    return { worker: sampleWorker, epps: sampleEpps, entries: sampleEntries };
  };

  const generatePreview = async () => {
    setPreviewLoading(true);
    try {
      // Revoke previous URL to free memory
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const { worker, epps, entries } = buildPreviewData();
      const url = await generateKardexPDF({ company: form, worker, entries, epps, preview: true });
      if (typeof url === "string") setPreviewUrl(url);
    } catch (e: any) {
      toast.error("Error al generar la vista previa: " + (e?.message ?? e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    await generatePreview();
  };

  // Regenerate preview live when form changes (only while dialog is open)
  useEffect(() => {
    if (!previewOpen) return;
    const t = setTimeout(() => {
      generatePreview();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, previewOpen]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!form.titulo.trim() || !form.razonSocial.trim()) {
      toast.error("Título y Razón Social son obligatorios");
      return;
    }
    try {
      await saveCompany(form);
      toast.success("Configuración del PDF guardada");
    } catch (e: any) {
      toast.error("Error al guardar: " + (e?.message ?? e));
    }
  };

  const resetAll = async () => {
    setForm(defaultCompany);
    try { await saveCompany(defaultCompany); } catch (e: any) {
      toast.error("Error al restablecer: " + (e?.message ?? e)); return;
    }
    setConfirmReset(false);
    toast.success("Configuración restablecida a los valores por defecto");
  };

  const headerFields: Array<{ key: keyof CompanyInfo["headers"]; label: string }> = [
    { key: "nro", label: "Nro" },
    { key: "nombre", label: "Nombre del equipo" },
    { key: "cantidad", label: "Cantidad" },
    { key: "fechaEntrega", label: "Fecha de Entrega" },
    { key: "tipoEntrega", label: "Tipo de Entrega" },
    { key: "motivoEntrega", label: "Motivo de Entrega" },
    { key: "fechaDevolucion", label: "Fecha de Devolución" },
    { key: "firmaUsuario", label: "Firma de Usuario" },
    { key: "firmaResponsable", label: "Firma del Responsable del Registro" },
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado del documento */}
      <Card className="p-5 card-elevated space-y-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Encabezado del documento
          </h3>
          <p className="text-xs text-muted-foreground">Aparece en la parte superior del PDF junto al logo.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Título</Label>
          <Input value={form.titulo} onChange={(e) => update("titulo", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Código</Label>
            <Input value={form.codigo} onChange={(e) => update("codigo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Versión</Label>
            <Input value={form.version} onChange={(e) => update("version", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fecha</Label>
            <Input value={form.fecha} onChange={(e) => update("fecha", e.target.value)} placeholder="dd/mm/aaaa" />
          </div>
        </div>
      </Card>

      {/* Datos de la empresa */}
      <Card className="p-5 card-elevated space-y-4">
        <div>
          <h3 className="text-base font-semibold">Datos de la empresa</h3>
          <p className="text-xs text-muted-foreground">Se mostrarán en el bloque de identificación del PDF.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Razón Social</Label>
            <Input value={form.razonSocial} onChange={(e) => update("razonSocial", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">RUC</Label>
            <Input value={form.ruc} onChange={(e) => update("ruc", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-medium">Dirección</Label>
            <Textarea rows={2} value={form.direccion} onChange={(e) => update("direccion", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-medium">Actividad Económica</Label>
            <Input value={form.actividadEconomica} onChange={(e) => update("actividadEconomica", e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Texto descriptivo */}
      <Card className="p-5 card-elevated space-y-3">
        <div>
          <h3 className="text-base font-semibold">Texto descriptivo / Declaración legal</h3>
          <p className="text-xs text-muted-foreground">
            Puedes usar la variable <code className="rounded bg-muted px-1">{"{razonSocial}"}</code> para insertar el nombre de la empresa automáticamente.
          </p>
        </div>
        <Textarea
          rows={8}
          value={form.textoDescriptivo}
          onChange={(e) => update("textoDescriptivo", e.target.value)}
        />
      </Card>

      {/* Encabezados de la tabla */}
      <Card className="p-5 card-elevated space-y-4">
        <div>
          <h3 className="text-base font-semibold">Encabezados de la tabla</h3>
          <p className="text-xs text-muted-foreground">Personaliza los títulos de cada columna del registro.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {headerFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-medium">{f.label}</Label>
              <Input value={form.headers[f.key]} onChange={(e) => updateHeader(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Pie */}
      <Card className="p-5 card-elevated space-y-3">
        <div>
          <h3 className="text-base font-semibold">Pie de página</h3>
          <p className="text-xs text-muted-foreground">Aparece debajo de la tabla de registros, en cursiva.</p>
        </div>
        <Textarea
          rows={2}
          value={form.pieTexto}
          onChange={(e) => update("pieTexto", e.target.value)}
        />
      </Card>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sticky bottom-4 z-10">
        <Button variant="outline" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="h-4 w-4 mr-2" /> Restablecer valores por defecto
        </Button>
        <Button variant="secondary" onClick={openPreview}>
          <Eye className="h-4 w-4 mr-2" /> Vista previa PDF
        </Button>
        <Button onClick={save} className="bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4 mr-2" /> Guardar configuración
        </Button>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer la configuración del PDF?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos los campos volverán a sus valores originales. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetAll} className="bg-destructive hover:bg-destructive/90">
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Vista previa del Reporte PDF
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
            </DialogTitle>
            <DialogDescription>
              Los cambios en el formulario se reflejan en tiempo real. Datos de ejemplo: trabajador y EPPs ficticios.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-muted/30 overflow-hidden relative">
            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Vista previa PDF"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Generando vista previa…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =================================================================
   Kardex defaults tab (responsable predeterminado)
   ================================================================= */
interface ProfileLite {
  id: string;
  full_name: string;
  cargo: string | null;
  area: string;
}

function KardexSettings() {
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [defaults, setDefaults] = useState<KardexDefaults>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<string | undefined>(undefined);
  const [sigKey, setSigKey] = useState(0); // force remount of SignaturePad
  const sigRef = useRef<SignaturePadHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: profs }, d] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,cargo,area")
          .eq("active", true)
          .order("full_name", { ascending: true }),
        getKardexDefaults(),
      ]);
      setProfiles((profs ?? []) as ProfileLite[]);
      setDefaults(d);
      setSignature(d.responsibleSignature);
    })();
  }, []);

  const selected = profiles.find((p) => p.id === defaults.responsibleWorkerId);
  const filtered = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const onPickWorker = (p: ProfileLite) => {
    setDefaults((d) => ({
      ...d,
      responsibleWorkerId: p.id,
      responsibleName: p.full_name,
    }));
    setPickerOpen(false);
  };

  const onUploadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setSignature(dataUrl);
      setSigKey((k) => k + 1);
    };
    reader.readAsDataURL(file);
  };

  const clearSignature = () => {
    sigRef.current?.clear();
    setSignature(undefined);
    setSigKey((k) => k + 1);
  };

  const save = async () => {
    if (!defaults.responsibleWorkerId || !defaults.responsibleName) {
      toast.error("Selecciona un trabajador como responsable");
      return;
    }
    // Prefer drawn signature if present, else uploaded/loaded one
    const drawn = sigRef.current?.getDataUrl();
    const finalSig = drawn ?? signature;
    if (!finalSig) {
      toast.error("Establece la firma del responsable (dibuja o sube una imagen)");
      return;
    }
    setSaving(true);
    try {
      const payload: KardexDefaults = {
        responsibleWorkerId: defaults.responsibleWorkerId,
        responsibleName: defaults.responsibleName,
        responsibleSignature: finalSig,
      };
      await saveKardexDefaults(payload);
      setDefaults(payload);
      setSignature(finalSig);
      toast.success("Configuración del Kardex guardada");
    } catch (e: any) {
      toast.error("Error al guardar: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    setSaving(true);
    try {
      await saveKardexDefaults({});
      setDefaults({});
      setSignature(undefined);
      setSigKey((k) => k + 1);
      toast.success("Configuración predeterminada eliminada");
    } catch (e: any) {
      toast.error("Error: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 card-elevated space-y-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Signature className="h-4 w-4 text-primary" /> Responsable predeterminado
          </h3>
          <p className="text-xs text-muted-foreground">
            Este trabajador y su firma se aplicarán automáticamente como Responsable en el formulario de Registro de Kardex y en el Reporte PDF cuando no se especifique uno distinto.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Trabajador responsable</Label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/40 transition-colors"
              >
                <span className="truncate text-left">
                  {selected
                    ? `${selected.full_name}${selected.cargo ? ` · ${selected.cargo}` : ""}`
                    : "Selecciona un trabajador…"}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar trabajador…"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-72">
                  <CommandEmpty>Sin resultados</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.id}
                        onSelect={() => onPickWorker(p)}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{p.full_name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {p.cargo || "—"} {p.area && `· ${p.area}`}
                          </span>
                        </div>
                        {defaults.responsibleWorkerId === p.id && (
                          <Check className="h-4 w-4 opacity-70" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium">Firma predeterminada</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Subir imagen
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
              >
                <Eraser className="h-3.5 w-3.5 mr-1.5" /> Limpiar
              </Button>
            </div>
          </div>
          <SignaturePad
            key={sigKey}
            ref={sigRef}
            label=""
            initialDataUrl={signature ?? null}
          />
          <p className="text-[11px] text-muted-foreground">
            Puedes trazar la firma con el dedo o lápiz táctil, o subir una imagen (PNG/JPG con fondo claro).
          </p>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sticky bottom-4 z-10">
        <Button variant="outline" onClick={clearAll} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" /> Quitar predeterminado
        </Button>
        <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}

/* =================================================================
   Signature settings tab
   ================================================================= */
function SignatureSettingsTab() {
  const [threshold, setThreshold] = useState<number>(85);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getSignatureSettings();
        setThreshold(Math.round((cfg.matchThreshold ?? 0.85) * 100));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const pct = Math.max(50, Math.min(100, Math.round(threshold)));
    setSaving(true);
    try {
      await saveSignatureSettings({ matchThreshold: pct / 100 });
      toast.success("Configuración de firma guardada");
    } catch (e: any) {
      toast.error("Error: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 card-elevated space-y-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Signature className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Coincidencia de firma</h3>
            <p className="text-sm text-muted-foreground">
              Define el porcentaje mínimo de similitud requerido entre la firma del Kardex y la firma validada del trabajador.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Porcentaje mínimo de coincidencia (%)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={50}
              max={100}
              step={1}
              value={loading ? "" : threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-32"
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">
              Recomendado: 85%. Rango permitido: 50% – 100%.
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Un valor más alto exige firmas más parecidas a la firma patrón; un valor más bajo es más permisivo.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}


export default function SettingsPage() {
  const { profile } = useAuth();
  const isTi = profile?.role === "ti";
  return (
    <div>
      <PageHeader title="Ajustes" description="Configuración general del sistema" />
      <section className="p-6 md:p-10">
        <Tabs defaultValue="areas" className="w-full">
          <TabsList>
            <TabsTrigger value="areas" className="gap-2">
              <MapPin className="h-4 w-4" /> Áreas
            </TabsTrigger>
            {isTi && (
              <TabsTrigger value="personnel" className="gap-2">
                <UserCog className="h-4 w-4" /> Personal Autorizado
              </TabsTrigger>
            )}
            <TabsTrigger value="kardex" className="gap-2">
              <Signature className="h-4 w-4" /> Kardex
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2">
              <Signature className="h-4 w-4" /> Firma
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="h-4 w-4" /> Reporte PDF
            </TabsTrigger>
          </TabsList>
          <TabsContent value="areas" className="mt-6">
            <AreasSettings />
          </TabsContent>
          {isTi && (
            <TabsContent value="personnel" className="mt-6">
              <AuthorizedPersonnelSettings />
            </TabsContent>
          )}
          <TabsContent value="kardex" className="mt-6">
            <KardexSettings />
          </TabsContent>
          <TabsContent value="signature" className="mt-6">
            <SignatureSettingsTab />
          </TabsContent>
          <TabsContent value="pdf" className="mt-6">
            <PdfReportSettings />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
