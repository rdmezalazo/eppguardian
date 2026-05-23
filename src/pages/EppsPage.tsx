import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Search, ShieldCheck, HardHat, ChevronsUpDown, Check, X, LayoutGrid, List, Upload, FileSpreadsheet, Download } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import eppDefault from "@/assets/epp-default.jpg";
import EppImageInput from "@/components/EppImageInput";
import CardPreviewDialog from "@/components/CardPreviewDialog";
import { getAreaStyle } from "@/lib/area-icons";
import { cn } from "@/lib/utils";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import * as XLSX from "xlsx";
import { generateEppMatrixPDF } from "@/lib/epp-matrix-pdf";
import DateFilter, { type DateFilterValue, isDateInFilter } from "@/components/DateFilter";

interface Epp {
  id: string;
  area: string;
  nombre: string;
  actividad: string | null;
  descripcion: string | null;
  riesgo_previsto: string | null;
  norma: string | null;
  codigo_nextsis: string | null;
  imagen_url: string | null;
  vida_util_dias: number;
  requiere_firma: boolean;
  estado: string;
  created_at?: string;
}

const emptyForm = {
  area: "",
  nombre: "",
  actividad: "",
  descripcion: "",
  riesgo_previsto: "",
  norma: "",
  codigo_nextsis: "",
  imagen_url: "",
  vida_util_dias: 90,
  requiere_firma: true,
  estado: "active",
};

// Las áreas se guardan en la columna `area` (text) como lista separada por comas: "Area1, Area2"
const parseAreas = (s: string | null | undefined): string[] =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const serializeAreas = (arr: string[]): string =>
  Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean))).join(", ");

export default function EppsPage() {
  const { can, loading: permissionsLoading } = useModulePermissions();
  const [epps, setEpps] = useState<Epp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Epp | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: "all" });
  const [confirmDelete, setConfirmDelete] = useState<Epp | null>(null);
  const [preview, setPreview] = useState<Epp | null>(null);
  const [view, setView] = useState<"card" | "table">(() => {
    if (typeof window === "undefined") return "card";
    return (localStorage.getItem("epps:view") as "card" | "table") || "card";
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("epps:view", view);
  }, [view]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("epps")
      .select("*")
      .order("area", { ascending: true })
      .order("nombre", { ascending: true });
    if (error) toast.error("Error al cargar EPPs: " + error.message);
    else setEpps((data ?? []) as Epp[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const areas = useMemo(
    () =>
      Array.from(new Set(epps.flatMap((e) => parseAreas(e.area)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [epps]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return epps.filter((e) => {
      const eppAreas = parseAreas(e.area);
      if (areaFilter !== "all" && !eppAreas.includes(areaFilter)) return false;
      if (!isDateInFilter(e.created_at, dateFilter)) return false;
      if (!q) return true;
      return [e.nombre, e.area, e.actividad, e.descripcion, e.riesgo_previsto, e.norma]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q));
    });
  }, [epps, search, areaFilter, dateFilter]);

  const canCreateEpps = !permissionsLoading && can("epps", "create");
  const canEditEpps = !permissionsLoading && can("epps", "edit");
  const canDeleteEpps = !permissionsLoading && can("epps", "delete");
  const canImportEpps = !permissionsLoading && can("epps", "import");

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  type ImportItem = {
    nombre: string;
    actividad: string | null;
    descripcion: string | null;
    riesgo_previsto: string | null;
    norma: string | null;
    vida_util_dias: number;
    areas: string[];
    isDuplicate: boolean;
    existingId?: string;
    decision: "create" | "replace" | "duplicate";
  };
  const [importPreview, setImportPreview] = useState<ImportItem[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const downloadImportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nombre", "Actividad", "Descripción", "Riesgo Previsto", "Norma", "Vida útil", "Área"],
      ["Casco de seguridad", "Trabajos en altura", "Casco con barbiquejo", "Caídas / impactos", "ANSI Z89.1", 365, "Operaciones"],
      ["Casco de seguridad", "Trabajos en altura", "Casco con barbiquejo", "Caídas / impactos", "ANSI Z89.1", 365, "Mantenimiento"],
      ["Guantes de nitrilo", "Manipulación química", "Guantes resistentes a químicos", "Contacto químico", "EN 374", 90, "Laboratorio"],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 32 }, { wch: 24 }, { wch: 18 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EPPs");
    XLSX.writeFile(wb, "plantilla-epps.xlsx");
  };

  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

  const handleImportFile = async (file: File) => {
    setImportFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      // Group by nombre+actividad+norma normalized
      const grouped = new Map<string, {
        nombre: string; actividad: string | null; descripcion: string | null;
        riesgo_previsto: string | null; norma: string | null; vida_util_dias: number; areas: Set<string>;
      }>();
      for (const r of rows) {
        const nombre = String(r["Nombre"] ?? r["nombre"] ?? "").trim();
        const area = String(r["Área"] ?? r["Area"] ?? r["area"] ?? "").trim();
        if (!nombre || !area) continue;
        const actividad = String(r["Actividad"] ?? r["actividad"] ?? "").trim() || null;
        const descripcion = String(r["Descripción"] ?? r["Descripcion"] ?? r["descripcion"] ?? "").trim() || null;
        const riesgo = String(r["Riesgo Previsto"] ?? r["Riesgo previsto"] ?? r["riesgo_previsto"] ?? "").trim() || null;
        const norma = String(r["Norma"] ?? r["norma"] ?? "").trim() || null;
        const vidaRaw = r["Vida útil"] ?? r["Vida util"] ?? r["vida_util"] ?? r["vida_util_dias"] ?? 90;
        const vida = parseInt(String(vidaRaw), 10);
        const key = `${norm(nombre)}|${norm(actividad ?? "")}|${norm(norma ?? "")}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.areas.add(area);
        } else {
          grouped.set(key, {
            nombre, actividad, descripcion, riesgo_previsto: riesgo, norma,
            vida_util_dias: isNaN(vida) ? 90 : vida,
            areas: new Set([area]),
          });
        }
      }
      // Match against existing epps by name only
      const preview: ImportItem[] = Array.from(grouped.values()).map((g) => {
        const match = epps.find((e) => norm(e.nombre) === norm(g.nombre));
        return {
          nombre: g.nombre,
          actividad: g.actividad,
          descripcion: g.descripcion,
          riesgo_previsto: g.riesgo_previsto,
          norma: g.norma,
          vida_util_dias: g.vida_util_dias,
          areas: Array.from(g.areas),
          isDuplicate: !!match,
          existingId: match?.id,
          decision: match ? "replace" : "create",
        };
      });
      setImportPreview(preview);
      if (preview.length === 0) toast.error("No se encontraron filas válidas (Nombre y Área obligatorios)");
    } catch (e: any) {
      toast.error("Error al leer el archivo: " + e.message);
    }
  };

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // Validate duplicates (by name) in existing catalog
  const [validateOpen, setValidateOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, Epp[]>();
    for (const e of epps) {
      const k = norm(e.nombre);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(e);
    }
    return Array.from(groups.values()).filter((g) => g.length > 1);
  }, [epps]);

  const handleValidateClick = () => {
    if (duplicateGroups.length === 0) {
      toast.success("No se encontraron EPPs duplicados");
      return;
    }
    setValidateOpen(true);
  };

  const removeDuplicates = async () => {
    setValidating(true);
    try {
      // Keep the first of each group (oldest insertion order), delete the rest
      const idsToDelete: string[] = [];
      for (const group of duplicateGroups) {
        const [, ...rest] = group;
        idsToDelete.push(...rest.map((e) => e.id));
      }
      if (idsToDelete.length === 0) return;
      const { error } = await supabase.from("epps").delete().in("id", idsToDelete);
      if (error) throw error;
      toast.success(`Se eliminaron ${idsToDelete.length} EPP(s) duplicado(s)`);
      setValidateOpen(false);
      load();
    } catch (e: any) {
      toast.error("Error al eliminar duplicados: " + e.message);
    } finally {
      setValidating(false);
    }
  };

  const startConfirmImport = () => {
    const hasDuplicates = importPreview.some((it) => it.isDuplicate);
    if (hasDuplicates) {
      setDuplicateDialogOpen(true);
    } else {
      confirmImport();
    }
  };

  const applyDuplicateDecision = (decision: "replace" | "duplicate") => {
    setImportPreview((prev) => prev.map((it) => it.isDuplicate ? { ...it, decision } : it));
    setDuplicateDialogOpen(false);
    setTimeout(() => confirmImport(decision), 0);
  };

  const confirmImport = async (overrideDecision?: "replace" | "duplicate") => {
    if (!can("epps", "import")) {
      toast.error("No tienes permiso para importar EPPs");
      return;
    }
    setImporting(true);
    try {
      let created = 0, replaced = 0, duplicated = 0;
      for (const item of importPreview) {
        const decision = item.isDuplicate ? (overrideDecision ?? item.decision) : "create";
        if (decision === "replace" && item.existingId) {
          const existing = epps.find((e) => e.id === item.existingId);
          const mergedAreas = serializeAreas([...parseAreas(existing?.area), ...item.areas]);
          const { error } = await supabase.from("epps").update({
            area: mergedAreas,
            actividad: item.actividad,
            descripcion: item.descripcion,
            riesgo_previsto: item.riesgo_previsto,
            norma: item.norma,
            vida_util_dias: item.vida_util_dias,
          }).eq("id", item.existingId);
          if (error) throw error;
          replaced++;
        } else {
          const { error } = await supabase.from("epps").insert({
            nombre: item.nombre,
            actividad: item.actividad,
            descripcion: item.descripcion,
            riesgo_previsto: item.riesgo_previsto,
            norma: item.norma,
            vida_util_dias: item.vida_util_dias,
            area: serializeAreas(item.areas),
            requiere_firma: true,
            estado: "active",
          });
          if (error) throw error;
          if (item.isDuplicate) duplicated++; else created++;
        }
      }
      toast.success(`Importación: ${created} nuevos, ${replaced} reemplazados, ${duplicated} duplicados`);
      setImportOpen(false);
      setImportPreview([]);
      setImportFileName("");
      load();
    } catch (e: any) {
      toast.error("Error al importar: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setForm(emptyForm); setEditing(null); };


  const startEdit = (e: Epp) => {
    if (!can("epps", "edit")) {
      toast.error("No tienes permiso para editar EPPs");
      return;
    }
    setEditing(e);
    setForm({
      area: e.area,
      nombre: e.nombre,
      actividad: e.actividad ?? "",
      descripcion: e.descripcion ?? "",
      riesgo_previsto: e.riesgo_previsto ?? "",
      norma: e.norma ?? "",
      codigo_nextsis: e.codigo_nextsis ?? "",
      imagen_url: e.imagen_url ?? "",
      vida_util_dias: e.vida_util_dias,
      requiere_firma: e.requiere_firma,
      estado: e.estado,
    });
    setOpen(true);
  };

  const submit = async () => {
    const action = editing ? "edit" : "create";
    if (!can("epps", action)) {
      toast.error(`No tienes permiso para ${editing ? "editar" : "crear"} EPPs`);
      return;
    }
    const selectedAreas = parseAreas(form.area);
    if (selectedAreas.length === 0 || !form.nombre.trim()) {
      toast.error("Área y nombre son obligatorios");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      area: serializeAreas(selectedAreas),
      nombre: form.nombre.trim(),
      actividad: form.actividad || null,
      descripcion: form.descripcion || null,
      riesgo_previsto: form.riesgo_previsto || null,
      norma: form.norma || null,
      codigo_nextsis: form.codigo_nextsis?.trim() || null,
      imagen_url: form.imagen_url || null,
    };
    const { error } = editing
      ? await supabase.from("epps").update(payload).eq("id", editing.id)
      : await supabase.from("epps").insert(payload);
    setSaving(false);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(editing ? "EPP actualizado" : "EPP registrado");
    setOpen(false); reset(); load();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    if (!can("epps", "delete")) {
      toast.error("No tienes permiso para eliminar EPPs");
      setConfirmDelete(null);
      return;
    }
    const { error } = await supabase.from("epps").delete().eq("id", confirmDelete.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("EPP eliminado");
    setConfirmDelete(null); load();
  };

  return (
    <div>
      <PageHeader
        title="Catálogo de EPP"
        description="Equipos de protección personal por área de trabajo"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              variant="outline"
              onClick={async () => {
                if (epps.length === 0) { toast.error("No hay EPPs para generar el reporte"); return; }
                try {
                  toast.info("Generando reporte...");
                  await generateEppMatrixPDF(epps);
                  toast.success("Reporte generado");
                } catch (e: any) {
                  toast.error("Error al generar PDF: " + e.message);
                }
              }}
              className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground backdrop-blur-sm shadow-md"
            >
              <Download className="h-5 w-5 mr-2" /> Matriz de EPP's
            </Button>
            {canImportEpps && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleValidateClick}
                className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground backdrop-blur-sm shadow-md"
              >
                <ShieldCheck className="h-5 w-5 mr-2" /> Validar EPPs
              </Button>
            )}
            {canImportEpps && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground backdrop-blur-sm shadow-md"
              >
                <Upload className="h-5 w-5 mr-2" /> Importar desde Excel
              </Button>
            )}
            {canCreateEpps && (
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-md"
                onClick={() => { reset(); setOpen(true); }}
              >
                <Plus className="h-5 w-5 mr-2" /> Nuevo EPP
              </Button>
            )}
          </div>
        }
      />

      {canImportEpps && (
        <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) { setImportPreview([]); setImportFileName(""); } }}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Importar EPPs desde Excel
              </DialogTitle>
              <DialogDescription>
                Carga un archivo .xlsx con las columnas: Nombre, Actividad, Descripción, Riesgo Previsto, Norma, Vida útil, Área. Si un EPP se repite en varias áreas, se registrará una sola vez con múltiples áreas.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadImportTemplate}>
                <Download className="h-4 w-4 mr-2" /> Descargar plantilla
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" /> Seleccionar archivo
                  </span>
                </Button>
              </label>
              {importFileName && <span className="text-xs text-muted-foreground truncate">{importFileName}</span>}
            </div>

            {importPreview.length > 0 && (
              <div className="overflow-auto border rounded-md flex-1 min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Norma</TableHead>
                      <TableHead>Vida útil</TableHead>
                      <TableHead>Áreas</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{it.nombre}</TableCell>
                        <TableCell className="text-xs">{it.actividad ?? "—"}</TableCell>
                        <TableCell className="text-xs">{it.norma ?? "—"}</TableCell>
                        <TableCell className="text-xs">{it.vida_util_dias} días</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {it.areas.map((a) => (
                              <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {it.isDuplicate ? (
                            <Badge variant="destructive">Duplicado</Badge>
                          ) : (
                            <Badge variant="default">Nuevo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancelar</Button>
              <Button onClick={startConfirmImport} disabled={importing || importPreview.length === 0}>
                {importing ? "Importando..." : `Confirmar (${importPreview.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>EPPs duplicados detectados</AlertDialogTitle>
            <AlertDialogDescription>
              Se encontraron {importPreview.filter((it) => it.isDuplicate).length} EPP(s) con el mismo nombre que ya existen en el catálogo:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-foreground">
                {importPreview.filter((it) => it.isDuplicate).map((it, i) => (
                  <li key={i} className="text-sm">{it.nombre}</li>
                ))}
              </ul>
              <span className="block mt-3">¿Deseas reemplazar los existentes (actualizar y fusionar áreas) o agregarlos como duplicados (crear nuevos registros)?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => applyDuplicateDecision("duplicate")} disabled={importing}>
              Agregar como duplicado
            </Button>
            <AlertDialogAction onClick={() => applyDuplicateDecision("replace")} disabled={importing}>
              Reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {(canCreateEpps || canEditEpps) && (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col">
              {/* Header con gradiente corporativo */}
              <DialogHeader className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg shrink-0">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                  <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  {editing ? "Editar EPP" : "Registrar nuevo EPP"}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 ml-[42px] text-xs">
                  Completa los datos del equipo de protección personal.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0 overflow-y-auto flex-1 min-h-0">
                {/* Columna izquierda: vista previa de imagen */}
                <div className="bg-muted/30 border-r p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-6 rounded-full bg-primary" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Imagen del EPP
                    </h3>
                  </div>
                  <EppImageInput
                    value={form.imagen_url}
                    onChange={(url) => setForm({ ...form, imagen_url: url })}
                  />
                </div>

                {/* Columna derecha: formulario horizontal */}
                <div className="p-5 space-y-4">
                  {/* Sección: Identificación */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Identificación
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Áreas * <span className="text-muted-foreground font-normal">(puedes elegir varias)</span></Label>
                        {(() => {
                          const selectedAreas = parseAreas(form.area);
                          const toggleArea = (a: string) => {
                            const next = selectedAreas.includes(a)
                              ? selectedAreas.filter((x) => x !== a)
                              : [...selectedAreas, a];
                            setForm({ ...form, area: serializeAreas(next) });
                          };
                          const removeArea = (a: string) => {
                            setForm({ ...form, area: serializeAreas(selectedAreas.filter((x) => x !== a)) });
                          };
                          return (
                            <Popover open={areaPopoverOpen} onOpenChange={(o) => { setAreaPopoverOpen(o); if (o) setAreaQuery(""); }}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  role="combobox"
                                  aria-expanded={areaPopoverOpen}
                                  className="flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background pl-1.5 pr-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                  <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                                    {selectedAreas.length === 0 && (
                                      <span className="text-muted-foreground pl-1">Selecciona o crea áreas…</span>
                                    )}
                                    {selectedAreas.map((a) => {
                                      const { icon: AreaIcon, soft } = getAreaStyle(a);
                                      return (
                                        <span
                                          key={a}
                                          className={cn(
                                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                                            soft
                                          )}
                                        >
                                          <AreaIcon className="h-3 w-3" />
                                          {a}
                                          <span
                                            role="button"
                                            tabIndex={-1}
                                            onClick={(ev) => { ev.stopPropagation(); removeArea(a); }}
                                            className="ml-0.5 rounded hover:bg-background/40 p-0.5"
                                            aria-label={`Quitar ${a}`}
                                          >
                                            <X className="h-3 w-3" />
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </span>
                                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                                <Command shouldFilter>
                                  <CommandInput
                                    placeholder="Buscar o crear área…"
                                    value={areaQuery}
                                    onValueChange={setAreaQuery}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {areaQuery.trim() ? (
                                        <button
                                          type="button"
                                          className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                                          onClick={() => {
                                            const newArea = areaQuery.trim();
                                            if (!selectedAreas.includes(newArea)) {
                                              setForm({ ...form, area: serializeAreas([...selectedAreas, newArea]) });
                                            }
                                            setAreaQuery("");
                                          }}
                                        >
                                          Agregar nueva área: <strong>"{areaQuery.trim()}"</strong>
                                        </button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Sin áreas registradas</span>
                                      )}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {areas.map((a) => {
                                        const { icon: AreaIcon, soft } = getAreaStyle(a);
                                        const isSelected = selectedAreas.includes(a);
                                        return (
                                          <CommandItem
                                            key={a}
                                            value={a}
                                            onSelect={() => toggleArea(a)}
                                          >
                                            <span className={cn("h-5 w-5 rounded flex items-center justify-center mr-2", soft)}>
                                              <AreaIcon className="h-3 w-3" />
                                            </span>
                                            <span className="flex-1">{a}</span>
                                            {isSelected && <Check className="h-4 w-4 opacity-70" />}
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          );
                        })()}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Nombre del EPP *</Label>
                        <Input
                          className="h-9"
                          placeholder="Ej. Casco de seguridad"
                          value={form.nombre}
                          onChange={(ev) => setForm({ ...form, nombre: ev.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Detalles técnicos */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-primary" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Detalles técnicos
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Actividad</Label>
                        <Input
                          className="h-9"
                          placeholder="Ej. Operación de prensa"
                          value={form.actividad}
                          onChange={(ev) => setForm({ ...form, actividad: ev.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Norma</Label>
                        <Input
                          className="h-9"
                          placeholder="Ej. ANSI Z89.1, EN 388"
                          value={form.norma}
                          onChange={(ev) => setForm({ ...form, norma: ev.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs font-medium">Código Nextsis</Label>
                        <Input
                          className="h-9 font-mono"
                          placeholder="Ej. 08.01.0031"
                          value={form.codigo_nextsis}
                          onChange={(ev) => setForm({ ...form, codigo_nextsis: ev.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs font-medium">Riesgo previsto</Label>
                        <Input
                          className="h-9"
                          placeholder="Ej. Golpes / caída de objetos"
                          value={form.riesgo_previsto}
                          onChange={(ev) => setForm({ ...form, riesgo_previsto: ev.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs font-medium">Descripción</Label>
                        <Textarea
                          rows={2}
                          placeholder="Función y características del equipo"
                          value={form.descripcion}
                          onChange={(ev) => setForm({ ...form, descripcion: ev.target.value })}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Configuración */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-accent-foreground/40" />
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Configuración
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Vida útil (días)</Label>
                        <Input
                          className="h-9"
                          type="number" min={1}
                          value={form.vida_util_dias}
                          onChange={(ev) => setForm({ ...form, vida_util_dias: Number(ev.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Estado</Label>
                        <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="retired">Retirado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
                        <Switch
                          checked={form.requiere_firma}
                          onCheckedChange={(v) => setForm({ ...form, requiere_firma: v })}
                        />
                        <div className="flex-1">
                          <Label className="text-xs font-medium cursor-pointer">Requiere firma del trabajador</Label>
                          <p className="text-[11px] text-muted-foreground">Exigir firma al momento de la entrega.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-3 bg-muted/30 border-t rounded-b-lg shrink-0">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                <Button size="sm" onClick={submit} disabled={saving} className="bg-primary hover:bg-primary/90 shadow-md">
                  {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar EPP"}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      <section className="p-6 md:p-10 space-y-6">
        {/* Toolbar */}
        <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center card-elevated">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, área, actividad, norma o riesgo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="md:w-64"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas ({epps.length})</SelectItem>
              {areas.map((a) => {
                const { icon: AreaIcon, soft } = getAreaStyle(a);
                return (
                  <SelectItem key={a} value={a}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-5 w-5 rounded flex items-center justify-center", soft)}>
                        <AreaIcon className="h-3 w-3" />
                      </span>
                      {a} ({epps.filter((e) => parseAreas(e.area).includes(a)).length})
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "card" | "table")}
            className="shrink-0"
          >
            <ToggleGroupItem value="card" aria-label="Vista de tarjetas" title="Vista de tarjetas">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista de tabla" title="Vista de tabla">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </Card>

        {/* Lista */}
        {loading ? (
          <Card className="p-10 text-center text-muted-foreground">Cargando…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <HardHat className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground">No se encontraron EPPs.</p>
          </Card>
        ) : view === "card" ? (
          <div className="grid gap-3">
            {filtered.map((e) => (
              <Card
                key={e.id}
                role="button"
                tabIndex={0}
                onClick={() => setPreview(e)}
                onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setPreview(e); } }}
                className="relative overflow-hidden p-4 pr-16 flex flex-col md:flex-row md:items-center gap-4 card-elevated cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted ring-1 ring-border shrink-0">
                  <img
                    src={e.imagen_url || eppDefault}
                    alt={e.nombre}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(ev) => { (ev.currentTarget as HTMLImageElement).src = eppDefault; }}
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-base truncate">{e.nombre}</p>
                    {e.norma && (
                      <Badge variant="outline" className="font-mono text-[10px]">{e.norma}</Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">Vida útil: {e.vida_util_dias}d</Badge>
                  </div>
                  {e.descripcion && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{e.descripcion}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground">
                    {parseAreas(e.area).map((a) => {
                      const { icon: AreaIcon, badge } = getAreaStyle(a);
                      return (
                        <Badge key={a} className={cn("gap-1 font-medium border-transparent", badge)}>
                          <AreaIcon className="h-3 w-3" />
                          {a}
                        </Badge>
                      );
                    })}
                    {e.actividad && <span className="ml-1">· {e.actividad}</span>}
                    {e.riesgo_previsto && <span>· Riesgo: {e.riesgo_previsto}</span>}
                  </div>
                </div>

                {(canEditEpps || canDeleteEpps) && (
                  <div className="absolute top-0 right-0 h-full w-12 bg-[hsl(195_45%_22%)] flex flex-col items-stretch text-white" onClick={(ev) => ev.stopPropagation()}>
                    {canEditEpps && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}
                        title="Editar"
                        className="flex-1 flex items-center justify-center border-b border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canDeleteEpps && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setConfirmDelete(e); }}
                        title="Eliminar"
                        className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>EPP</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="hidden md:table-cell">Actividad</TableHead>
                  <TableHead className="hidden lg:table-cell">Riesgo previsto</TableHead>
                  <TableHead className="hidden lg:table-cell">Norma</TableHead>
                  <TableHead className="text-center">Vida útil</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted ring-1 ring-border">
                        <img
                          src={e.imagen_url || eppDefault}
                          alt={e.nombre}
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(ev) => { (ev.currentTarget as HTMLImageElement).src = eppDefault; }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.nombre}</div>
                      {e.descripcion && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{e.descripcion}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {parseAreas(e.area).map((a) => {
                          const { icon: AreaIcon, badge } = getAreaStyle(a);
                          return (
                            <Badge key={a} className={cn("gap-1.5 font-medium border-transparent", badge)}>
                              <AreaIcon className="h-3 w-3" />
                              {a}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{e.actividad || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{e.riesgo_previsto || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {e.norma ? <Badge variant="outline" className="font-mono text-xs">{e.norma}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">{e.vida_util_dias}d</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEditEpps && (
                          <Button variant="ghost" size="icon" onClick={() => startEdit(e)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteEpps && (
                          <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(e)} title="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <CardPreviewDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        title={preview?.nombre ?? "Detalle del EPP"}
        description="Vista previa de solo lectura"
        icon={ShieldCheck}
        maxWidthClass="max-w-3xl"
      >
        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
            <div className="rounded-lg overflow-hidden bg-muted ring-1 ring-border aspect-square">
              <img
                src={preview.imagen_url || eppDefault}
                alt={preview.nombre}
                className="h-full w-full object-cover"
                onError={(ev) => { (ev.currentTarget as HTMLImageElement).src = eppDefault; }}
              />
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{preview.nombre}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {parseAreas(preview.area).map((a) => {
                    const { icon: AreaIcon, badge } = getAreaStyle(a);
                    return (
                      <Badge key={a} className={cn("gap-1 font-medium border-transparent", badge)}>
                        <AreaIcon className="h-3 w-3" />
                        {a}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Vida útil</p>
                  <p className="font-medium">{preview.vida_util_dias} días</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Requiere firma</p>
                  <p className="font-medium">{preview.requiere_firma ? "Sí" : "No"}</p>
                </div>
                {preview.norma && (
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Norma</p>
                    <Badge variant="outline" className="font-mono text-xs mt-1">{preview.norma}</Badge>
                  </div>
                )}
                {preview.actividad && (
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Actividad</p>
                    <p>{preview.actividad}</p>
                  </div>
                )}
                {preview.riesgo_previsto && (
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Riesgo previsto</p>
                    <p>{preview.riesgo_previsto}</p>
                  </div>
                )}
                {preview.descripcion && (
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Descripción</p>
                    <p className="text-muted-foreground">{preview.descripcion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardPreviewDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este EPP?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <strong>{confirmDelete?.nombre}</strong> del catálogo.
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

      <AlertDialog open={validateOpen} onOpenChange={setValidateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>EPPs duplicados encontrados</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Se encontraron <strong>{duplicateGroups.length}</strong> grupo(s) con nombres duplicados,
                  totalizando <strong>{duplicateGroups.reduce((acc, g) => acc + g.length - 1, 0)}</strong> registro(s) extra
                  que serán eliminados (se conservará el primero de cada grupo).
                </p>
                <ul className="text-xs list-disc pl-5 max-h-48 overflow-auto">
                  {duplicateGroups.map((g, i) => (
                    <li key={i}>
                      <span className="font-medium">{g[0].nombre}</span> — {g.length} registros
                    </li>
                  ))}
                </ul>
                <p>¿Confirma eliminar los duplicados?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeDuplicates} disabled={validating} className="bg-destructive hover:bg-destructive/90">
              {validating ? "Eliminando..." : "Eliminar duplicados"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
