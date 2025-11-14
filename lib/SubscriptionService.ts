/**
 * SubscriptionService - Gerenciamento de Assinaturas via In-App Purchase (IAP)
 *
 * Este serviço gerencia compras in-app para iOS (Apple) e Android (Google Play).
 * Sincroniza com o backend para validar recibos e atualizar status de assinatura.
 *
 * IMPORTANTE:
 * - STUB VERSION: expo-in-app-purchases foi removido devido a incompatibilidade
 * - Esta é uma versão temporária que retorna erros/valores vazios
 * - Todos os métodos foram desabilitados temporariamente
 */

import { Platform } from 'react-native';
// REMOVED: import * as InAppPurchases from 'expo-in-app-purchases';
// expo-in-app-purchases was removed due to incompatibility with expo-modules-core 3.0.25

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
    // TODO: Configurar produtos no Google Play Console
    BASIC_MONTHLY: 'com.manoel.controledemaquina.basic.monthly',
    BASIC_YEARLY: 'com.manoel.controledemaquina.basic.yearly',
    PREMIUM_MONTHLY: 'com.manoel.controledemaquina.premium.monthly',
    PREMIUM_YEARLY: 'com.manoel.controledemaquina.premium.yearly',
    FREE_TRIAL: 'com.manoel.controledemaquina.trial.7days',
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
    machineLimit: null, // unlimited
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
    machineLimit: null, // unlimited
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

  /**
   * Inicializa a conexão com a loja (Apple ou Google)
   * STUB: Always returns false (IAP not available)
   */
  async connect(): Promise<boolean> {
    console.log('[IAP STUB] expo-in-app-purchases not available - IAP disabled');
    return false;
  }

  /**
   * Desconecta da loja
   * STUB: No-op
   */
  async disconnect(): Promise<void> {
    console.log('[IAP STUB] Disconnect (no-op)');
  }

  /**
   * Busca produtos disponíveis na loja
   * STUB: Returns empty array
   */
  async getProducts(): Promise<IAPProduct[]> {
    console.log('[IAP STUB] getProducts - returning empty array');
    return [];
  }

  /**
   * Parse do preço do produto
   */
  private parsePrice(priceString: string): number {
    if (!priceString) return 0;

    // Remove tudo exceto dígitos, vírgulas e pontos
    const cleaned = priceString.replace(/[^\d.,]/g, '');

    // Converte vírgula para ponto (formato brasileiro)
    const normalized = cleaned.replace(',', '.');

    return parseFloat(normalized) || 0;
  }

  /**
   * Inicia o processo de compra de um produto
   * STUB: Throws error (IAP not available)
   */
  async purchaseProduct(productId: string): Promise<IAPPurchase | null> {
    console.log('[IAP STUB] purchaseProduct called but IAP not available');
    throw new Error('In-App Purchases not available in this build');
  }

  /**
   * Valida uma compra no backend
   */
  async validatePurchase(purchase: IAPPurchase, userId: string): Promise<boolean> {
    try {
      console.log('[IAP] Validando compra no backend:', purchase.transactionId);

      const endpoint = purchase.platform === 'ios'
        ? '/api/iap/validate-apple'
        : '/api/iap/validate-google';

      const baseUrl = 'https://controledemaquina.com.br';
      const url = `${baseUrl}${endpoint}`;

      console.log('[IAP] URL de validação:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          receipt: purchase.receipt,
          transactionId: purchase.transactionId,
          productId: purchase.productId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[IAP] Erro na validação:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return false;
      }

      const data = await response.json();
      console.log('[IAP] ✅ Compra validada com sucesso:', data);

      // Finalizar transação após validação bem-sucedida
      await this.finishTransaction(purchase);

      return true;
    } catch (error) {
      console.error('[IAP] Erro ao validar compra:', error);
      return false;
    }
  }

  /**
   * Finaliza uma transação (importante para liberar compras pendentes)
   * STUB: No-op
   */
  async finishTransaction(purchase: IAPPurchase): Promise<void> {
    console.log('[IAP STUB] finishTransaction (no-op)');
  }

  /**
   * Restaura compras anteriores
   * STUB: Returns empty array
   */
  async restorePurchases(userId: string): Promise<IAPPurchase[]> {
    console.log('[IAP STUB] restorePurchases - returning empty array');
    return [];
  }

  /**
   * Verifica se um plano possui limite de máquinas
   */
  getMachineLimit(planType: SubscriptionPlanType): number | null {
    return SUBSCRIPTION_PLANS[planType].machineLimit;
  }

  /**
   * Mapeia productId para planType
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
