import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setAreaRegistry, type AreaSetting } from "@/lib/area-icons";

let cache: AreaSetting[] | null = null;
const listeners = new Set<(rows: AreaSetting[]) => void>();

export async function loadAreaSettings(): Promise<AreaSetting[]> {
  const { data, error } = await supabase
    .from("area_settings")
    .select("id,name,icon,badge_class,soft_class,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as AreaSetting[];
  cache = rows;
  setAreaRegistry(rows);
  listeners.forEach((l) => l(rows));
  return rows;
}

export function useAreaSettings() {
  const [rows, setRows] = useState<AreaSetting[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    listeners.add(setRows);
    if (cache === null) {
      loadAreaSettings().finally(() => setLoading(false));
    } else {
      setRows(cache);
    }
    return () => { listeners.delete(setRows); };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { await loadAreaSettings(); } finally { setLoading(false); }
  }, []);

  return { areas: rows, loading, refresh };
}
