BEGIN;

-- Returns the code only to the customer who owns the booking.
CREATE FUNCTION public.get_appointment_start_code(
  p_appointment_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking public.appointments%ROWTYPE;
  code_value text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SIGN_IN_REQUIRED';
  END IF;

  SELECT *
  INTO booking
  FROM public.appointments
  WHERE id = p_appointment_id
    AND customer_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_UNAVAILABLE';
  END IF;

  IF booking.customer_id = booking.designer_id THEN
    RAISE EXCEPTION 'SELF_BOOKING_NOT_SUPPORTED';
  END IF;

  IF booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_CONFIRMED';
  END IF;

  -- Creates one code and preserves it on subsequent requests.
  INSERT INTO public.appointment_start_verifications (
    appointment_id
  )
  VALUES (booking.id)
  ON CONFLICT (appointment_id) DO NOTHING;

  SELECT start_code
  INTO code_value
  FROM public.appointment_start_verifications
  WHERE appointment_id = booking.id
    AND started_at IS NULL;

  IF code_value IS NULL THEN
    RAISE EXCEPTION 'START_CODE_ALREADY_USED';
  END IF;

  RETURN code_value;
END;
$$;

-- Validates the customer's code without revealing it to the designer.
CREATE FUNCTION public.start_appointment_with_code(
  p_appointment_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking public.appointments%ROWTYPE;
  verification public.appointment_start_verifications%ROWTYPE;
  attempts integer;
  started_time timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SIGN_IN_REQUIRED';
  END IF;

  -- Serializes simultaneous attempts for the same booking.
  SELECT *
  INTO booking
  FROM public.appointments
  WHERE id = p_appointment_id
    AND designer_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_UNAVAILABLE';
  END IF;

  IF booking.customer_id = booking.designer_id THEN
    RETURN jsonb_build_object(
      'result', 'self_booking_not_supported'
    );
  END IF;

  SELECT *
  INTO verification
  FROM public.appointment_start_verifications
  WHERE appointment_id = booking.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'result', 'code_not_requested'
    );
  END IF;

  -- A repeated request cannot start the appointment twice.
  IF verification.started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'already_started'
    );
  END IF;

  IF booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object(
      'result', 'not_confirmed'
    );
  END IF;

  IF booking.appointment_date IS DISTINCT FROM
    (clock_timestamp() AT TIME ZONE 'Europe/Dublin')::date
  THEN
    RETURN jsonb_build_object(
      'result', 'wrong_date'
    );
  END IF;

  IF verification.locked_until > clock_timestamp() THEN
    RETURN jsonb_build_object(
      'result', 'locked',
      'retry_at', verification.locked_until
    );
  END IF;

  -- Resets the counter after a previous lock has expired.
  attempts := CASE
    WHEN verification.locked_until IS NOT NULL THEN 0
    ELSE verification.failed_attempts
  END;

  IF p_code IS NULL
    OR upper(btrim(p_code)) <> verification.start_code
  THEN
    attempts := attempts + 1;

    UPDATE public.appointment_start_verifications
    SET
      failed_attempts = attempts,
      locked_until = CASE
        WHEN attempts >= 5
          THEN clock_timestamp() + interval '15 minutes'
        ELSE NULL
      END
    WHERE appointment_id = booking.id;

    -- Returns normally so failed attempts remain saved.
    RETURN jsonb_build_object(
      'result', CASE
        WHEN attempts >= 5 THEN 'locked'
        ELSE 'invalid_code'
      END,
      'attempts_remaining', greatest(0, 5 - attempts)
    );
  END IF;

  started_time := clock_timestamp();

  UPDATE public.appointment_start_verifications
  SET
    started_at = started_time,
    failed_attempts = 0,
    locked_until = NULL
  WHERE appointment_id = booking.id;

  UPDATE public.appointments
  SET status = 'in_progress'
  WHERE id = booking.id;

  RETURN jsonb_build_object(
    'result', 'started',
    'started_at', started_time
  );
END;
$$;

-- Only signed-in users can call these functions.
-- Each function checks ownership internally.
REVOKE ALL ON FUNCTION
  public.get_appointment_start_code(uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.start_appointment_with_code(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.get_appointment_start_code(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.start_appointment_with_code(uuid, text)
TO authenticated;

COMMIT;