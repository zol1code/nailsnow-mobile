BEGIN;

-- Records the customer's response to the completion request.
ALTER TABLE public.appointment_completion_requests
ADD COLUMN customer_confirmed_at timestamptz,
ADD COLUMN disputed_at timestamptz,
ADD COLUMN dispute_reason text;

ALTER TABLE public.appointment_completion_requests
ADD CONSTRAINT completion_response_consistent
CHECK (
  (
    customer_confirmed_at IS NULL
    AND disputed_at IS NULL
    AND dispute_reason IS NULL
  )
  OR (
    customer_confirmed_at IS NOT NULL
    AND disputed_at IS NULL
    AND dispute_reason IS NULL
  )
  OR (
    customer_confirmed_at IS NULL
    AND disputed_at IS NOT NULL
    AND dispute_reason IS NOT NULL
    AND char_length(btrim(dispute_reason)) BETWEEN 10 AND 2000
  )
);

CREATE FUNCTION public.respond_to_appointment_completion(
  p_appointment_id uuid,
  p_confirm boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking public.appointments%ROWTYPE;
  completion public.appointment_completion_requests%ROWTYPE;
  response_time timestamptz;
  clean_reason text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SIGN_IN_REQUIRED';
  END IF;

  -- Locks the booking before checking or changing its status.
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

  IF p_confirm IS NULL THEN
    RETURN jsonb_build_object('result', 'invalid_response');
  END IF;

  SELECT *
  INTO completion
  FROM public.appointment_completion_requests
  WHERE appointment_id = booking.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'completion_not_requested');
  END IF;

  -- Repeated calls cannot overwrite an existing customer response.
  IF completion.customer_confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'already_confirmed',
      'status', booking.status
    );
  END IF;

  IF completion.disputed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'already_disputed',
      'status', booking.status
    );
  END IF;

  IF booking.status IS DISTINCT FROM 'in_progress' THEN
    RETURN jsonb_build_object('result', 'not_in_progress');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.appointment_start_verifications
    WHERE appointment_id = booking.id
      AND started_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('result', 'start_not_verified');
  END IF;

  response_time := clock_timestamp();

  IF p_confirm THEN
    UPDATE public.appointment_completion_requests
    SET customer_confirmed_at = response_time
    WHERE appointment_id = booking.id;

    UPDATE public.appointments
    SET status = 'completed'
    WHERE id = booking.id;

    RETURN jsonb_build_object('result', 'completed');
  END IF;

  clean_reason := btrim(p_reason);

  IF clean_reason IS NULL
    OR char_length(clean_reason) NOT BETWEEN 10 AND 2000
  THEN
    RETURN jsonb_build_object('result', 'invalid_reason');
  END IF;

  UPDATE public.appointment_completion_requests
  SET
    disputed_at = response_time,
    dispute_reason = clean_reason
  WHERE appointment_id = booking.id;

  UPDATE public.appointments
  SET status = 'disputed'
  WHERE id = booking.id;

  RETURN jsonb_build_object('result', 'disputed');
END;
$$;

REVOKE ALL ON FUNCTION
  public.respond_to_appointment_completion(uuid, boolean, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.respond_to_appointment_completion(uuid, boolean, text)
TO authenticated;

COMMIT;