ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS validated_signature text,
  ADD COLUMN IF NOT EXISTS signature_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_validated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS signature_validated_by uuid;