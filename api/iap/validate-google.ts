import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Endpoint para validar compras do Google Play
 *
 * Este endpoint:
 * 1. Recebe o token de compra do Android
 * 2. Valida com a Google Play Developer API
 * 3. Atualiza o status de assinatura do usuário no Supabase
 * 4. Retorna sucesso ou erro
 *
 * Documentação do Google: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions
 *
 * IMPORTANTE: Para usar este endpoint, você precisa:
 * 1. Configurar produtos no Google Play Console
 * 2. Criar uma Service Account no Google Cloud Console
 * 3. Dar permissões à Service Account no Play Console
 * 4. Baixar o JSON da Service Account e converter para base64
 * 5. Adicionar ao .env como GOOGLE_SERVICE_ACCOUNT_KEY
 */

interface GoogleReceiptValidationRequest {
  userId: string;
  purchaseToken: string;
  productId: string;
  packageName?: string;
}

async function readJson(req: VercelRequest) {
  if (typeof req.body === 'object' && req.body) return req.body;
  const chunks: Buffer[] = [];
  for await (const ch of req) chunks.push(Buffer.from(ch));
  const raw = Buffer.concat(chunks as any).toString('utf8') || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Valida compra com Google Play Developer API
 */
async function validatePurchaseWithGoogle(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<any> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurado');
  }

  // Decodificar Service Account JSON
  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
  );

  // Obter access token usando JWT
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  await auth.authorize();

  // Buscar informações da compra
  const androidPublisher = google.androidpublisher({
    version: 'v3',
    auth,
  });

  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });

  return response.data;
}

/**
 * Mapeia productId para tipo de plano e período
 */
function getSubscriptionInfo(productId: string): {
  plan_type: 'basic' | 'premium';
  billing_cycle: 'monthly' | 'annual';
  machine_limit: number | null;
} | null {
  const productMap: Record<string, {
    plan_type: 'basic' | 'premium';
    billing_cycle: 'monthly' | 'annual';
    machine_limit: number | null;
  }> = {
    'com.manoel.controledemaquina.basic.monthly': {
      plan_type: 'basic',
      billing_cycle: 'monthly',
      machine_limit: 10,
    },
    'com.manoel.controledemaquina.basic.yearly': {
      plan_type: 'basic',
      billing_cycle: 'annual',
      machine_limit: 10,
    },
    'com.manoel.controledemaquina.premium.monthly': {
      plan_type: 'premium',
      billing_cycle: 'monthly',
      machine_limit: null,
    },
    'com.manoel.controledemaquina.premium.yearly': {
      plan_type: 'premium',
      billing_cycle: 'annual',
      machine_limit: null,
    },
    'com.manoel.controledemaquina.trial.7days': {
      plan_type: 'premium',
      billing_cycle: 'monthly',
      machine_limit: null,
    },
  };

  return productMap[productId] || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST, OPTIONS').end('Method Not Allowed');
  }

  try {
    console.log('[GOOGLE IAP] Recebendo validação de compra');

    const {
      userId,
      purchaseToken,
      productId,
      packageName = 'com.manoel.controledemaquina',
    } = await readJson(req) as GoogleReceiptValidationRequest;

    // Validar parâmetros
    if (!userId || !purchaseToken || !productId) {
      console.error('[GOOGLE IAP] Parâmetros inválidos:', { userId, hasPurchaseToken: !!purchaseToken, productId });
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        message: 'userId, purchaseToken e productId são obrigatórios',
      });
    }

    console.log('[GOOGLE IAP] Validando:', { userId, productId, packageName });

    // Validar compra com Google
    const purchaseData = await validatePurchaseWithGoogle(packageName, productId, purchaseToken);

    console.log('[GOOGLE IAP] Resultado da validação:', {
      purchaseState: purchaseData.purchaseState,
      paymentState: purchaseData.paymentState,
    });

    // purchaseState:
    // 0 = Purchased
    // 1 = Canceled
    // 2 = Pending
    if (purchaseData.purchaseState !== 0) {
      console.error('[GOOGLE IAP] Compra não está ativa:', purchaseData.purchaseState);
      return res.status(400).json({
        error: 'Compra não está ativa',
        purchaseState: purchaseData.purchaseState,
      });
    }

    // Obter informações do plano
    const subscriptionInfo = getSubscriptionInfo(productId);
    if (!subscriptionInfo) {
      console.error('[GOOGLE IAP] Produto desconhecido:', productId);
      return res.status(400).json({
        error: 'Produto desconhecido',
        productId,
      });
    }

    // Atualizar assinatura no Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obter data de expiração
    const expiryTimeMillis = purchaseData.expiryTimeMillis;
    const expiresDate = expiryTimeMillis ? new Date(parseInt(expiryTimeMillis)) : null;

    console.log('[GOOGLE IAP] Informações da assinatura:', {
      plan_type: subscriptionInfo.plan_type,
      billing_cycle: subscriptionInfo.billing_cycle,
      expiresDate,
    });

    // Atualizar ou criar registro de assinatura
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSubscription) {
      // Atualizar assinatura existente
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_type: subscriptionInfo.plan_type,
          billing_cycle: subscriptionInfo.billing_cycle,
          machine_limit: subscriptionInfo.machine_limit ?? 10,
          status: 'active',
          payment_provider: 'google',
          google_purchase_token: purchaseToken,
          google_product_id: productId,
          current_period_end: expiresDate,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[GOOGLE IAP] Erro ao atualizar assinatura:', updateError);
        throw updateError;
      }

      console.log('[GOOGLE IAP] ✅ Assinatura atualizada');
    } else {
      // Criar nova assinatura
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: subscriptionInfo.plan_type,
          billing_cycle: subscriptionInfo.billing_cycle,
          machine_limit: subscriptionInfo.machine_limit ?? 10,
          status: 'active',
          payment_provider: 'google',
          google_purchase_token: purchaseToken,
          google_product_id: productId,
          current_period_end: expiresDate,
        });

      if (insertError) {
        console.error('[GOOGLE IAP] Erro ao criar assinatura:', insertError);
        throw insertError;
      }

      console.log('[GOOGLE IAP] ✅ Assinatura criada');
    }

    return res.status(200).json({
      success: true,
      subscription: {
        plan_type: subscriptionInfo.plan_type,
        billing_cycle: subscriptionInfo.billing_cycle,
        machine_limit: subscriptionInfo.machine_limit,
        expiresDate,
        status: 'active',
      },
    });
  } catch (error: any) {
    console.error('[GOOGLE IAP] Erro:', error?.message);

    // Se o erro for porque GOOGLE_SERVICE_ACCOUNT_KEY não está configurado
    if (error?.message?.includes('GOOGLE_SERVICE_ACCOUNT_KEY')) {
      return res.status(503).json({
        error: 'Google Play não configurado',
        message: 'Configure GOOGLE_SERVICE_ACCOUNT_KEY no .env',
        details: error?.message,
      });
    }

    return res.status(500).json({
      error: 'Erro ao validar compra',
      details: error?.message,
    });
  }
}
