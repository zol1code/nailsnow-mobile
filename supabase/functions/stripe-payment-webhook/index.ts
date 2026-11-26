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

    // Recover checkout sessions after interrupted requests.
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.expired'
    ) {
      const session = event.data.object;

      const appointmentId =
        session.metadata?.appointment_id;

      const customerId =
        session.metadata?.customer_id;

      const designerId =
        session.metadata?.designer_id;

      if (
        session.livemode !== false ||
        session.mode !== 'payment' ||
        !session.id.startsWith('cs_test_') ||
        !appointmentId ||
        !customerId ||
        !designerId ||
        session.amount_total === null ||
        session.amount_total <= 0 ||
        session.currency !== 'eur' ||
        session.client_reference_id !== appointmentId
      ) {
        throw new Error(
          'Invalid checkout recovery details'
        );
      }

      const { error: recoveryError } = await db.rpc(
        'recover_booking_checkout',
        {
          p_appointment_id: appointmentId,
          p_session_id: session.id,
          p_customer_id: customerId,
          p_designer_id: designerId,
          p_amount_cents: session.amount_total,
          p_currency: session.currency,
        }
      );

      if (recoveryError) throw recoveryError;
    }


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

            const { error } = await db.rpc(
        'confirm_booking_payment',
        {
          p_session_id: session.id,
          p_payment_intent_id: session.payment_intent,
        }
      );

      if (error) throw error;
    }
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;

      if (
        session.livemode !== false ||
        session.mode !== 'payment' ||
        session.status !== 'expired' ||
        session.payment_status !== 'unpaid' ||
        !session.id.startsWith('cs_test_')
      ) {
        throw new Error('Invalid expired checkout session');
      }

      const { error } = await db.rpc(
        'expire_booking_payment',
        {
          p_session_id: session.id,
        }
      );

      if (error) throw error;
    }
        if (
      event.type === 'refund.created' ||
      event.type === 'refund.updated' ||
      event.type === 'refund.failed'
    ) {
      const refund = event.data.object;

      const appointmentId =
        refund.metadata?.appointment_id;

      if (
        refund.metadata?.source !== 'nailsnow'
      ) {
        return new Response('Ignored', { status: 200 });
      }

      if (
        !appointmentId ||
        typeof refund.payment_intent !== 'string' ||
        refund.currency !== 'eur' ||
        !refund.status ||
        !refund.id.startsWith('re_')
      ) {
        throw new Error('Invalid refund details');
      }

      const { error } = await db.rpc(
        'complete_booking_refund',
        {
          p_appointment_id: appointmentId,
          p_refund_id: refund.id,
          p_payment_intent_id: refund.payment_intent,
          p_amount_cents: refund.amount,
          p_refund_status: refund.status,
        }
      );

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