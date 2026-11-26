
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import Stripe from 'npm:stripe@17.7.0';

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return reply(405, {
      error: 'Method not allowed',
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL');

    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const stripeKey =
      Deno.env.get('STRIPE_SECRET_KEY');

    const reconciliationSecret =
      Deno.env.get('RECONCILIATION_SECRET');

    if (
      !supabaseUrl ||
      !serviceKey ||
      !stripeKey?.startsWith('sk_test_') ||
      !reconciliationSecret ||
      reconciliationSecret.length < 32
    ) {
      return reply(503, {
        error: 'Test reconciliation not configured',
      });
    }

    const authorization =
      req.headers.get('Authorization');

    if (
      authorization !==
      `Bearer ${reconciliationSecret}`
    ) {
      return reply(401, {
        error: 'Unauthorized',
      });
    }

    const db = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const stripe = new Stripe(stripeKey, {
      timeout: 10000
      maxNetworkRetries: 0,
    });

   
    const { data: payments, error: claimError } =
      await db.rpc('claim_payment_reconciliation', {
        p_limit: 1
      });

    if (claimError) {
      throw new Error('Unable to claim payments');
    }

    const summary = {
      claimed: payments?.length ?? 0,
      resolved: 0,
      retry: 0,
      manual_review: 0,
      errors: 0,
    };

    for (let payment of payments ?? []) {
      let result = 'retry';
      let retryMinutes = 5;
      let errorMessage: string | null = null;

      const assertValidLock = async () => {
        const { data: valid, error } =
          await db.rpc(
            'validate_payment_reconciliation_lock',
            {
              p_payment_id: payment.id,
              p_lock_token:
                payment.reconciliation_lock_token,
            }
          );

        if (error || valid !== true) {
          throw new Error(
            'RECONCILIATION_LOCK_INVALID'
          );
        }
      };


      try {

        const {
          data: freshPayment,
          error: refreshError,
        } = await db
          .from('appointment_payments')
          .select('*')
          .eq('id', payment.id)
          .eq(
            'reconciliation_lock_token',
            payment.reconciliation_lock_token
          )
          .eq('livemode', false)
          .single();

        if (refreshError || !freshPayment) {
          throw new Error(
            'PAYMENT_REFRESH_FAILED'
          );
        }

        payment = freshPayment;

        await assertValidLock();


        if (payment.livemode !== false) {
          throw new Error('LIVE_PAYMENT_BLOCKED');
        }

        if (
          !payment.reconciliation_lock_token ||
          Date.parse(
            payment.reconciliation_locked_until
          ) <= Date.now()
        ) {
          summary.errors++;
          continue;
        }

       
        if (
          payment.payment_status === 'pending' ||
          payment.payment_status === 'processing'
        ) {
          if (payment.stripe_checkout_session_id) {
            let session =
              await stripe.checkout.sessions.retrieve(
                payment.stripe_checkout_session_id
              );

            if (
              session.livemode !== false ||
              session.mode !== 'payment' ||
              session.id !== payment.stripe_checkout_session_id ||
              session.metadata?.appointment_id !== payment.appointment_id ||
              session.metadata?.customer_id !== payment.customer_id ||
              session.metadata?.designer_id !== payment.designer_id ||
              session.client_reference_id !== payment.appointment_id ||
              session.amount_total !== Number(payment.amount_total_cents) ||
              session.currency !== 'eur'
            ) {
              throw new Error('INVALID_CHECKOUT_SESSION');
            }

            if (
              payment.cancellation_requested_at &&
              session.status === 'open' &&
              session.payment_status === 'unpaid'
            ) {
                await assertValidLock();
              session =
                await stripe.checkout.sessions.expire(
                  session.id
                );
            }

            if (
              session.status === 'complete' &&
              session.payment_status === 'paid' &&
              typeof session.payment_intent === 'string'
            ) {
              const { error } = await db.rpc(
                'confirm_booking_payment',
                {
                  p_session_id: session.id,
                  p_payment_intent_id:
                    session.payment_intent,
                }
              );

              if (error) {
                throw error;
              }

              const {
                data: updatedPayment,
                error: lookupError,
              } = await db
                .from('appointment_payments')
                .select('payment_status')
                .eq('id', payment.id)
                .single();

              if (lookupError || !updatedPayment) {
                throw new Error('PAYMENT_LOOKUP_FAILED');
              }

              if (
                updatedPayment.payment_status === 'paid' ||
                updatedPayment.payment_status === 'refunded'
              ) {
                result = 'resolved';
              } else {
                result = 'retry';
                retryMinutes = 1;
              }

            } else if (
              session.status === 'expired' &&
              session.payment_status === 'unpaid'
            ) {
              const { error } = await db.rpc(
                'expire_booking_payment',
                {
                  p_session_id: session.id,
                }
              );

              if (error) {
                throw error;
              }

              result = 'resolved';

            } else {
              result = 'retry';
              retryMinutes = 5;
            }

          } else {
           
            if (!payment.checkout_creation_started_at) {

              if (payment.cancellation_requested_at) {
                const { data: cancelled, error } =
                  await db.rpc(
                    'cancel_unstarted_checkout',
                    {
                      p_appointment_id:
                        payment.appointment_id,
                    }
                  );

                if (error) {
                  throw error;
                }

                result = cancelled === true
                  ? 'resolved'
                  : 'retry';

              } else {
                result = 'retry';
                retryMinutes = 5;
              }

            } else {

              const startedAt = Date.parse(
                payment.checkout_creation_started_at
              );

              if (!Number.isFinite(startedAt)) {
                throw new Error(
                  'INVALID_CHECKOUT_CREATION_DATE'
                );
              }
let scannedSessions = 0;
              const matchingSessions:
                Stripe.Checkout.Session[] = [];

              for await (
                const session of stripe.checkout.sessions.list({
                  created: {
                    gte: Math.floor(startedAt / 1000) - 60,
                    lte: Math.floor(startedAt / 1000) + 3600,
                  },
                  limit: 100,
                })
              ) {

                scannedSessions++;

                if (scannedSessions > 300) {
                  throw new Error(
                    'CHECKOUT_SCAN_LIMIT_REACHED'
                  );
                }

                if (scannedSessions % 100 === 1) {
                  await assertValidLock();
                }


                if (
                  session.metadata?.appointment_id ===
                  payment.appointment_id
                ) {
                  matchingSessions.push(session);
                }

                if (matchingSessions.length > 1) {
                  break;
                }
              }

              if (matchingSessions.length > 1) {

                result = 'manual_review';
                errorMessage = 'MULTIPLE_CHECKOUT_SESSIONS';

              } else if (matchingSessions.length === 1) {

                const session = matchingSessions[0];

                if (
                  session.livemode !== false ||
                  session.mode !== 'payment' ||
                  !session.id.startsWith('cs_test_') ||
                  session.metadata?.customer_id !== payment.customer_id ||
                  session.metadata?.designer_id !== payment.designer_id ||
                  session.client_reference_id !== payment.appointment_id ||
                  session.amount_total !== Number(payment.amount_total_cents) ||
                  session.currency !== 'eur'
                ) {
                  throw new Error(
                    'RECOVERED_CHECKOUT_VALIDATION_FAILED'
                  );
                }

                const { error } = await db.rpc(
                  'recover_booking_checkout',
                  {
                    p_appointment_id:
                      payment.appointment_id,
                    p_session_id: session.id,
                    p_customer_id: payment.customer_id,
                    p_designer_id: payment.designer_id,
                    p_amount_cents: session.amount_total,
                    p_currency: session.currency,
                  }
                );

                if (error) {
                  throw error;
                }

                result = 'retry';
                retryMinutes = 1;

              } else if (
                Date.now() - startedAt > 60 * 60 * 1000
              ) {

                result = 'manual_review';
                errorMessage = 'CHECKOUT_SESSION_NOT_FOUND';

              } else {

                result = 'retry';
                retryMinutes = 5;

              }
            }

          }

        } else if (
          payment.payment_status === 'refund_pending'
        ) {
          
          const {
            data: prepared,
            error: prepareError,
          } = await db.rpc(
            'prepare_booking_refund',
            {
              p_appointment_id:
                payment.appointment_id,
            }
          );

          if (prepareError || !prepared) {
            throw new Error('REFUND_PREPARATION_FAILED');
          }

          let refund: Stripe.Refund | null = null;

          if (
            prepared.result === 'refund_completed'
          ) {
            result = 'resolved';

          } else if (
            prepared.result === 'refund_already_registered'
          ) {
            refund = await stripe.refunds.retrieve(
              prepared.refund_id
            );

          } else if (
            prepared.result === 'refund_prepared'
          ) {
            if (
              !prepared.idempotency_key ||
              prepared.payment_intent_id !==
                payment.stripe_payment_intent_id ||
              Number(prepared.amount) !==
                Number(payment.amount_total_cents)
            ) {
              throw new Error(
                'INVALID_REFUND_PREPARATION'
              );
            }
await assertValidLock();
            refund = await stripe.refunds.create(
              {
                payment_intent:
                  prepared.payment_intent_id,

                amount: Number(prepared.amount),

                metadata: {
                  appointment_id:
                    payment.appointment_id,

                  source: 'nailsnow',
                },
              },
              {
                idempotencyKey:
                  prepared.idempotency_key,
              }
            );

          } else if (
            prepared.result ===
              'refund_reconciliation_required'
          ) {
            let scannedRefunds = 0;
            const matchingRefunds: Stripe.Refund[] = [];

            if (!payment.stripe_payment_intent_id) {
              throw new Error(
                'MISSING_PAYMENT_INTENT'
              );
            }

            for await (
              const existingRefund of stripe.refunds.list({
                payment_intent:
                  payment.stripe_payment_intent_id,

                limit: 100,
              })
            ) {

              scannedRefunds++;

              if (scannedRefunds > 300) {
                throw new Error(
                  'REFUND_SCAN_LIMIT_REACHED'
                );
              }

              if (scannedRefunds % 100 === 1) {
                await assertValidLock();
              }


              if (
                existingRefund.metadata?.appointment_id ===
                  payment.appointment_id &&
                existingRefund.metadata?.source ===
                  'nailsnow'
              ) {
                matchingRefunds.push(existingRefund);
              }

              if (matchingRefunds.length > 1) {
                break;
              }
            }

            if (matchingRefunds.length === 1) {
              refund = matchingRefunds[0];

            } else {
              result = 'manual_review';

              errorMessage =
                matchingRefunds.length > 1
                  ? 'MULTIPLE_REFUNDS_FOUND'
                  : 'REFUND_NOT_FOUND';
            }

          } else {
            result = 'manual_review';
            errorMessage = 'UNKNOWN_REFUND_STATE';
          }

          if (refund) {
            if (
              refund.metadata?.appointment_id !==
                payment.appointment_id ||
              refund.metadata?.source !== 'nailsnow' ||
              typeof refund.payment_intent !== 'string' ||
              refund.payment_intent !==
                payment.stripe_payment_intent_id ||
              refund.amount !==
                Number(payment.amount_total_cents) ||
              refund.currency !== 'eur' ||
              !refund.status
            ) {
              throw new Error(
                'REFUND_VALIDATION_FAILED'
              );
            }

            const { error: refundError } =
              await db.rpc(
                'complete_booking_refund',
                {
                  p_appointment_id:
                    payment.appointment_id,

                  p_refund_id: refund.id,

                  p_payment_intent_id:
                    refund.payment_intent,

                  p_amount_cents: refund.amount,

                  p_refund_status: refund.status,
                }
              );

            if (refundError) {
              throw refundError;
            }

            if (refund.status === 'succeeded') {
              result = 'resolved';

            } else if (
              refund.status === 'failed' ||
              refund.status === 'canceled' ||
              refund.status === 'requires_action'
            ) {
              result = 'manual_review';
              errorMessage = 'REFUND_REQUIRES_REVIEW';

            } else {
              result = 'retry';
              retryMinutes = 5;
            }
          }


        } else {
          result = 'resolved';
        }


      } catch {
        errorMessage = 'PAYMENT_RECONCILIATION_FAILED';

        const {
          data: retry,
          error: retryError,
        } = await db.rpc(
          'get_payment_reconciliation_retry',
          {
            p_attempts:
              payment.reconciliation_attempts,
          }
        );

        if (retryError || !retry) {
          result = 'manual_review';
        } else {
          result = retry.result;
          retryMinutes = retry.retry_minutes;
        }
      }

      const {
        data: finished,
        error: finishError,
      } = await db.rpc(
        'finish_payment_reconciliation',
        {
          p_payment_id: payment.id,
          p_lock_token:
            payment.reconciliation_lock_token,
          p_result: result,
          p_error: errorMessage,
          p_retry_minutes: retryMinutes,
        }
      );

      if (finishError || finished !== true) {
        summary.errors++;
        continue;
      }

      if (result === 'resolved') {
        summary.resolved++;
      } else if (result === 'manual_review') {
        summary.manual_review++;
      } else {
        summary.retry++;
      }
    }

    return reply(200, {
      result: 'reconciliation_processed',
      summary,
    });


  } catch {
    console.error(
      'Payment reconciliation failed'
    );

    return reply(500, {
      error: 'Reconciliation failed',
    });
  }
});
