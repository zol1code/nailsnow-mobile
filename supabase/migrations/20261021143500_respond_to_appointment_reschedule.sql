BEGIN;

CREATE FUNCTION public.respond_to_appointment_reschedule(
  p_request_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking_id uuid;
  booking public.appointments%ROWTYPE;
  proposal public.appointment_reschedule_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL
    OR p_action NOT IN ('accept', 'decline', 'withdraw')
  THEN
    RETURN jsonb_build_object('result', 'invalid_action');
  END IF;

  SELECT appointment_id
  INTO booking_id
  FROM public.appointment_reschedule_requests
  WHERE id = p_request_id;

  -- Always locks the appointment before the proposal.
  SELECT *
  INTO booking
  FROM public.appointments
  WHERE id = booking_id
    AND (
      customer_id = auth.uid()
      OR designer_id = auth.uid()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO proposal
  FROM public.appointment_reschedule_requests
  WHERE id = p_request_id
    AND appointment_id = booking.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reschedule request not found'
      USING ERRCODE = '42501';
  END IF;

  -- The sender may withdraw, but cannot accept their own proposal.
  IF (
    p_action = 'withdraw'
    AND proposal.requested_by IS DISTINCT FROM auth.uid()
  ) OR (
    p_action IN ('accept', 'decline')
    AND proposal.requested_by = auth.uid()
  ) THEN
    RETURN jsonb_build_object('result', 'not_allowed');
  END IF;

  -- Repeated responses never change an already handled proposal.
  IF proposal.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'result', 'already_handled',
      'request_status', proposal.status
    );
  END IF;

  IF p_action = 'withdraw' THEN
    UPDATE public.appointment_reschedule_requests
    SET status = 'withdrawn',
        responded_at = clock_timestamp()
    WHERE id = proposal.id;

    RETURN jsonb_build_object('result', 'withdrawn');
  END IF;

  -- An old proposal cannot move a changed or started appointment.
  IF booking.status IS DISTINCT FROM 'confirmed'
    OR booking.customer_id = booking.designer_id
    OR booking.appointment_date
      IS DISTINCT FROM proposal.original_date
    OR booking.appointment_time
      IS DISTINCT FROM proposal.original_time
    OR EXISTS (
      SELECT 1
      FROM public.appointment_start_verifications
      WHERE appointment_id = booking.id
        AND started_at IS NOT NULL
    )
  THEN
    UPDATE public.appointment_reschedule_requests
    SET status = 'expired',
        responded_at = clock_timestamp()
    WHERE id = proposal.id;

    RETURN jsonb_build_object('result', 'expired');
  END IF;

  IF p_action = 'decline' THEN
    UPDATE public.appointment_reschedule_requests
    SET status = 'declined',
        responded_at = clock_timestamp()
    WHERE id = proposal.id;

    RETURN jsonb_build_object('result', 'declined');
  END IF;

  -- Checks availability again when the other participant accepts.
  IF (
    (proposal.proposed_date + proposal.proposed_time)
      AT TIME ZONE 'Europe/Dublin'
  ) <= clock_timestamp()
    OR NOT EXISTS (
      SELECT 1
      FROM public.get_reschedule_time_slots(
        booking.id,
        proposal.proposed_date
      ) AS available_slot
      WHERE available_slot.slot_time = proposal.proposed_time
        AND available_slot.is_available = true
    )
  THEN
    UPDATE public.appointment_reschedule_requests
    SET status = 'expired',
        responded_at = clock_timestamp()
    WHERE id = proposal.id;

    RETURN jsonb_build_object('result', 'time_unavailable');
  END IF;

  BEGIN
    -- Updates only the agreed date and time.
    UPDATE public.appointments
    SET appointment_date = proposal.proposed_date,
        appointment_time = proposal.proposed_time
    WHERE id = booking.id;

    -- Invalidates the old start code.
    -- The customer can request a new one for the rescheduled booking.
    DELETE FROM public.appointment_start_verifications
    WHERE appointment_id = booking.id
      AND started_at IS NULL;

    UPDATE public.appointment_reschedule_requests
    SET status = 'accepted',
        responded_at = clock_timestamp()
    WHERE id = proposal.id;

  EXCEPTION
    -- Another booking may have reserved this time concurrently.
    WHEN exclusion_violation THEN
      UPDATE public.appointment_reschedule_requests
      SET status = 'expired',
          responded_at = clock_timestamp()
      WHERE id = proposal.id;

      RETURN jsonb_build_object('result', 'time_unavailable');
  END;

  RETURN jsonb_build_object(
    'result', 'accepted',
    'appointment_id', booking.id,
    'appointment_date', proposal.proposed_date,
    'appointment_time', proposal.proposed_time
  );
END;
$$;

REVOKE ALL ON FUNCTION
public.respond_to_appointment_reschedule(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.respond_to_appointment_reschedule(uuid, text)
TO authenticated;

COMMIT;