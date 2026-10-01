BEGIN;

-- Validates booking details against the registered service.
CREATE FUNCTION public.validate_appointment_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  selected_service public.designer_services%ROWTYPE;
BEGIN
  SELECT *
  INTO selected_service
  FROM public.designer_services
  WHERE id = NEW.service_id
    AND designer_id = NEW.designer_id;

  -- Rejects missing services or services from another designer.
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'BOOKING_SERVICE_UNAVAILABLE';
  END IF;

  -- Rejects incomplete or invalid service configuration.
  IF selected_service.name IS NULL
    OR btrim(selected_service.name) = ''
    OR selected_service.price IS NULL
    OR selected_service.price < 0
    OR selected_service.price::text IN ('NaN', 'Infinity', '-Infinity')
    OR selected_service.duration_minutes IS NULL
    OR selected_service.duration_minutes <= 0
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'BOOKING_SERVICE_UNAVAILABLE';
  END IF;

  -- Requires the details reviewed by the customer to match the catalog.
  IF NEW.service_name IS DISTINCT FROM selected_service.name
    OR NEW.price IS DISTINCT FROM selected_service.price
    OR NEW.duration_minutes IS DISTINCT FROM selected_service.duration_minutes
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1002',
      MESSAGE = 'BOOKING_SERVICE_CHANGED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_service_before_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_service();

COMMIT;