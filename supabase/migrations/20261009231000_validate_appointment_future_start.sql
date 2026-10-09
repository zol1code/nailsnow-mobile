BEGIN;

-- Rejects new appointments whose start time has already passed.
CREATE FUNCTION public.validate_appointment_future_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.appointment_date IS NOT NULL
    AND NEW.appointment_time IS NOT NULL
    AND (
      (NEW.appointment_date + NEW.appointment_time)
        AT TIME ZONE 'Europe/Dublin'
    ) <= clock_timestamp()
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1004',
      MESSAGE = 'BOOKING_TIME_ALREADY_PASSED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_future_start_before_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_future_start();

COMMIT;