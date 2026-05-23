CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module text,
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_ti_user_safe(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.module_permissions mp
      WHERE mp.user_id = _user_id
        AND mp.module = _module
        AND mp.action = _action
        AND mp.granted = true
    );
$$;

DROP POLICY IF EXISTS "TI and gerencia can manage epps" ON public.epps;
DROP POLICY IF EXISTS "Authorized users can create epps" ON public.epps;
DROP POLICY IF EXISTS "Authorized users can edit epps" ON public.epps;
DROP POLICY IF EXISTS "Authorized users can delete epps" ON public.epps;

CREATE POLICY "Authorized users can create epps"
ON public.epps
FOR INSERT
TO authenticated
WITH CHECK (public.has_module_permission(auth.uid(), 'epps', 'create'));

CREATE POLICY "Authorized users can edit epps"
ON public.epps
FOR UPDATE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'epps', 'edit'))
WITH CHECK (public.has_module_permission(auth.uid(), 'epps', 'edit'));

CREATE POLICY "Authorized users can delete epps"
ON public.epps
FOR DELETE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'epps', 'delete'));

DROP POLICY IF EXISTS "ti_users_manage_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authorized users can create trabajadores" ON public.profiles;
DROP POLICY IF EXISTS "Authorized users can edit trabajadores" ON public.profiles;
DROP POLICY IF EXISTS "Authorized users can void trabajadores" ON public.profiles;

CREATE POLICY "Authorized users can create trabajadores"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_module_permission(auth.uid(), 'trabajadores', 'create')
);

CREATE POLICY "Authorized users can edit trabajadores"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_ti_user_safe(auth.uid())
  OR (auth.uid() = user_id AND active = true)
  OR (active = true AND public.has_module_permission(auth.uid(), 'trabajadores', 'edit'))
  OR (active = true AND public.has_module_permission(auth.uid(), 'trabajadores', 'void'))
)
WITH CHECK (
  public.is_ti_user_safe(auth.uid())
  OR auth.uid() = user_id
  OR (active = true AND public.has_module_permission(auth.uid(), 'trabajadores', 'edit'))
  OR (active = false AND public.has_module_permission(auth.uid(), 'trabajadores', 'void'))
);

CREATE POLICY "Authorized users can void trabajadores"
ON public.profiles
FOR UPDATE
TO authenticated
USING (active = true AND public.has_module_permission(auth.uid(), 'trabajadores', 'void'))
WITH CHECK (active = false AND public.has_module_permission(auth.uid(), 'trabajadores', 'void'));

DROP POLICY IF EXISTS "Authenticated users can manage kardex headers" ON public.kardex_headers;
DROP POLICY IF EXISTS "TI and gerencia can manage kardex headers" ON public.kardex_headers;
DROP POLICY IF EXISTS "Authorized users can create kardex headers" ON public.kardex_headers;
DROP POLICY IF EXISTS "Authorized users can edit kardex headers" ON public.kardex_headers;
DROP POLICY IF EXISTS "Authorized users can void kardex headers" ON public.kardex_headers;
DROP POLICY IF EXISTS "Authorized users can delete kardex headers" ON public.kardex_headers;

CREATE POLICY "Authorized users can create kardex headers"
ON public.kardex_headers
FOR INSERT
TO authenticated
WITH CHECK (public.has_module_permission(auth.uid(), 'kardex', 'create'));

CREATE POLICY "Authorized users can edit kardex headers"
ON public.kardex_headers
FOR UPDATE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'kardex', 'edit'))
WITH CHECK (public.has_module_permission(auth.uid(), 'kardex', 'edit'));

CREATE POLICY "Authorized users can void kardex headers"
ON public.kardex_headers
FOR UPDATE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'kardex', 'void'))
WITH CHECK (public.has_module_permission(auth.uid(), 'kardex', 'void'));

CREATE POLICY "Authorized users can delete kardex headers"
ON public.kardex_headers
FOR DELETE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'kardex', 'delete'));

DROP POLICY IF EXISTS "Authenticated users can manage kardex entries" ON public.kardex_entries;
DROP POLICY IF EXISTS "TI and gerencia can manage kardex entries" ON public.kardex_entries;
DROP POLICY IF EXISTS "Authorized users can create kardex entries" ON public.kardex_entries;
DROP POLICY IF EXISTS "Authorized users can edit kardex entries" ON public.kardex_entries;
DROP POLICY IF EXISTS "Authorized users can void kardex entries" ON public.kardex_entries;
DROP POLICY IF EXISTS "Authorized users can delete kardex entries" ON public.kardex_entries;

CREATE POLICY "Authorized users can create kardex entries"
ON public.kardex_entries
FOR INSERT
TO authenticated
WITH CHECK (public.has_module_permission(auth.uid(), 'kardex', 'create'));

CREATE POLICY "Authorized users can edit kardex entries"
ON public.kardex_entries
FOR UPDATE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'kardex', 'edit'))
WITH CHECK (public.has_module_permission(auth.uid(), 'kardex', 'edit'));

CREATE POLICY "Authorized users can void kardex entries"
ON public.kardex_entries
FOR UPDATE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'kardex', 'void'))
WITH CHECK (public.has_module_permission(auth.uid(), 'kardex', 'void'));

CREATE POLICY "Authorized users can delete kardex entries"
ON public.kardex_entries
FOR DELETE
TO authenticated
USING (public.has_module_permission(auth.uid(), 'kardex', 'delete'));

DELETE FROM public.module_permissions
WHERE (module = 'epps' AND action NOT IN ('create', 'edit', 'delete'))
   OR (module = 'trabajadores' AND action NOT IN ('create', 'edit', 'void'))
   OR (module = 'kardex' AND action NOT IN ('create', 'edit', 'void', 'delete'))
   OR (module = 'reportes' AND action NOT IN ('download'));