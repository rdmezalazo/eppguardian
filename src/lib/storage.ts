import type { Worker, EppItem, KardexEntry, KardexHeader, KardexItemInput, CompanyInfo } from "@/types/kardex";
import { supabase } from "@/integrations/supabase/client";

export const defaultCompany: CompanyInfo = {
  titulo: "KARDEX DE EQUIPOS DE PROTECCIÓN PERSONAL",
  codigo: "L-SSOMA-FOR-027",
  version: "3.2",
  fecha: "04/11/2022",
  razonSocial: "Livigui Perú S.A.C.",
  ruc: "20455825742",
  direccion:
    "Asoc. Semi Rural de Productos Pecuarios Umalpaca Mz M, Lt 3, Zona II Sector Pecuario Sabandia - Arequipa",
  actividadEconomica: "Fabricación de otros productos de caucho",
  textoDescriptivo:
    "Recibí de {razonSocial} los Equipos de Protección Personal y/o Equipos de Emergencia que avalo con mi firma y me comprometo a mantenerlos en buen estado de conservación, notificando de inmediato las roturas, pérdidas, etc. y solicitando la inmediata reposición de los mismos en caso corresponda.\nAsí mismo he sido notificado que el uso de los E.P.P. es de carácter obligatorio durante la jornada laboral, siendo también mi obligación el uso adecuado de estos, en cumplimiento de la Ley de Seguridad y Salud en el Trabajo N° 29783, su reglamento dado por el Decreto Supremo N° 005-2012-TR y modificatorias y en cumplimiento de las disposiciones establecidas por {razonSocial}.",
  headers: {
    nro: "Nro",
    nombre: "Nombre(s) del(los) equipo(s) de protección de seguridad o emergencia entregado",
    cantidad: "Cantidad",
    fechaEntrega: "Fecha de Entrega",
    tipoEntrega: "Tipo de Entrega*",
    motivoEntrega: "Motivo de Entrega",
    fechaDevolucion: "Fecha de Devolución",
    firmaUsuario: "Firma de Usuario",
    firmaResponsable: "Firma del Responsable del Registro",
  },
  pieTexto: "* Tipo de entrega: A = Asignado (1ra entrega), C = Cambio; P = Pérdida",
};

export const uuid = () =>
  (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

// =============== KARDEX (Supabase) ===============

const dateOnly = (value?: string | null) => (value ? String(value).slice(0, 10) : undefined);

function rowToEntry(r: any): KardexEntry {
  return {
    id: r.id,
    headerId: r.header_id ?? undefined,
    workerId: r.worker_id,
    eppId: r.epp_id,
    eventType: r.event_type,
    deliveryType: r.delivery_type,
    quantity: r.quantity,
    deliveryDate: dateOnly(r.delivery_date) ?? dateOnly(new Date().toISOString())!,
    changeRequestDate: dateOnly(r.change_request_date),
    returnDate: dateOnly(r.return_date),
    reason: r.reason,
    observations: r.observations ?? undefined,
    workerSignature: r.worker_signature ?? undefined,
    responsibleSignature: r.responsible_signature ?? undefined,
    responsibleName: r.responsible_name ?? undefined,
    createdAt: r.created_at,
    voided: r.voided ?? false,
    voidReason: r.void_reason ?? undefined,
    voidedAt: r.voided_at ?? undefined,
  };
}

function entryToRow(e: KardexEntry) {
  const onlyDate = (s?: string) => (s ? s.slice(0, 10) : null);
  return {
    id: e.id,
    header_id: e.headerId ?? null,
    worker_id: e.workerId,
    epp_id: e.eppId,
    event_type: e.eventType,
    delivery_type: e.deliveryType,
    quantity: e.quantity,
    delivery_date: onlyDate(e.deliveryDate)!,
    change_request_date: onlyDate(e.changeRequestDate),
    return_date: onlyDate(e.returnDate),
    reason: e.reason,
    observations: e.observations ?? null,
    worker_signature: e.workerSignature ?? null,
    responsible_signature: e.responsibleSignature ?? null,
    responsible_name: e.responsibleName ?? null,
    voided: e.voided ?? false,
    void_reason: e.voidReason ?? null,
    voided_at: e.voidedAt ?? null,
  };
}

// ===== Caché en memoria para evitar refetch al navegar entre páginas =====
const KARDEX_TTL_MS = 60_000;
let kardexEntriesCache: { at: number; data: KardexEntry[] } | null = null;
let kardexHeadersCache: { at: number; data: KardexHeader[] } | null = null;
let kardexEntriesInflight: Promise<KardexEntry[]> | null = null;
let kardexHeadersInflight: Promise<KardexHeader[]> | null = null;

export function invalidateKardexCache() {
  kardexEntriesCache = null;
  kardexHeadersCache = null;
}

export async function getKardex(force = false): Promise<KardexEntry[]> {
  if (!force && kardexEntriesCache && Date.now() - kardexEntriesCache.at < KARDEX_TTL_MS) {
    return kardexEntriesCache.data;
  }
  if (!force && kardexEntriesInflight) return kardexEntriesInflight;
  const run = (async () => {
    const pageSize = 1000;
    const all: any[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("kardex_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error("getKardex error", error);
        const partial = all.map(rowToEntry);
        kardexEntriesCache = { at: Date.now(), data: partial };
        return partial;
      }
      all.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    const mapped = all.map(rowToEntry);
    kardexEntriesCache = { at: Date.now(), data: mapped };
    return mapped;
  })();
  kardexEntriesInflight = run;
  try {
    return await run;
  } finally {
    kardexEntriesInflight = null;
  }
}

export async function upsertKardexEntry(entry: KardexEntry): Promise<void> {
  const { error } = await supabase.from("kardex_entries").upsert(entryToRow(entry));
  if (error) throw error;
  invalidateKardexCache();
}

export async function deleteKardexEntry(id: string): Promise<void> {
  const { error } = await supabase.from("kardex_entries").delete().eq("id", id);
  if (error) throw error;
  invalidateKardexCache();
}

export async function setKardexVoided(id: string, voided: boolean, reason?: string): Promise<void> {
  const { error } = await supabase
    .from("kardex_entries")
    .update({
      voided,
      void_reason: voided ? (reason ?? "Sin motivo especificado") : null,
      voided_at: voided ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
  invalidateKardexCache();
}

// =============== KARDEX HEADERS (maestro-detalle) ===============

export const uuidGen = () =>
  (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

export interface KardexHeaderInput {
  id?: string;
  workerId: string;
  deliveryDate: string;        // yyyy-mm-dd
  changeRequestDate?: string;
  returnDate?: string;
  responsibleName?: string;
  responsibleSignature?: string;
  workerSignature?: string;
  observations?: string;
  items: KardexItemInput[];
}

const onlyDate = (s?: string) => (s ? s.slice(0, 10) : null);

function rowToHeader(r: any, items: KardexEntry[]): KardexHeader {
  return {
    id: r.id,
    workerId: r.worker_id,
    deliveryDate: dateOnly(r.delivery_date) ?? dateOnly(new Date().toISOString())!,
    changeRequestDate: dateOnly(r.change_request_date),
    returnDate: dateOnly(r.return_date),
    responsibleName: r.responsible_name ?? undefined,
    responsibleSignature: r.responsible_signature ?? undefined,
    workerSignature: r.worker_signature ?? undefined,
    observations: r.observations ?? undefined,
    voided: r.voided ?? false,
    voidReason: r.void_reason ?? undefined,
    voidedAt: r.voided_at ?? undefined,
    createdAt: r.created_at,
    items,
  };
}

async function fetchKardexEntriesByHeaderIds(ids: string[]): Promise<any[]> {
  const pageSize = 1000;
  const chunkSize = 75;
  const allItems: any[] = [];

  for (let start = 0; start < ids.length; start += chunkSize) {
    const chunk = ids.slice(start, start + chunkSize);

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("kardex_entries")
        .select("*")
        .in("header_id", chunk)
        .order("header_id", { ascending: true })
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      allItems.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
  }

  return allItems;
}

export async function getKardexHeaders(force = false): Promise<KardexHeader[]> {
  if (!force && kardexHeadersCache && Date.now() - kardexHeadersCache.at < KARDEX_TTL_MS) {
    return kardexHeadersCache.data;
  }
  if (!force && kardexHeadersInflight) return kardexHeadersInflight;
  const run = (async () => {
    const { data: headers, error: hErr } = await supabase
      .from("kardex_headers")
      .select("*, kardex_entries(*)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (hErr) {
      console.error("getKardexHeaders error", hErr);
      return [];
    }
    if (!headers?.length) {
      kardexHeadersCache = { at: Date.now(), data: [] };
      return [];
    }
    let result: KardexHeader[];
    if (headers.every((h: any) => Array.isArray(h.kardex_entries))) {
      result = headers.map((h: any) => rowToHeader(h, (h.kardex_entries ?? []).map(rowToEntry)));
    } else {
      const ids = headers.map((h: any) => h.id);
      let items: any[] = [];
      try {
        items = await fetchKardexEntriesByHeaderIds(ids);
      } catch (iErr) {
        console.error("getKardexHeaders items error", iErr);
      }
      const itemsByHeader = new Map<string, KardexEntry[]>();
      (items ?? []).forEach((row: any) => {
        const list = itemsByHeader.get(row.header_id) ?? [];
        list.push(rowToEntry(row));
        itemsByHeader.set(row.header_id, list);
      });
      result = headers.map((h: any) => rowToHeader(h, itemsByHeader.get(h.id) ?? []));
    }
    kardexHeadersCache = { at: Date.now(), data: result };
    return result;
  })();
  kardexHeadersInflight = run;
  try {
    return await run;
  } finally {
    kardexHeadersInflight = null;
  }
}

export async function upsertKardexHeader(input: KardexHeaderInput): Promise<string> {
  const headerId = input.id ?? uuidGen();
  const headerPayload = {
    id: headerId,
    worker_id: input.workerId,
    delivery_date: onlyDate(input.deliveryDate)!,
    change_request_date: onlyDate(input.changeRequestDate),
    return_date: onlyDate(input.returnDate),
    responsible_name: input.responsibleName ?? null,
    responsible_signature: input.responsibleSignature ?? null,
    worker_signature: input.workerSignature ?? null,
    observations: input.observations ?? null,
  };

  const { error: hErr } = await supabase.from("kardex_headers").upsert(headerPayload);
  if (hErr) throw hErr;

  // Reemplazar todos los detalles asociados
  const { error: delErr } = await supabase
    .from("kardex_entries")
    .delete()
    .eq("header_id", headerId);
  if (delErr) throw delErr;

  if (input.items.length > 0) {
    const itemsPayload = input.items.map((it) => ({
      id: it.id ?? uuidGen(),
      header_id: headerId,
      worker_id: input.workerId,
      epp_id: it.eppId,
      event_type: it.eventType,
      delivery_type: it.deliveryType,
      quantity: it.quantity,
      delivery_date: onlyDate(input.deliveryDate)!,
      change_request_date: onlyDate(input.changeRequestDate),
      return_date: onlyDate(it.returnDate ?? input.returnDate),
      reason: it.reason,
      observations: it.observations ?? null,
      worker_signature: input.workerSignature ?? null,
      responsible_signature: input.responsibleSignature ?? null,
      responsible_name: input.responsibleName ?? null,
    }));
    const { error: iErr } = await supabase.from("kardex_entries").insert(itemsPayload);
    if (iErr) throw iErr;
  }

  invalidateKardexCache();
  return headerId;
}

export async function deleteKardexHeader(id: string): Promise<void> {
  // Eliminar primero los detalles para que el reporte asociado también desaparezca
  const { error: iErr } = await supabase.from("kardex_entries").delete().eq("header_id", id);
  if (iErr) throw iErr;
  const { error } = await supabase.from("kardex_headers").delete().eq("id", id);
  if (error) throw error;
  invalidateKardexCache();
}

export async function setKardexHeaderVoided(id: string, voided: boolean, reason?: string): Promise<void> {
  const voided_at = voided ? new Date().toISOString() : null;
  const void_reason = voided ? (reason ?? "Sin motivo especificado") : null;
  const { error: hErr } = await supabase
    .from("kardex_headers")
    .update({ voided, void_reason, voided_at })
    .eq("id", id);
  if (hErr) throw hErr;
  // Propaga el estado a los detalles para que reportes y dashboard reflejen la anulación
  const { error: iErr } = await supabase
    .from("kardex_entries")
    .update({ voided, void_reason, voided_at })
    .eq("header_id", id);
  if (iErr) throw iErr;
  invalidateKardexCache();
}

// =============== COMPANY / REPORT CONFIG (Supabase) ===============

function rowToCompany(r: any): CompanyInfo {
  return {
    titulo: r.titulo ?? defaultCompany.titulo,
    codigo: r.codigo ?? defaultCompany.codigo,
    version: r.version ?? defaultCompany.version,
    fecha: r.fecha ?? defaultCompany.fecha,
    razonSocial: r.razon_social ?? defaultCompany.razonSocial,
    ruc: r.ruc ?? defaultCompany.ruc,
    direccion: r.direccion ?? defaultCompany.direccion,
    actividadEconomica: r.actividad_economica ?? defaultCompany.actividadEconomica,
    textoDescriptivo: r.texto_descriptivo ?? defaultCompany.textoDescriptivo,
    headers: { ...defaultCompany.headers, ...(r.headers ?? {}) },
    pieTexto: r.pie_texto ?? defaultCompany.pieTexto,
  };
}

let companyCache: CompanyInfo | null = null;

export async function getCompany(): Promise<CompanyInfo> {
  const { data, error } = await supabase
    .from("kardex_report_config")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    console.error("getCompany error", error);
    return companyCache ?? defaultCompany;
  }
  companyCache = rowToCompany(data);
  return companyCache;
}

export function getCompanyCached(): CompanyInfo {
  return companyCache ?? defaultCompany;
}

export async function saveCompany(c: CompanyInfo): Promise<void> {
  // Get singleton row id
  const { data: existing } = await supabase
    .from("kardex_report_config")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    titulo: c.titulo,
    codigo: c.codigo,
    version: c.version,
    fecha: c.fecha,
    razon_social: c.razonSocial,
    ruc: c.ruc,
    direccion: c.direccion,
    actividad_economica: c.actividadEconomica,
    texto_descriptivo: c.textoDescriptivo,
    pie_texto: c.pieTexto,
    headers: c.headers as any,
  };

  if (existing?.id) {
    const { error } = await supabase.from("kardex_report_config").update(payload).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("kardex_report_config").insert(payload);
    if (error) throw error;
  }
  companyCache = c;
}

// =============== KARDEX DEFAULTS (responsable predeterminado) ===============

export interface KardexDefaults {
  responsibleWorkerId?: string;
  responsibleName?: string;
  responsibleSignature?: string; // dataURL PNG
}

let kardexDefaultsCache: KardexDefaults | null = null;

export async function getKardexDefaults(): Promise<KardexDefaults> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("module", "kardex")
    .eq("key", "default_responsible")
    .maybeSingle();
  if (error || !data) {
    return kardexDefaultsCache ?? {};
  }
  const v = (data.value ?? {}) as KardexDefaults;
  kardexDefaultsCache = v;
  return v;
}

export function getKardexDefaultsCached(): KardexDefaults {
  return kardexDefaultsCache ?? {};
}

export async function saveKardexDefaults(v: KardexDefaults): Promise<void> {
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("module", "kardex")
    .eq("key", "default_responsible")
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from("app_settings")
      .update({ value: v as any })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("app_settings")
      .insert({ module: "kardex", key: "default_responsible", value: v as any });
    if (error) throw error;
  }
  kardexDefaultsCache = v;
}

// =============== SIGNATURE SETTINGS ===============

export interface SignatureSettings {
  /** Umbral de coincidencia mínimo (0..1). Default 0.85 */
  matchThreshold: number;
}

const DEFAULT_SIGNATURE_SETTINGS: SignatureSettings = { matchThreshold: 0.85 };
let signatureSettingsCache: SignatureSettings | null = null;

export async function getSignatureSettings(): Promise<SignatureSettings> {
  if (signatureSettingsCache) return signatureSettingsCache;
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("module", "signature")
    .eq("key", "match")
    .maybeSingle();
  if (error || !data) {
    signatureSettingsCache = DEFAULT_SIGNATURE_SETTINGS;
    return signatureSettingsCache;
  }
  const v = (data.value ?? {}) as Partial<SignatureSettings>;
  const merged: SignatureSettings = {
    matchThreshold:
      typeof v.matchThreshold === "number" && v.matchThreshold > 0 && v.matchThreshold <= 1
        ? v.matchThreshold
        : DEFAULT_SIGNATURE_SETTINGS.matchThreshold,
  };
  signatureSettingsCache = merged;
  return merged;
}

export function getSignatureSettingsCached(): SignatureSettings {
  return signatureSettingsCache ?? DEFAULT_SIGNATURE_SETTINGS;
}

export async function saveSignatureSettings(v: SignatureSettings): Promise<void> {
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("module", "signature")
    .eq("key", "match")
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from("app_settings")
      .update({ value: v as any })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("app_settings")
      .insert({ module: "signature", key: "match", value: v as any });
    if (error) throw error;
  }
  signatureSettingsCache = v;
}

