BEGIN;

CREATE FUNCTION public.request_appointment_reschedule(
  p_appointment_id uuid,
  p_date date,
  p_time time without time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking public.appointments%ROWTYPE;
  pending_request public.appointment_reschedule_requests%ROWTYPE;
  new_request_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Locks the appointment while creating the proposal.
  SELECT *
  INTO booking
  FROM public.appointments
  WHERE id = p_appointment_id
    AND (
      customer_id = auth.uid()
      OR designer_id = auth.uid()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found'
      USING ERRCODE = '42501';
  END IF;

  IF booking.customer_id = booking.designer_id THEN
    RETURN jsonb_build_object(
      'result', 'self_booking_not_supported'
    );
  END IF;

  IF booking.status IS DISTINCT FROM 'confirmed'
    OR EXISTS (
      SELECT 1
      FROM public.appointment_start_verifications
      WHERE appointment_id = booking.id
        AND started_at IS NOT NULL
    )
  THEN
    RETURN jsonb_build_object(
      'result', 'not_reschedulable'
    );
  END IF;

  -- Allows only one pending proposal per appointment.
  SELECT *
  INTO pending_request
  FROM public.appointment_reschedule_requests
  WHERE appointment_id = booking.id
    AND status = 'pending'
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'result', 'pending_request_exists',
      'request_id', pending_request.id
    );
  END IF;

  IF p_date IS NULL OR p_time IS NULL THEN
    RETURN jsonb_build_object(
      'result', 'invalid_time'
    );
  END IF;

  -- Checks working hours, duration, future time and conflicts.
  -- Uses the original appointment's service duration.
  IF NOT EXISTS (
    SELECT 1
    FROM public.get_reschedule_time_slots(
      booking.id,
      p_date
    ) AS available_slot
    WHERE available_slot.slot_time = p_time
      AND available_slot.is_available = true
  ) THEN
    RETURN jsonb_build_object(
      'result', 'time_unavailable'
    );
  END IF;

  INSERT INTO public.appointment_reschedule_requests (
    appointment_id,
    requested_by,
    original_date,
    original_time,
    proposed_date,
    proposed_time
  )
  VALUES (
    booking.id,
    auth.uid(),
    booking.appointment_date,
    booking.appointment_time,
    p_date,
    p_time
  )
  RETURNING id INTO new_request_id;

  RETURN jsonb_build_object(
    'result', 'requested',
    'request_id', new_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION
public.request_appointment_reschedule(uuid, date, time without time zone)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.request_appointment_reschedule(uuid, date, time without time zone)
TO authenticated;

COMMIT;