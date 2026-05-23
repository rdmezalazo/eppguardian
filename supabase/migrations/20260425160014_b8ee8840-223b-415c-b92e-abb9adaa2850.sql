-- Tabla de permisos por módulo y acción para cada usuario
CREATE TABLE public.module_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module text NOT NULL CHECK (module IN ('epps', 'trabajadores', 'kardex', 'reportes')),
  action text NOT NULL CHECK (action IN ('create', 'edit', 'void', 'delete', 'download')),
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, module, action)
);

CREATE INDEX idx_module_permissions_user ON public.module_permissions(user_id);
CREATE INDEX idx_module_permissions_lookup ON public.module_permissions(user_id, module, action);

ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede leer (para que la UI verifique sus propios permisos y los demás)
CREATE POLICY "Authenticated can view module permissions"
ON public.module_permissions
FOR SELECT
TO authenticated
USING (true);

-- Solo TI puede gestionar
CREATE POLICY "TI can manage module permissions"
ON public.module_permissions
FOR ALL
TO authenticated
USING (is_ti_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_module_permissions_updated_at
BEFORE UPDATE ON public.module_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();