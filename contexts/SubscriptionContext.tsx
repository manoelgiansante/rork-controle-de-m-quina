import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubscriptionInfo } from '@/types';

const STORAGE_KEY = '@controle_maquina:subscription';
const TRIAL_DAYS = 7;

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: 'none',
    isActive: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const calculateSubscriptionStatus = useCallback((info: SubscriptionInfo): SubscriptionInfo => {
    const now = new Date();
    
    if (info.trialStartDate && info.trialEndDate) {
      const trialEnd = new Date(info.trialEndDate);
      
      if (now <= trialEnd) {
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...info,
          status: 'trial',
          isActive: true,
          daysRemainingInTrial: daysRemaining,
        };
      } else if (!info.subscriptionStartDate) {
        return {
          ...info,
          status: 'expired',
          isActive: false,
          daysRemainingInTrial: 0,
        };
      }
    }
    
    if (info.subscriptionStartDate) {
      if (info.subscriptionEndDate) {
        const subEnd = new Date(info.subscriptionEndDate);
        if (now <= subEnd) {
          return {
            ...info,
            status: 'active',
            isActive: true,
          };
        } else {
          return {
            ...info,
            status: 'expired',
            isActive: false,
          };
        }
      } else {
        return {
          ...info,
          status: 'active',
          isActive: true,
        };
      }
    }
    
    return {
      ...info,
      status: 'none',
      isActive: false,
    };
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const calculated = calculateSubscriptionStatus(parsed);
        setSubscriptionInfo(calculated);
        
        if (calculated.status !== parsed.status) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(calculated));
        }
      } else {
        const newInfo: SubscriptionInfo = {
          status: 'none',
          isActive: false,
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
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    
    const newInfo: SubscriptionInfo = {
      status: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      isActive: true,
      daysRemainingInTrial: TRIAL_DAYS,
    };
    
    setSubscriptionInfo(newInfo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
    
    console.log('Trial started:', newInfo);
  }, []);

  const activateSubscription = useCallback(async () => {
    const now = new Date();
    const subEnd = new Date();
    subEnd.setMonth(subEnd.getMonth() + 1);
    
    const newInfo: SubscriptionInfo = {
      ...subscriptionInfo,
      status: 'active',
      subscriptionStartDate: now.toISOString(),
      subscriptionEndDate: subEnd.toISOString(),
      isActive: true,
    };
    
    setSubscriptionInfo(newInfo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
    
    console.log('Subscription activated:', newInfo);
    return true;
  }, [subscriptionInfo]);

  const cancelSubscription = useCallback(async () => {
    const newInfo: SubscriptionInfo = {
      ...subscriptionInfo,
      status: 'expired',
      isActive: false,
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

  const needsTrialActivation = subscriptionInfo.status === 'none' && !isLoading;
  const needsSubscription = (subscriptionInfo.status === 'expired' || subscriptionInfo.status === 'none') && !isLoading;
  const isInTrial = subscriptionInfo.status === 'trial' && subscriptionInfo.isActive;

  return useMemo(
    () => ({
      subscriptionInfo,
      isLoading,
      startTrial,
      activateSubscription,
      cancelSubscription,
      checkSubscriptionStatus,
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
      needsTrialActivation,
      needsSubscription,
      isInTrial,
    ]
  );
});
