import { useSubscription } from '@/contexts/SubscriptionContext';
import { CreditCard } from 'lucide-react-native';
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

export default function SubscriptionScreen() {
  const {
    subscriptionInfo,
    isLoading,
    activateSubscription,
    startTrial,
    needsTrialActivation,
  } = useSubscription();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleActivateSubscription = async () => {
    setIsProcessing(true);
    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Simulação de Pagamento',
          'Em um app real, isso abriria o sistema de pagamento da loja. Por enquanto, vamos ativar sua assinatura para demonstração.',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Ativar Assinatura',
              onPress: async () => {
                await activateSubscription();
                Alert.alert(
                  'Assinatura Ativada!',
                  'Sua assinatura mensal foi ativada com sucesso.'
                );
              },
            },
          ]
        );
      } else {
        const success = await activateSubscription();
        if (success) {
          Alert.alert(
            'Assinatura Ativada!',
            'Sua assinatura mensal foi ativada com sucesso.'
          );
        }
      }
    } catch (error) {
      console.error('Error activating subscription:', error);
      Alert.alert('Erro', 'Não foi possível ativar a assinatura. Tente novamente.');
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
        'Você tem 7 dias para testar todas as funcionalidades do Controle de Máquina.'
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5016" />
      </View>
    );
  }

  if (needsTrialActivation) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <CreditCard size={64} color="#2D5016" />
            <Text style={styles.title}>Controle de Máquina</Text>
            <Text style={styles.subtitle}>Plano Mensal</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Teste Grátis por 7 Dias</Text>
            <Text style={styles.infoText}>
              Controle tudo sobre seus tratores, caminhões e implementos com
              praticidade.
            </Text>
            <Text style={styles.infoText}>
              • Receba alertas automáticos de manutenção{'\n'}
              • Registre abastecimentos e acompanhe consumo{'\n'}
              • Gerencie revisões e horímetros{'\n'}
              • Acesso completo por 7 dias gratuitos
            </Text>
            <Text style={styles.infoText}>
              Após o período gratuito, continue por apenas:
            </Text>
            <Text style={styles.priceText}>R$ 19,90/mês</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isProcessing && styles.buttonDisabled]}
            onPress={handleStartTrial}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#2D5016" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Teste Gratuito</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Após 7 dias, a assinatura será renovada automaticamente por R$
            19,90/mês. Você pode cancelar a qualquer momento.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (subscriptionInfo.status === 'trial') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <CreditCard size={64} color="#2D5016" />
            <Text style={styles.title}>Teste Gratuito Ativo</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Período de Teste</Text>
            <Text style={styles.statusText}>
              Você tem acesso completo a todas as funcionalidades
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
                {formatDate(subscriptionInfo.trialEndDate)}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Continue Aproveitando</Text>
            <Text style={styles.infoText}>
              Após o período de teste, continue com acesso completo por apenas:
            </Text>
            <Text style={styles.priceText}>R$ 19,90/mês</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isProcessing && styles.buttonDisabled]}
            onPress={handleActivateSubscription}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#2D5016" />
            ) : (
              <Text style={styles.buttonText}>Ativar Assinatura Agora</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (subscriptionInfo.status === 'active') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <CreditCard size={64} color="#2D5016" />
            <Text style={styles.title}>Assinatura Ativa</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Plano Mensal</Text>
            <Text style={styles.statusText}>
              Você tem acesso completo a todas as funcionalidades
            </Text>
            <View style={styles.statusDetail}>
              <Text style={styles.statusLabel}>Valor mensal:</Text>
              <Text style={styles.statusValue}>R$ 19,90</Text>
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

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Benefícios da Assinatura</Text>
            <Text style={styles.infoText}>
              • Alertas automáticos de manutenção{'\n'}
              • Registro completo de abastecimentos{'\n'}
              • Controle de horímetros e consumo{'\n'}
              • Relatórios detalhados{'\n'}
              • Sincronização automática{'\n'}
              • Acesso ilimitado
            </Text>
          </View>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={() => {
                Alert.alert(
                  'Gerenciar Assinatura',
                  'Para gerenciar ou cancelar sua assinatura, acesse as configurações da sua conta na Play Store ou App Store.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.secondaryButtonText}>Gerenciar Assinatura</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <CreditCard size={64} color="#D32F2F" />
          <Text style={[styles.title, { color: '#D32F2F' }]}>
            Período Gratuito Encerrado
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Continue Controlando Suas Máquinas
          </Text>
          <Text style={styles.infoText}>
            Para continuar usando o Controle de Máquina e ter acesso a:
          </Text>
          <Text style={styles.infoText}>
            • Alertas automáticos de manutenção{'\n'}
            • Registro de abastecimentos{'\n'}
            • Controle de horímetros e consumo{'\n'}
            • Relatórios completos
          </Text>
          <Text style={styles.infoText}>Assine o plano mensal por apenas:</Text>
          <Text style={styles.priceText}>R$ 19,90/mês</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleActivateSubscription}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#2D5016" />
          ) : (
            <Text style={styles.buttonText}>Assinar Agora</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Renovação automática mensal. Cancele quando quiser.
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
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 30,
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
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#2D5016',
    textAlign: 'center' as const,
    marginTop: 12,
    marginBottom: 12,
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
  button: {
    backgroundColor: '#FDD835',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2D5016',
  },
  secondaryButtonText: {
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
