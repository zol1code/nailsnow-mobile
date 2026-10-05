BEGIN;

-- Rejects new bookings outside the designer's published hours.
CREATE FUNCTION public.validate_appointment_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  selected_schedule public.designer_availability%ROWTYPE;
  booking_start timestamp;
  booking_end timestamp;
BEGIN
  -- Requires valid scheduling information.
  IF NEW.designer_id IS NULL
    OR NEW.appointment_date IS NULL
    OR NEW.appointment_time IS NULL
    OR NEW.duration_minutes IS NULL
    OR NEW.duration_minutes <= 0
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1003',
      MESSAGE = 'BOOKING_OUTSIDE_AVAILABILITY';
  END IF;

  -- PostgreSQL weekdays: Sunday = 0, Monday = 1, etc.
  SELECT *
  INTO selected_schedule
  FROM public.designer_availability
  WHERE designer_id = NEW.designer_id
    AND day_of_week =
      EXTRACT(DOW FROM NEW.appointment_date)::smallint;

  -- Missing schedules and closed days cannot receive bookings.
  IF NOT FOUND OR NOT selected_schedule.is_available THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1003',
      MESSAGE = 'BOOKING_OUTSIDE_AVAILABILITY';
  END IF;

  booking_start :=
    NEW.appointment_date + NEW.appointment_time;

  booking_end :=
    booking_start + make_interval(mins => NEW.duration_minutes);

  -- Uses complete timestamps so bookings cannot wrap past midnight.
  IF booking_start <
      NEW.appointment_date + selected_schedule.start_time
    OR booking_end >
      NEW.appointment_date + selected_schedule.end_time
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P1003',
      MESSAGE = 'BOOKING_OUTSIDE_AVAILABILITY';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_availability_before_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_availability();

COMMIT;