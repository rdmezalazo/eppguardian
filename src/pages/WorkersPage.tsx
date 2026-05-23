import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, UserPlus, Briefcase, HardHat, Pencil, User as UserIcon, Users, Ban, Archive, RotateCcw } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EppImageInput from "@/components/EppImageInput";
import CardPreviewDialog from "@/components/CardPreviewDialog";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck } from "lucide-react";

type PersonnelType = "administrativo" | "operativo";
type Filter = "all" | PersonnelType;

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  dni: string | null;
  area: string;
  cargo: string | null;
  sede: string;
  personnel_type: PersonnelType;
  active: boolean;
  avatar_url: string | null;
  validated_signature: string | null;
  signature_validated: boolean;
}

const emptyForm = {
  full_name: "",
  email: "",
  dni: "",
  area: "",
  cargo: "",
  sede: "Arequipa",
  personnel_type: "administrativo" as PersonnelType,
  avatar_url: "",
  validated_signature: "",
  signature_validated: false,
};

export default function WorkersPage() {
  const { can, loading: permissionsLoading } = useModulePermissions();
  const signatureRef = useRef<SignaturePadHandle>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [areas, setAreas] = useState<string[]>([]);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [voidTarget, setVoidTarget] = useState<Profile | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archived, setArchived] = useState<Profile[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedQ, setArchivedQ] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<Profile | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] = useState<Profile | null>(null);

  const loadArchived = async () => {
    setArchivedLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,user_id,full_name,email,dni,area,cargo,sede,personnel_type,active,avatar_url,validated_signature,signature_validated")
      .eq("active", false)
      .order("full_name", { ascending: true });
    setArchivedLoading(false);
    if (error) {
      toast.error("Error al cargar anulados: " + error.message);
      return;
    }
    setArchived((data ?? []) as Profile[]);
  };

  const openArchived = () => {
    if (!can("trabajadores", "edit") && !can("trabajadores", "void")) {
      toast.error("No tienes permiso para ver trabajadores anulados");
      return;
    }
    setArchivedOpen(true);
    loadArchived();
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    if (!can("trabajadores", "edit")) {
      toast.error("No tienes permiso para restablecer trabajadores");
      setRestoreTarget(null);
      return;
    }
    setRestoring(true);
    const { error } = await supabase
      .from("profiles")
      .update({ active: true })
      .eq("id", restoreTarget.id);
    setRestoring(false);
    if (error) {
      toast.error("Error al restablecer: " + error.message);
      return;
    }
    toast.success("Trabajador restablecido");
    setRestoreTarget(null);
    loadArchived();
    loadProfiles();
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    if (!can("trabajadores", "void")) {
      toast.error("No tienes permiso para anular trabajadores");
      setVoidTarget(null);
      return;
    }
    setVoiding(true);
    const { error } = await supabase
      .from("profiles")
      .update({ active: false })
      .eq("id", voidTarget.id);
    setVoiding(false);
    if (error) {
      toast.error("Error al anular: " + error.message);
      return;
    }
    toast.success("Trabajador anulado");
    setVoidTarget(null);
    loadProfiles();
  };

  const loadProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,user_id,full_name,email,dni,area,cargo,sede,personnel_type,active,avatar_url,validated_signature,signature_validated")
      .eq("active", true)
      .order("full_name", { ascending: true });
    if (error) {
      toast.error("Error al cargar trabajadores: " + error.message);
    } else {
      const list = (data ?? []) as Profile[];
      setProfiles(list);
      const uniqueAreas = Array.from(
        new Set(
          list
            .map((p) => (p.area || "").trim())
            .filter((a) => a.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
      setAreas(uniqueAreas);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return profiles.filter((p) => {
      if (filter !== "all" && p.personnel_type !== filter) return false;
      if (!t) return true;
      return (
        p.full_name.toLowerCase().includes(t) ||
        p.email.toLowerCase().includes(t) ||
        (p.dni || "").toLowerCase().includes(t) ||
        (p.area || "").toLowerCase().includes(t) ||
        (p.cargo || "").toLowerCase().includes(t)
      );
    });
  }, [profiles, q, filter]);

  const counts = useMemo(() => ({
    all: profiles.length,
    administrativo: profiles.filter((p) => p.personnel_type === "administrativo").length,
    operativo: profiles.filter((p) => p.personnel_type === "operativo").length,
  }), [profiles]);

  const canCreateWorkers = !permissionsLoading && can("trabajadores", "create");
  const canEditWorkers = !permissionsLoading && can("trabajadores", "edit");
  const canVoidWorkers = !permissionsLoading && can("trabajadores", "void");

  const initials = (name: string) =>
    name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const isOperativo = form.personnel_type === "operativo";

  const reset = () => { setForm(emptyForm); setEditing(null); };

  const startCreate = () => {
    if (!can("trabajadores", "create")) {
      toast.error("No tienes permiso para crear trabajadores");
      return;
    }
    reset();
    setDialogOpen(true);
  };

  const startEdit = (p: Profile) => {
    if (!can("trabajadores", "edit")) {
      toast.error("No tienes permiso para editar trabajadores");
      return;
    }
    setEditing(p);
    setForm({
      full_name: p.full_name,
      email: p.email.endsWith("@sin-email.local") ? "" : p.email,
      dni: p.dni || "",
      area: p.area || "",
      cargo: p.cargo || "",
      sede: p.sede || "Arequipa",
      personnel_type: p.personnel_type,
      avatar_url: p.avatar_url || "",
      validated_signature: p.validated_signature || "",
      signature_validated: !!p.signature_validated,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const action = editing ? "edit" : "create";
    if (!can("trabajadores", action)) {
      toast.error(`No tienes permiso para ${editing ? "editar" : "crear"} trabajadores`);
      return;
    }
    if (!form.full_name.trim() || !form.area.trim()) {
      toast.error("Completa nombre y área.");
      return;
    }
    setSaving(true);

    // Capture current signature pad state if user drew/changed it
    const padData = signatureRef.current?.getDataUrl() ?? null;
    const finalSignature = padData ?? (form.validated_signature || null);
    // Reset validation flag if signature was cleared/changed via the pad
    let validatedFlag = form.signature_validated;
    if (editing && padData && padData !== (editing.validated_signature ?? null)) {
      validatedFlag = form.signature_validated; // user explicitly toggles below
    }
    if (!finalSignature) validatedFlag = false;

    if (editing) {
      const emailValue = form.email.trim().toLowerCase() || `${editing.user_id}@sin-email.local`;
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          email: emailValue,
          dni: form.dni.trim() || null,
          area: form.area.trim(),
          cargo: form.cargo.trim() || null,
          sede: form.sede,
          personnel_type: form.personnel_type,
          avatar_url: form.avatar_url.trim() || null,
          validated_signature: finalSignature,
          signature_validated: validatedFlag,
          signature_validated_at: validatedFlag ? new Date().toISOString() : null,
        })
        .eq("id", editing.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar: " + error.message); return; }
      toast.success("Trabajador actualizado");
    } else {
      const newUserId = crypto.randomUUID();
      const emailValue = form.email.trim().toLowerCase() || `${newUserId}@sin-email.local`;
      const { error } = await supabase.from("profiles").insert({
        user_id: newUserId,
        full_name: form.full_name.trim(),
        email: emailValue,
        dni: form.dni.trim() || null,
        area: form.area.trim(),
        cargo: form.cargo.trim() || null,
        sede: form.sede,
        personnel_type: form.personnel_type,
        role: "usuario",
        active: true,
        avatar_url: form.avatar_url.trim() || null,
        validated_signature: finalSignature,
        signature_validated: validatedFlag,
        signature_validated_at: validatedFlag ? new Date().toISOString() : null,
      });
      setSaving(false);
      if (error) { toast.error("Error al crear: " + error.message); return; }
      toast.success("Trabajador agregado correctamente");
    }
    setDialogOpen(false);
    reset();
    loadProfiles();
  };

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        description="Personal disponible para asignación de EPPs (administrativo y operativo)"
        actions={
          canCreateWorkers ? (
          <Button
            onClick={startCreate}
            size="lg"
            variant="secondary"
            className="h-11 gap-2 shrink-0"
          >
            <UserPlus className="h-5 w-5" />
            <span className="hidden sm:inline">Agregar personal</span>
          </Button>
          ) : null
        }
      />
      <section className="p-6 md:p-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="administrativo">Administrativo ({counts.administrativo})</TabsTrigger>
              <TabsTrigger value="operativo">Operativo ({counts.operativo})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI, email, área…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {(canEditWorkers || canVoidWorkers) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openArchived}
                title="Ver trabajadores anulados"
                className="h-12 w-12 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Archive className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <Card className="p-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando…
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.length === 0 && (
              <Card className="p-10 text-center text-muted-foreground">
                No se encontraron trabajadores.
              </Card>
            )}
            {filtered.map((p) => (
              <Card
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setPreview(p)}
                onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setPreview(p); } }}
                className="relative overflow-hidden p-5 pr-16 flex flex-col md:flex-row md:items-center justify-between gap-3 card-elevated cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-4">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold">
                      {initials(p.full_name)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{p.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      DNI: {p.dni || "—"} · {p.email.endsWith("@sin-email.local") ? "—" : p.email} · {p.area || "—"} · {p.cargo || "—"} · {p.sede}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={p.personnel_type === "operativo" ? "secondary" : "default"}
                    className="capitalize"
                  >
                    {p.personnel_type}
                  </Badge>
                </div>

                {(canEditWorkers || canVoidWorkers) && (
                  <div className="absolute top-0 right-0 h-full w-12 bg-[hsl(195_45%_22%)] flex flex-col items-stretch text-white" onClick={(ev) => ev.stopPropagation()}>
                    {canEditWorkers && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); startEdit(p); }}
                        title="Editar"
                        className="flex-1 flex items-center justify-center border-b border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canVoidWorkers && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setVoidTarget(p); }}
                        title="Anular"
                        className="flex-1 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <CardPreviewDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        title={preview?.full_name ?? "Trabajador"}
        description="Vista previa de solo lectura"
        icon={UserIcon}
        maxWidthClass="max-w-2xl"
      >
        {preview && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {preview.avatar_url ? (
                <img
                  src={preview.avatar_url}
                  alt={preview.full_name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold text-2xl">
                  {initials(preview.full_name)}
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{preview.full_name}</h3>
                <Badge
                  variant={preview.personnel_type === "operativo" ? "secondary" : "default"}
                  className="capitalize"
                >
                  {preview.personnel_type}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm border-t pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">DNI</p>
                <p className="font-medium">{preview.dni || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
                <p className="font-medium break-all">
                  {preview.email.endsWith("@sin-email.local") ? "—" : preview.email}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Área</p>
                <p className="font-medium">{preview.area || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Cargo</p>
                <p className="font-medium">{preview.cargo || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sede</p>
                <p className="font-medium">{preview.sede}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Estado</p>
                <p className="font-medium">{preview.active ? "Activo" : "Anulado"}</p>
              </div>
            </div>
          </div>
        )}
      </CardPreviewDialog>

      <AlertDialog open={!!voidTarget} onOpenChange={(o) => { if (!o) setVoidTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este trabajador?</AlertDialogTitle>
            <AlertDialogDescription>
              {voidTarget && (
                <>
                  <strong>{voidTarget.full_name}</strong> será retirado del listado.
                  El registro no se elimina y puede restablecerse desde el icono <Archive className="inline h-3.5 w-3.5 align-text-bottom" /> Anulados.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voiding}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVoid} disabled={voiding}>
              {voiding ? "Anulando…" : "Anular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={archivedOpen} onOpenChange={setArchivedOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 py-3 bg-gradient-to-r from-muted-foreground/80 to-muted-foreground/60 text-primary-foreground rounded-t-lg shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center">
                <Archive className="h-4 w-4" />
              </div>
              Trabajadores anulados
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 ml-[42px] text-xs">
              Estos registros no aparecen en el listado principal. Puedes restablecerlos en cualquier momento.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3 overflow-y-auto flex-1 min-h-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar anulados…"
                value={archivedQ}
                onChange={(e) => setArchivedQ(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {archivedLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando…
              </div>
            ) : (
              <div className="grid gap-2">
                {archived.filter((p) => {
                  const t = archivedQ.trim().toLowerCase();
                  if (!t) return true;
                  return (
                    p.full_name.toLowerCase().includes(t) ||
                    (p.dni || "").toLowerCase().includes(t) ||
                    (p.area || "").toLowerCase().includes(t) ||
                    p.email.toLowerCase().includes(t)
                  );
                }).length === 0 && (
                  <Card className="p-8 text-center text-sm text-muted-foreground">
                    No hay trabajadores anulados.
                  </Card>
                )}
                {archived
                  .filter((p) => {
                    const t = archivedQ.trim().toLowerCase();
                    if (!t) return true;
                    return (
                      p.full_name.toLowerCase().includes(t) ||
                      (p.dni || "").toLowerCase().includes(t) ||
                      (p.area || "").toLowerCase().includes(t) ||
                      p.email.toLowerCase().includes(t)
                    );
                  })
                  .map((p) => (
                    <Card key={p.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.full_name}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-border opacity-70"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                            {initials(p.full_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            DNI: {p.dni || "—"} · {p.area || "—"} · {p.cargo || "—"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(p)}
                        disabled={!canEditWorkers}
                        className="gap-1.5 shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restablecer
                      </Button>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => { if (!o) setRestoreTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer este trabajador?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget && (
                <>
                  <strong>{restoreTarget.full_name}</strong> volverá a aparecer en el listado principal de trabajadores.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={restoring}>
              {restoring ? "Restableciendo…" : "Restablecer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="h-8 w-8 rounded-md bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
                <Users className="h-4 w-4" />
              </div>
              {editing ? "Editar trabajador" : "Agregar personal"}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 ml-[42px] text-xs">
              {editing
                ? "Actualiza los datos del trabajador."
                : "Registra un nuevo trabajador administrativo u operativo."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 overflow-y-auto flex-1 min-h-0">
            {/* Columna izquierda: foto */}
            <div className="bg-muted/30 border-r p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-1 w-6 rounded-full bg-primary" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Foto del trabajador
                </h3>
              </div>
              <EppImageInput
                value={form.avatar_url}
                onChange={(url) => setForm({ ...form, avatar_url: url })}
                bucket="worker-avatars"
                aspect="square"
                emptyHint="Arrastra una foto aquí o haz clic para seleccionar"
              />
              <p className="text-[10px] text-muted-foreground leading-snug">
                Si no se asigna una foto, se mostrará un avatar genérico con las iniciales del trabajador.
              </p>
            </div>

            {/* Columna derecha: formulario */}
            <div className="p-5 space-y-4">
              {/* Toggle tipo de personal */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full bg-primary" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Tipo de personal
                  </h3>
                </div>
                <div
                  role="tablist"
                  aria-label="Tipo de personal"
                  className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted"
                >
                  {(
                    [
                      { value: "administrativo", label: "Administrativo", Icon: Briefcase },
                      { value: "operativo", label: "Operativo", Icon: HardHat },
                    ] as const
                  ).map(({ value, label, Icon }) => {
                    const active = form.personnel_type === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setForm({ ...form, personnel_type: value })}
                        className={cn(
                          "flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-all",
                          active
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Datos */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full bg-primary" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Datos personales
                  </h3>
                </div>

                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="full_name" className="text-xs font-medium">Nombre completo *</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Ej. Juan Pérez Quispe"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dni" className="text-xs font-medium">N° DNI</Label>
                    <Input
                      id="dni"
                      value={form.dni}
                      onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                      placeholder="Ej. 12345678"
                      inputMode="numeric"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-medium">
                      Email <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="area" className="text-xs font-medium">Área *</Label>
                      <Select
                        value={form.area}
                        onValueChange={(v) => setForm({ ...form, area: v })}
                      >
                        <SelectTrigger id="area">
                          <SelectValue placeholder="Selecciona un área" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.length === 0 ? (
                            <SelectItem value="General">General</SelectItem>
                          ) : (
                            areas.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cargo" className="text-xs font-medium">Cargo</Label>
                      <Input
                        id="cargo"
                        value={form.cargo}
                        onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                        placeholder="Técnico"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Sede</Label>
                    <Select
                      value={form.sede}
                      onValueChange={(v) => setForm({ ...form, sede: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arequipa">Arequipa</SelectItem>
                        <SelectItem value="Lima">Lima</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Firma validada */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full bg-primary" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Firma validada
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Esta firma servirá como patrón de comparación. Los movimientos en el Kardex se
                  validarán contra esta firma. Si no coincide, el sistema no permitirá registrarlos.
                </p>
                <SignaturePad
                  ref={signatureRef}
                  label="Firma del trabajador"
                  initialDataUrl={form.validated_signature || null}
                  height={180}
                />
                <div className="flex items-center justify-between rounded-md border p-2.5 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={cn("h-4 w-4", form.signature_validated ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="text-xs font-medium">Marcar firma como validada</p>
                      <p className="text-[10px] text-muted-foreground">
                        Solo las firmas validadas se usan como patrón.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.signature_validated}
                    onCheckedChange={(v) => setForm({ ...form, signature_validated: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
