BEGIN;

-- Records when the artist asks the customer to confirm completion.
CREATE TABLE public.appointment_completion_requests (
  appointment_id uuid PRIMARY KEY
    REFERENCES public.appointments(id)
    ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_completion_requests
ENABLE ROW LEVEL SECURITY;

-- Participants can read the request for their own appointment.
CREATE POLICY "Participants can read completion requests"
ON public.appointment_completion_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments AS booking
    WHERE booking.id = appointment_completion_requests.appointment_id
      AND (
        booking.customer_id = (SELECT auth.uid())
        OR booking.designer_id = (SELECT auth.uid())
      )
  )
);

REVOKE ALL PRIVILEGES
ON TABLE public.appointment_completion_requests
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.appointment_completion_requests
TO authenticated;

-- Only the assigned artist can request completion.
CREATE FUNCTION public.request_appointment_completion(
  p_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking public.appointments%ROWTYPE;
  request_time timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SIGN_IN_REQUIRED';
  END IF;

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
    RAISE EXCEPTION 'SELF_BOOKING_NOT_SUPPORTED';
  END IF;

  IF booking.status IS DISTINCT FROM 'in_progress' THEN
    RETURN jsonb_build_object(
      'result', 'not_in_progress'
    );
  END IF;

  -- Requires a successful start-code verification.
  IF NOT EXISTS (
    SELECT 1
    FROM public.appointment_start_verifications
    WHERE appointment_id = booking.id
      AND started_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'result', 'start_not_verified'
    );
  END IF;

  -- Repeated requests preserve the original timestamp.
  INSERT INTO public.appointment_completion_requests (
    appointment_id
  )
  VALUES (booking.id)
  ON CONFLICT (appointment_id) DO NOTHING;

  SELECT requested_at
  INTO request_time
  FROM public.appointment_completion_requests
  WHERE appointment_id = booking.id;

  RETURN jsonb_build_object(
    'result', 'awaiting_customer_confirmation',
    'requested_at', request_time
  );
END;
$$;

REVOKE ALL ON FUNCTION
  public.request_appointment_completion(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.request_appointment_completion(uuid)
TO authenticated;

COMMIT;