import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const successUrl = Deno.env.get('STRIPE_CHECKOUT_SUCCESS_URL');
  const cancelUrl = Deno.env.get('STRIPE_CHECKOUT_CANCEL_URL');

  if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey?.startsWith('sk_test_') || !successUrl || !cancelUrl) {
    return reply(503, { error: 'Test checkout is not configured' });
  }
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Authentication required' });

  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return reply(401, { error: 'Invalid session' });

    const body = await req.json().catch(() => null);
    const appointmentId = body?.appointmentId;
    if (typeof appointmentId !== 'string' || !uuidPattern.test(appointmentId)) {
      return reply(400, { error: 'Valid appointmentId required' });
    }

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: appointment, error: appointmentError } = await db
      .from('appointments')
      .select('id,customer_id,designer_id,service_id,service_name,price,duration_minutes,status,payment_status')
      .eq('id', appointmentId)
      .single();
    if (appointmentError || !appointment || appointment.customer_id !== user.id) {
      return reply(404, { error: 'Appointment not found' });
    }
    if (appointment.status !== 'pending' || appointment.payment_status !== 'unpaid') {
      return reply(409, { error: 'Appointment is not awaiting payment' });
    }

    const { data: service, error: serviceError } = await db
      .from('designer_services')
      .select('id,designer_id,name,price,duration_minutes,is_active')
      .eq('id', appointment.service_id)
      .single();
    if (serviceError || !service || !service.is_active || service.designer_id !== appointment.designer_id ||
        service.name !== appointment.service_name || Number(service.price) !== Number(appointment.price) ||
        service.duration_minutes !== appointment.duration_minutes) {
      return reply(409, { error: 'Service details changed; please book again' });
    }

    const amount = Math.round(Number(service.price) * 100);
    if (!Number.isSafeInteger(amount) || amount < 50) return reply(400, { error: 'Invalid service amount' });

    const { data: connected } = await db.from('designer_stripe_accounts')
      .select('livemode,charges_enabled,payouts_enabled,transfers_status')
      .eq('designer_id', appointment.designer_id)
      .maybeSingle();
    if (!connected || connected.livemode || !connected.charges_enabled || !connected.payouts_enabled || connected.transfers_status !== 'active') {
      return reply(409, { error: 'Designer is not ready to receive test payments' });
    }

    // Only allow preconfigured HTTPS redirect destinations; never accept URLs from the client.
    for (const url of [successUrl, cancelUrl]) {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return reply(503, { error: 'Checkout redirect URLs must use HTTPS' });
    }
      const { data: existingPayment, error: lookupError } = await db
      .from('appointment_payments')
      .select('stripe_checkout_session_id,payment_status')
      .eq('appointment_id', appointment.id)
      .maybeSingle();

    if (lookupError) {
      return reply(500, { error: 'Unable to verify existing payment' });
    }

    if (existingPayment) {
      return reply(409, {
        error: 'A payment already exists for this appointment',
      });
    }
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('payment_method_types[0]', 'card');
    form.set('line_items[0][price_data][currency]', 'eur');
    form.set('line_items[0][price_data][unit_amount]', String(amount));
    form.set('line_items[0][price_data][product_data][name]', service.name);
    form.set('line_items[0][quantity]', '1');
    form.set('client_reference_id', appointment.id);
    form.set('metadata[appointment_id]', appointment.id);
    form.set('metadata[customer_id]', user.id);
    form.set('metadata[designer_id]', appointment.designer_id);
    form.set('payment_intent_data[metadata][appointment_id]', appointment.id);
    form.set('success_url', `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url', cancelUrl);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
'Idempotency-Key': `nailsnow-booking-${appointment.id}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    const session = await response.json();
    if (!response.ok || !session?.id || !session?.url) {
      console.error('Stripe checkout session creation failed', response.status, session?.error?.code);
      return reply(502, { error: 'Unable to start checkout' });
    }
      const { error: paymentError } = await db
      .from('appointment_payments')
      .upsert({
        appointment_id: appointment.id,
        customer_id: user.id,
        designer_id: appointment.designer_id,
        stripe_checkout_session_id: session.id,
        currency: 'eur',
        amount_total_cents: amount,
        platform_fee_cents: 0,
        livemode: false,
      }, {
        onConflict: 'appointment_id',
        ignoreDuplicates: true,
      });

    if (paymentError) {
      console.error('Payment registration failed', paymentError.code);
      return reply(500, { error: 'Unable to register payment' });
    }
    // Payment is NOT marked paid here. Only a verified Stripe webhook may do that.
    return reply(200, { checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Create booking payment failed', error instanceof Error ? error.message : 'Unknown error');
    return reply(500, { error: 'Unable to start checkout' });
  }
});
