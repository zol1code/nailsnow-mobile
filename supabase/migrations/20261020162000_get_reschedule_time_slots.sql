BEGIN;

CREATE FUNCTION public.get_reschedule_time_slots(
  p_appointment_id uuid,
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
  booking public.appointments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Only participants can check rescheduling options.
  SELECT *
  INTO booking
  FROM public.appointments
  WHERE id = p_appointment_id
    AND (
      customer_id = auth.uid()
      OR designer_id = auth.uid()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found'
      USING ERRCODE = '42501';
  END IF;

  -- Rescheduling preserves the booked service and duration.
  IF booking.status IS DISTINCT FROM 'confirmed'
    OR booking.duration_minutes IS NULL
    OR booking.duration_minutes <= 0
    OR p_date IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.appointment_start_verifications AS verification
      WHERE verification.appointment_id = booking.id
        AND verification.started_at IS NOT NULL
    )
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    slots.starts_at::time,
    (
      (
        slots.starts_at AT TIME ZONE 'Europe/Dublin'
      ) > statement_timestamp()

      -- The original date and time are not a new proposal.
      AND slots.starts_at IS DISTINCT FROM (
        booking.appointment_date + booking.appointment_time
      )

      AND NOT EXISTS (
        SELECT 1
        FROM public.appointments AS other_booking
        WHERE other_booking.designer_id = booking.designer_id

          -- The appointment being moved cannot block itself.
          AND other_booking.id <> booking.id
          AND other_booking.status IN (
            'pending', 'confirmed', 'in_progress'
          )
          AND tsrange(
            other_booking.appointment_date
              + other_booking.appointment_time,
            other_booking.appointment_date
              + other_booking.appointment_time
              + make_interval(
                  mins => other_booking.duration_minutes
                ),
            '[)'
          ) && tsrange(
            slots.starts_at,
            slots.starts_at
              + make_interval(mins => booking.duration_minutes),
            '[)'
          )
      )
    )
  FROM public.designer_availability AS schedule
  CROSS JOIN LATERAL generate_series(
    p_date + schedule.start_time,
    p_date + schedule.end_time
      - make_interval(mins => booking.duration_minutes),
    interval '30 minutes'
  ) AS slots(starts_at)
  WHERE schedule.designer_id = booking.designer_id
    AND schedule.day_of_week =
      EXTRACT(DOW FROM p_date)::smallint
    AND schedule.is_available = true
    AND schedule.start_time < schedule.end_time
  ORDER BY slots.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reschedule_time_slots(uuid, date)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_reschedule_time_slots(uuid, date)
TO authenticated;

COMMIT;