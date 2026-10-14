BEGIN;

-- Removes unnecessary table permissions.
REVOKE ALL PRIVILEGES ON TABLE public.appointments
FROM PUBLIC, anon, authenticated;

-- Signed-in users can read and create bookings.
-- Existing RLS policies still control which bookings they can access.
GRANT SELECT, INSERT ON TABLE public.appointments
TO authenticated;

-- Allows status changes without allowing edits to booking details.
GRANT UPDATE (status) ON TABLE public.appointments
TO authenticated;

-- Customers can only create their own pending bookings.
ALTER POLICY "Customers can create their own appointments"
ON public.appointments
WITH CHECK (
  customer_id = (SELECT auth.uid())
  AND status = 'pending'
);

COMMIT;