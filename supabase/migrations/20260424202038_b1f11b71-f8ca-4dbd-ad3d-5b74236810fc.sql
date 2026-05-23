-- =========================================
-- KARDEX ENTRIES
-- =========================================
CREATE TABLE public.kardex_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  epp_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'delivery',
  delivery_type TEXT NOT NULL DEFAULT 'A',
  quantity INTEGER NOT NULL DEFAULT 1,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  change_request_date DATE,
  return_date DATE,
  reason TEXT NOT NULL DEFAULT 'entrega_inicial',
  observations TEXT,
  worker_signature TEXT,
  responsible_signature TEXT,
  responsible_name TEXT,
  voided BOOLEAN NOT NULL DEFAULT false,
  void_reason TEXT,
  voided_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_kardex_entries_worker ON public.kardex_entries(worker_id);
CREATE INDEX idx_kardex_entries_epp ON public.kardex_entries(epp_id);
CREATE INDEX idx_kardex_entries_delivery_date ON public.kardex_entries(delivery_date);

ALTER TABLE public.kardex_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kardex entries"
  ON public.kardex_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TI and gerencia can manage kardex entries"
  ON public.kardex_entries FOR ALL
  TO authenticated
  USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE TRIGGER update_kardex_entries_updated_at
  BEFORE UPDATE ON public.kardex_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- KARDEX REPORT CONFIG (singleton)
-- =========================================
CREATE TABLE public.kardex_report_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT 'KARDEX DE EQUIPO DE PROTECCIÓN PERSONAL',
  codigo TEXT NOT NULL DEFAULT 'L-SST-REG-001',
  version TEXT NOT NULL DEFAULT '1.0',
  fecha TEXT NOT NULL DEFAULT '01/01/2025',
  razon_social TEXT NOT NULL DEFAULT 'LIVIGUI S.A.C.',
  ruc TEXT NOT NULL DEFAULT '20XXXXXXXXX',
  direccion TEXT NOT NULL DEFAULT 'Av. Principal 123 - Arequipa',
  actividad_economica TEXT NOT NULL DEFAULT 'Servicios Generales',
  texto_descriptivo TEXT NOT NULL DEFAULT 'Yo, el trabajador identificado en el presente documento, declaro haber recibido de {razonSocial} los Equipos de Protección Personal (EPP) descritos a continuación, comprometiéndome a su uso adecuado, conservación y devolución cuando corresponda.',
  pie_texto TEXT NOT NULL DEFAULT 'Tipo de Entrega: A = Asignado | C = Cambio | P = Pérdida',
  headers JSONB NOT NULL DEFAULT '{
    "nro": "Nro",
    "nombre": "Nombre(s) del(los) equipo(s) de protección de seguridad o emergencia entregado",
    "cantidad": "Cantidad",
    "fechaEntrega": "Fecha de Entrega",
    "tipoEntrega": "Tipo de Entrega*",
    "motivoEntrega": "Motivo de Entrega",
    "fechaDevolucion": "Fecha de Devolución",
    "firmaUsuario": "Firma de Usuario",
    "firmaResponsable": "Firma del Responsable del Registro"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kardex_report_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view report config"
  ON public.kardex_report_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TI and gerencia can manage report config"
  ON public.kardex_report_config FOR ALL
  TO authenticated
  USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE TRIGGER update_kardex_report_config_updated_at
  BEFORE UPDATE ON public.kardex_report_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default singleton row
INSERT INTO public.kardex_report_config DEFAULT VALUES;