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
      console.error('[CANCEL] ⚠️ userId ausente no body');
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    console.log('[CANCEL] 🔍 Iniciando cancelamento para userId:', userId);

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
      console.error('[CANCEL] ❌ Subscription não encontrada no Supabase:', fetchError);
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    console.log('[CANCEL] ✅ Subscription encontrada:', subscription.stripe_subscription_id);

    if (subscription.status === 'canceled') {
      console.log('[CANCEL] ⚠️ Subscription já está cancelada');
      return res.status(400).json({ error: 'Assinatura já está cancelada' });
    }

    const stripeSubscriptionId = subscription.stripe_subscription_id;

    // Verifica se é subscription de teste ou trial
    const isTestSubscription = !stripeSubscriptionId || 
                                stripeSubscriptionId.startsWith('sub_test_') ||
                                subscription.status === 'trial';

    if (isTestSubscription) {
      // Subscription de teste ou trial - apenas atualiza Supabase
      console.log('[CANCEL] ⚠️ Subscription de teste/trial detectada - pulando cancelamento no Stripe');
      console.log('[CANCEL] 📝 Atualizando apenas no Supabase...');
      
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          trial_active: false,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[CANCEL] ❌ Erro ao atualizar Supabase:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
      }

      console.log('[CANCEL] ✅ Subscription de teste cancelada com sucesso (apenas Supabase)');

      return res.status(200).json({
        success: true,
        message: 'Assinatura cancelada com sucesso',
        isTest: true,
      });
    }

    // Subscription real - cancela no final do período (período de graça)
    try {
      console.log('[CANCEL] 🔄 Configurando cancelamento no final do período no Stripe:', stripeSubscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      
      console.log('[CANCEL] ✅ Subscription configurada para cancelar no final do período:', updatedSubscription.id);
      console.log('[CANCEL] 🗓️ Período termina em:', new Date((updatedSubscription as any).current_period_end * 1000).toISOString());
    } catch (stripeError: any) {
      console.error('[CANCEL] ❌ Erro ao configurar cancelamento no Stripe:', stripeError.message);
      
      // Se erro é "subscription não encontrada", apenas atualiza Supabase
      if (stripeError.code === 'resource_missing') {
        console.log('[CANCEL] ⚠️ Subscription não encontrada no Stripe - atualizando apenas Supabase');
      } else {
        // Outro erro - retorna erro para usuário
        return res.status(500).json({ error: 'Erro ao cancelar no Stripe: ' + stripeError.message });
      }
    }

    // Busca dados atualizados para pegar current_period_end
    let currentPeriodEnd = subscription.current_period_end;
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const stripePeriodEnd = (stripeSubscription as any).current_period_end;
      
      if (stripePeriodEnd) {
        // Stripe tem data válida - usa ela
        currentPeriodEnd = new Date(stripePeriodEnd * 1000).toISOString();
      } else if (!currentPeriodEnd) {
        // Fallback: se não tem em lugar nenhum, usa 30 dias
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        currentPeriodEnd = futureDate.toISOString();
        console.log('[CANCEL] ⚠️ Usando fallback de 30 dias:', currentPeriodEnd);
      }
    } catch (err) {
      console.error('[CANCEL] ⚠️ Erro ao buscar subscription no Stripe:', err);
      // Se deu erro e não tem currentPeriodEnd, usa fallback de 30 dias
      if (!currentPeriodEnd) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        currentPeriodEnd = futureDate.toISOString();
        console.log('[CANCEL] ⚠️ Usando fallback de 30 dias após erro:', currentPeriodEnd);
      }
    }

    // Atualiza status no Supabase - marca cancel_at_period_end mas mantém ativa
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        current_period_end: currentPeriodEnd,
        canceled_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[CANCEL] ❌ Erro ao atualizar Supabase:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
    }

    console.log('[CANCEL] ✅ Subscription configurada para cancelar no final do período para userId:', userId);

    return res.status(200).json({
      success: true,
      message: 'Assinatura será cancelada no final do período atual',
      currentPeriodEnd,
    });

  } catch (error: any) {
    console.error('[CANCEL] ❌ Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
}
