import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, hasAcceptedTerms, isLoading: authLoading } = useAuth();
  const { needsSubscription, needsTrialActivation, isLoading: subLoading } = useSubscription();

  if (authLoading || subLoading) {
    return null;
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
