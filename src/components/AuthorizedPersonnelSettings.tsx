import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ShieldCheck, Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PERMISSION_MODULES,
  getActionsForModule,
  MODULE_ACTIONS,
  type PermissionModule,
  type PermissionAction,
} from "@/hooks/useModulePermissions";
import { cn } from "@/lib/utils";

type ProfileRow = {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  cargo: string | null;
  area: string;
  role: string;
  active: boolean;
};

type PermKey = `${PermissionModule}:${PermissionAction}`;
type PermMap = Record<string, Set<PermKey>>; // user_id -> set de permisos otorgados

export default function AuthorizedPersonnelSettings() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [perms, setPerms] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeModule, setActiveModule] = useState<PermissionModule>("epps");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: profs }, { data: pp }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,full_name,email,avatar_url,cargo,area,role,active")
          .eq("active", true)
          .order("full_name"),
        supabase
          .from("module_permissions")
          .select("user_id,module,action,granted")
          .eq("granted", true),
      ]);
      setProfiles((profs ?? []) as ProfileRow[]);
      const map: PermMap = {};
      (pp ?? []).forEach((r: any) => {
        if (!map[r.user_id]) map[r.user_id] = new Set();
        map[r.user_id].add(`${r.module}:${r.action}` as PermKey);
      });
      setPerms(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.cargo ?? "").toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const togglePerm = async (
    userId: string,
    module: PermissionModule,
    action: PermissionAction,
    next: boolean
  ) => {
    const key = `${module}:${action}` as PermKey;
    setSaving(`${userId}:${key}`);
    try {
      if (next) {
        const { error } = await supabase
          .from("module_permissions")
          .upsert(
            { user_id: userId, module, action, granted: true },
            { onConflict: "user_id,module,action" }
          );
        if (error) throw error;
        setPerms((prev) => {
          const copy = { ...prev };
          if (!copy[userId]) copy[userId] = new Set();
          else copy[userId] = new Set(copy[userId]);
          copy[userId].add(key);
          return copy;
        });
      } else {
        const { error } = await supabase
          .from("module_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("module", module)
          .eq("action", action);
        if (error) throw error;
        setPerms((prev) => {
          const copy = { ...prev };
          if (copy[userId]) {
            copy[userId] = new Set(copy[userId]);
            copy[userId].delete(key);
          }
          return copy;
        });
      }
    } catch (e: any) {
      toast.error("No se pudo actualizar el permiso", { description: e.message });
    } finally {
      setSaving(null);
    }
  };

  const toggleAllForUser = async (userId: string, grant: boolean) => {
    setSaving(`${userId}:all`);
    try {
      if (grant) {
        const rows = PERMISSION_MODULES.flatMap((m) =>
          MODULE_ACTIONS[m.key].map((action) => ({
            user_id: userId,
            module: m.key,
            action,
            granted: true,
          }))
        );
        const { error } = await supabase
          .from("module_permissions")
          .upsert(rows, { onConflict: "user_id,module,action" });
        if (error) throw error;
        setPerms((prev) => {
          const copy = { ...prev };
          copy[userId] = new Set(
            PERMISSION_MODULES.flatMap((m) =>
              MODULE_ACTIONS[m.key].map((action) => `${m.key}:${action}` as PermKey)
            )
          );
          return copy;
        });
        toast.success("Permisos otorgados");
      } else {
        const { error } = await supabase
          .from("module_permissions")
          .delete()
          .eq("user_id", userId);
        if (error) throw error;
        setPerms((prev) => {
          const copy = { ...prev };
          copy[userId] = new Set();
          return copy;
        });
        toast.success("Permisos revocados");
      }
    } catch (e: any) {
      toast.error("No se pudo actualizar", { description: e.message });
    } finally {
      setSaving(null);
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");

  return (
    <Card className="card-elevated p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <UserCog className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Personal Autorizado</h3>
            <p className="text-xs text-muted-foreground">
              Define qué acciones puede realizar cada persona en cada módulo. Por defecto, nada está permitido.
            </p>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar persona..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Selector de módulo */}
      <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
        {PERMISSION_MODULES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActiveModule(m.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeModule === m.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          {(() => {
            const moduleActions = getActionsForModule(activeModule);
            return (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Persona</th>
                    {moduleActions.map((a) => (
                      <th key={a.key} className="px-2 py-2 font-medium text-center whitespace-nowrap">
                        {a.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-center">Todo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const userPerms = perms[p.user_id] ?? new Set<PermKey>();
                    const isTi = p.role === "ti";
                    const allChecked =
                      moduleActions.every((a) =>
                        userPerms.has(`${activeModule}:${a.key}` as PermKey)
                      );
                    return (
                      <tr key={p.user_id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={p.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{initials(p.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate flex items-center gap-1.5">
                                {p.full_name}
                                {isTi && (
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px] gap-0.5">
                                    <ShieldCheck className="h-2.5 w-2.5" /> TI
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {p.cargo ?? p.email} · {p.area}
                              </div>
                            </div>
                          </div>
                        </td>
                        {moduleActions.map((a) => {
                          const key = `${activeModule}:${a.key}` as PermKey;
                          const checked = isTi || userPerms.has(key);
                          const busy = saving === `${p.user_id}:${key}`;
                          return (
                            <td key={a.key} className="px-2 py-2 text-center">
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                              ) : (
                                <Checkbox
                                  checked={checked}
                                  disabled={isTi}
                                  onCheckedChange={(v) =>
                                    togglePerm(p.user_id, activeModule, a.key, !!v)
                                  }
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          <Button
                            size="sm"
                            variant={allChecked ? "secondary" : "outline"}
                            className="h-7 px-2 text-xs"
                            disabled={isTi || saving === `${p.user_id}:all`}
                            onClick={() => {
                              moduleActions.forEach((a) =>
                                togglePerm(p.user_id, activeModule, a.key, !allChecked)
                              );
                            }}
                          >
                            {allChecked ? "Quitar" : "Otorgar"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={moduleActions.length + 2} className="text-center py-8 text-muted-foreground text-sm">
                        No se encontraron personas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        💡 Los usuarios con rol <strong>TI</strong> tienen todos los permisos automáticamente.
        Cambia entre los módulos arriba para configurar permisos específicos.
      </p>
    </Card>
  );
}
