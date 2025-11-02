import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function Index() {
  const { isAuthenticated, hasAcceptedTerms, isLoading: authLoading } = useAuth();
  const { needsSubscription, needsTrialActivation, isLoading: subLoading } = useSubscription();

  const isLoading = authLoading || subLoading;

  // Enquanto carrega, exibe um placeholder leve
  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  // Fluxos de navegação
  if (!isAuthenticated) {
    console.log('Index: Usuário não autenticado, redirecionando para /login');
    return <Redirect href="/login" />;
  }

  if (!hasAcceptedTerms) {
    return <Redirect href="/terms" />;
  }

  if (needsTrialActivation) {
    return <Redirect href="/(tabs)/subscription" />;
  }

  if (needsSubscription) {
    return <Redirect href="/subscription-required" />;
  }

  return <Redirect href="/machines" />;
}
