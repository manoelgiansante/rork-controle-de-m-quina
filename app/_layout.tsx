import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, hasAcceptedTerms } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const isOnLoginPage = segments[0] === 'login';
    const isOnTermsPage = segments[0] === 'terms';

    if (!isAuthenticated && !isOnLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && isOnLoginPage) {
      router.replace('/machines');
    } else if (isAuthenticated && !hasAcceptedTerms && !isOnTermsPage) {
      router.replace('/terms');
    }
  }, [isAuthenticated, isLoading, segments, hasAcceptedTerms, router]);

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    // Garante que a splash screen some corretamente após o carregamento inicial
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SubscriptionProvider>
            <PropertyProvider>
              <DataProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </DataProvider>
            </PropertyProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
