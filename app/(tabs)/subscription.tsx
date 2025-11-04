import { SUBSCRIPTION_PLANS, useSubscription } from '@/contexts/SubscriptionContext';
import type { BillingCycle, PlanType } from '@/types';
import { Check, CreditCard } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionScreen() {
  const {
    subscriptionInfo,
    isLoading,
    activateSubscription,
    startTrial,
    needsTrialActivation,
  } = useSubscription();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  const handleSelectPlan = async (planType: PlanType, billingCycle: BillingCycle) => {
    setIsProcessing(true);
    try {
      const plan = SUBSCRIPTION_PLANS.find(
        (p) => p.planType === planType && p.billingCycle === billingCycle
      );

      if (!plan) {
        Alert.alert('Erro', 'Plano não encontrado');
        return;
      }

      if (Platform.OS === 'web') {
        console.log('[SUBSCRIPTION] Iniciando checkout Stripe...');
        
        if (!currentUser) {
          Alert.alert('Erro', 'Você precisa estar logado para assinar um plano.');
          return;
        }

        let priceId = '';
        if (planType === 'basic' && billingCycle === 'monthly') {
          priceId = process.env.NEXT_PUBLIC_PRICE_BASIC_MONTHLY || process.env.EXPO_PUBLIC_PRICE_BASIC_MONTHLY || '';
        } else if (planType === 'basic' && billingCycle === 'annual') {
          priceId = process.env.NEXT_PUBLIC_PRICE_BASIC_YEARLY || process.env.EXPO_PUBLIC_PRICE_BASIC_YEARLY || '';
        } else if (planType === 'premium' && billingCycle === 'monthly') {
          priceId = process.env.NEXT_PUBLIC_PRICE_PREMIUM_MONTHLY || process.env.EXPO_PUBLIC_PRICE_PREMIUM_MONTHLY || '';
        } else if (planType === 'premium' && billingCycle === 'annual') {
          priceId = process.env.NEXT_PUBLIC_PRICE_PREMIUM_YEARLY || process.env.EXPO_PUBLIC_PRICE_PREMIUM_YEARLY || '';
        }

        if (!priceId) {
          Alert.alert('Erro', 'ID do plano não configurado. Entre em contato com o suporte.');
          console.error('[SUBSCRIPTION] Price ID não encontrado:', { planType, billingCycle });
          return;
        }

        console.log('[SUBSCRIPTION] Criando sessão de checkout:', {
          priceId,
          userId: currentUser.id,
          email: currentUser.username,
        });

        const result = await trpcClient.stripe.checkout.mutate({
          priceId,
          userId: currentUser.id,
          email: currentUser.username,
        });

        console.log('[SUBSCRIPTION] Sessão criada, redirecionando para:', result.url);
        
        if (typeof window !== 'undefined' && result.url) {
          window.location.href = result.url;
        }
      } else {
        const success = await activateSubscription(planType, billingCycle);
        if (success) {
          Alert.alert(
            'Assinatura Ativada!',
            `Sua assinatura ${plan.name} foi ativada com sucesso.`
          );
        }
      }
    } catch (error) {
      console.error('[SUBSCRIPTION] Error selecting plan:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o checkout. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTrial = async () => {
    setIsProcessing(true);
    try {
      await startTrial();
      Alert.alert(
        'Teste Gratuito Ativado!',
        'Você tem 7 dias para testar todas as funcionalidades com máquinas ilimitadas.'
      );
    } catch (error) {
      console.error('Error starting trial:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o teste gratuito.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const renderPlanCard = (plan: typeof SUBSCRIPTION_PLANS[0], isCurrentPlan: boolean) => (
    <View
      key={plan.id}
      style={[styles.planCard, isCurrentPlan && styles.planCardActive]}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Check size={16} color="#FFF" />
            <Text style={styles.currentBadgeText}>Atual</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.planPrice}>
        R$ {plan.price.toFixed(2)}
        <Text style={styles.planPriceUnit}>
          /{plan.billingCycle === 'monthly' ? 'mês' : 'ano'}
        </Text>
      </Text>
      
      <Text style={styles.planDescription}>{plan.description}</Text>
      
      <View style={styles.planFeatures}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Check size={18} color="#2D5016" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {!isCurrentPlan && subscriptionInfo.isActive && (
        <TouchableOpacity
          style={[styles.selectButton, isProcessing && styles.selectButtonDisabled]}
          onPress={() => handleSelectPlan(plan.planType, plan.billingCycle)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.selectButtonText}>Selecionar Plano</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5016" />
      </View>
    );
  }

  if (needsTrialActivation) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <CreditCard size={64} color="#2D5016" />
            <Text style={styles.title}>Controle de Máquina</Text>
            <Text style={styles.subtitle}>Escolha seu plano</Text>
          </View>

          <View style={styles.trialCard}>
            <Text style={styles.trialTitle}>🎉 Teste Grátis por 7 Dias</Text>
            <Text style={styles.trialText}>
              Comece com acesso Premium completo e máquinas ilimitadas por 7 dias gratuitamente.
            </Text>
            <Text style={styles.trialText}>
              Você pode escolher seu plano a qualquer momento durante ou após o teste.
            </Text>
            <Text style={styles.trialProductId}>Product ID: com.2m.controledemaquina.teste.7dias</Text>
          </View>

          <TouchableOpacity
            style={[styles.trialButton, isProcessing && styles.trialButtonDisabled]}
            onPress={handleStartTrial}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#2D5016" />
            ) : (
              <Text style={styles.trialButtonText}>Iniciar Teste Gratuito</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Planos Disponíveis</Text>
          <View style={styles.plansGrid}>
            {SUBSCRIPTION_PLANS.map((plan) => renderPlanCard(plan, false))}
          </View>

          <Text style={styles.disclaimer}>
            Após o período de teste, você pode escolher o plano que melhor se adequa às suas necessidades.
            Cancele a qualquer momento.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (subscriptionInfo.status === 'trial') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <CreditCard size={64} color="#2D5016" />
            <Text style={styles.title}>Teste Gratuito Ativo</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Período de Teste</Text>
            <Text style={styles.statusText}>
              Você tem acesso completo com máquinas ilimitadas
            </Text>
            <View style={styles.statusDetail}>
              <Text style={styles.statusLabel}>Dias restantes:</Text>
              <Text style={styles.statusValue}>
                {subscriptionInfo.daysRemainingInTrial || 0} dias
              </Text>
            </View>
            <View style={styles.statusDetail}>
              <Text style={styles.statusLabel}>Teste termina em:</Text>
              <Text style={styles.statusValue}>
                {formatDate(subscriptionInfo.trialEndsAt)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Escolha seu plano para continuar</Text>
          <View style={styles.plansGrid}>
            {SUBSCRIPTION_PLANS.map((plan) => renderPlanCard(plan, false))}
          </View>
        </View>
      </ScrollView>
    );
  }

  if (subscriptionInfo.status === 'active') {
    const currentPlan = SUBSCRIPTION_PLANS.find(
      (p) => p.planType === subscriptionInfo.planType && p.billingCycle === subscriptionInfo.billingCycle
    );

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <CreditCard size={64} color="#2D5016" />
            <Text style={styles.title}>Assinatura Ativa</Text>
          </View>

          {currentPlan && (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>{currentPlan.name}</Text>
              <Text style={styles.statusText}>{currentPlan.description}</Text>
              <View style={styles.statusDetail}>
                <Text style={styles.statusLabel}>Valor:</Text>
                <Text style={styles.statusValue}>
                  R$ {currentPlan.price.toFixed(2)}/{currentPlan.billingCycle === 'monthly' ? 'mês' : 'ano'}
                </Text>
              </View>
              {subscriptionInfo.subscriptionEndDate && (
                <View style={styles.statusDetail}>
                  <Text style={styles.statusLabel}>Próxima cobrança:</Text>
                  <Text style={styles.statusValue}>
                    {formatDate(subscriptionInfo.subscriptionEndDate)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>Outros Planos</Text>
          <View style={styles.plansGrid}>
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrentPlan = plan.planType === subscriptionInfo.planType && 
                                   plan.billingCycle === subscriptionInfo.billingCycle;
              return renderPlanCard(plan, isCurrentPlan);
            })}
          </View>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => {
                Alert.alert(
                  'Gerenciar Assinatura',
                  'Para gerenciar ou cancelar sua assinatura, acesse as configurações da sua conta na Play Store ou App Store.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.manageButtonText}>Gerenciar Assinatura</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
      <View style={styles.content}>
        <View style={styles.header}>
          <CreditCard size={64} color="#D32F2F" />
          <Text style={[styles.title, { color: '#D32F2F' }]}>
            Assinatura Necessária
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Seu período de teste terminou. Escolha um plano para continuar usando o app.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Escolha seu plano</Text>
        <View style={styles.plansGrid}>
          {SUBSCRIPTION_PLANS.map((plan) => renderPlanCard(plan, false))}
        </View>

        <Text style={styles.disclaimer}>
          Renovação automática. Cancele quando quiser.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginTop: 16,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    textAlign: 'center' as const,
  },
  trialCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  trialTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  trialText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  trialProductId: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center' as const,
    marginTop: 12,
    fontFamily: 'monospace' as const,
  },
  trialButton: {
    backgroundColor: '#FDD835',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  statusCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  statusDetail: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  statusLabel: {
    fontSize: 16,
    color: '#555',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  warningCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  warningText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  plansGrid: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardActive: {
    borderColor: '#2D5016',
    backgroundColor: '#F1F8E9',
  },
  planHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  currentBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#2D5016',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 8,
  },
  planPriceUnit: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: '#666',
  },
  planDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  planFeatures: {
    gap: 10,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
  },
  selectButton: {
    backgroundColor: '#2D5016',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center' as const,
  },
  selectButtonDisabled: {
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  manageButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  disclaimer: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
