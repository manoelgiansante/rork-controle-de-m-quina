import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook para receber notificações do Apple App Store Server
 *
 * Este endpoint recebe notificações sobre:
 * - Novas assinaturas
 * - Renovações
 * - Cancelamentos
 * - Reembolsos
 * - Mudanças de status
 *
 * Documentação: https://developer.apple.com/documentation/appstoreservernotifications
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AppleNotification {
  notificationType: string;
  subtype?: string;
  data: {
    appAppleId?: number;
    bundleId?: string;
    bundleVersion?: string;
    environment?: string;
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
}

/**
 * Mapeia notification type da Apple para status no Supabase
 */
function mapAppleNotificationToStatus(notificationType: string, subtype?: string): string | null {
  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'DID_CHANGE_RENEWAL_PREF':
      return 'active';

    case 'DID_FAIL_TO_RENEW':
      return 'past_due';

    case 'EXPIRED':
    case 'DID_CHANGE_RENEWAL_STATUS':
      if (subtype === 'VOLUNTARY' || subtype === 'AUTO_RENEW_DISABLED') {
        return 'canceled';
      }
      return 'expired';

    case 'GRACE_PERIOD_EXPIRED':
      return 'unpaid';

    case 'REFUND':
    case 'REVOKE':
      return 'canceled';

    default:
      console.log('[Apple Webhook] Tipo de notificação desconhecido:', notificationType);
      return null;
  }
}

/**
 * Extrai dados do transaction info (JWT)
 * Em produção, você deve verificar a assinatura JWT da Apple
 */
function decodeTransactionInfo(signedInfo: string): any {
  try {
    // O signedInfo é um JWT. Aqui estamos apenas decodificando sem verificar
    // Em produção, use uma biblioteca como 'jsonwebtoken' para verificar a assinatura
    const parts = signedInfo.split('.');
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('[Apple Webhook] Erro ao decodificar transaction info:', error);
    return null;
  }
}

/**
 * Processa notificação da Apple e atualiza Supabase
 */
async function processAppleNotification(notification: AppleNotification): Promise<void> {
  console.log('[Apple Webhook] Processando notificação:', {
    type: notification.notificationType,
    subtype: notification.subtype,
    environment: notification.data.environment,
  });

  // Decodificar transaction info
  const transactionInfo = notification.data.signedTransactionInfo
    ? decodeTransactionInfo(notification.data.signedTransactionInfo)
    : null;

  if (!transactionInfo) {
    console.error('[Apple Webhook] Não foi possível decodificar transaction info');
    return;
  }

  const originalTransactionId = transactionInfo.originalTransactionId;
  const productId = transactionInfo.productId;
  const expiresDate = transactionInfo.expiresDate
    ? new Date(transactionInfo.expiresDate).toISOString()
    : null;

  // Mapear para status do Supabase
  const newStatus = mapAppleNotificationToStatus(
    notification.notificationType,
    notification.subtype
  );

  if (!newStatus) {
    console.log('[Apple Webhook] Status não mapeado, ignorando notificação');
    return;
  }

  // Buscar assinatura existente
  const { data: existingSubscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('apple_transaction_id', originalTransactionId)
    .maybeSingle();

  if (fetchError) {
    console.error('[Apple Webhook] Erro ao buscar assinatura:', fetchError);
    throw fetchError;
  }

  // Preparar dados para atualização
  const updateData: any = {
    status: newStatus,
    apple_transaction_id: originalTransactionId,
    apple_product_id: productId,
    payment_provider: 'apple',
  };

  if (expiresDate) {
    updateData.current_period_end = expiresDate;
  }

  // Determinar plan_type baseado no product_id
  if (productId.includes('basico')) {
    updateData.plan_type = productId.includes('anual') ? 'BASIC_YEARLY' : 'BASIC_MONTHLY';
    updateData.machine_limit = 10;
  } else if (productId.includes('premium')) {
    updateData.plan_type = productId.includes('anual') ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
    updateData.machine_limit = null;
  }

  if (existingSubscription) {
    // Atualizar assinatura existente
    console.log('[Apple Webhook] Atualizando assinatura existente para user:', existingSubscription.user_id);

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', existingSubscription.user_id);

    if (updateError) {
      console.error('[Apple Webhook] Erro ao atualizar assinatura:', updateError);
      throw updateError;
    }

    console.log('[Apple Webhook] ✅ Assinatura atualizada com sucesso');
  } else {
    console.log('[Apple Webhook] ⚠️ Assinatura não encontrada para transaction_id:', originalTransactionId);
    // Não criamos nova assinatura aqui pois não temos o user_id
    // A assinatura deve ser criada primeiro pelo endpoint validate-apple
  }
}

/**
 * Handler principal do webhook
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Apple Webhook] Recebida notificação da Apple');

    const notification: AppleNotification = req.body;

    // Validação básica
    if (!notification.notificationType || !notification.data) {
      console.error('[Apple Webhook] Payload inválido:', req.body);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Processar notificação
    await processAppleNotification(notification);

    // Retornar sucesso (importante para a Apple não reenviar)
    return res.status(200).json({
      success: true,
      message: 'Notification processed successfully'
    });

  } catch (error: any) {
    console.error('[Apple Webhook] Erro ao processar webhook:', error);

    // Retornar 200 mesmo com erro para evitar retries da Apple
    // mas logar o erro para investigação
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}
