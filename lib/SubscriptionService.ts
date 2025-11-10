/**
 * SubscriptionService - Gerenciamento de Assinaturas via In-App Purchase (IAP)
 *
 * Este serviço gerencia compras in-app para iOS (Apple) e Android (Google Play).
 * Sincroniza com o backend para validar recibos e atualizar status de assinatura.
 *
 * IMPORTANTE:
 * - iOS usa expo-in-app-purchases
 * - Android usa react-native-iap
 * - Todos os recibos são validados no backend antes de conceder acesso
 */

import { Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import {
  initConnection as initConnectionAndroid,
  endConnection as endConnectionAndroid,
  getProducts as getProductsAndroid,
  requestPurchase as requestPurchaseAndroid,
  finishTransaction as finishTransactionAndroid,
  purchaseUpdatedListener as purchaseUpdatedListenerAndroid,
  purchaseErrorListener as purchaseErrorListenerAndroid,
  type Product as AndroidProduct,
  type Purchase as AndroidPurchase,
  type PurchaseError as AndroidPurchaseError,
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
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Inicializa a conexão com a loja (Apple ou Google)
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      console.log('[IAP] Já conectado');
      return true;
    }

    try {
      if (Platform.OS === 'ios') {
        console.log('[IAP iOS] Conectando ao App Store...');
        await InAppPurchases.connectAsync();
        console.log('[IAP iOS] ✅ Conectado ao App Store');
      } else if (Platform.OS === 'android') {
        console.log('[IAP Android] Conectando ao Google Play...');
        await initConnectionAndroid();
        console.log('[IAP Android] ✅ Conectado ao Google Play');

        // Setup purchase listeners para Android
        this.purchaseUpdateSubscription = purchaseUpdatedListenerAndroid(
          async (purchase: AndroidPurchase) => {
            console.log('[IAP Android] Purchase update:', purchase);
            await this.handlePurchaseUpdate(purchase);
          }
        );

        this.purchaseErrorSubscription = purchaseErrorListenerAndroid(
          (error: AndroidPurchaseError) => {
            console.error('[IAP Android] Purchase error:', error);
          }
        );
      }

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
      if (Platform.OS === 'ios') {
        await InAppPurchases.disconnectAsync();
      } else if (Platform.OS === 'android') {
        this.purchaseUpdateSubscription?.remove();
        this.purchaseErrorSubscription?.remove();
        await endConnectionAndroid();
      }
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

      if (Platform.OS === 'ios') {
        const { results } = await InAppPurchases.getProductsAsync(productIds);
        console.log('[IAP iOS] Produtos encontrados:', results.length);

        return results.map((product: any) => ({
          productId: product.productId,
          title: product.title,
          description: product.description,
          price: product.price,
          priceValue: parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.')),
          currency: product.currencyCode || 'BRL',
          platform: 'ios' as const,
        }));
      } else if (Platform.OS === 'android') {
        const products = await getProductsAndroid({ skus: productIds });
        console.log('[IAP Android] Produtos encontrados:', products.length);

        return products.map((product: AndroidProduct) => ({
          productId: product.productId,
          title: product.title,
          description: product.description,
          price: product.localizedPrice,
          priceValue: parseFloat(product.price),
          currency: product.currency || 'BRL',
          platform: 'android' as const,
        }));
      }

      return [];
    } catch (error) {
      console.error('[IAP] Erro ao buscar produtos:', error);
      return [];
    }
  }

  /**
   * Inicia o processo de compra de um produto
   */
  async purchaseProduct(productId: string): Promise<IAPPurchase | null> {
    try {
      console.log('[IAP] Iniciando compra:', productId);

      if (Platform.OS === 'ios') {
        await InAppPurchases.purchaseItemAsync(productId);

        // Aguardar atualização de compra
        const history = await InAppPurchases.getPurchaseHistoryAsync();
        const purchase = history.results.find(p => p.productId === productId);

        if (!purchase) {
          console.error('[IAP iOS] Compra não encontrada no histórico');
          return null;
        }

        console.log('[IAP iOS] Compra concluída:', purchase.transactionId);

        return {
          transactionId: purchase.transactionId || '',
          productId: purchase.productId,
          purchaseTime: purchase.purchaseTime || Date.now(),
          receipt: purchase.transactionReceipt || '',
          platform: 'ios',
        };
      } else if (Platform.OS === 'android') {
        await requestPurchaseAndroid({ skus: [productId] });

        // O resultado virá através do listener purchaseUpdatedListener
        // Por enquanto retornamos null e tratamos no listener
        return null;
      }

      return null;
    } catch (error) {
      console.error('[IAP] Erro ao comprar produto:', error);
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

      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://controle-de-maquina.rork.app';
      const url = `${baseUrl}${endpoint}`;

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
        const error = await response.json();
        console.error('[IAP] Erro na validação:', error);
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

      if (Platform.OS === 'ios') {
        await InAppPurchases.finishTransactionAsync(purchase as any, true);
      } else if (Platform.OS === 'android') {
        await finishTransactionAndroid({
          purchase: purchase as any,
          isConsumable: false, // Subscriptions são não-consumíveis
        });
      }

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

      if (Platform.OS === 'ios') {
        const history = await InAppPurchases.getPurchaseHistoryAsync();
        console.log('[IAP iOS] Compras encontradas:', history.results.length);

        const purchases: IAPPurchase[] = history.results.map(purchase => ({
          transactionId: purchase.transactionId || '',
          productId: purchase.productId,
          purchaseTime: purchase.purchaseTime || Date.now(),
          receipt: purchase.transactionReceipt || '',
          platform: 'ios',
        }));

        // Validar todas as compras no backend
        for (const purchase of purchases) {
          await this.validatePurchase(purchase, userId);
        }

        return purchases;
      } else if (Platform.OS === 'android') {
        // Android restoration logic
        // TODO: Implement when Google Play Console is configured
        console.log('[IAP Android] Restauração de compras ainda não implementada');
        return [];
      }

      return [];
    } catch (error) {
      console.error('[IAP] Erro ao restaurar compras:', error);
      return [];
    }
  }

  /**
   * Handler para atualizações de compra no Android
   */
  private async handlePurchaseUpdate(purchase: AndroidPurchase): Promise<void> {
    try {
      console.log('[IAP Android] Processando atualização de compra:', purchase.transactionId);

      const iapPurchase: IAPPurchase = {
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseTime: purchase.transactionDate,
        receipt: purchase.transactionReceipt,
        platform: 'android',
      };

      // TODO: Validar compra com userId
      // await this.validatePurchase(iapPurchase, userId);
    } catch (error) {
      console.error('[IAP Android] Erro ao processar compra:', error);
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
