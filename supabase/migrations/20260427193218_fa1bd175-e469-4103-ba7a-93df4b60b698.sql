DROP POLICY IF EXISTS "Authorized users can delete kardex entries" ON public.kardex_entries;

CREATE POLICY "Authorized users can delete kardex entries"
ON public.kardex_entries
FOR DELETE
TO authenticated
USING (
  public.has_module_permission(auth.uid(), 'kardex', 'delete')
  OR public.has_module_permission(auth.uid(), 'kardex', 'edit')
);