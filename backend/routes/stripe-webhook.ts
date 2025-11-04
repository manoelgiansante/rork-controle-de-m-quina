import { Hono } from 'hono';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const app = new Hono();

app.post('/stripe/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  
  if (!sig) {
    console.error('[STRIPE_WEBHOOK] ⚠️ Stripe signature header ausente');
    return c.text('Webhook Error: Missing signature', 400);
  }

  let rawBody: string;
  try {
    rawBody = await c.req.text();
  } catch (err) {
    console.error('[STRIPE_WEBHOOK] ⚠️ Erro ao ler body:', err);
    return c.text('Webhook Error: Cannot read body', 400);
  }

  let event: Stripe.Event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[STRIPE_WEBHOOK] ⚠️ STRIPE_WEBHOOK_SECRET não configurado');
      return c.text('Webhook Error: Secret not configured', 500);
    }

    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('[STRIPE_WEBHOOK] 📨 Evento recebido:', event.type, '| ID:', event.id);
  } catch (err: any) {
    console.error('[STRIPE_WEBHOOK] ⚠️ Erro de verificação de webhook:', err.message);
    return c.text(`Webhook Error: ${err.message}`, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        console.log('[STRIPE_WEBHOOK] ✅ Pagamento concluído:', session.id);
        console.log('[STRIPE_WEBHOOK] User ID:', userId);
        console.log('[STRIPE_WEBHOOK] Subscription ID:', subscriptionId);

        if (!userId) {
          console.error('[STRIPE_WEBHOOK] ⚠️ No userId in metadata');
          break;
        }

        if (!subscriptionId) {
          console.error('[STRIPE_WEBHOOK] ⚠️ No subscription ID');
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

        console.log('[STRIPE_WEBHOOK] 📦 Plan details:', { planType, billingCycle, machineLimit, priceId });

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
          console.error('[STRIPE_WEBHOOK] ❌ Error updating subscription:', error);
        } else {
          console.log('[STRIPE_WEBHOOK] ✅ Subscription created/updated for user:', userId);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        console.log('[STRIPE_WEBHOOK] 💰 Fatura paga:', invoice.id);

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
            console.error('[STRIPE_WEBHOOK] ❌ Error updating payment:', error);
          } else {
            console.log('[STRIPE_WEBHOOK] ✅ Payment succeeded for subscription:', subscriptionId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        console.log('[STRIPE_WEBHOOK] ❌ Pagamento falhou:', invoice.id);

        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'expired',
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('[STRIPE_WEBHOOK] ❌ Error updating failed payment:', error);
          } else {
            console.log('[STRIPE_WEBHOOK] ⚠️ Payment failed for subscription:', subscriptionId);
          }
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[STRIPE_WEBHOOK] 🟢 Nova assinatura criada:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        console.log('[STRIPE_WEBHOOK] 🔄 Assinatura atualizada:', subscription.id);

        if (!userId) {
          console.error('[STRIPE_WEBHOOK] ⚠️ No userId in metadata');
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
          console.error('[STRIPE_WEBHOOK] ❌ Error updating subscription:', error);
        } else {
          console.log('[STRIPE_WEBHOOK] ✅ Subscription updated for user:', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        console.log('[STRIPE_WEBHOOK] 🔴 Assinatura cancelada:', subscription.id);

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            machine_limit: 0,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('[STRIPE_WEBHOOK] ❌ Error canceling subscription:', error);
        } else {
          console.log('[STRIPE_WEBHOOK] ✅ Subscription canceled:', subscription.id);
        }
        break;
      }

      default:
        console.log('[STRIPE_WEBHOOK] 📝 Evento não tratado:', event.type);
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error('[STRIPE_WEBHOOK] ❌ Erro ao processar evento:', err);
    return c.text(`Webhook Processing Error: ${err.message}`, 500);
  }
});

export default app;
