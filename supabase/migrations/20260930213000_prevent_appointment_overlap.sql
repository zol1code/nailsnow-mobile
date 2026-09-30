BEGIN;

-- Enables the database to compare designer IDs in the booking rule.
CREATE EXTENSION IF NOT EXISTS btree_gist;

SET LOCAL search_path = public, extensions;

-- Active bookings must have a professional, date, time
-- and a positive service duration.
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_active_schedule_valid
CHECK (
  status NOT IN ('pending', 'confirmed', 'in_progress')
  OR (
    designer_id IS NOT NULL
    AND appointment_date IS NOT NULL
    AND appointment_time IS NOT NULL
    AND duration_minutes IS NOT NULL
    AND duration_minutes > 0
  )
);

-- Prevents overlapping bookings for the same professional.
-- Cancelled and declined bookings do not reserve the time.
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_no_overlap
EXCLUDE USING gist (
  designer_id WITH =,
  (
    tsrange(
      appointment_date + appointment_time,
      appointment_date + appointment_time
        + make_interval(mins => duration_minutes),
      '[)'
    )
  ) WITH &&
)
WHERE (status IN ('pending', 'confirmed', 'in_progress'));

COMMIT;