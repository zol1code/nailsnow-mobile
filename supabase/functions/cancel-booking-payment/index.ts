
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import Stripe from 'npm:stripe@17.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return reply(405, {
      error: 'Method not allowed',
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceKey ||
      !stripeKey?.startsWith('sk_test_')
    ) {
      return reply(503, {
        error: 'Test payment system not configured',
      });
    }

    const authorization = req.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return reply(401, {
        error: 'Unauthorized',
      });
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser(
      authorization.slice(7)
    );

    if (authError || !user) {
      return reply(401, {
        error: 'Unauthorized',
      });
    }

    const { appointmentId } = await req.json();

    if (
      typeof appointmentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        appointmentId
      )
    ) {
      return reply(400, {
        error: 'Invalid appointment ID',
      });
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
      },
    });

    const stripe = new Stripe(stripeKey);

    const { data: appointment, error: appointmentError } =
      await db
        .from('appointments')
        .select('id, customer_id, designer_id, status')
        .eq('id', appointmentId)
        .single();

    if (appointmentError || !appointment) {
      return reply(404, {
        error: 'Appointment not found',
      });
    }

    if (
      appointment.customer_id !== user.id &&
      appointment.designer_id !== user.id
    ) {
      return reply(403, {
        error: 'Access denied',
      });
    }

    const { data: cancellation, error: cancellationError } =
      await client.rpc('request_booking_cancellation', {
        p_appointment_id: appointmentId,
      });

    if (cancellationError) {
      return reply(409, {
        error: 'Cancellation not available',
      });
    }

    const { data: payment, error: paymentError } =
      await db
        .from('appointment_payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

    if (paymentError) throw paymentError;

    if (!payment) {
      return reply(200, {
        result: cancellation,
      });
    }

    if (payment.livemode !== false) {
      return reply(409, {
        error: 'Live payments disabled',
      });
    }

   
    // Return completed refunds without creating another.
    if (payment.payment_status === 'refunded') {
      return reply(200, {
        result: 'refund_completed',
        refundStatus: 'succeeded',
      });
    }

    // Return previously closed unpaid bookings.
    if (
      payment.payment_status === 'cancelled' ||
      payment.payment_status === 'expired'
    ) {
      if (
        cancellation?.status === 'cancelled' ||
        cancellation?.status === 'declined'
      ) {
        return reply(200, {
          result: 'already_closed',
          status: cancellation.status,
        });
      }
    }

    // Allow reconciliation of late payments.
    const closedBookingNeedsRefund =
      (
        cancellation?.status === 'cancelled' ||
        cancellation?.status === 'declined'
      ) &&
      payment.payment_status === 'refund_pending';

    if (
      !payment.cancellation_requested_at &&
      !closedBookingNeedsRefund
    ) {
      return reply(409, {
        result: 'payment_review_required',
      });
    }

    // Unpaid checkout
    if (
      payment.payment_status === 'pending' ||
      payment.payment_status === 'processing'
    ) {
     if (!payment.stripe_checkout_session_id) {
  const { data: cancelled, error: cancelError } =
    await db.rpc('cancel_unstarted_checkout', {
      p_appointment_id: appointmentId,
    });

  if (cancelError) throw cancelError;

  if (cancelled === true) {
    return reply(200, {
      result: 'booking_cancelled',
    });
  }

  return reply(202, {
    result: 'checkout_reconciliation_required',
  });
}

      let session = await stripe.checkout.sessions.retrieve(
        payment.stripe_checkout_session_id
      );

      if (
        session.livemode !== false ||
        session.mode !== 'payment' ||
        session.metadata?.appointment_id !== appointmentId ||
        session.metadata?.customer_id !== payment.customer_id ||
        session.metadata?.designer_id !== payment.designer_id ||
        session.amount_total !== Number(payment.amount_total_cents) ||
        session.currency !== payment.currency
      ) {
        throw new Error('Checkout validation failed');
      }

      if (
        session.status === 'open' &&
        session.payment_status === 'unpaid'
      ) {
        session = await stripe.checkout.sessions.expire(
          session.id
        );
      }

      if (
        session.status === 'expired' &&
        session.payment_status === 'unpaid'
      ) {
        const { error } = await db.rpc(
          'expire_booking_payment',
          {
            p_session_id: session.id,
          }
        );

        if (error) throw error;

        return reply(200, {
          result: 'checkout_expired',
        });
      }

      return reply(202, {
        result: 'payment_reconciliation_required',
      });
    }

    // Paid booking
    if (
      payment.payment_status === 'paid' ||
      payment.payment_status === 'refund_pending'
    ) {
      const { data: prepared, error: prepareError } =
        await db.rpc('prepare_booking_refund', {
          p_appointment_id: appointmentId,
        });

      if (prepareError) throw prepareError;

      // Reconcile an existing Stripe refund.
      if (
        prepared?.result === 'refund_already_registered'
      ) {
        const refund = await stripe.refunds.retrieve(
          prepared.refund_id
        );

        if (
          refund.id !== prepared.refund_id ||
          refund.metadata?.appointment_id !== appointmentId ||
          refund.metadata?.source !== 'nailsnow' ||
          typeof refund.payment_intent !== 'string' ||
          refund.payment_intent !== payment.stripe_payment_intent_id ||
          refund.amount !== Number(payment.amount_total_cents) ||
          refund.currency !== 'eur' ||
          !refund.status
        ) {
          throw new Error(
            'Existing refund validation failed'
          );
        }

        const { error: reconciliationError } =
          await db.rpc('complete_booking_refund', {
            p_appointment_id: appointmentId,
            p_refund_id: refund.id,
            p_payment_intent_id: refund.payment_intent,
            p_amount_cents: refund.amount,
            p_refund_status: refund.status,
          });

        if (reconciliationError) {
          throw reconciliationError;
        }

        return reply(
          refund.status === 'succeeded' ? 200 : 202,
          {
            result: 'refund_reconciled',
            refundStatus: refund.status,
          }
        );
      }

      if (prepared?.result === 'refund_completed') {
        return reply(200, {
          result: 'refund_completed',
          refundStatus: 'succeeded',
        });
      }


      if (prepared?.result !== 'refund_prepared') {
        return reply(202, {
          result: prepared?.result ??
            'refund_review_required',
        });
      }

      const refund = await stripe.refunds.create(
        {
          payment_intent: prepared.payment_intent_id,
          amount: Number(prepared.amount),
          metadata: {
            appointment_id: appointmentId,
            source: 'nailsnow',
          },
        },
        {
          idempotencyKey: prepared.idempotency_key,
        }
      );

      if (
        typeof refund.payment_intent !== 'string' ||
        refund.payment_intent !== prepared.payment_intent_id ||
        refund.amount !== Number(prepared.amount) ||
        refund.currency !== 'eur' ||
        !refund.status
      ) {
        throw new Error('Refund validation failed');
      }

      const { error: refundError } = await db.rpc(
        'complete_booking_refund',
        {
          p_appointment_id: appointmentId,
          p_refund_id: refund.id,
          p_payment_intent_id: refund.payment_intent,
          p_amount_cents: refund.amount,
          p_refund_status: refund.status,
        }
      );

      if (refundError) throw refundError;

      return reply(200, {
        result: 'refund_registered',
        refundStatus: refund.status,
      });
    }

    return reply(202, {
      result: 'payment_review_required',
    });

  } catch (error) {
    console.error('Cancellation processing failed', error);

    return reply(500, {
      error: 'Unable to complete cancellation',
    });
  }
});
