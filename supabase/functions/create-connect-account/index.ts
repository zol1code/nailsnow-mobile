import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Account = {
  id: string;
  object: string;
  livemode?: boolean;
  country?: string;
  metadata?: Record<string, string>;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  capabilities?: { transfers?: string };
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return reply(405, { error: 'Method not allowed.' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')?.trim();

    if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey) {
      return reply(500, {
        error: 'Server configuration incomplete.',
      });
    }

    // Keeps this integration strictly in Stripe test mode.
    if (!stripeKey.startsWith('sk_test_')) {
      return reply(503, {
        error: 'This function requires a Stripe test secret key.',
      });
    }

    const token = request.headers
      .get('Authorization')
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      return reply(401, { error: 'Sign in required.' });
    }

    const authOptions = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    };

    const authClient = createClient(
      supabaseUrl,
      anonKey,
      authOptions
    );

    // Verifies the caller with Supabase Auth.
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return reply(401, { error: 'Please sign in again.' });
    }

    const admin = createClient(
      supabaseUrl,
      serviceKey,
      authOptions
    );

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw new Error('Profile lookup failed.');

    if (profile?.user_type !== 'designer') {
      return reply(403, {
        error: 'Only designer accounts can connect to Stripe.',
      });
    }

    const stripeRequest = async (
      path: string,
      body?: Record<string, unknown>,
      idempotencyKey?: string
    ): Promise<Account> => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${stripeKey}`,
        'Stripe-Version': '2026-09-30.endive',
      };

      if (body) headers['Content-Type'] = 'application/json';

      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }

      const response = await fetch(
        `https://api.stripe.com/${path}`,
        {
          method: body ? 'POST' : 'GET',
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(20000),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Diagnostic fields only: no credentials or request payload.
        console.error('Stripe account request failed:', {
          status: response.status,
          code: result?.error?.code,
          type: result?.error?.type,
          param: result?.error?.param,
          request_id: response.headers.get('request-id'),
        });

        throw new Error('Stripe account request failed.');
      }

      const expectedObject = path.startsWith('v2/')
        ? 'v2.core.account'
        : 'account';

      if (
        result.object !== expectedObject ||
        typeof result.id !== 'string' ||
        !result.id.startsWith('acct_')
      ) {
        throw new Error('Unexpected Stripe response.');
      }

          return result as Account;
    };

    const { data: existing, error: lookupError } = await admin
      .from('designer_stripe_accounts')
      .select('stripe_account_id')
      .eq('designer_id', user.id)
      .eq('livemode', false)
      .maybeSingle();

    if (lookupError) throw new Error('Account lookup failed.');

    let accountId = existing?.stripe_account_id;

    if (!accountId) {
      if (!user.email || !user.email_confirmed_at) {
        return reply(422, {
          error: 'Please verify your account email before connecting Stripe.',
        });
      }

      // Creates the connected account using Accounts v2.
      const created = await stripeRequest(
        'v2/core/accounts',
        {
          contact_email: user.email,
          identity: {
            country: 'IE',
          },
          dashboard: 'express',
          defaults: {
            responsibilities: {
              fees_collector: 'application',
              losses_collector: 'application',
            },
          },
          configuration: {
            merchant: {
              capabilities: {
                card_payments: {
                  requested: true,
                },
              },
            },
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: {
                    requested: true,
                  },
                },
              },
            },
          },
          metadata: {
            nailsnow_user_id: user.id,
            nailsnow_environment: 'test',
          },
        },
        `nailsnow-connect-test-v2-${user.id}`
      );

      if (created.livemode !== false) {
        throw new Error('Unexpected Stripe account mode.');
      }

      // Never replaces an existing mapping.
      const { error: insertError } = await admin
        .from('designer_stripe_accounts')
        .upsert(
          {
            designer_id: user.id,
            livemode: false,
            stripe_account_id: created.id,
          },
          {
            onConflict: 'designer_id,livemode',
            ignoreDuplicates: true,
          }
        );

      if (insertError) {
        throw new Error('Could not save the Stripe account mapping.');
      }

      // Re-reads the mapping to handle concurrent requests.
      const { data: saved, error: savedError } = await admin
        .from('designer_stripe_accounts')
        .select('stripe_account_id')
        .eq('designer_id', user.id)
        .eq('livemode', false)
        .single();

      if (savedError || !saved) {
        throw new Error('Could not verify the saved account mapping.');
      }

      accountId = saved.stripe_account_id;
    }

    // Stripe supports reading v2 accounts through the v1 format.
    // This preserves the existing database status fields.
    const account = await stripeRequest(
      `v1/accounts/${encodeURIComponent(accountId)}`
    );

 if (
  account.id !== accountId ||
  account.country !== 'IE' ||
  account.metadata?.nailsnow_user_id !== user.id ||
  account.metadata?.nailsnow_environment !== 'test'
) {
      return reply(409, {
        error: 'The Stripe account mapping requires administrator review.',
      });
    }

    const capability = account.capabilities?.transfers;

    const transfersStatus =
      capability === 'active' || capability === 'pending'
        ? capability
        : 'inactive';

    // Records only states retrieved directly from Stripe.
    const { data: updated, error: updateError } = await admin
      .from('designer_stripe_accounts')
      .update({
        details_submitted: account.details_submitted === true,
        charges_enabled: account.charges_enabled === true,
        payouts_enabled: account.payouts_enabled === true,
        transfers_status: transfersStatus,
        last_synced_at: new Date().toISOString(),
      })
      .eq('designer_id', user.id)
      .eq('livemode', false)
      .eq('stripe_account_id', accountId)
      .select('stripe_account_id')
      .single();

    if (updateError || !updated) {
      throw new Error('Could not update Stripe account status.');
    }

    return reply(200, {
      result: 'account_ready',
      livemode: false,
      stripe_account_id: accountId,
      details_submitted: account.details_submitted === true,
      charges_enabled: account.charges_enabled === true,
      payouts_enabled: account.payouts_enabled === true,
      transfers_status: transfersStatus,
    });
  } catch (error) {
    console.error(
      'Connect account error:',
      error instanceof Error ? error.message : 'Unexpected error'
    );

    return reply(500, {
      error: 'Could not prepare your Stripe account. Please try again later.',
    });
  }
});