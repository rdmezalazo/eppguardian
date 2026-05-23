-- Create EPP catalog table
CREATE TABLE public.epps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL,
  nombre TEXT NOT NULL,
  actividad TEXT,
  descripcion TEXT,
  riesgo_previsto TEXT,
  norma TEXT,
  imagen_url TEXT,
  vida_util_dias INTEGER NOT NULL DEFAULT 90,
  requiere_firma BOOLEAN NOT NULL DEFAULT true,
  estado TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.epps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view epps"
ON public.epps FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "TI and gerencia can manage epps"
ON public.epps FOR ALL
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE TRIGGER update_epps_updated_at
BEFORE UPDATE ON public.epps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalog
INSERT INTO public.epps (area, nombre, actividad, descripcion, riesgo_previsto, norma) VALUES
('Almacén','Tapón reutilizable','Operaciones generales','Protección auditiva insertable','Ruido >85 dB','ANSI S3.19'),
('Almacén','Lentes claros/oscuros','Manipulación','Protección visual','Proyección de partículas / radiación UV','ANSI Z87.1'),
('Almacén','Sobre lentes','Personal con lentes','Protección adicional','Impacto de partículas','ANSI Z87.1'),
('Mantenimiento','Casco de seguridad','Mantenimiento general','Protección craneal','Golpes / caída de objetos','ANSI Z89.1'),
('Mantenimiento','Guantes de badana','Manipulación','Protección de manos','Abrasión','EN 388'),
('Mantenimiento','Calzado de seguridad','Operaciones','Protección de pies','Aplastamiento','EN ISO 20345'),
('Mantenimiento','Bloqueador solar','Trabajo exterior','Protección dérmica','Radiación UV','SPF estándar'),
('Revestimiento','Respirador media cara','Aplicación revestimiento','Protección respiratoria','Inhalación de partículas','NIOSH'),
('Revestimiento','Filtro P100','Procesos con polvo','Filtrado de partículas','Polvos finos','NIOSH'),
('Revestimiento','Guante nitrilo','Manipulación química','Protección manos','Exposición a químicos','EN 374'),
('Prensa','Guantes de badana','Operación de prensa','Protección manos','Atrapamiento leve','EN 388'),
('Prensa','Casco de seguridad','Operación','Protección craneal','Golpes','ANSI Z89.1'),
('Limpieza por abrasión','Respirador media cara','Limpieza abrasiva','Protección respiratoria','Polvo','NIOSH'),
('Limpieza por abrasión','Guantes de cuero','Trabajo abrasivo','Protección manos','Cortes / abrasión','EN 388'),
('Poliuretano','Botas de jebe','Manipulación química','Protección pies','Exposición a químicos','EN ISO 20345'),
('Poliuretano','Guante nitrilo','Aplicación PU','Protección manos','Químicos','EN 374'),
('Metalmecánica','Protector facial','Corte / esmerilado','Protección facial','Proyección de partículas','ANSI Z87.1'),
('Metalmecánica','Guantes de cuero','Trabajo mecánico','Protección manos','Cortes','EN 388'),
('Molino','Orejera','Operación molino','Protección auditiva','Ruido elevado','ANSI S3.19'),
('Molino','Respirador media cara','Procesos con polvo','Protección respiratoria','Polvo fino','NIOSH'),
('Maestranza','Traje de cuero','Soldadura','Protección corporal','Calor / chispas','EN 11611'),
('Maestranza','Botas de soldar','Soldadura','Protección pies','Calor','EN ISO 20349'),
('Maestranza','Chavito soldador','Soldadura','Protección cabeza','Radiación / chispas','EN 11611'),
('Limpieza','Botas jebe caña alta','Limpieza general','Protección pies','Humedad / líquidos','EN ISO 20345'),
('Limpieza','Mascarilla','Limpieza general','Protección respiratoria','Polvo leve','EN 149'),
('Visitas/Contratistas','Casco de seguridad','Ingreso a planta','Protección craneal','Golpes','ANSI Z89.1'),
('Visitas/Contratistas','Calzado de seguridad','Ingreso a planta','Protección pies','Aplastamiento','EN ISO 20345'),
('Supervisores','Chaleco reflectivo','Supervisión en campo','Alta visibilidad','Atropellos / baja visibilidad','ANSI/ISEA 107'),
('Supervisores','Guantes anticorte','Supervisión operativa','Protección manos','Cortes','EN 388');