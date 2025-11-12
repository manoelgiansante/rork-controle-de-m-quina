import type { Alert, Machine, MaintenanceAlert } from '@/types';
import { sendLocalNotification } from './push-notifications';
import { sendRedAlertEmail } from './email-service';
import AsyncStorage from '@/lib/storage';

const ALERT_HISTORY_KEY = '@controle_maquina:notified_alerts';

interface NotifiedAlert {
  alertId: string;
  lastNotifiedAt: string;
}

/**
 * Verifica se um alerta já foi notificado recentemente (últimas 24h)
 */
async function wasRecentlyNotified(alertId: string): Promise<boolean> {
  try {
    const historyJson = await AsyncStorage.getItem(ALERT_HISTORY_KEY);
    if (!historyJson) return false;

    const history: NotifiedAlert[] = JSON.parse(historyJson);
    const alertHistory = history.find((h) => h.alertId === alertId);

    if (!alertHistory) return false;

    // Verificar se foi notificado nas últimas 24 horas
    const lastNotified = new Date(alertHistory.lastNotifiedAt);
    const now = new Date();
    const hoursSinceNotification =
      (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

    return hoursSinceNotification < 24;
  } catch (error) {
    console.error('Erro ao verificar histórico de alertas:', error);
    return false;
  }
}

/**
 * Marca um alerta como notificado
 */
async function markAsNotified(alertId: string): Promise<void> {
  try {
    const historyJson = await AsyncStorage.getItem(ALERT_HISTORY_KEY);
    let history: NotifiedAlert[] = historyJson ? JSON.parse(historyJson) : [];

    // Remover entrada antiga se existir
    history = history.filter((h) => h.alertId !== alertId);

    // Adicionar nova entrada
    history.push({
      alertId,
      lastNotifiedAt: new Date().toISOString(),
    });

    // Limpar histórico antigo (> 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    history = history.filter(
      (h) => new Date(h.lastNotifiedAt) > sevenDaysAgo
    );

    await AsyncStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Erro ao marcar alerta como notificado:', error);
  }
}

/**
 * Monitora alertas e envia notificações para os vermelhos
 */
export async function monitorRedAlerts(
  alerts: Alert[],
  machines: Machine[],
  userEmail?: string,
  userName?: string,
  notificationsEnabled: boolean = true
): Promise<void> {
  if (!notificationsEnabled) {
    console.log('⏸️ Notificações desabilitadas pelo usuário');
    return;
  }

  const redAlerts = alerts.filter(
    (alert) => alert.status === 'red' && alert.type === 'maintenance'
  ) as MaintenanceAlert[];

  console.log(`🔍 Verificando ${redAlerts.length} alertas vermelhos...`);

  for (const alert of redAlerts) {
    // Verificar se já foi notificado recentemente
    if (await wasRecentlyNotified(alert.id)) {
      console.log(`⏭️ Alerta ${alert.id} já foi notificado nas últimas 24h`);
      continue;
    }

    const machine = machines.find((m) => m.id === alert.machineId);
    if (!machine) continue;

    const machineName = `[${machine.type}] ${machine.model}`;
    const remaining = alert.nextRevisionHourMeter - machine.currentHourMeter;
    const hoursOverdue = Math.abs(remaining);

    // Enviar notificação local (push)
    await sendLocalNotification(
      '🚨 Manutenção Urgente!',
      `${machineName}: ${alert.maintenanceItem} ${
        remaining < 0 ? `está ${hoursOverdue.toFixed(0)}h atrasada!` : 'precisa ser feita AGORA!'
      }`,
      {
        alertId: alert.id,
        machineId: machine.id,
        type: 'red_alert',
      }
    );

    // Enviar email se as informações estiverem disponíveis
    if (userEmail && userName) {
      await sendRedAlertEmail(
        userEmail,
        userName,
        machineName,
        alert.maintenanceItem,
        machine.currentHourMeter,
        alert.nextRevisionHourMeter
      );
    }

    // Marcar como notificado
    await markAsNotified(alert.id);

    console.log(`✅ Notificações enviadas para alerta: ${alert.id}`);
  }
}

/**
 * Limpa o histórico de notificações (útil para testes)
 */
export async function clearNotificationHistory(): Promise<void> {
  await AsyncStorage.removeItem(ALERT_HISTORY_KEY);
  console.log('🗑️ Histórico de notificações limpo');
}

/**
 * Verifica quantos alertas vermelhos existem
 */
export function countRedAlerts(alerts: Alert[]): number {
  return alerts.filter((a) => a.status === 'red').length;
}

/**
 * Retorna mensagem de resumo dos alertas
 */
export function getAlertsSummary(alerts: Alert[]): string {
  const redCount = alerts.filter((a) => a.status === 'red').length;
  const yellowCount = alerts.filter((a) => a.status === 'yellow').length;
  const greenCount = alerts.filter((a) => a.status === 'green').length;

  const parts: string[] = [];
  if (redCount > 0) parts.push(`${redCount} urgente${redCount > 1 ? 's' : ''}`);
  if (yellowCount > 0) parts.push(`${yellowCount} atenção`);
  if (greenCount > 0) parts.push(`${greenCount} OK`);

  return parts.join(', ') || 'Nenhum alerta';
}
