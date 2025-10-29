import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BillingCycle, PlanType, SubscriptionInfo, SubscriptionPlan } from '@/types';

const STORAGE_KEY = '@controle_maquina:subscription';
const TRIAL_DAYS = 7;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_monthly',
    productId: 'com.2m.vetra.basico.mensal',
    name: 'Plano Básico',
    planType: 'basic',
    billingCycle: 'monthly',
    machineLimit: 10,
    price: 9.90,
    description: 'Acesso limitado',
    features: [
      'Até 10 máquinas',
      'Controle de abastecimento',
      'Manutenção básica',
      'Alertas automáticos',
    ],
  },
  {
    id: 'premium_monthly',
    productId: 'com.2m.vetra.premium.mensal',
    name: 'Plano Premium',
    planType: 'premium',
    billingCycle: 'monthly',
    machineLimit: -1,
    price: 19.90,
    description: 'Acesso total + IA',
    features: [
      'Máquinas ilimitadas',
      'Controle de abastecimento',
      'Manutenção completa',
      'Alertas inteligentes',
      'Relatórios avançados',
      'Suporte com IA',
    ],
  },
  {
    id: 'premium_annual',
    productId: 'com.2m.vetra.premium.anual',
    name: 'Plano Premium Anual',
    planType: 'premium',
    billingCycle: 'annual',
    machineLimit: -1,
    price: 199.00,
    description: 'Acesso total + IA (~2 meses grátis)',
    features: [
      'Máquinas ilimitadas',
      'Controle de abastecimento',
      'Manutenção completa',
      'Alertas inteligentes',
      'Relatórios avançados',
      'Suporte com IA',
      'Economia de 2 meses',
    ],
  },
];

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: 'none',
    machineLimit: 0,
    isActive: false,
    trialActive: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const calculateSubscriptionStatus = useCallback((info: SubscriptionInfo): SubscriptionInfo => {
    const now = new Date();
    
    if (info.trialActive && info.trialEndsAt) {
      const trialEnd = new Date(info.trialEndsAt);
      
      if (now <= trialEnd) {
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...info,
          status: 'trial',
          isActive: true,
          machineLimit: -1,
          daysRemainingInTrial: daysRemaining,
        };
      } else {
        return {
          ...info,
          status: 'expired',
          isActive: false,
          trialActive: false,
          machineLimit: 0,
          daysRemainingInTrial: 0,
        };
      }
    }
    
    if (info.planType && info.isActive) {
      const plan = SUBSCRIPTION_PLANS.find(
        (p) => p.planType === info.planType && p.billingCycle === info.billingCycle
      );
      
      if (plan) {
        if (info.subscriptionEndDate) {
          const subEnd = new Date(info.subscriptionEndDate);
          if (now <= subEnd) {
            return {
              ...info,
              status: 'active',
              isActive: true,
              machineLimit: plan.machineLimit,
            };
          } else {
            return {
              ...info,
              status: 'expired',
              isActive: false,
              machineLimit: 0,
            };
          }
        } else {
          return {
            ...info,
            status: 'active',
            isActive: true,
            machineLimit: plan.machineLimit,
          };
        }
      }
    }
    
    return {
      ...info,
      status: 'none',
      isActive: false,
      machineLimit: 0,
    };
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const calculated = calculateSubscriptionStatus(parsed);
        setSubscriptionInfo(calculated);
        
        if (calculated.status !== parsed.status || calculated.isActive !== parsed.isActive) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(calculated));
        }
      } else {
        const newInfo: SubscriptionInfo = {
          status: 'none',
          machineLimit: 0,
          isActive: false,
          trialActive: false,
        };
        setSubscriptionInfo(newInfo);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateSubscriptionStatus]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const startTrial = useCallback(async () => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    
    const newInfo: SubscriptionInfo = {
      status: 'trial',
      trialActive: true,
      trialEndsAt: trialEnd.toISOString(),
      isActive: true,
      machineLimit: -1,
      daysRemainingInTrial: TRIAL_DAYS,
    };
    
    setSubscriptionInfo(newInfo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
    
    console.log('Trial started:', newInfo);
  }, []);

  const activateSubscription = useCallback(async (
    planType: PlanType,
    billingCycle: BillingCycle
  ) => {
    const plan = SUBSCRIPTION_PLANS.find(
      (p) => p.planType === planType && p.billingCycle === billingCycle
    );
    
    if (!plan) {
      console.error('Plan not found');
      return false;
    }

    const now = new Date();
    const subEnd = new Date();
    if (billingCycle === 'monthly') {
      subEnd.setMonth(subEnd.getMonth() + 1);
    } else {
      subEnd.setFullYear(subEnd.getFullYear() + 1);
    }
    
    const newInfo: SubscriptionInfo = {
      status: 'active',
      planType,
      billingCycle,
      machineLimit: plan.machineLimit,
      subscriptionStartDate: now.toISOString(),
      subscriptionEndDate: subEnd.toISOString(),
      isActive: true,
      trialActive: false,
    };
    
    setSubscriptionInfo(newInfo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
    
    console.log('Subscription activated:', newInfo);
    return true;
  }, []);

  const cancelSubscription = useCallback(async () => {
    const newInfo: SubscriptionInfo = {
      ...subscriptionInfo,
      status: 'expired',
      isActive: false,
      machineLimit: 0,
    };
    
    setSubscriptionInfo(newInfo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
    
    console.log('Subscription cancelled:', newInfo);
  }, [subscriptionInfo]);

  const checkSubscriptionStatus = useCallback(() => {
    const calculated = calculateSubscriptionStatus(subscriptionInfo);
    if (calculated.status !== subscriptionInfo.status || calculated.isActive !== subscriptionInfo.isActive) {
      setSubscriptionInfo(calculated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(calculated));
    }
    return calculated;
  }, [subscriptionInfo, calculateSubscriptionStatus]);

  const canAddMachine = useCallback((currentMachineCount: number): boolean => {
    if (subscriptionInfo.machineLimit === -1) {
      return true;
    }
    
    return currentMachineCount < subscriptionInfo.machineLimit;
  }, [subscriptionInfo.machineLimit]);

  const getRemainingMachineSlots = useCallback((currentMachineCount: number): number => {
    if (subscriptionInfo.machineLimit === -1) {
      return -1;
    }
    
    return Math.max(0, subscriptionInfo.machineLimit - currentMachineCount);
  }, [subscriptionInfo.machineLimit]);

  const needsTrialActivation = subscriptionInfo.status === 'none' && !isLoading;
  const needsSubscription = !subscriptionInfo.isActive && !isLoading;
  const isInTrial = subscriptionInfo.status === 'trial' && subscriptionInfo.isActive;

  return useMemo(
    () => ({
      subscriptionInfo,
      isLoading,
      startTrial,
      activateSubscription,
      cancelSubscription,
      checkSubscriptionStatus,
      canAddMachine,
      getRemainingMachineSlots,
      needsTrialActivation,
      needsSubscription,
      isInTrial,
    }),
    [
      subscriptionInfo,
      isLoading,
      startTrial,
      activateSubscription,
      cancelSubscription,
      checkSubscriptionStatus,
      canAddMachine,
      getRemainingMachineSlots,
      needsTrialActivation,
      needsSubscription,
      isInTrial,
    ]
  );
});
