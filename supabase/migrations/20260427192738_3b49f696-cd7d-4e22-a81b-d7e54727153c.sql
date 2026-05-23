REVOKE ALL ON FUNCTION public.has_module_permission(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_module_permission(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_module_permission(uuid, text, text) TO authenticated;