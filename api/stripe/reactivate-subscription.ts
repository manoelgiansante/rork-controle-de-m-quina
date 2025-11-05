import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed');
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      console.error('[REACTIVATE] ⚠️ userId ausente no body');
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    console.log('[REACTIVATE] 🔍 Iniciando reativação para userId:', userId);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2025-10-29.clover',
    });

    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      console.error('[REACTIVATE] ❌ Subscription não encontrada no Supabase:', fetchError);
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    console.log('[REACTIVATE] ✅ Subscription encontrada:', subscription.stripe_subscription_id);

    if (!subscription.cancel_at_period_end) {
      console.log('[REACTIVATE] ⚠️ Subscription não está marcada para cancelamento');
      return res.status(400).json({ error: 'Assinatura não está pendente de cancelamento' });
    }

    const stripeSubscriptionId = subscription.stripe_subscription_id;

    if (!stripeSubscriptionId || stripeSubscriptionId.startsWith('sub_test_')) {
      console.log('[REACTIVATE] ⚠️ Subscription de teste - não pode reativar no Stripe');
      return res.status(400).json({ error: 'Assinatura de teste não pode ser reativada' });
    }

    try {
      console.log('[REACTIVATE] 🔄 Reativando subscription no Stripe:', stripeSubscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      
      console.log('[REACTIVATE] ✅ Subscription reativada no Stripe:', updatedSubscription.id);
    } catch (stripeError: any) {
      console.error('[REACTIVATE] ❌ Erro ao reativar no Stripe:', stripeError.message);
      return res.status(500).json({ error: 'Erro ao reativar no Stripe: ' + stripeError.message });
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[REACTIVATE] ❌ Erro ao atualizar Supabase:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
    }

    console.log('[REACTIVATE] ✅ Subscription reativada com sucesso para userId:', userId);

    return res.status(200).json({
      success: true,
      message: 'Assinatura reativada com sucesso',
    });

  } catch (error: any) {
    console.error('[REACTIVATE] ❌ Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
}
