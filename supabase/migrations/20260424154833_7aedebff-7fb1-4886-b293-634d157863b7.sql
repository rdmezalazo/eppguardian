INSERT INTO storage.buckets (id, name, public)
VALUES ('epp-images', 'epp-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "EPP images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'epp-images');

CREATE POLICY "TI/Gerencia can upload epp images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'epp-images'
  AND (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
);

CREATE POLICY "TI/Gerencia can update epp images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'epp-images'
  AND (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
);

CREATE POLICY "TI/Gerencia can delete epp images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'epp-images'
  AND (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
);