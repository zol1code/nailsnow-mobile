BEGIN;

CREATE TABLE public.appointment_private_addresses (
  appointment_id uuid PRIMARY KEY
    REFERENCES public.appointments(id) ON DELETE CASCADE,

  address_line_1 text NOT NULL
    CHECK (char_length(btrim(address_line_1)) BETWEEN 1 AND 200),

  address_line_2 text NOT NULL DEFAULT ''
    CHECK (char_length(address_line_2) <= 200),

  city text NOT NULL
    CHECK (char_length(btrim(city)) BETWEEN 1 AND 100),

  county text NOT NULL DEFAULT ''
    CHECK (char_length(county) <= 100),

  eircode text NOT NULL DEFAULT ''
    CHECK (char_length(eircode) <= 10),

  access_instructions text NOT NULL DEFAULT ''
    CHECK (char_length(access_instructions) <= 2000),

  shared_by uuid NOT NULL
    REFERENCES auth.users(id),

  shared_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_private_addresses
ENABLE ROW LEVEL SECURITY;

-- Access will be provided through functions that validate
-- the booking participants and verified payment.
REVOKE ALL PRIVILEGES
ON TABLE public.appointment_private_addresses
FROM PUBLIC, anon, authenticated;

COMMIT;