import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configurar comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registra o dispositivo para receber notificações push
 * Retorna o token do Expo Push Notification
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Verificar se é um dispositivo físico (não simulador)
  const isPhysicalDevice = Constants.isDevice;

  if (!isPhysicalDevice) {
    console.log('⚠️ Push notifications só funcionam em dispositivos físicos');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permissão de notificação negada');
      return null;
    }

    // Pegar o token do Expo Push Notification
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '1775bcd8-a291-42a9-be32-438d9573163f', // Seu Project ID do Expo
    });

    console.log('✅ Push notification token:', tokenData.data);

    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas de Manutenção',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('❌ Erro ao registrar para push notifications:', error);
    return null;
  }
}

/**
 * Envia uma notificação local (no próprio dispositivo)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Envia imediatamente
    });
    console.log('✅ Notificação local enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar notificação local:', error);
  }
}

/**
 * Envia notificação para o servidor Expo para entrega remota
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high' as const,
    channelId: 'default',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('✅ Push notification enviada:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao enviar push notification:', error);
    throw error;
  }
}

/**
 * Cancela todas as notificações agendadas
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('✅ Todas as notificações canceladas');
}
