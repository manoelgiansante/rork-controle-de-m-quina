import React, { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * Provider que inicializa e gerencia notificações de alertas
 * Deve ser incluído no _layout.tsx dentro dos providers
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { expoPushToken, notificationsEnabled } = useNotifications();

  useEffect(() => {
    if (expoPushToken) {
      console.log('📱 Sistema de notificações ativo');
      console.log('🔔 Status:', notificationsEnabled ? 'Ativado' : 'Desativado');
    }
  }, [expoPushToken, notificationsEnabled]);

  return <>{children}</>;
}
