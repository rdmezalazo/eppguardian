-- Crear enum para tipo de personal
DO $$ BEGIN
  CREATE TYPE public.personnel_type AS ENUM ('administrativo', 'operativo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Agregar columna personnel_type a profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS personnel_type public.personnel_type NOT NULL DEFAULT 'administrativo';

-- Índice para filtrar rápido por tipo
CREATE INDEX IF NOT EXISTS idx_profiles_personnel_type ON public.profiles(personnel_type);