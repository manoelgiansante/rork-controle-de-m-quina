/**
 * SubscriptionService - Gerenciamento de Assinaturas via In-App Purchase (IAP)
 *
 * Usando react-native-iap para compatibilidade com Expo SDK 54
 */

import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import type {
  Product,
  Purchase,
  PurchaseError,
  Subscription,
  SubscriptionPurchase,
} from 'react-native-iap';

/**
 * Product IDs configurados no Apple App Store Connect e Google Play Console
 */
export const PRODUCT_IDS = {
  ios: {
    BASIC_MONTHLY: 'com.2m.controledemaquina.basico.mensal19',
    BASIC_YEARLY: 'com.2m.controledemaquina.basico.anual',
    PREMIUM_MONTHLY: 'com.2m.controledemaquina.premium.mensal',
    PREMIUM_YEARLY: 'com.2m.controledemaquina.premium.anual',
    FREE_TRIAL: 'com.2m.controledemaquina.teste.7dias',
  },
  android: {
    BASIC_MONTHLY: 'com.2m.controledemaquina.basico.mensal19',
    BASIC_YEARLY: 'com.2m.controledemaquina.basico.anual',
    PREMIUM_MONTHLY: 'com.2m.controledemaquina.premium.mensal',
    PREMIUM_YEARLY: 'com.2m.controledemaquina.premium.anual',
    FREE_TRIAL: 'com.2m.controledemaquina.teste.7dias',
  },
} as const;

/**
 * Informações dos planos de assinatura
 */
export const SUBSCRIPTION_PLANS = {
  BASIC_MONTHLY: {
    name: 'Básico Mensal',
    price: 'R$ 19,99',
    priceValue: 19.99,
    interval: 'month',
    features: [
      'Até 10 máquinas',
      'Controle de abastecimento',
      'Manutenção básica',
      'Alertas automáticos',
    ],
    machineLimit: 10,
  },
  BASIC_YEARLY: {
    name: 'Básico Anual',
    price: 'R$ 199,99',
    priceValue: 199.99,
    interval: 'year',
    features: [
      'Até 10 máquinas',
      'Controle de abastecimento',
      'Manutenção básica',
      'Alertas automáticos',
      'Economize ~2 meses',
    ],
    machineLimit: 10,
    savings: '~2 meses',
  },
  PREMIUM_MONTHLY: {
    name: 'Premium Mensal',
    price: 'R$ 49,90',
    priceValue: 49.90,
    interval: 'month',
    features: [
      'Máquinas ilimitadas',
      'Controle de abastecimento',
      'Manutenção completa',
      'Alertas inteligentes',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    machineLimit: null,
  },
  PREMIUM_YEARLY: {
    name: 'Premium Anual',
    price: 'R$ 499,90',
    priceValue: 499.90,
    interval: 'year',
    features: [
      'Máquinas ilimitadas',
      'Controle de abastecimento',
      'Manutenção completa',
      'Alertas inteligentes',
      'Relatórios avançados',
      'Suporte prioritário',
      'Economize ~2 meses',
    ],
    machineLimit: null,
    savings: '~2 meses',
  },
  FREE_TRIAL: {
    name: 'Teste Gratuito 7 Dias',
    price: 'Grátis',
    priceValue: 0,
    interval: 'trial',
    features: [
      'Acesso completo por 7 dias',
      'Todas as funcionalidades Premium',
      'Sem compromisso',
    ],
    machineLimit: null,
    trialDays: 7,
  },
} as const;

export type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS;

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceValue: number;
  currency: string;
  platform: 'ios' | 'android';
}

export interface IAPPurchase {
  transactionId: string;
  productId: string;
  purchaseTime: number;
  receipt: string;
  platform: 'ios' | 'android';
}

class SubscriptionServiceClass {
  private isConnected = false;
  private purchaseUpdateListener: any = null;
  private purchaseErrorListener: any = null;

  /**
   * Conecta ao serviço de IAP da plataforma (Apple ou Google)
   */
  async connect(): Promise<boolean> {
    try {
      console.log('[IAP] Conectando ao serviço IAP...');

      if (this.isConnected) {
        console.log('[IAP] Já está conectado');
        return true;
      }

      await RNIap.initConnection();
      this.isConnected = true;

      console.log('[IAP] ✅ Conectado com sucesso!');

      // Setup listeners para updates de compra
      this.setupPurchaseListeners();

      return true;
    } catch (error: any) {
      console.error('[IAP] ❌ Erro ao conectar:', error);
      console.error('[IAP] Error code:', error.code);
      console.error('[IAP] Error message:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Desconecta do serviço de IAP
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[IAP] Desconectando...');

      // Remove listeners
      if (this.purchaseUpdateListener) {
        this.purchaseUpdateListener.remove();
        this.purchaseUpdateListener = null;
      }
      if (this.purchaseErrorListener) {
        this.purchaseErrorListener.remove();
        this.purchaseErrorListener = null;
      }

      await RNIap.endConnection();
      this.isConnected = false;

      console.log('[IAP] ✅ Desconectado');
    } catch (error) {
      console.error('[IAP] Erro ao desconectar:', error);
    }
  }

  /**
   * Configura listeners para updates de compra
   */
  private setupPurchaseListeners(): void {
    try {
      // Listener para updates de compra (sucesso)
      this.purchaseUpdateListener = RNIap.purchaseUpdatedListener((purchase: Purchase | SubscriptionPurchase) => {
        console.log('[IAP] Purchase updated:', purchase);
        // Este listener será processado em purchaseProduct()
      });

      // Listener para erros de compra
      this.purchaseErrorListener = RNIap.purchaseErrorListener((error: PurchaseError) => {
        console.error('[IAP] Purchase error:', error);
        console.error('[IAP] Error code:', error.code);
        console.error('[IAP] Error message:', error.message);
      });

      console.log('[IAP] ✅ Listeners configurados');
    } catch (error) {
      console.error('[IAP] Erro ao configurar listeners:', error);
    }
  }

  /**
   * Busca produtos disponíveis na loja
   */
  async getProducts(): Promise<IAPProduct[]> {
    try {
      if (!this.isConnected) {
        console.warn('[IAP] Não está conectado. Conecte primeiro usando connect()');
        return [];
      }

      console.log('[IAP] Buscando produtos...');

      const productIds = Platform.OS === 'ios'
        ? Object.values(PRODUCT_IDS.ios)
        : Object.values(PRODUCT_IDS.android);

      console.log('[IAP] Product IDs:', productIds);

      // Busca produtos como subscriptions (não como produtos one-time)
      const subscriptions = await RNIap.getSubscriptions({ skus: productIds });

      console.log('[IAP] Subscriptions encontradas:', subscriptions.length);
      console.log('[IAP] Subscriptions:', JSON.stringify(subscriptions, null, 2));

      const products: IAPProduct[] = subscriptions.map((sub: Subscription) => ({
        productId: sub.productId,
        title: sub.title || '',
        description: sub.description || '',
        price: sub.localizedPrice || sub.price || '0',
        priceValue: parseFloat(sub.price || '0'),
        currency: sub.currency || 'BRL',
        platform: Platform.OS as 'ios' | 'android',
      }));

      console.log('[IAP] ✅ Produtos processados:', products.length);
      return products;
    } catch (error: any) {
      console.error('[IAP] ❌ Erro ao buscar produtos:', error);
      console.error('[IAP] Error code:', error.code);
      console.error('[IAP] Error message:', error.message);
      return [];
    }
  }

  /**
   * Inicia a compra de um produto
   */
  async purchaseProduct(productId: string): Promise<IAPPurchase | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Não está conectado ao IAP. Conecte primeiro usando connect()');
      }

      console.log('[IAP] Iniciando compra do produto:', productId);

      // Solicita compra de subscription
      await RNIap.requestSubscription({ sku: productId });

      console.log('[IAP] Aguardando confirmação da compra...');

      // Aguarda o listener de purchase update
      // Em produção, você deve usar o purchaseUpdatedListener para processar
      // Por enquanto, retorna null para indicar que a compra foi iniciada
      return null;
    } catch (error: any) {
      console.error('[IAP] ❌ Erro ao comprar produto:', error);
      console.error('[IAP] Error code:', error.code);
      console.error('[IAP] Error message:', error.message);

      if (error.code === 'E_USER_CANCELLED') {
        throw new Error('Compra cancelada pelo usuário');
      }

      throw error;
    }
  }

  /**
   * Valida uma compra no backend
   */
  async validatePurchase(purchase: IAPPurchase, userId: string): Promise<boolean> {
    try {
      console.log('[IAP] Validando compra no backend...');
      console.log('[IAP] Purchase:', purchase);
      console.log('[IAP] User ID:', userId);

      // TODO: Implementar validação no backend
      // Deve enviar o receipt para o backend validar com Apple/Google

      const response = await fetch(
        Platform.OS === 'web'
          ? '/api/iap/validate'
          : 'https://controledemaquina.com.br/api/iap/validate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: Platform.OS,
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            receipt: purchase.receipt,
            userId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro na validação do backend');
      }

      const result = await response.json();
      console.log('[IAP] ✅ Validação concluída:', result);

      return result.valid === true;
    } catch (error) {
      console.error('[IAP] ❌ Erro ao validar compra:', error);
      return false;
    }
  }

  /**
   * Finaliza uma transação (acknowledge)
   */
  async finishTransaction(purchase: IAPPurchase): Promise<void> {
    try {
      console.log('[IAP] Finalizando transação...');

      if (Platform.OS === 'ios') {
        await RNIap.finishTransaction({ purchase: purchase as any });
      } else {
        // Android: acknowledge purchase
        await RNIap.acknowledgePurchaseAndroid({ token: purchase.receipt });
      }

      console.log('[IAP] ✅ Transação finalizada');
    } catch (error) {
      console.error('[IAP] ❌ Erro ao finalizar transação:', error);
    }
  }

  /**
   * Restaura compras anteriores
   */
  async restorePurchases(userId: string): Promise<IAPPurchase[]> {
    try {
      if (!this.isConnected) {
        console.warn('[IAP] Não está conectado');
        return [];
      }

      console.log('[IAP] Restaurando compras...');

      const purchases = await RNIap.getAvailablePurchases();

      console.log('[IAP] Compras encontradas:', purchases.length);
      console.log('[IAP] Purchases:', JSON.stringify(purchases, null, 2));

      const iapPurchases: IAPPurchase[] = purchases.map((purchase: Purchase) => ({
        transactionId: purchase.transactionId || '',
        productId: purchase.productId,
        purchaseTime: purchase.transactionDate ? new Date(purchase.transactionDate).getTime() : Date.now(),
        receipt: purchase.transactionReceipt || '',
        platform: Platform.OS as 'ios' | 'android',
      }));

      console.log('[IAP] ✅ Compras restauradas:', iapPurchases.length);
      return iapPurchases;
    } catch (error: any) {
      console.error('[IAP] ❌ Erro ao restaurar compras:', error);
      console.error('[IAP] Error code:', error.code);
      console.error('[IAP] Error message:', error.message);
      return [];
    }
  }

  /**
   * Retorna o limite de máquinas de um plano
   */
  getMachineLimit(planType: SubscriptionPlanType): number | null {
    return SUBSCRIPTION_PLANS[planType].machineLimit;
  }

  /**
   * Mapeia um productId para um planType
   */
  getProductPlanType(productId: string): SubscriptionPlanType | null {
    const iosIds = PRODUCT_IDS.ios;
    const androidIds = PRODUCT_IDS.android;

    if (productId === iosIds.BASIC_MONTHLY || productId === androidIds.BASIC_MONTHLY) {
      return 'BASIC_MONTHLY';
    }
    if (productId === iosIds.BASIC_YEARLY || productId === androidIds.BASIC_YEARLY) {
      return 'BASIC_YEARLY';
    }
    if (productId === iosIds.PREMIUM_MONTHLY || productId === androidIds.PREMIUM_MONTHLY) {
      return 'PREMIUM_MONTHLY';
    }
    if (productId === iosIds.PREMIUM_YEARLY || productId === androidIds.PREMIUM_YEARLY) {
      return 'PREMIUM_YEARLY';
    }
    if (productId === iosIds.FREE_TRIAL || productId === androidIds.FREE_TRIAL) {
      return 'FREE_TRIAL';
    }

    return null;
  }
}

// Singleton instance
export const SubscriptionService = new SubscriptionServiceClass();
