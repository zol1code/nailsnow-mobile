BEGIN;

-- Stores private verification data for each appointment.
CREATE TABLE public.appointment_start_verifications (
  appointment_id uuid PRIMARY KEY
    REFERENCES public.appointments(id)
    ON DELETE CASCADE,

  -- Generates an eight-character code on the server.
  start_code text NOT NULL DEFAULT upper(
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  ),

  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT appointment_start_code_format
    CHECK (start_code ~ '^[0-9A-F]{8}$'),

  CONSTRAINT appointment_start_attempts_valid
    CHECK (failed_attempts >= 0)
);

ALTER TABLE public.appointment_start_verifications
ENABLE ROW LEVEL SECURITY;

-- The app cannot read or change this table directly.
-- Access will go through functions that verify the logged-in user.
REVOKE ALL PRIVILEGES
ON TABLE public.appointment_start_verifications
FROM PUBLIC, anon, authenticated;

COMMIT;