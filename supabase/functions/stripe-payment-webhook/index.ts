import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import Stripe from 'npm:stripe@17.7.0';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (
    !stripeKey?.startsWith('sk_test_') ||
    !webhookSecret ||
    !supabaseUrl ||
    !serviceKey
  ) {
    return new Response('Test webhook not configured', {
      status: 503,
    });
  }

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.livemode) {
    return new Response('Live payments disabled', {
      status: 400,
    });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.payment_status !== 'paid') {
        return new Response('Payment not completed', {
          status: 200,
        });
      }

      const appointmentId = session.metadata?.appointment_id;

      const { data: payment, error: lookupError } = await db
        .from('appointment_payments')
        .select('*')
        .eq('stripe_checkout_session_id', session.id)
        .single();

      if (lookupError || !payment) {
        throw new Error('Payment record not found');
      }

      if (
        payment.appointment_id !== appointmentId ||
        payment.customer_id !== session.metadata?.customer_id ||
        payment.designer_id !== session.metadata?.designer_id ||
        Number(payment.amount_total_cents) !== session.amount_total ||
        payment.currency !== session.currency ||
        payment.livemode !== false ||
        session.mode !== 'payment' ||
        typeof session.payment_intent !== 'string'
      ) {
        throw new Error('Payment validation failed');
      }

      const { error } = await db
        .from('appointment_payments')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .eq('payment_status', 'pending');

      if (error) throw error;
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing failed', error);

    return new Response('Processing failed', {
      status: 500,
    });
  }
});