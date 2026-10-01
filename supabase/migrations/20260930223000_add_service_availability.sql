BEGIN;

-- Existing and newly created services start as active.
ALTER TABLE public.designer_services
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Updates booking validation to reject inactive services.
CREATE OR REPLACE FUNCTION public.validate_appointment_service()
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
    AND designer_id = NEW.designer_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1001',
      MESSAGE = 'BOOKING_SERVICE_UNAVAILABLE';
  END IF;

  -- Rejects invalid service configuration.
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

  -- Requires the customer's reviewed details to match the catalog.
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

COMMIT;