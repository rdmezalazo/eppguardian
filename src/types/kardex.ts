export type UUID = string;

export interface Worker {
  id: UUID;
  firstName: string;
  lastName: string;
  dni: string;
  area: string;
  position: string;
  createdAt: string;
  validatedSignature?: string | null;
  signatureValidated?: boolean;
}

export type EppStatus = "active" | "in_use" | "retired";

export interface EppItem {
  id: UUID;
  name: string;
  type: string;
  usefulLifeDays: number;
  requiresSignature: boolean;
  status: EppStatus;
  createdAt: string;
}

export type DeliveryType = "A" | "C" | "P"; // Asignado, Cambio, Pérdida
export type EventType = "delivery" | "change_request" | "change" | "retire";
export type Reason = "deterioro" | "fin_vida_util" | "perdida" | "entrega_inicial" | "otro";

export interface KardexEntry {
  id: UUID;
  headerId?: UUID;             // referencia a la cabecera maestro-detalle
  workerId: UUID;
  eppId: UUID;
  eventType: EventType;
  deliveryType: DeliveryType; // A / C / P (para el reporte oficial)
  quantity: number;
  deliveryDate: string;        // fecha de entrega
  changeRequestDate?: string;  // fecha de solicitud de cambio
  returnDate?: string;         // fecha de devolución
  reason: Reason;
  observations?: string;
  workerSignature?: string;    // dataURL
  responsibleSignature?: string; // dataURL
  responsibleName?: string;
  createdAt: string;
  voided?: boolean;            // registro anulado (se conserva pero no produce efecto)
  voidReason?: string;         // motivo de anulación
  voidedAt?: string;           // fecha de anulación
}

// Detalle dentro de un registro maestro-detalle
export interface KardexItemInput {
  id?: UUID;                   // existe si ya está persistido
  eppId: UUID;
  eventType: EventType;
  deliveryType: DeliveryType;
  quantity: number;
  reason: Reason;
  returnDate?: string;
  observations?: string;
}

// Cabecera de un registro de Kardex (maestro)
export interface KardexHeader {
  id: UUID;
  workerId: UUID;
  deliveryDate: string;
  changeRequestDate?: string;
  returnDate?: string;
  responsibleName?: string;
  responsibleSignature?: string;
  workerSignature?: string;
  observations?: string;
  voided?: boolean;
  voidReason?: string;
  voidedAt?: string;
  createdAt: string;
  items: KardexEntry[];
}

export interface KardexTableHeaders {
  nro: string;
  nombre: string;
  cantidad: string;
  fechaEntrega: string;
  tipoEntrega: string;
  motivoEntrega: string;
  fechaDevolucion: string;
  firmaUsuario: string;
  firmaResponsable: string;
}

export interface CompanyInfo {
  // Encabezado
  titulo: string;
  codigo: string;
  version: string;
  fecha: string;
  // Datos de empresa
  razonSocial: string;
  ruc: string;
  direccion: string;
  actividadEconomica: string;
  // Cuerpo del documento
  textoDescriptivo: string;
  headers: KardexTableHeaders;
  pieTexto: string;
}
