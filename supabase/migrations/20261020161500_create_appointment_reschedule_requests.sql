BEGIN;

-- Stores rescheduling proposals without changing the original booking.
CREATE TABLE public.appointment_reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  appointment_id uuid NOT NULL
    REFERENCES public.appointments(id)
    ON DELETE CASCADE,

  requested_by uuid NOT NULL
    REFERENCES auth.users(id),

  original_date date NOT NULL,
  original_time time without time zone NOT NULL,

  proposed_date date NOT NULL,
  proposed_time time without time zone NOT NULL,

  status text NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'accepted',
        'declined',
        'withdrawn',
        'expired'
      )
    ),

  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,

  CONSTRAINT reschedule_requires_different_time
    CHECK (
      proposed_date <> original_date
      OR proposed_time <> original_time
    ),

  CONSTRAINT reschedule_response_consistent
    CHECK (
      (status = 'pending' AND responded_at IS NULL)
      OR
      (status <> 'pending' AND responded_at IS NOT NULL)
    )
);

-- Only one pending proposal may exist for each booking.
CREATE UNIQUE INDEX appointment_one_pending_reschedule
ON public.appointment_reschedule_requests (appointment_id)
WHERE status = 'pending';

ALTER TABLE public.appointment_reschedule_requests
ENABLE ROW LEVEL SECURITY;

-- Only the customer and artist of the booking can read its proposals.
CREATE POLICY "Participants can read reschedule requests"
ON public.appointment_reschedule_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments AS booking
    WHERE booking.id =
      appointment_reschedule_requests.appointment_id
      AND (
        booking.customer_id = (SELECT auth.uid())
        OR booking.designer_id = (SELECT auth.uid())
      )
  )
);

-- Writes will go through functions that validate each action.
REVOKE ALL PRIVILEGES
ON TABLE public.appointment_reschedule_requests
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.appointment_reschedule_requests
TO authenticated;

COMMIT;