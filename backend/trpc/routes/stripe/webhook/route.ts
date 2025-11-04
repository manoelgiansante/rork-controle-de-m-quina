import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export const stripeWebhookProcedure = publicProcedure
  .input(
    z.object({
      body: z.string(),
      signature: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Webhook secret não configurado',
        });
      }

      const event = stripe.webhooks.constructEvent(
        input.body,
        input.signature,
        webhookSecret
      );

      console.log('[STRIPE_WEBHOOK] Event received:', event.type);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const subscriptionId = session.subscription as string;

          if (!userId) {
            console.error('[STRIPE_WEBHOOK] No userId in metadata');
            break;
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;

          let planType: 'basic' | 'premium' = 'basic';
          let billingCycle: 'monthly' | 'annual' = 'monthly';
          let machineLimit = 10;

          if (priceId === process.env.NEXT_PUBLIC_PRICE_BASIC_MONTHLY) {
            planType = 'basic';
            billingCycle = 'monthly';
            machineLimit = 10;
          } else if (priceId === process.env.NEXT_PUBLIC_PRICE_BASIC_YEARLY) {
            planType = 'basic';
            billingCycle = 'annual';
            machineLimit = 10;
          } else if (priceId === process.env.NEXT_PUBLIC_PRICE_PREMIUM_MONTHLY) {
            planType = 'premium';
            billingCycle = 'monthly';
            machineLimit = -1;
          } else if (priceId === process.env.NEXT_PUBLIC_PRICE_PREMIUM_YEARLY) {
            planType = 'premium';
            billingCycle = 'annual';
            machineLimit = -1;
          }

          const { error } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: subscription.customer as string,
              plan_type: planType,
              billing_cycle: billingCycle,
              machine_limit: machineLimit,
              status: 'active',
              current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
              trial_active: false,
            });

          if (error) {
            console.error('[STRIPE_WEBHOOK] Error updating subscription:', error);
          } else {
            console.log('[STRIPE_WEBHOOK] Subscription created/updated for user:', userId);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;

          if (!userId) {
            console.error('[STRIPE_WEBHOOK] No userId in metadata');
            break;
          }

          const priceId = subscription.items.data[0].price.id;
          let planType: 'basic' | 'premium' = 'basic';
          let billingCycle: 'monthly' | 'annual' = 'monthly';
          let machineLimit = 10;

          if (priceId === process.env.NEXT_PUBLIC_PRICE_BASIC_MONTHLY) {
            planType = 'basic';
            billingCycle = 'monthly';
            machineLimit = 10;
          } else if (priceId === process.env.NEXT_PUBLIC_PRICE_BASIC_YEARLY) {
            planType = 'basic';
            billingCycle = 'annual';
            machineLimit = 10;
          } else if (priceId === process.env.NEXT_PUBLIC_PRICE_PREMIUM_MONTHLY) {
            planType = 'premium';
            billingCycle = 'monthly';
            machineLimit = -1;
          } else if (priceId === process.env.NEXT_PUBLIC_PRICE_PREMIUM_YEARLY) {
            planType = 'premium';
            billingCycle = 'annual';
            machineLimit = -1;
          }

          const { error } = await supabase
            .from('subscriptions')
            .update({
              plan_type: planType,
              billing_cycle: billingCycle,
              machine_limit: machineLimit,
              status: subscription.status === 'active' ? 'active' : 'expired',
              current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          if (error) {
            console.error('[STRIPE_WEBHOOK] Error updating subscription:', error);
          } else {
            console.log('[STRIPE_WEBHOOK] Subscription updated for user:', userId);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;

          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'expired',
              machine_limit: 0,
            })
            .eq('stripe_subscription_id', subscription.id);

          if (error) {
            console.error('[STRIPE_WEBHOOK] Error canceling subscription:', error);
          } else {
            console.log('[STRIPE_WEBHOOK] Subscription canceled:', subscription.id);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription as string;

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const { error } = await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
              })
              .eq('stripe_subscription_id', subscriptionId);

            if (error) {
              console.error('[STRIPE_WEBHOOK] Error updating payment:', error);
            } else {
              console.log('[STRIPE_WEBHOOK] Payment succeeded for subscription:', subscriptionId);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription as string;

          if (subscriptionId) {
            const { error } = await supabase
              .from('subscriptions')
              .update({
                status: 'expired',
              })
              .eq('stripe_subscription_id', subscriptionId);

            if (error) {
              console.error('[STRIPE_WEBHOOK] Error updating failed payment:', error);
            } else {
              console.log('[STRIPE_WEBHOOK] Payment failed for subscription:', subscriptionId);
            }
          }
          break;
        }

        default:
          console.log('[STRIPE_WEBHOOK] Unhandled event type:', event.type);
      }

      return { received: true };
    } catch (error) {
      console.error('[STRIPE_WEBHOOK] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao processar webhook',
      });
    }
  });
