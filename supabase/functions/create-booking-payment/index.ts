
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (
  status: number,
  body: Record<string, unknown>
) => new Response(JSON.stringify(body), { status, headers });

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (req.method !== 'POST') {
    return reply(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const successUrl = Deno.env.get('STRIPE_CHECKOUT_SUCCESS_URL');
  const cancelUrl = Deno.env.get('STRIPE_CHECKOUT_CANCEL_URL');

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceKey ||
    !stripeKey?.startsWith('sk_test_') ||
    !successUrl ||
    !cancelUrl
  ) {
    return reply(503, {
      error: 'Test checkout is not configured',
    });
  }

  const token = req.headers
    .get('Authorization')
    ?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return reply(401, {
      error: 'Authentication required',
    });
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return reply(401, { error: 'Invalid session' });
    }

    const body = await req.json().catch(() => null);
    const appointmentId = body?.appointmentId;

    if (
      typeof appointmentId !== 'string' ||
      !uuidPattern.test(appointmentId)
    ) {
      return reply(400, {
        error: 'Valid appointmentId required',
      });
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: appointment, error: appointmentError } =
      await db
        .from('appointments')
        .select(
          'id,customer_id,designer_id,service_id,service_name,price,duration_minutes,status,payment_status,currency,service_fee'
        )
        .eq('id', appointmentId)
        .single();

    if (
      appointmentError ||
      !appointment ||
      appointment.customer_id !== user.id
    ) {
      return reply(404, {
        error: 'Appointment not found',
      });
    }

    if (
      appointment.status !== 'pending' ||
      appointment.payment_status !== 'unpaid'
    ) {
      return reply(409, {
        error: 'Appointment is not awaiting payment',
      });
    }

    if (
      appointment.currency !== 'eur' ||
      Number(appointment.service_fee) !== 0
    ) {
      return reply(409, {
        error: 'Invalid appointment payment configuration',
      });
    }

    const { data: service, error: serviceError } =
      await db
        .from('designer_services')
        .select(
          'id,designer_id,name,price,duration_minutes,is_active'
        )
        .eq('id', appointment.service_id)
        .single();

    if (
      serviceError ||
      !service ||
      !service.is_active ||
      service.designer_id !== appointment.designer_id ||
      service.name !== appointment.service_name ||
      Number(service.price) !== Number(appointment.price) ||
      service.duration_minutes !== appointment.duration_minutes
    ) {
      return reply(409, {
        error: 'Service details changed; please book again',
      });
    }

    const amount = Math.round(Number(service.price) * 100);

    if (
      !Number.isSafeInteger(amount) ||
      amount < 50 ||
      Math.abs(Number(service.price) * 100 - amount) > 0.000001
    ) {
      return reply(400, {
        error: 'Invalid service amount',
      });
    }

    const { data: connected, error: connectedError } =
      await db
        .from('designer_stripe_accounts')
        .select(
          'livemode,charges_enabled,payouts_enabled,transfers_status'
        )
        .eq('designer_id', appointment.designer_id)
        .maybeSingle();

    if (
      connectedError ||
      !connected ||
      connected.livemode !== false ||
      !connected.charges_enabled ||
      !connected.payouts_enabled ||
      connected.transfers_status !== 'active'
    ) {
      return reply(409, {
        error: 'Designer is not ready to receive test payments',
      });
    }

    for (const url of [successUrl, cancelUrl]) {
      const parsed = new URL(url);

      if (parsed.protocol !== 'https:') {
        return reply(503, {
          error: 'Checkout redirect URLs must use HTTPS',
        });
      }
    }

    // Reserve one payment record before contacting Stripe.
    const { data: reservedPayment, error: reservationError } =
      await db
        .from('appointment_payments')
        .upsert(
          {
            appointment_id: appointment.id,
            customer_id: user.id,
            designer_id: appointment.designer_id,
            currency: 'eur',
            amount_total_cents: amount,
            platform_fee_cents: 0,
            payment_status: 'pending',
            livemode: false,
          },
          {
            onConflict: 'appointment_id',
            ignoreDuplicates: true,
          }
        )
        .select()
        .maybeSingle();

    if (reservationError) {
      console.error(
        'Payment reservation failed',
        reservationError.code
      );

      return reply(500, {
        error: 'Unable to reserve payment',
      });
    }

    const { data: payment, error: lookupError } =
      await db
        .from('appointment_payments')
        .select('*')
        .eq('appointment_id', appointment.id)
        .single();

    if (lookupError || !payment) {
      return reply(500, {
        error: 'Unable to verify payment',
      });
    }

    if (
      payment.customer_id !== user.id ||
      payment.designer_id !== appointment.designer_id ||
      Number(payment.amount_total_cents) !== amount ||
      Number(payment.platform_fee_cents) !== 0 ||
      payment.currency !== 'eur' ||
      payment.livemode !== false
    ) {
      return reply(409, {
        error: 'Payment details mismatch',
      });
    }

    if (payment.payment_status !== 'pending') {
      return reply(409, {
        error: 'Payment is no longer pending',
      });
    }

    // Reuse an existing Stripe Checkout session.
    if (payment.stripe_checkout_session_id) {
      const sessionId = payment.stripe_checkout_session_id;

      if (!sessionId.startsWith('cs_test_')) {
        return reply(409, {
          error: 'Invalid test checkout session',
        });
      }

      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        {
          headers: {
            Authorization: `Bearer ${stripeKey}`,
          },
          signal: AbortSignal.timeout(20000),
        }
      );

      const session = await response.json();

      if (!response.ok) {
        return reply(502, {
          error: 'Unable to retrieve checkout',
        });
      }

      if (
        session.id !== sessionId ||
        session.livemode !== false ||
        session.mode !== 'payment' ||
        session.metadata?.appointment_id !== appointment.id ||
        session.metadata?.customer_id !== user.id ||
        session.metadata?.designer_id !== appointment.designer_id ||
        session.amount_total !== amount ||
        session.currency !== 'eur'
      ) {
        return reply(409, {
          error: 'Checkout validation failed',
        });
      }

      if (
        session.status === 'complete' ||
        session.payment_status === 'paid'
      ) {
        return reply(409, {
          error: 'Payment is awaiting verification',
          code: 'PAYMENT_PROCESSING',
        });
      }

      if (
        session.status === 'open' &&
        session.payment_status === 'unpaid' &&
        session.url
      ) {
        return reply(200, {
          checkoutUrl: session.url,
          sessionId: session.id,
        });
      }

      return reply(409, {
        error: 'Checkout is no longer available',
        code: 'CHECKOUT_UNAVAILABLE',
      });
    }

    // Only the request that created the reservation may
    // create a new Stripe Checkout session.
    if (!reservedPayment) {
      return reply(409, {
        error: 'Payment creation requires verification',
        code: 'PAYMENT_CREATION_PENDING',
      });
    }

    // Recheck appointment status before contacting Stripe.
    const { data: latestAppointment, error: latestError } =
      await db
        .from('appointments')
        .select('status,payment_status')
        .eq('id', appointment.id)
        .single();

    if (
      latestError ||
      !latestAppointment ||
      latestAppointment.status !== 'pending' ||
      latestAppointment.payment_status !== 'unpaid'
    ) {
      return reply(409, {
        error: 'Appointment is no longer available',
      });
    }

    const form = new URLSearchParams();

    form.set('mode', 'payment');
    form.set('payment_method_types[0]', 'card');
    form.set('line_items[0][price_data][currency]', 'eur');
    form.set(
      'line_items[0][price_data][unit_amount]',
      String(amount)
    );
    form.set(
      'line_items[0][price_data][product_data][name]',
      service.name
    );
    form.set('line_items[0][quantity]', '1');

    form.set('client_reference_id', appointment.id);
    form.set('metadata[appointment_id]', appointment.id);
    form.set('metadata[customer_id]', user.id);
    form.set(
      'metadata[designer_id]',
      appointment.designer_id
    );

    form.set(
      'payment_intent_data[metadata][appointment_id]',
      appointment.id
    );

    form.set(
      'payment_intent_data[transfer_group]',
      `booking_${appointment.id}`
    );

    form.set(
      'success_url',
      `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
    );

    form.set('cancel_url', cancelUrl);

    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Idempotency-Key': `nailsnow-booking-${appointment.id}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        signal: AbortSignal.timeout(20000),
      }
    );

    const session = await response.json();

    if (
      !response.ok ||
      typeof session.id !== 'string' ||
      !session.id.startsWith('cs_test_') ||
      session.livemode !== false ||
      session.status !== 'open' ||
      session.payment_status !== 'unpaid' ||
      session.amount_total !== amount ||
      session.currency !== 'eur' ||
      !session.url
    ) {
      console.error(
        'Stripe checkout creation failed',
        response.status,
        session?.error?.code
      );

      return reply(502, {
        error: 'Unable to start checkout',
      });
    }

    const { data: savedPayment, error: saveError } =
      await db
        .from('appointment_payments')
        .update({
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .eq('payment_status', 'pending')
        .is('stripe_checkout_session_id', null)
        .select('id')
        .single();

    if (saveError || !savedPayment) {
      console.error(
        'Checkout registration failed',
        saveError?.code
      );

      return reply(500, {
        error: 'Unable to register checkout',
      });
    }

    // Only the verified webhook can confirm payment.
    return reply(200, {
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error(
      'Create booking payment failed',
      error instanceof Error
        ? error.message
        : 'Unknown error'
    );

    return reply(500, {
      error: 'Unable to start checkout',
    });
  }
});
