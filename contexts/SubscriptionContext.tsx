import AsyncStorage from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { BillingCycle, PlanType, SubscriptionInfo, SubscriptionPlan } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';

const STORAGE_KEY = '@controle_maquina:subscription';
const TRIAL_DAYS = 7;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_monthly',
    productId: 'com.2m.controledemaquina.basico.mensal19',
    name: 'Plano Básico Mensal',
    planType: 'basic',
    billingCycle: 'monthly',
    machineLimit: 10,
    price: 19.99,
    description: 'Até 10 máquinas',
    features: [
      'Até 10 máquinas',
      'Controle de abastecimento',
      'Manutenção básica',
      'Alertas automáticos',
    ],
  },
  {
    id: 'basic_annual',
    productId: 'com.2m.controledemaquina.basico.anual',
    name: 'Plano Básico Anual',
    planType: 'basic',
    billingCycle: 'annual',
    machineLimit: 10,
    price: 199.99,
    description: 'Até 10 máquinas (economize ~2 meses)',
    features: [
      'Até 10 máquinas',
      'Controle de abastecimento',
      'Manutenção básica',
      'Alertas automáticos',
      'Economia em relação ao mensal',
    ],
  },
  {
    id: 'premium_monthly',
    productId: 'com.2m.controledemaquina.premium.mensal',
    name: 'Plano Premium Mensal',
    planType: 'premium',
    billingCycle: 'monthly',
    machineLimit: -1,
    price: 49.90,
    description: 'Máquinas ilimitadas',
    features: [
      'Máquinas ilimitadas',
      'Controle de abastecimento',
      'Manutenção completa',
      'Alertas inteligentes',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
  {
    id: 'premium_annual',
    productId: 'com.2m.controledemaquina.premium.anual',
    name: 'Plano Premium Anual',
    planType: 'premium',
    billingCycle: 'annual',
    machineLimit: -1,
    price: 499.90,
    description: 'Máquinas ilimitadas (economize ~2 meses)',
    features: [
      'Máquinas ilimitadas',
      'Controle de abastecimento',
      'Manutenção completa',
      'Alertas inteligentes',
      'Relatórios avançados',
      'Suporte prioritário',
      'Economia em relação ao mensal',
    ],
  },
];

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const { currentUser } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: 'none',
    machineLimit: 0,
    isActive: false,
    trialActive: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isWeb = Platform.OS === 'web';

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

  const syncWithSupabase = useCallback(async (userId: string) => {
    try {
      console.log('[SUBSCRIPTION] Sincronizando com Supabase para user:', userId);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[SUBSCRIPTION] Erro ao buscar subscription:', error);
        return null;
      }

      if (data) {
        console.log('[SUBSCRIPTION] Dados encontrados no Supabase:', data);
        
        const subscriptionData: SubscriptionInfo = {
          status: data.status === 'active' ? 'active' : 'expired',
          planType: data.plan_type,
          billingCycle: data.billing_cycle,
          machineLimit: data.machine_limit,
          subscriptionStartDate: data.current_period_start,
          subscriptionEndDate: data.current_period_end,
          isActive: data.status === 'active',
          trialActive: data.trial_active || false,
          trialEndsAt: data.trial_ends_at,
        };

        const calculated = calculateSubscriptionStatus(subscriptionData);
        
        setSubscriptionInfo(calculated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(calculated));
        
        console.log('[SUBSCRIPTION] Sincronização concluída:', calculated);
        return calculated;
      }

      return null;
    } catch (error) {
      console.error('[SUBSCRIPTION] Erro na sincronização:', error);
      return null;
    }
  }, [calculateSubscriptionStatus]);

  const loadSubscription = useCallback(async () => {
    console.log('[SUBSCRIPTION] Carregando subscription...', { isWeb, userId: currentUser?.id });
    try {
      setIsLoading(true);
      
      if (currentUser?.id && isWeb) {
        const supabaseData = await syncWithSupabase(currentUser.id);
        
        if (supabaseData) {
          console.log('[SUBSCRIPTION] Usando dados do Supabase');
          return;
        }
      }
      
      console.log('[SUBSCRIPTION] Usando dados do cache local');
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
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Error loading subscription:', error);
      console.error('[SUBSCRIPTION] Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      const newInfo: SubscriptionInfo = {
        status: 'none',
        machineLimit: 0,
        isActive: false,
        trialActive: false,
      };
      setSubscriptionInfo(newInfo);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, isWeb, syncWithSupabase, calculateSubscriptionStatus]);

  useEffect(() => {
    if (currentUser === undefined) return;
    loadSubscription();
  }, [currentUser, loadSubscription]);

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

  const refreshSubscription = useCallback(async () => {
    console.log('[SUBSCRIPTION] Forçando refresh da subscription...');
    await loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    if (!isWeb || !currentUser?.id) return;

    const interval = setInterval(() => {
      console.log('[SUBSCRIPTION] Verificação periódica (30s)...');
      loadSubscription();
    }, 30000);

    return () => clearInterval(interval);
  }, [isWeb, currentUser, loadSubscription]);

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
      refreshSubscription,
      syncWithSupabase,
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
      refreshSubscription,
      syncWithSupabase,
      needsTrialActivation,
      needsSubscription,
      isInTrial,
    ]
  );
});
