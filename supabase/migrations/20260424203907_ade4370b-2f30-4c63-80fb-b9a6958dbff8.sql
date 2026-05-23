-- Cabecera de Kardex (maestro)
CREATE TABLE public.kardex_headers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  change_request_date DATE,
  return_date DATE,
  responsible_name TEXT,
  responsible_signature TEXT,
  worker_signature TEXT,
  observations TEXT,
  voided BOOLEAN NOT NULL DEFAULT false,
  void_reason TEXT,
  voided_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_kardex_headers_worker ON public.kardex_headers(worker_id);
CREATE INDEX idx_kardex_headers_delivery_date ON public.kardex_headers(delivery_date);

ALTER TABLE public.kardex_headers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kardex headers"
  ON public.kardex_headers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TI and gerencia can manage kardex headers"
  ON public.kardex_headers FOR ALL
  TO authenticated
  USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE TRIGGER update_kardex_headers_updated_at
  BEFORE UPDATE ON public.kardex_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Añadir header_id a kardex_entries (detalle). Nullable para conservar datos previos.
ALTER TABLE public.kardex_entries
  ADD COLUMN header_id UUID REFERENCES public.kardex_headers(id) ON DELETE CASCADE;

CREATE INDEX idx_kardex_entries_header ON public.kardex_entries(header_id);