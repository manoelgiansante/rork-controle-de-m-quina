import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook para receber notificações do Google Play Billing
 *
 * Este endpoint recebe notificações sobre:
 * - Novas assinaturas
 * - Renovações
 * - Cancelamentos
 * - Suspensões
 * - Recuperações de pagamento
 *
 * Documentação: https://developer.android.com/google/play/billing/rtdn-reference
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GoogleNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  testNotification?: {
    version: string;
  };
}

interface GooglePubSubMessage {
  message: {
    data: string; // Base64 encoded GoogleNotification
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * Tipos de notificação do Google Play
 * Docs: https://developer.android.com/google/play/billing/rtdn-reference#sub
 */
const GOOGLE_NOTIFICATION_TYPES = {
  SUBSCRIPTION_RECOVERED: 1,
  SUBSCRIPTION_RENEWED: 2,
  SUBSCRIPTION_CANCELED: 3,
  SUBSCRIPTION_PURCHASED: 4,
  SUBSCRIPTION_ON_HOLD: 5,
  SUBSCRIPTION_IN_GRACE_PERIOD: 6,
  SUBSCRIPTION_RESTARTED: 7,
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED: 8,
  SUBSCRIPTION_DEFERRED: 9,
  SUBSCRIPTION_PAUSED: 10,
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED: 11,
  SUBSCRIPTION_REVOKED: 12,
  SUBSCRIPTION_EXPIRED: 13,
};

/**
 * Mapeia notification type do Google para status no Supabase
 */
function mapGoogleNotificationToStatus(notificationType: number): string | null {
  switch (notificationType) {
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_PURCHASED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_RECOVERED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_RESTARTED:
      return 'active';

    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_IN_GRACE_PERIOD:
      return 'past_due';

    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_ON_HOLD:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_PAUSED:
      return 'unpaid';

    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_CANCELED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_REVOKED:
      return 'canceled';

    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_PRICE_CHANGE_CONFIRMED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_DEFERRED:
    case GOOGLE_NOTIFICATION_TYPES.SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED:
      // Esses tipos não mudam o status, apenas atualizam dados
      return null;

    default:
      console.log('[Google Webhook] Tipo de notificação desconhecido:', notificationType);
      return null;
  }
}

/**
 * Processa notificação do Google e atualiza Supabase
 */
async function processGoogleNotification(notification: GoogleNotification): Promise<void> {
  // Ignorar notificações de teste
  if (notification.testNotification) {
    console.log('[Google Webhook] Notificação de teste recebida');
    return;
  }

  const subNotification = notification.subscriptionNotification;
  if (!subNotification) {
    console.log('[Google Webhook] Notificação sem dados de assinatura');
    return;
  }

  console.log('[Google Webhook] Processando notificação:', {
    type: subNotification.notificationType,
    productId: subNotification.subscriptionId,
    packageName: notification.packageName,
  });

  const purchaseToken = subNotification.purchaseToken;
  const productId = subNotification.subscriptionId;
  const notificationType = subNotification.notificationType;

  // Mapear para status do Supabase
  const newStatus = mapGoogleNotificationToStatus(notificationType);

  if (!newStatus) {
    console.log('[Google Webhook] Status não mapeado ou não requer atualização, ignorando');
    return;
  }

  // Buscar assinatura existente
  const { data: existingSubscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('google_purchase_token', purchaseToken)
    .maybeSingle();

  if (fetchError) {
    console.error('[Google Webhook] Erro ao buscar assinatura:', fetchError);
    throw fetchError;
  }

  if (!existingSubscription) {
    console.log('[Google Webhook] ⚠️ Assinatura não encontrada para purchase_token:', purchaseToken);
    // Não criamos nova assinatura aqui pois não temos o user_id
    // A assinatura deve ser criada primeiro pelo endpoint validate-google
    return;
  }

  // Preparar dados para atualização
  const updateData: any = {
    status: newStatus,
    google_purchase_token: purchaseToken,
    google_product_id: productId,
    payment_provider: 'google',
  };

  // Determinar plan_type baseado no product_id
  if (productId.includes('basico')) {
    updateData.plan_type = productId.includes('anual') ? 'BASIC_YEARLY' : 'BASIC_MONTHLY';
    updateData.machine_limit = 10;
  } else if (productId.includes('premium')) {
    updateData.plan_type = productId.includes('anual') ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
    updateData.machine_limit = null;
  }

  // Atualizar assinatura
  console.log('[Google Webhook] Atualizando assinatura para user:', existingSubscription.user_id);

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', existingSubscription.user_id);

  if (updateError) {
    console.error('[Google Webhook] Erro ao atualizar assinatura:', updateError);
    throw updateError;
  }

  console.log('[Google Webhook] ✅ Assinatura atualizada com sucesso');
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
    console.log('[Google Webhook] Recebida notificação do Google Play');

    // O Google Play envia via Cloud Pub/Sub
    const pubsubMessage: GooglePubSubMessage = req.body;

    if (!pubsubMessage.message || !pubsubMessage.message.data) {
      console.error('[Google Webhook] Payload inválido:', req.body);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Decodificar mensagem Base64
    const notificationData = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
    const notification: GoogleNotification = JSON.parse(notificationData);

    // Validar package name
    if (notification.packageName !== 'com.manoel.controledemaquina') {
      console.error('[Google Webhook] Package name inválido:', notification.packageName);
      return res.status(400).json({ error: 'Invalid package name' });
    }

    // Processar notificação
    await processGoogleNotification(notification);

    // Retornar sucesso (importante para o Google não reenviar)
    // O Google espera código 200-299
    return res.status(200).json({
      success: true,
      message: 'Notification processed successfully'
    });

  } catch (error: any) {
    console.error('[Google Webhook] Erro ao processar webhook:', error);

    // Retornar 200 mesmo com erro para evitar retries do Google
    // mas logar o erro para investigação
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}
