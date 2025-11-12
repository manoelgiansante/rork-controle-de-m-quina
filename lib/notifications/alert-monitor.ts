import type { Alert, Machine, MaintenanceAlert } from '@/types';
import { sendLocalNotification } from './push-notifications';
import { sendRedAlertEmail, sendTankAlertEmail } from './email-service';
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
 * Monitora alertas e envia notificações para os vermelhos e amarelos
 */
export async function monitorRedAlerts(
  alerts: Alert[],
  machines: Machine[],
  userEmails?: string | string[],
  userName?: string,
  notificationsEnabled: boolean = true
): Promise<void> {
  if (!notificationsEnabled) {
    console.log('⏸️ Notificações desabilitadas pelo usuário');
    return;
  }

  // Converter emails para array se necessário
  const emailsArray = userEmails
    ? Array.isArray(userEmails)
      ? userEmails
      : [userEmails]
    : [];

  // Filtrar alertas vermelhos E amarelos (manutenção e tanque)
  const criticalAlerts = alerts.filter(
    (alert) => alert.status === 'red' || alert.status === 'yellow'
  );

  console.log(`🔍 Verificando ${criticalAlerts.length} alertas críticos (vermelho/amarelo)...`);
  console.log(`📧 Emails configurados: ${emailsArray.length}`);

  for (const alert of criticalAlerts) {
    // Verificar se já foi notificado recentemente
    if (await wasRecentlyNotified(alert.id)) {
      console.log(`⏭️ Alerta ${alert.id} já foi notificado nas últimas 24h`);
      continue;
    }

    // Processar alerta de tanque
    if (alert.type === 'tank') {
      const emoji = alert.status === 'red' ? '🚨' : '⚠️';
      const urgency = alert.status === 'red' ? 'URGENTE' : 'ATENÇÃO';

      // Enviar notificação local (push)
      await sendLocalNotification(
        `${emoji} ${urgency}: Tanque de Combustível`,
        alert.message,
        {
          alertId: alert.id,
          type: 'tank_alert',
        }
      );

      // Enviar email se as informações estiverem disponíveis
      if (emailsArray.length > 0 && userName) {
        await sendTankAlertEmail(
          emailsArray,
          userName,
          alert.tankCurrentLiters,
          alert.tankCapacityLiters,
          alert.tankAlertLevelLiters,
          alert.status
        );
      }

      // Marcar como notificado
      await markAsNotified(alert.id);
      console.log(`✅ Notificações de tanque enviadas para alerta: ${alert.id}`);
      continue;
    }

    // Processar alerta de manutenção
    const maintenanceAlert = alert as MaintenanceAlert;
    const machine = machines.find((m) => m.id === maintenanceAlert.machineId);
    if (!machine) continue;

    const machineName = `[${machine.type}] ${machine.model}`;
    const remaining = maintenanceAlert.nextRevisionHourMeter - machine.currentHourMeter;
    const hoursOverdue = Math.abs(remaining);

    const emoji = maintenanceAlert.status === 'red' ? '🚨' : '⚠️';
    const urgency = maintenanceAlert.status === 'red' ? 'URGENTE' : 'ATENÇÃO';

    let message = '';
    if (remaining < 0) {
      message = `${machineName}: ${maintenanceAlert.maintenanceItem} está ${hoursOverdue.toFixed(0)}h atrasada!`;
    } else if (maintenanceAlert.status === 'yellow') {
      message = `${machineName}: ${maintenanceAlert.maintenanceItem} precisa de atenção (faltam ${remaining.toFixed(0)}h)`;
    } else {
      message = `${machineName}: ${maintenanceAlert.maintenanceItem} precisa ser feita AGORA!`;
    }

    // Enviar notificação local (push)
    await sendLocalNotification(
      `${emoji} Manutenção ${urgency}!`,
      message,
      {
        alertId: maintenanceAlert.id,
        machineId: machine.id,
        type: maintenanceAlert.status === 'red' ? 'red_alert' : 'yellow_alert',
      }
    );

    // Enviar email se as informações estiverem disponíveis
    if (emailsArray.length > 0 && userName) {
      await sendRedAlertEmail(
        emailsArray,
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
