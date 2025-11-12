import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { registerForPushNotifications } from '@/lib/notifications/push-notifications';
import { monitorRedAlerts } from '@/lib/notifications/alert-monitor';

/**
 * Hook para gerenciar notificações de alertas vermelhos
 */
export function useNotifications() {
  const { currentUser } = useAuth();
  const { alerts, machines } = useData();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);
  const lastCheckRef = useRef<Date>(new Date());

  // Registrar para receber notificações quando o componente montar
  useEffect(() => {
    if (!currentUser) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        console.log('✅ Token de notificação registrado:', token);
        // TODO: Salvar o token no banco de dados associado ao usuário
      }
    });

    // Listener para quando uma notificação é recebida enquanto o app está aberto
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('📬 Notificação recebida:', notification);
      });

    // Listener para quando o usuário toca na notificação
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('👆 Usuário tocou na notificação:', response);
        const data = response.notification.request.content.data;

        // Navegar para a tela de alertas se for uma notificação de alerta
        if (data?.type === 'red_alert') {
          // TODO: Implementar navegação para a tela de alertas
          console.log('Navegar para alertas');
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [currentUser]);

  // Monitorar alertas periodicamente
  useEffect(() => {
    if (!currentUser || !notificationsEnabled) return;

    // Verificar alertas imediatamente
    checkForRedAlerts();

    // Configurar verificação quando o app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App voltou ao foreground, verificar alertas
        checkForRedAlerts();
      }
      appState.current = nextAppState;
    });

    // Verificar a cada 30 minutos se o app estiver ativo
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkForRedAlerts();
      }
    }, 30 * 60 * 1000); // 30 minutos

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [alerts, machines, currentUser, notificationsEnabled]);

  /**
   * Verifica e envia notificações para alertas vermelhos
   */
  const checkForRedAlerts = async () => {
    if (!currentUser) return;

    // Evitar verificações muito frequentes (mínimo 5 minutos entre verificações)
    const now = new Date();
    const minutesSinceLastCheck =
      (now.getTime() - lastCheckRef.current.getTime()) / (1000 * 60);

    if (minutesSinceLastCheck < 5) {
      console.log('⏸️ Pulando verificação (muito recente)');
      return;
    }

    lastCheckRef.current = now;

    console.log('🔍 Verificando alertas vermelhos...');
    console.log('📧 Email do usuário:', currentUser.email);
    console.log('👤 Nome do usuário:', currentUser.name);
    console.log('🚨 Total de alertas:', alerts.length);

    await monitorRedAlerts(
      alerts,
      machines,
      currentUser.email,
      currentUser.name,
      notificationsEnabled
    );
  };

  /**
   * Ativa/desativa notificações
   */
  const toggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    console.log(`🔔 Notificações ${enabled ? 'ativadas' : 'desativadas'}`);
  };

  /**
   * Força uma verificação manual de alertas
   */
  const forceCheckAlerts = async () => {
    lastCheckRef.current = new Date(0); // Reset para permitir verificação imediata
    await checkForRedAlerts();
  };

  return {
    expoPushToken,
    notificationsEnabled,
    toggleNotifications,
    forceCheckAlerts,
  };
}
