-- Create public bucket for worker avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-avatars', 'worker-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Worker avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'worker-avatars');

-- Authenticated users can upload
CREATE POLICY "Authenticated can upload worker avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'worker-avatars');

-- Authenticated users can update
CREATE POLICY "Authenticated can update worker avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'worker-avatars');

-- Authenticated users can delete
CREATE POLICY "Authenticated can delete worker avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'worker-avatars');