import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import { trpc, trpcClient } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, hasAcceptedTerms } = useAuth();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !isNavigationReady) return;

    const isOnLoginPage = segments[0] === 'login';
    const isOnTermsPage = segments[0] === 'terms';
    const isOnSubscriptionRequired = segments[0] === 'subscription-required';
    const isOnResetPassword = segments[0] === 'reset-password';

    if (!isAuthenticated && !isOnLoginPage && !isOnResetPassword) {
      console.log('RootLayoutNav: Redirecionando para /login (não autenticado)');
      router.replace('/login');
    } else if (isAuthenticated && isOnLoginPage && !isOnResetPassword) {
      console.log('RootLayoutNav: Redirecionando para /machines (já autenticado)');
      router.replace('/machines');
    } else if (isAuthenticated && !hasAcceptedTerms && !isOnTermsPage && !isOnSubscriptionRequired && !isOnResetPassword) {
      console.log('RootLayoutNav: Redirecionando para /terms (termos não aceitos)');
      router.replace('/terms');
    }
  }, [isAuthenticated, isLoading, segments, hasAcceptedTerms, router, isNavigationReady]);

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <PropertyProvider>
                <DataProvider>
                  <NotificationsProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <RootLayoutNav />
                    </GestureHandlerRootView>
                  </NotificationsProvider>
                </DataProvider>
              </PropertyProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
