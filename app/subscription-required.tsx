import { SUBSCRIPTION_PLANS, useSubscription } from '@/contexts/SubscriptionContext';
import type { BillingCycle, PlanType } from '@/types';
import { useRouter } from 'expo-router';
import { AlertCircle, CreditCard } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubscriptionRequiredScreen() {
  const { subscriptionInfo, activateSubscription, isLoading } = useSubscription();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (subscriptionInfo.isActive) {
      router.replace('/(tabs)/machines');
    }
  }, [subscriptionInfo.isActive, router]);

  const handleSelectPlan = async (planType: PlanType, billingCycle: BillingCycle) => {
    setIsProcessing(true);
    try {
      const success = await activateSubscription(planType, billingCycle);
      if (success) {
        const plan = SUBSCRIPTION_PLANS.find(
          (p) => p.planType === planType && p.billingCycle === billingCycle
        );
        Alert.alert(
          'Assinatura Ativada!',
          `Sua assinatura ${plan?.name} foi ativada com sucesso.`,
          [
            {
              text: 'Continuar',
              onPress: () => router.replace('/(tabs)/machines'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error activating subscription:', error);
      Alert.alert('Erro', 'Não foi possível ativar a assinatura. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5016" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={styles.content}>
        <AlertCircle size={80} color="#D32F2F" />
        <Text style={styles.title}>
          {subscriptionInfo.trialEndsAt ? 'Período Gratuito Encerrado' : 'Assinatura Necessária'}
        </Text>

        {subscriptionInfo.trialEndsAt && (
          <Text style={styles.subtitle}>
            Seu teste gratuito terminou em {formatDate(subscriptionInfo.trialEndsAt)}
          </Text>
        )}

        <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            Para continuar usando o Controle de Máquina, escolha um dos planos abaixo:
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Escolha seu plano</Text>

        {SUBSCRIPTION_PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, isProcessing && styles.planCardDisabled]}
            onPress={() => handleSelectPlan(plan.planType, plan.billingCycle)}
            disabled={isProcessing}
          >
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>
              <View style={styles.planPriceBox}>
                <Text style={styles.planPrice}>R$ {plan.price.toFixed(2)}</Text>
                <Text style={styles.planPriceUnit}>
                  /{plan.billingCycle === 'monthly' ? 'mês' : 'ano'}
                </Text>
              </View>
            </View>
            
            {plan.billingCycle === 'annual' && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>💰 Economia de 2+ meses</Text>
              </View>
            )}

            <View style={styles.selectButtonWrapper}>
              {isProcessing ? (
                <ActivityIndicator color="#2D5016" size="small" />
              ) : (
                <View style={styles.selectButtonContent}>
                  <CreditCard size={20} color="#2D5016" />
                  <Text style={styles.selectButtonText}>Selecionar este plano</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/(tabs)/subscription')}
        >
          <Text style={styles.linkText}>Ver detalhes dos planos</Text>
        </TouchableOpacity>
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
    flex: 1,
    padding: 24,
    alignItems: 'center' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#D32F2F',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start' as const,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2D5016',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  planHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
    marginRight: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
  },
  planPriceBox: {
    alignItems: 'flex-end' as const,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  planPriceUnit: {
    fontSize: 12,
    color: '#666',
  },
  savingsBadge: {
    backgroundColor: '#FDD835',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    alignSelf: 'flex-start' as const,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  selectButtonWrapper: {
    backgroundColor: '#FDD835',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center' as const,
  },
  selectButtonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  linkButton: {
    marginTop: 16,
    padding: 12,
  },
  linkText: {
    fontSize: 16,
    color: '#2D5016',
    textDecorationLine: 'underline' as const,
  },
});
