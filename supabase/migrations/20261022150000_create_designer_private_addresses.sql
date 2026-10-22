BEGIN;

CREATE TABLE public.designer_private_addresses (
  designer_id uuid PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,

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
    CHECK (char_length(access_instructions) <= 2000)
);

ALTER TABLE public.designer_private_addresses
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers can read their own private address"
ON public.designer_private_addresses
FOR SELECT
TO authenticated
USING (
  designer_id = (SELECT auth.uid())
);

CREATE POLICY "Designers can insert their own private address"
ON public.designer_private_addresses
FOR INSERT
TO authenticated
WITH CHECK (
  designer_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND user_type = 'designer'
  )
);

CREATE POLICY "Designers can update their own private address"
ON public.designer_private_addresses
FOR UPDATE
TO authenticated
USING (
  designer_id = (SELECT auth.uid())
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

REVOKE ALL PRIVILEGES
ON TABLE public.designer_private_addresses
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.designer_private_addresses
TO authenticated;

GRANT UPDATE (
  address_line_1,
  address_line_2,
  city,
  county,
  eircode,
  access_instructions
)
ON TABLE public.designer_private_addresses
TO authenticated;

COMMIT;