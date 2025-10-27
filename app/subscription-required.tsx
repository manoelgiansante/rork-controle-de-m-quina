import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRouter } from 'expo-router';
import { AlertCircle, CreditCard } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SubscriptionRequiredScreen() {
  const { subscriptionInfo, activateSubscription } = useSubscription();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (subscriptionInfo.isActive) {
      router.replace('/(tabs)/machines');
    }
  }, [subscriptionInfo.isActive, router]);

  const handleActivateSubscription = async () => {
    setIsProcessing(true);
    try {
      await activateSubscription();
      Alert.alert(
        'Assinatura Ativada!',
        'Sua assinatura mensal foi ativada com sucesso.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(tabs)/machines'),
          },
        ]
      );
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AlertCircle size={80} color="#D32F2F" />
        <Text style={styles.title}>Período Gratuito Encerrado</Text>

        {subscriptionInfo.trialEndDate && (
          <Text style={styles.subtitle}>
            Seu teste gratuito terminou em{' '}
            {formatDate(subscriptionInfo.trialEndDate)}
          </Text>
        )}

        <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            Para continuar usando o Controle de Máquina, ative sua assinatura mensal.
          </Text>

          <View style={styles.benefitsList}>
            <Text style={styles.benefitsTitle}>Com a assinatura você tem:</Text>
            <Text style={styles.benefitItem}>• Alertas automáticos de manutenção</Text>
            <Text style={styles.benefitItem}>• Registro completo de abastecimentos</Text>
            <Text style={styles.benefitItem}>• Controle de horímetros e consumo</Text>
            <Text style={styles.benefitItem}>• Relatórios detalhados</Text>
            <Text style={styles.benefitItem}>• Sincronização automática</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Apenas</Text>
            <Text style={styles.priceText}>R$ 19,90</Text>
            <Text style={styles.priceLabel}>por mês</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleActivateSubscription}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#2D5016" />
          ) : (
            <>
              <CreditCard size={24} color="#2D5016" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Assinar Agora</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/(tabs)/subscription')}
        >
          <Text style={styles.linkText}>Ver detalhes da assinatura</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    marginBottom: 32,
  },
  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  messageText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center' as const,
    lineHeight: 26,
    marginBottom: 24,
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    marginLeft: 8,
  },
  priceContainer: {
    alignItems: 'center' as const,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceText: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#FDD835',
    borderRadius: 12,
    padding: 18,
    width: '100%',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 18,
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
