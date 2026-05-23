DROP POLICY IF EXISTS "Authorized users can create kardex entries" ON public.kardex_entries;

CREATE POLICY "Authorized users can create kardex entries"
ON public.kardex_entries
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_module_permission(auth.uid(), 'kardex', 'create')
  OR public.has_module_permission(auth.uid(), 'kardex', 'edit')
);