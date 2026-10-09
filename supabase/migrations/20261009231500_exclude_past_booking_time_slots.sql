BEGIN;

CREATE OR REPLACE FUNCTION public.get_booking_time_slots(
  p_designer_id uuid,
  p_service_id bigint,
  p_date date
)
RETURNS TABLE (
  slot_time time without time zone,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_duration integer;
BEGIN
  -- Only signed-in users may check booking availability.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Uses the real duration of an active service.
  SELECT s.duration_minutes
  INTO service_duration
  FROM public.designer_services AS s
  WHERE s.id = p_service_id
    AND s.designer_id = p_designer_id
    AND s.is_active = true;

  IF service_duration IS NULL OR service_duration <= 0
    OR p_date IS NULL
  THEN
    RAISE EXCEPTION 'BOOKING_SERVICE_UNAVAILABLE'
      USING ERRCODE = 'P1001';
  END IF;

  RETURN QUERY
  SELECT
    slots.starts_at,
    (
      -- Uses Ireland's time zone and the database clock.
      (
        (p_date + slots.starts_at)
          AT TIME ZONE 'Europe/Dublin'
      ) > statement_timestamp()

      AND EXISTS (
        SELECT 1
        FROM public.designer_availability AS schedule
        WHERE schedule.designer_id = p_designer_id
          AND schedule.day_of_week =
            EXTRACT(DOW FROM p_date)::smallint
          AND schedule.is_available = true
          AND slots.starts_at >= schedule.start_time
          AND p_date + slots.starts_at
              + make_interval(mins => service_duration)
            <= p_date + schedule.end_time
      )

      AND NOT EXISTS (
        SELECT 1
        FROM public.appointments AS appointment
        WHERE appointment.designer_id = p_designer_id
          AND appointment.status IN (
            'pending', 'confirmed', 'in_progress'
          )
          -- Checks the full service interval.
          AND tsrange(
            appointment.appointment_date
              + appointment.appointment_time,
            appointment.appointment_date
              + appointment.appointment_time
              + make_interval(
                  mins => appointment.duration_minutes
                ),
            '[)'
          ) && tsrange(
            p_date + slots.starts_at,
            p_date + slots.starts_at
              + make_interval(mins => service_duration),
            '[)'
          )
      )
    )
  FROM (
    VALUES
      ('09:00:00'::time),
      ('10:00:00'::time),
      ('11:00:00'::time),
      ('12:00:00'::time),
      ('14:00:00'::time),
      ('15:00:00'::time),
      ('16:00:00'::time),
      ('17:00:00'::time)
  ) AS slots(starts_at)
  ORDER BY slots.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_time_slots(
  uuid, bigint, date
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_booking_time_slots(
  uuid, bigint, date
) TO authenticated;

COMMIT;