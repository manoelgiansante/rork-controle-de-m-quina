import { Redirect } from 'expo-router';
import { View } from 'react-native';

// Os hooks podem não existir/retornar undefined se o Provider não estiver montado.
// Por isso, usamos chamadas seguras e valores padrão.
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function Index() {
  // Chama os hooks com fallback para evitar crash se o contexto não estiver disponível
  const auth = typeof useAuth === 'function' ? useAuth() : undefined;
  const sub  = typeof useSubscription === 'function' ? useSubscription() : undefined;

  // Desestruturação com valores padrão (evita "Cannot read property 'x' of undefined")
  const isAuthenticated   = auth?.isAuthenticated ?? false;
  const hasAcceptedTerms  = auth?.hasAcceptedTerms ?? false;
  const authLoading       = auth?.isLoading ?? false;

  const needsSubscription     = sub?.needsSubscription ?? false;
  const needsTrialActivation  = sub?.needsTrialActivation ?? false;
  const subLoading            = sub?.isLoading ?? false;

  const isLoading = authLoading || subLoading;

  // Enquanto carrega, exibe um placeholder leve
  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  // Fluxos de navegação
  if (!isAuthenticated) {
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
