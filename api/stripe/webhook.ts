import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

async function readRaw(req: VercelRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed');
  }

  try {
    const raw = await readRaw(req);
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      console.error('[WEBHOOK] ⚠️ Stripe signature header ausente');
      return res.status(400).send('Webhook Error: Missing signature');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2025-10-29.clover',
    });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[WEBHOOK] ⚠️ STRIPE_WEBHOOK_SECRET não configurado');
      return res.status(500).send('Webhook Error: Secret not configured');
    }

    const event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    console.log('[WEBHOOK] 📨 Evento recebido:', event.type, '| ID:', event.id);

    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        console.log('[WEBHOOK] ✅ Pagamento concluído:', session.id);
        console.log('[WEBHOOK] User ID:', userId);
        console.log('[WEBHOOK] Subscription ID:', subscriptionId);

        if (!userId || !subscriptionId) {
          console.error('[WEBHOOK] ⚠️ Dados ausentes no metadata');
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

        console.log('[WEBHOOK] 📦 Plan details:', { planType, billingCycle, machineLimit, priceId });

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
            current_period_start: (subscription as any).current_period_start 
              ? new Date((subscription as any).current_period_start * 1000).toISOString()
              : new Date().toISOString(),
            current_period_end: (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_active: false,
          });

        if (error) {
          console.error('[WEBHOOK] ❌ Erro ao atualizar subscription:', error);
        } else {
          console.log('[WEBHOOK] ✅ Subscription criada/atualizada para user:', userId);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        console.log('[WEBHOOK] 💰 Fatura paga:', invoice.id);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: (subscription as any).current_period_start 
                ? new Date((subscription as any).current_period_start * 1000).toISOString()
                : new Date().toISOString(),
              current_period_end: (subscription as any).current_period_end
                ? new Date((subscription as any).current_period_end * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('[WEBHOOK] ❌ Erro ao atualizar pagamento:', error);
          } else {
            console.log('[WEBHOOK] ✅ Pagamento confirmado para subscription:', subscriptionId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        console.log('[WEBHOOK] ❌ Pagamento falhou:', invoice.id);

        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('[WEBHOOK] ❌ Erro ao marcar como expirado:', error);
          } else {
            console.log('[WEBHOOK] ⚠️ Pagamento falhou para subscription:', subscriptionId);
          }
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[WEBHOOK] 🟢 Nova assinatura criada:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        console.log('[WEBHOOK] 🔄 Subscription atualizada:', subscription.id);
        console.log('[WEBHOOK] User ID:', userId);
        console.log('[WEBHOOK] Status:', subscription.status);

        if (!userId) {
          console.error('[WEBHOOK] ⚠️ userId ausente no metadata da subscription atualizada');
          break;
        }

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!existingSub) {
          console.error('[WEBHOOK] ⚠️ Subscription não encontrada no Supabase');
          break;
        }

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : subscription.status === 'canceled' ? 'canceled' : 'expired',
            current_period_start: (subscription as any).current_period_start
              ? new Date((subscription as any).current_period_start * 1000).toISOString()
              : existingSub.current_period_start,
            current_period_end: (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000).toISOString()
              : existingSub.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          })
          .eq('user_id', userId);

        if (error) {
          console.error('[WEBHOOK] ❌ Erro ao atualizar subscription:', error);
        } else {
          console.log('[WEBHOOK] ✅ Subscription atualizada no Supabase para userId:', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        console.log('[WEBHOOK] 🗑️ Subscription deletada:', subscription.id);
        console.log('[WEBHOOK] User ID:', userId);

        if (!userId) {
          console.error('[WEBHOOK] ⚠️ userId ausente no metadata da subscription deletada');
          break;
        }

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            trial_active: false,
          })
          .eq('user_id', userId);

        if (error) {
          console.error('[WEBHOOK] ❌ Erro ao cancelar subscription:', error);
        } else {
          console.log('[WEBHOOK] ✅ Subscription cancelada no Supabase para userId:', userId);
        }
        break;
      }

      default:
        console.log('[WEBHOOK] 📝 Evento não tratado:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[WEBHOOK] ❌ Erro:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
