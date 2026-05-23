-- kardex_headers: permitir a cualquier usuario autenticado gestionar registros
DROP POLICY IF EXISTS "TI and gerencia can manage kardex headers" ON public.kardex_headers;
CREATE POLICY "Authenticated users can manage kardex headers"
  ON public.kardex_headers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- kardex_entries: idem
DROP POLICY IF EXISTS "TI and gerencia can manage kardex entries" ON public.kardex_entries;
CREATE POLICY "Authenticated users can manage kardex entries"
  ON public.kardex_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);