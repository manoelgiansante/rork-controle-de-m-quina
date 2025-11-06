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
import { useAuth } from '@/contexts/AuthContext';
import CancelSubscriptionModal from '@/components/CancelSubscriptionModal';

export default function SubscriptionScreen() {
  const {
    subscriptionInfo,
    isLoading,
    activateSubscription,
    startTrial,
    needsTrialActivation,
    refreshSubscription,
    syncWithSupabase,
  } = useSubscription();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [canceling, setCanceling] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
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
        });

        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId,
            userId: currentUser.id,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[SUBSCRIPTION] Erro na resposta:', errorText);
          throw new Error('Falha ao criar sessão de checkout');
        }

        const result = await response.json();

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

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      
      console.log('[CANCEL] Iniciando cancelamento...');

      if (!currentUser) {
        if (Platform.OS === 'web') {
          window.alert('Erro: Você precisa estar logado.');
        } else {
          Alert.alert('Erro', 'Você precisa estar logado.');
        }
        return;
      }

      const response = await fetch(
        Platform.OS === 'web'
          ? '/api/stripe/cancel-subscription'
          : 'https://controledemaquina.com.br/api/stripe/cancel-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
          }),
        }
      );

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('[CANCEL] Erro ao fazer parse do JSON:', e);
        data = { error: 'Resposta inválida do servidor' };
      }

      console.log('[CANCEL] Resposta do servidor:', { status: response.status, data });

      // Fecha o modal antes de mostrar a mensagem
      setShowCancelModal(false);

      // Aguarda um pouco para atualizar o estado via webhook
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Sincroniza com o Supabase para pegar o estado atualizado
      if (currentUser?.id) {
        await syncWithSupabase(currentUser.id);
      }
      await refreshSubscription();

      // Verifica se o cancelamento realmente funcionou checando o estado
      if (subscriptionInfo?.cancelAtPeriodEnd || response.ok) {
        // Sucesso!
        if (Platform.OS === 'web') {
          window.alert(
            'Assinatura Cancelada\n\nSua assinatura foi cancelada com sucesso. Você continuará tendo acesso aos recursos Premium até o final do período atual.'
          );
        } else {
          Alert.alert(
            'Assinatura Cancelada',
            'Sua assinatura foi cancelada com sucesso. Você continuará tendo acesso aos recursos Premium até o final do período atual.',
            [{ text: 'OK' }]
          );
        }
      } else if (!response.ok) {
        // Erro real
        throw new Error(data.error || 'Erro ao cancelar assinatura');
      } else {
        // Sucesso via response.ok
        if (Platform.OS === 'web') {
          window.alert(
            'Assinatura Cancelada\n\nSua assinatura foi cancelada com sucesso. Você continuará tendo acesso aos recursos Premium até o final do período atual.'
          );
        } else {
          Alert.alert(
            'Assinatura Cancelada',
            'Sua assinatura foi cancelada com sucesso. Você continuará tendo acesso aos recursos Premium até o final do período atual.',
            [{ text: 'OK' }]
          );
        }
      }

    } catch (error: any) {
      console.error('[CANCEL] Erro ao cancelar:', error);
      
      setShowCancelModal(false);

      if (Platform.OS === 'web') {
        window.alert(
          'Erro\n\nNão foi possível cancelar sua assinatura. Por favor, tente novamente ou entre em contato com o suporte.'
        );
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível cancelar sua assinatura. Por favor, tente novamente ou entre em contato com o suporte.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setCanceling(false);
    }
  };

  const handleRefreshSubscription = async () => {
    if (!currentUser?.id) {
      if (Platform.OS === 'web') {
        window.alert('Você precisa estar logado.');
      } else {
        Alert.alert('Erro', 'Você precisa estar logado.');
      }
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('[SUBSCRIPTION] Atualizando status da assinatura...');
      
      await syncWithSupabase(currentUser.id);
      
      if (Platform.OS === 'web') {
        window.alert('Status da assinatura atualizado com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Status da assinatura atualizado com sucesso!');
      }
    } catch (error) {
      console.error('[SUBSCRIPTION] Erro ao atualizar:', error);
      
      if (Platform.OS === 'web') {
        window.alert('Erro ao atualizar status. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o status. Tente novamente.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleReactivateSubscription = async () => {
    try {
      setReactivating(true);
      
      console.log('[REACTIVATE] Iniciando reativação...');

      if (!currentUser) {
        if (Platform.OS === 'web') {
          window.alert('Erro: Você precisa estar logado.');
        } else {
          Alert.alert('Erro', 'Você precisa estar logado.');
        }
        return;
      }

      const response = await fetch(
        Platform.OS === 'web'
          ? '/api/stripe/reactivate-subscription'
          : 'https://controledemaquina.com.br/api/stripe/reactivate-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao reativar assinatura');
      }

      console.log('[REACTIVATE] Assinatura reativada com sucesso:', data);

      if (Platform.OS === 'web') {
        window.alert(
          'Assinatura Reativada\n\nSua assinatura foi reativada com sucesso! Você continuará tendo acesso aos recursos Premium.'
        );
      } else {
        Alert.alert(
          'Assinatura Reativada',
          'Sua assinatura foi reativada com sucesso! Você continuará tendo acesso aos recursos Premium.',
          [{ text: 'OK' }]
        );
      }

      if (currentUser?.id) {
        await syncWithSupabase(currentUser.id);
      }
      await refreshSubscription();

    } catch (error: any) {
      console.error('[REACTIVATE] Erro ao reativar:', error);

      if (Platform.OS === 'web') {
        window.alert(
          'Erro\n\nNão foi possível reativar sua assinatura. Por favor, tente novamente ou entre em contato com o suporte.'
        );
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível reativar sua assinatura. Por favor, tente novamente ou entre em contato com o suporte.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setReactivating(false);
    }
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

          <TouchableOpacity
            style={[styles.refreshButton, isProcessing && styles.refreshButtonDisabled]}
            onPress={handleRefreshSubscription}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#2D5016" size="small" />
            ) : (
              <Text style={styles.refreshButtonText}>Atualizar Status da Assinatura</Text>
            )}
          </TouchableOpacity>

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
            <Text style={styles.title}>
              {subscriptionInfo.cancelAtPeriodEnd ? 'Período de Graça' : 'Assinatura Ativa'}
            </Text>
          </View>

          {subscriptionInfo.cancelAtPeriodEnd && subscriptionInfo.currentPeriodEnd && (
            <View style={styles.gracePeriodCard}>
              <Text style={styles.gracePeriodTitle}>⚠️ Plano Cancelado</Text>
              <Text style={styles.gracePeriodText}>
                Sua assinatura foi cancelada, mas você ainda tem acesso aos recursos Premium até:
              </Text>
              <Text style={styles.gracePeriodDate}>
                {formatDate(subscriptionInfo.currentPeriodEnd)}
              </Text>
              <Text style={styles.gracePeriodDays}>
                ({calculateDaysRemaining(subscriptionInfo.currentPeriodEnd)} dias restantes)
              </Text>
              <TouchableOpacity
                style={[styles.reactivateButton, reactivating && styles.reactivateButtonDisabled]}
                onPress={handleReactivateSubscription}
                disabled={reactivating}
              >
                {reactivating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.reactivateButtonText}>Reativar Assinatura</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {currentPlan && !subscriptionInfo.cancelAtPeriodEnd && (
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

          {subscriptionInfo?.status === 'active' && !subscriptionInfo?.trialActive && !subscriptionInfo.cancelAtPeriodEnd && Platform.OS === 'web' && (
            <View style={styles.cancelSection}>
              <Text style={styles.cancelText}>
                Não quer mais continuar? Você pode cancelar sua assinatura a qualquer momento.
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCancelModal(true)}
              >
                <Text style={styles.cancelButtonText}>
                  Cancelar Assinatura
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

          <CancelSubscriptionModal
            visible={showCancelModal}
            onCancel={() => setShowCancelModal(false)}
            onConfirm={handleCancelSubscription}
            isLoading={canceling}
          />
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
            Assinatura Expirada
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Sua assinatura expirou. Escolha um plano para continuar usando o app.
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
  refreshButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  cancelSection: {
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 16,
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  gracePeriodCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 16,
    padding: 24,
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  gracePeriodTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#856404',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  gracePeriodText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center' as const,
    marginBottom: 16,
    lineHeight: 22,
  },
  gracePeriodDate: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#2D5016',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  gracePeriodDays: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  reactivateButton: {
    backgroundColor: '#2D5016',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
  },
  reactivateButtonDisabled: {
    opacity: 0.6,
  },
  reactivateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
