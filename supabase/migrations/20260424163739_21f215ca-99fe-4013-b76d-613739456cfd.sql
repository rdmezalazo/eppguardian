-- Tabla de personalización de áreas (icono + colores tailwind)
CREATE TABLE public.area_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'HardHat',
  badge_class TEXT NOT NULL DEFAULT 'bg-primary text-primary-foreground hover:bg-primary/90',
  soft_class TEXT NOT NULL DEFAULT 'bg-primary/10 text-primary',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.area_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view area_settings"
  ON public.area_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "TI and gerencia can manage area_settings"
  ON public.area_settings FOR ALL
  TO authenticated
  USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE TRIGGER update_area_settings_updated_at
  BEFORE UPDATE ON public.area_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semillas iniciales basadas en las áreas conocidas
INSERT INTO public.area_settings (name, icon, badge_class, soft_class, sort_order) VALUES
  ('Almacén', 'Package', 'bg-amber-500 text-white hover:bg-amber-500/90', 'bg-amber-500/10 text-amber-700 dark:text-amber-400', 10),
  ('Mantenimiento', 'Wrench', 'bg-blue-600 text-white hover:bg-blue-600/90', 'bg-blue-600/10 text-blue-700 dark:text-blue-400', 20),
  ('Producción', 'Factory', 'bg-orange-600 text-white hover:bg-orange-600/90', 'bg-orange-600/10 text-orange-700 dark:text-orange-400', 30),
  ('Laboratorio', 'FlaskConical', 'bg-purple-600 text-white hover:bg-purple-600/90', 'bg-purple-600/10 text-purple-700 dark:text-purple-400', 40),
  ('Transporte', 'Truck', 'bg-cyan-600 text-white hover:bg-cyan-600/90', 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-400', 50),
  ('Limpieza', 'Sparkles', 'bg-teal-600 text-white hover:bg-teal-600/90', 'bg-teal-600/10 text-teal-700 dark:text-teal-400', 60),
  ('Visitas/Contratistas', 'UserCheck', 'bg-pink-600 text-white hover:bg-pink-600/90', 'bg-pink-600/10 text-pink-700 dark:text-pink-400', 70),
  ('Supervisores', 'ClipboardCheck', 'bg-indigo-600 text-white hover:bg-indigo-600/90', 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-400', 80),
  ('Administración', 'Building2', 'bg-slate-600 text-white hover:bg-slate-600/90', 'bg-slate-600/10 text-slate-700 dark:text-slate-400', 90),
  ('Salud', 'Stethoscope', 'bg-rose-600 text-white hover:bg-rose-600/90', 'bg-rose-600/10 text-rose-700 dark:text-rose-400', 100),
  ('TI', 'Cpu', 'bg-sky-600 text-white hover:bg-sky-600/90', 'bg-sky-600/10 text-sky-700 dark:text-sky-400', 110)
ON CONFLICT (name) DO NOTHING;