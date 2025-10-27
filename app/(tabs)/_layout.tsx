import { Tabs, useRouter } from 'expo-router';
import { BookOpen, CreditCard, Droplet, Fuel, Settings, Tractor } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const { subscriptionInfo, isLoading: isSubscriptionLoading, needsTrialActivation } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isSubscriptionLoading) {
      if (needsTrialActivation) {
        console.log('Trial needs activation, redirecting to subscription tab');
      } else if (!subscriptionInfo.isActive) {
        console.log('Subscription expired, redirecting to blocked screen');
        router.replace('/subscription-required');
      }
    }
  }, [isAuthenticated, subscriptionInfo.isActive, isSubscriptionLoading, needsTrialActivation, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2D5016',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2D5016',
        },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontWeight: '600' as const,
        },
        tabBarStyle: {},
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="machines"
        options={{
          title: 'Máquinas',
          tabBarIcon: ({ color }) => <Tractor size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="refueling"
        options={{
          title: 'Abastecimento',
          tabBarIcon: ({ color }) => <Droplet size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Manutenção',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fuel-tank"
        options={{
          title: 'Tanque',
          tabBarIcon: ({ color }) => <Fuel size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Assinatura',
          tabBarIcon: ({ color }) => <CreditCard size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
