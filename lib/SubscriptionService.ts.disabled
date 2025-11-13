/**
 * SubscriptionService - Gerenciamento de Assinaturas via In-App Purchase (IAP)
 *
 * Este serviço gerencia compras in-app para iOS (Apple) e Android (Google Play).
 * Sincroniza com o backend para validar recibos e atualizar status de assinatura.
 *
 * IMPORTANTE:
 * - Usa expo-in-app-purchases para ambas plataformas (iOS e Android)
 * - Todos os recibos são validados no backend antes de conceder acesso
 */

import { Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';

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
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      console.log('[IAP] Já conectado');
      return true;
    }

    try {
      console.log(`[IAP ${Platform.OS}] Conectando...`);
      await InAppPurchases.connectAsync();
      console.log(`[IAP ${Platform.OS}] ✅ Conectado`);

      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('[IAP] Erro ao conectar:', error);
      return false;
    }
  }

  /**
   * Desconecta da loja
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await InAppPurchases.disconnectAsync();
      this.isConnected = false;
      console.log('[IAP] Desconectado');
    } catch (error) {
      console.error('[IAP] Erro ao desconectar:', error);
    }
  }

  /**
   * Busca produtos disponíveis na loja
   */
  async getProducts(): Promise<IAPProduct[]> {
    try {
      const productIds = Platform.OS === 'ios'
        ? Object.values(PRODUCT_IDS.ios)
        : Object.values(PRODUCT_IDS.android);

      console.log('[IAP] Buscando produtos:', productIds);

      const { results } = await InAppPurchases.getProductsAsync(productIds);
      console.log(`[IAP ${Platform.OS}] Produtos encontrados:`, results.length);

      return results.map((product: any) => ({
        productId: product.productId,
        title: product.title || 'Sem título',
        description: product.description || 'Sem descrição',
        price: product.price || 'N/A',
        priceValue: this.parsePrice(product.price),
        currency: product.currencyCode || 'BRL',
        platform: Platform.OS as 'ios' | 'android',
      }));
    } catch (error) {
      console.error('[IAP] Erro ao buscar produtos:', error);
      return [];
    }
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
   */
  async purchaseProduct(productId: string): Promise<IAPPurchase | null> {
    try {
      console.log('[IAP] Iniciando compra:', productId);

      // Inicia a compra
      await InAppPurchases.purchaseItemAsync(productId);

      // Aguarda um pouco para garantir que a compra foi processada
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Busca no histórico de compras
      const history = await InAppPurchases.getPurchaseHistoryAsync();

      console.log('[IAP] Histórico de compras:', {
        total: history.results.length,
        produtos: history.results.map(p => p.productId)
      });

      // Busca a compra mais recente do produto solicitado
      const purchase = history.results
        .filter(p => p.productId === productId)
        .sort((a, b) => (b.purchaseTime || 0) - (a.purchaseTime || 0))[0];

      if (!purchase) {
        console.error('[IAP] Compra não encontrada no histórico');
        throw new Error('Compra cancelada ou não concluída');
      }

      console.log('[IAP] Compra concluída:', {
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        acknowledged: purchase.acknowledged
      });

      // Validar que temos o receipt
      if (!purchase.transactionReceipt) {
        console.error('[IAP] Receipt não encontrado na compra');
        throw new Error('Receipt não disponível');
      }

      return {
        transactionId: purchase.transactionId || '',
        productId: purchase.productId,
        purchaseTime: purchase.purchaseTime || Date.now(),
        receipt: purchase.transactionReceipt,
        platform: Platform.OS as 'ios' | 'android',
      };
    } catch (error: any) {
      console.error('[IAP] Erro ao comprar produto:', error);

      // Tratamento de erros específicos
      if (error?.code === 'E_USER_CANCELLED') {
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
   */
  async finishTransaction(purchase: IAPPurchase): Promise<void> {
    try {
      console.log('[IAP] Finalizando transação:', purchase.transactionId);

      await InAppPurchases.finishTransactionAsync(purchase as any, true);

      console.log('[IAP] ✅ Transação finalizada');
    } catch (error) {
      console.error('[IAP] Erro ao finalizar transação:', error);
    }
  }

  /**
   * Restaura compras anteriores
   */
  async restorePurchases(userId: string): Promise<IAPPurchase[]> {
    try {
      console.log('[IAP] Restaurando compras...');

      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log(`[IAP ${Platform.OS}] Compras encontradas:`, history.results.length);

      const purchases: IAPPurchase[] = history.results
        .filter(p => p.transactionReceipt) // Apenas compras com receipt
        .map(purchase => ({
          transactionId: purchase.transactionId || '',
          productId: purchase.productId,
          purchaseTime: purchase.purchaseTime || Date.now(),
          receipt: purchase.transactionReceipt || '',
          platform: Platform.OS as 'ios' | 'android',
        }));

      // Validar todas as compras no backend
      let validatedCount = 0;
      for (const purchase of purchases) {
        const validated = await this.validatePurchase(purchase, userId);
        if (validated) {
          validatedCount++;
        }
      }

      console.log(`[IAP] ✅ ${validatedCount} de ${purchases.length} compras restauradas com sucesso`);

      return purchases;
    } catch (error) {
      console.error('[IAP] Erro ao restaurar compras:', error);
      return [];
    }
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
