BEGIN;

CREATE TABLE public.designer_stripe_accounts (
  designer_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Separates test accounts from live accounts.
  livemode boolean NOT NULL DEFAULT false,

  stripe_account_id text NOT NULL
    CHECK (stripe_account_id LIKE 'acct_%'),

  details_submitted boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,

  transfers_status text NOT NULL DEFAULT 'inactive'
    CHECK (
      transfers_status IN (
        'inactive',
        'pending',
        'active'
      )
    ),

  last_synced_at timestamptz,

  PRIMARY KEY (designer_id, livemode),
  UNIQUE (stripe_account_id)
);

ALTER TABLE public.designer_stripe_accounts
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers can view their own Stripe account"
ON public.designer_stripe_accounts
FOR SELECT
TO authenticated
USING (
  designer_id = (SELECT auth.uid())
);

REVOKE ALL PRIVILEGES
ON TABLE public.designer_stripe_accounts
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.designer_stripe_accounts
TO authenticated;

GRANT ALL PRIVILEGES
ON TABLE public.designer_stripe_accounts
TO service_role;

COMMIT;