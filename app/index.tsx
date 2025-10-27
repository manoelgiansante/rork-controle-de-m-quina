import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const { isAuthenticated, hasAcceptedTerms, isLoading: authLoading } = useAuth();
  const { needsSubscription, needsTrialActivation, isLoading: subLoading } = useSubscription();

  const isLoading = authLoading || subLoading;

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

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
