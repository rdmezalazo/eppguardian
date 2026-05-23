import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PermissionModule = "epps" | "trabajadores" | "kardex" | "reportes";
export type PermissionAction = "create" | "edit" | "void" | "delete" | "download" | "import";

export const PERMISSION_MODULES: { key: PermissionModule; label: string }[] = [
  { key: "epps", label: "EPPs" },
  { key: "trabajadores", label: "Trabajadores" },
  { key: "kardex", label: "Kardex" },
  { key: "reportes", label: "Reportes" },
];

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "void", label: "Anular" },
  { key: "delete", label: "Eliminar" },
  { key: "download", label: "Descargar PDF" },
  { key: "import", label: "Importar" },
];

/**
 * Acciones disponibles por módulo (whitelist por módulo).
 */
export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  epps: ["create", "edit", "delete", "import"],
  trabajadores: ["create", "edit", "void"],
  kardex: ["create", "edit", "void", "delete"],
  reportes: ["download"],
};

export const getActionsForModule = (
  module: PermissionModule
): { key: PermissionAction; label: string }[] => {
  const allowed = MODULE_ACTIONS[module];
  return PERMISSION_ACTIONS.filter((a) => allowed.includes(a.key));
};

type PermissionRow = {
  user_id: string;
  module: PermissionModule;
  action: PermissionAction;
  granted: boolean;
};

/**
 * Hook para verificar permisos del usuario actual sobre módulos.
 * Política: denegar por defecto. Rol "ti" tiene todos los permisos implícitamente.
 */
export function useModulePermissions() {
  const { user, profile } = useAuth();
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const isTi = profile?.role === "ti";

  useEffect(() => {
    if (!user) {
      setPerms(new Set());
      setLoading(false);
      return;
    }
    if (isTi) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("module_permissions")
        .select("module,action,granted")
        .eq("user_id", user.id)
        .eq("granted", true);
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => set.add(`${r.module}:${r.action}`));
      setPerms(set);
      setLoading(false);
    })();
  }, [user?.id, isTi]);

  const can = useCallback(
    (module: PermissionModule, action: PermissionAction) => {
      if (isTi) return true;
      return perms.has(`${module}:${action}`);
    },
    [perms, isTi]
  );

  return { can, loading, isTi };
}

/**
 * Hook para gestión completa (matriz) en /ajustes. Solo TI debería usarlo.
 */
export function useAllModulePermissions() {
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_permissions")
      .select("user_id,module,action,granted");
    setRows((data ?? []) as PermissionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, reload };
}
