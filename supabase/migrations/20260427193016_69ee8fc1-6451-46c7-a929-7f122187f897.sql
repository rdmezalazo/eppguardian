CREATE OR REPLACE FUNCTION public.enforce_trabajadores_update_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_ti_user_safe(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF OLD.active IS DISTINCT FROM NEW.active THEN
    IF OLD.active = true AND NEW.active = false THEN
      IF NOT public.has_module_permission(auth.uid(), 'trabajadores', 'void') THEN
        RAISE EXCEPTION 'No tiene permiso para anular trabajadores';
      END IF;
      RETURN NEW;
    END IF;

    IF NOT public.has_module_permission(auth.uid(), 'trabajadores', 'edit') THEN
      RAISE EXCEPTION 'No tiene permiso para cambiar el estado del trabajador';
    END IF;
  END IF;

  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
    IF NOT public.has_module_permission(auth.uid(), 'trabajadores', 'edit') THEN
      RAISE EXCEPTION 'No tiene permiso para editar trabajadores';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_trabajadores_update_permission_trigger ON public.profiles;
CREATE TRIGGER enforce_trabajadores_update_permission_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_trabajadores_update_permission();

CREATE OR REPLACE FUNCTION public.enforce_kardex_headers_update_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  void_changed boolean;
  non_void_changed boolean;
BEGIN
  IF public.is_ti_user_safe(auth.uid()) THEN
    RETURN NEW;
  END IF;

  void_changed :=
    OLD.voided IS DISTINCT FROM NEW.voided
    OR OLD.void_reason IS DISTINCT FROM NEW.void_reason
    OR OLD.voided_at IS DISTINCT FROM NEW.voided_at;

  non_void_changed :=
    OLD.worker_id IS DISTINCT FROM NEW.worker_id
    OR OLD.delivery_date IS DISTINCT FROM NEW.delivery_date
    OR OLD.change_request_date IS DISTINCT FROM NEW.change_request_date
    OR OLD.return_date IS DISTINCT FROM NEW.return_date
    OR OLD.responsible_name IS DISTINCT FROM NEW.responsible_name
    OR OLD.responsible_signature IS DISTINCT FROM NEW.responsible_signature
    OR OLD.worker_signature IS DISTINCT FROM NEW.worker_signature
    OR OLD.observations IS DISTINCT FROM NEW.observations;

  IF void_changed AND NOT public.has_module_permission(auth.uid(), 'kardex', 'void') THEN
    RAISE EXCEPTION 'No tiene permiso para anular Kardex';
  END IF;

  IF non_void_changed AND NOT public.has_module_permission(auth.uid(), 'kardex', 'edit') THEN
    RAISE EXCEPTION 'No tiene permiso para editar Kardex';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_kardex_headers_update_permission_trigger ON public.kardex_headers;
CREATE TRIGGER enforce_kardex_headers_update_permission_trigger
BEFORE UPDATE ON public.kardex_headers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_kardex_headers_update_permission();

CREATE OR REPLACE FUNCTION public.enforce_kardex_entries_update_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  void_changed boolean;
  non_void_changed boolean;
BEGIN
  IF public.is_ti_user_safe(auth.uid()) THEN
    RETURN NEW;
  END IF;

  void_changed :=
    OLD.voided IS DISTINCT FROM NEW.voided
    OR OLD.void_reason IS DISTINCT FROM NEW.void_reason
    OR OLD.voided_at IS DISTINCT FROM NEW.voided_at;

  non_void_changed :=
    OLD.worker_id IS DISTINCT FROM NEW.worker_id
    OR OLD.header_id IS DISTINCT FROM NEW.header_id
    OR OLD.epp_id IS DISTINCT FROM NEW.epp_id
    OR OLD.event_type IS DISTINCT FROM NEW.event_type
    OR OLD.delivery_type IS DISTINCT FROM NEW.delivery_type
    OR OLD.quantity IS DISTINCT FROM NEW.quantity
    OR OLD.delivery_date IS DISTINCT FROM NEW.delivery_date
    OR OLD.change_request_date IS DISTINCT FROM NEW.change_request_date
    OR OLD.return_date IS DISTINCT FROM NEW.return_date
    OR OLD.reason IS DISTINCT FROM NEW.reason
    OR OLD.observations IS DISTINCT FROM NEW.observations
    OR OLD.worker_signature IS DISTINCT FROM NEW.worker_signature
    OR OLD.responsible_signature IS DISTINCT FROM NEW.responsible_signature
    OR OLD.responsible_name IS DISTINCT FROM NEW.responsible_name;

  IF void_changed AND NOT public.has_module_permission(auth.uid(), 'kardex', 'void') THEN
    RAISE EXCEPTION 'No tiene permiso para anular Kardex';
  END IF;

  IF non_void_changed AND NOT public.has_module_permission(auth.uid(), 'kardex', 'edit') THEN
    RAISE EXCEPTION 'No tiene permiso para editar Kardex';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_kardex_entries_update_permission_trigger ON public.kardex_entries;
CREATE TRIGGER enforce_kardex_entries_update_permission_trigger
BEFORE UPDATE ON public.kardex_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_kardex_entries_update_permission();

REVOKE ALL ON FUNCTION public.enforce_trabajadores_update_permission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_kardex_headers_update_permission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_kardex_entries_update_permission() FROM PUBLIC;