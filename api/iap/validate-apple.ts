import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Endpoint para validar recibos de compra da Apple App Store
 *
 * Este endpoint:
 * 1. Recebe o recibo de compra do iOS
 * 2. Valida com os servidores da Apple
 * 3. Atualiza o status de assinatura do usuário no Supabase
 * 4. Retorna sucesso ou erro
 *
 * Documentação da Apple: https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
 */

interface AppleReceiptValidationRequest {
  userId: string;
  receipt: string;
  transactionId: string;
  productId: string;
}

interface AppleReceiptValidationResponse {
  status: number;
  environment?: string;
  receipt?: any;
  latest_receipt_info?: any[];
  pending_renewal_info?: any[];
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
 * Valida recibo com servidores da Apple
 */
async function validateReceiptWithApple(
  receiptData: string,
  isProduction: boolean = true
): Promise<AppleReceiptValidationResponse> {
  const appleSharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!appleSharedSecret) {
    throw new Error('APPLE_SHARED_SECRET não configurado');
  }

  // URL da Apple para validação
  // Production: https://buy.itunes.apple.com/verifyReceipt
  // Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
  const verifyUrl = isProduction
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  console.log('[APPLE IAP] Validando recibo em:', verifyUrl);

  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: appleSharedSecret,
      'exclude-old-transactions': true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro na validação Apple: ${response.statusText}`);
  }

  const data: AppleReceiptValidationResponse = await response.json();

  // Se status for 21007, significa que estamos usando sandbox em produção (ou vice-versa)
  // Tentar novamente com o ambiente correto
  if (data.status === 21007) {
    console.log('[APPLE IAP] Ambiente incorreto, tentando novamente...');
    return validateReceiptWithApple(receiptData, !isProduction);
  }

  return data;
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
    'com.2m.controledemaquina.basico.mensal19': {
      plan_type: 'basic',
      billing_cycle: 'monthly',
      machine_limit: 10,
    },
    'com.2m.controledemaquina.basico.anual': {
      plan_type: 'basic',
      billing_cycle: 'annual',
      machine_limit: 10,
    },
    'com.2m.controledemaquina.premium.mensal': {
      plan_type: 'premium',
      billing_cycle: 'monthly',
      machine_limit: null,
    },
    'com.2m.controledemaquina.premium.anual': {
      plan_type: 'premium',
      billing_cycle: 'annual',
      machine_limit: null,
    },
    'com.2m.controledemaquina.teste.7dias': {
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
    console.log('[APPLE IAP] Recebendo validação de recibo');

    const { userId, receipt, transactionId, productId } = await readJson(req) as AppleReceiptValidationRequest;

    // Validar parâmetros
    if (!userId || !receipt || !productId) {
      console.error('[APPLE IAP] Parâmetros inválidos:', { userId, hasReceipt: !!receipt, productId });
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        message: 'userId, receipt e productId são obrigatórios',
      });
    }

    console.log('[APPLE IAP] Validando:', { userId, transactionId, productId });

    // Validar recibo com Apple
    const validationResult = await validateReceiptWithApple(receipt);

    console.log('[APPLE IAP] Resultado da validação:', {
      status: validationResult.status,
      environment: validationResult.environment,
    });

    // Status codes da Apple:
    // 0 = Success
    // 21000 = The App Store could not read the JSON object you provided
    // 21002 = The data in the receipt-data property was malformed or missing
    // 21003 = The receipt could not be authenticated
    // 21004 = The shared secret you provided does not match the shared secret on file
    // 21005 = The receipt server is not currently available
    // 21007 = This receipt is from the test environment (sandbox)
    // 21008 = This receipt is from the production environment
    if (validationResult.status !== 0) {
      console.error('[APPLE IAP] Validação falhou:', validationResult.status);
      return res.status(400).json({
        error: 'Recibo inválido',
        appleStatus: validationResult.status,
      });
    }

    // Obter informações do plano
    const subscriptionInfo = getSubscriptionInfo(productId);
    if (!subscriptionInfo) {
      console.error('[APPLE IAP] Produto desconhecido:', productId);
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

    // Obter informações da última transação
    const latestReceiptInfo = validationResult.latest_receipt_info?.[0];
    const expiresDateMs = latestReceiptInfo?.expires_date_ms;
    const expiresDate = expiresDateMs ? new Date(parseInt(expiresDateMs)) : null;

    console.log('[APPLE IAP] Informações da assinatura:', {
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
          payment_provider: 'apple',
          apple_transaction_id: transactionId,
          apple_product_id: productId,
          current_period_end: expiresDate,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[APPLE IAP] Erro ao atualizar assinatura:', updateError);
        throw updateError;
      }

      console.log('[APPLE IAP] ✅ Assinatura atualizada');
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
          payment_provider: 'apple',
          apple_transaction_id: transactionId,
          apple_product_id: productId,
          current_period_end: expiresDate,
        });

      if (insertError) {
        console.error('[APPLE IAP] Erro ao criar assinatura:', insertError);
        throw insertError;
      }

      console.log('[APPLE IAP] ✅ Assinatura criada');
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
    console.error('[APPLE IAP] Erro:', error?.message);
    return res.status(500).json({
      error: 'Erro ao validar recibo',
      details: error?.message,
    });
  }
}
