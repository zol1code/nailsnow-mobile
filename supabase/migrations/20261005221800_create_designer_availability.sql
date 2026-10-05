BEGIN;

-- Stores one weekly schedule row per designer and weekday.
-- Weekdays: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
CREATE TABLE public.designer_availability (
  designer_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL
    CHECK (day_of_week BETWEEN 0 AND 6),
  is_available boolean NOT NULL DEFAULT false,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',

  PRIMARY KEY (designer_id, day_of_week),

  -- Opening time must be earlier than closing time.
  CONSTRAINT designer_availability_valid_hours
    CHECK (start_time < end_time)
);

ALTER TABLE public.designer_availability
ENABLE ROW LEVEL SECURITY;

-- Only signed-in users can read availability.
CREATE POLICY "Authenticated users read availability"
ON public.designer_availability
FOR SELECT TO authenticated
USING (true);

-- Designers can create only their own schedule.
CREATE POLICY "Designers insert own availability"
ON public.designer_availability
FOR INSERT TO authenticated
WITH CHECK (
  designer_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND user_type = 'designer'
  )
);

-- Designers can update only their own schedule.
CREATE POLICY "Designers update own availability"
ON public.designer_availability
FOR UPDATE TO authenticated
USING (
  designer_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND user_type = 'designer'
  )
)
WITH CHECK (
  designer_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND user_type = 'designer'
  )
);

-- Days are switched off instead of deleting schedule rows.
REVOKE ALL ON public.designer_availability FROM anon;
REVOKE ALL ON public.designer_availability FROM authenticated;
GRANT SELECT, INSERT, UPDATE
ON public.designer_availability TO authenticated;

COMMIT;