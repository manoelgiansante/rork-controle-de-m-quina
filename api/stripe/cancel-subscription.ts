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

    // Log para debug
    console.log('[CANCEL] stripe_subscription_id:', stripeSubscriptionId);
    console.log('[CANCEL] subscription.status:', subscription.status);

    // Verifica se é subscription de teste ou trial
    const isTestSubscription = !stripeSubscriptionId || 
                                stripeSubscriptionId === '' ||
                                stripeSubscriptionId === null ||
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
    let currentPeriodEnd = subscription.current_period_end;
    
    try {
      console.log('[CANCEL] 🔄 Configurando cancelamento no final do período no Stripe:', stripeSubscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      
      console.log('[CANCEL] ✅ Subscription configurada para cancelar no final do período:', updatedSubscription.id);
      console.log('[CANCEL] 🗓️ Período termina em:', new Date((updatedSubscription as any).current_period_end * 1000).toISOString());
      
      // Atualiza currentPeriodEnd com valor do Stripe
      const stripePeriodEnd = (updatedSubscription as any).current_period_end;
      if (stripePeriodEnd) {
        currentPeriodEnd = new Date(stripePeriodEnd * 1000).toISOString();
      }
    } catch (stripeError: any) {
      console.error('[CANCEL] ❌ Erro ao configurar cancelamento no Stripe:', stripeError?.message || stripeError);
      console.error('[CANCEL] 🔍 Código do erro:', stripeError?.code || 'undefined');
      console.error('[CANCEL] 🔍 Erro completo:', JSON.stringify(stripeError, null, 2));
      
      // Se erro é "subscription não encontrada", apenas atualiza Supabase
      if (stripeError?.code === 'resource_missing') {
        console.log('[CANCEL] ⚠️ Subscription não encontrada no Stripe - atualizando apenas Supabase');
      } else if (!stripeError || !stripeError.code) {
        // Erro indefinido ou desconhecido - continua e atualiza no Supabase
        console.log('[CANCEL] ⚠️ Erro desconhecido no Stripe - continuando com atualização no Supabase');
      } else {
        // Outro erro real - retorna erro para usuário
        return res.status(500).json({ error: 'Erro ao cancelar no Stripe: ' + stripeError.message });
      }
    }

    // Se ainda não temos currentPeriodEnd, tenta buscar do Stripe ou usa fallback
    if (!currentPeriodEnd) {
      console.log('[CANCEL] ⚠️ currentPeriodEnd não definido, tentando buscar...');
      
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const stripePeriodEnd = (stripeSubscription as any).current_period_end;
        
        if (stripePeriodEnd) {
          currentPeriodEnd = new Date(stripePeriodEnd * 1000).toISOString();
          console.log('[CANCEL] ✅ currentPeriodEnd obtido do Stripe:', currentPeriodEnd);
        }
      } catch (err: any) {
        console.error('[CANCEL] ⚠️ Erro ao buscar subscription no Stripe:', err.message);
      }
      
      // Fallback final: usa data baseada no tipo de plano
      if (!currentPeriodEnd) {
        const futureDate = new Date();
        
        // Se é mensal, adiciona 30 dias; se é anual, adiciona 365 dias
        if (subscription.billing_cycle === 'annual') {
          futureDate.setDate(futureDate.getDate() + 365);
          console.log('[CANCEL] ⚠️ Usando fallback de 365 dias (anual):', futureDate.toISOString());
        } else {
          futureDate.setDate(futureDate.getDate() + 30);
          console.log('[CANCEL] ⚠️ Usando fallback de 30 dias (mensal):', futureDate.toISOString());
        }
        
        currentPeriodEnd = futureDate.toISOString();
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
