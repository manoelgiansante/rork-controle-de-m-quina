import type { Alert, Machine, MaintenanceAlert } from '@/types';
import { sendLocalNotification } from './push-notifications';
import { sendRedAlertEmail, sendTankAlertEmail, sendConsolidatedAlertsEmail } from './email-service';
import { getMeterUnit } from '@/lib/machine-utils';
import AsyncStorage from '@/lib/storage';

const ALERT_HISTORY_KEY = '@controle_maquina:notified_alerts';

interface NotifiedAlert {
  alertId: string;
  lastNotifiedAt: string;
}

/**
 * Verifica se um alerta já foi notificado hoje (após 21h)
 * Sistema: 1 notificação por dia às 21h
 */
async function wasNotifiedToday(alertId: string): Promise<boolean> {
  try {
    const historyJson = await AsyncStorage.getItem(ALERT_HISTORY_KEY);
    if (!historyJson) return false;

    const history: NotifiedAlert[] = JSON.parse(historyJson);
    const alertHistory = history.find((h) => h.alertId === alertId);

    if (!alertHistory) return false;

    const lastNotified = new Date(alertHistory.lastNotifiedAt);
    const now = new Date();

    // Verifica se foi notificado no mesmo dia (considerando dia atual após 21h)
    const lastNotifiedDate = new Date(lastNotified);
    lastNotifiedDate.setHours(0, 0, 0, 0);

    const todayDate = new Date(now);
    todayDate.setHours(0, 0, 0, 0);

    // Se foi notificado hoje, não enviar novamente
    if (lastNotifiedDate.getTime() === todayDate.getTime()) {
      console.log(`⏭️ Alerta ${alertId} já foi notificado hoje`);
      return true;
    }

    return false;
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
  notificationsEnabled: boolean = true,
  forceEmailSend: boolean = false // Parâmetro para forçar envio (teste)
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

  // Verificar se está no horário de envio (21h - horário de Brasília)
  const now = new Date();

  // Converter para horário de Brasília (UTC-3)
  const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const currentHour = brazilTime.getHours();
  const isScheduledTime = currentHour === 21; // 21h Brasília

  // Se forceEmailSend for true, simula que está às 21h (para testes)
  const shouldSendEmails = forceEmailSend || isScheduledTime;

  if (forceEmailSend) {
    console.log(`🧪 MODO TESTE: Forçando envio de emails (simulando 21h)`);
  } else {
    console.log(`🕐 Hora atual (Brasília): ${currentHour}h | Horário de envio: ${isScheduledTime ? 'SIM' : 'NÃO (apenas às 21h)'}`);
    console.log(`   Data/Hora completa (Brasília): ${brazilTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  }

  // Arrays para coletar alertas por tipo
  const tankAlertsToEmail: any[] = [];
  const maintenanceAlertsToEmail: any[] = [];

  for (const alert of criticalAlerts) {
    console.log(`\n📋 Processando alerta: ${alert.id}`);
    console.log(`   Tipo: ${alert.type} | Status: ${alert.status}`);

    // Log detalhado do alerta
    if (alert.type === 'maintenance') {
      console.log(`   Máquina ID: ${alert.machineId}`);
      console.log(`   Item: ${alert.maintenanceItem}`);
    }

    // Verificar se já foi notificado hoje
    const alreadyNotified = await wasNotifiedToday(alert.id);
    console.log(`   Já notificado hoje? ${alreadyNotified ? 'SIM' : 'NÃO'}`);

    if (alreadyNotified) {
      console.log(`   ⏭️ Pulando alerta (já notificado hoje)`);
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

      // Coletar dados para email consolidado (não enviar ainda)
      console.log(`   📧 Coletando alerta de tanque para email consolidado...`);
      tankAlertsToEmail.push({
        type: 'tank' as const,
        status: alert.status,
        tankCurrentLiters: alert.tankCurrentLiters,
        tankCapacityLiters: alert.tankCapacityLiters,
        tankAlertLevelLiters: alert.tankAlertLevelLiters,
      });

      // Marcar como notificado
      await markAsNotified(alert.id);
      console.log(`✅ Notificação push de tanque enviada para alerta: ${alert.id}`);
      continue;
    }

    // Processar alerta de manutenção
    const maintenanceAlert = alert as MaintenanceAlert;
    const machine = machines.find((m) => m.id === maintenanceAlert.machineId);
    if (!machine) continue;

    const machineName = `[${machine.type}] ${machine.model}`;
    const remaining = maintenanceAlert.nextRevisionHourMeter - machine.currentHourMeter;
    const hoursOverdue = Math.abs(remaining);
    const meterUnit = getMeterUnit(machine.type);

    const emoji = maintenanceAlert.status === 'red' ? '🚨' : '⚠️';
    const urgency = maintenanceAlert.status === 'red' ? 'URGENTE' : 'ATENÇÃO';

    let message = '';
    if (remaining < 0) {
      message = `${machineName}: ${maintenanceAlert.maintenanceItem} está ${hoursOverdue.toFixed(0)}${meterUnit} atrasada!`;
    } else if (maintenanceAlert.status === 'yellow') {
      message = `${machineName}: ${maintenanceAlert.maintenanceItem} precisa de atenção (faltam ${remaining.toFixed(0)}${meterUnit})`;
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

    // Coletar dados para email consolidado (não enviar ainda)
    console.log(`   📧 Coletando alerta de manutenção para email consolidado...`);
    const alertDataToCollect = {
      type: 'maintenance' as const,
      status: maintenanceAlert.status,
      machineName,
      machineType: machine.type,
      maintenanceItem: maintenanceAlert.maintenanceItem,
      currentHourMeter: machine.currentHourMeter,
      nextRevisionHourMeter: maintenanceAlert.nextRevisionHourMeter,
    };
    maintenanceAlertsToEmail.push(alertDataToCollect);
    console.log(`   ✅ Alerta coletado! Total de manutenções coletadas: ${maintenanceAlertsToEmail.length}`);
    console.log(`   Dados coletados:`, JSON.stringify(alertDataToCollect, null, 2));

    // Marcar como notificado
    await markAsNotified(alert.id);

    console.log(`✅ Notificação push de manutenção enviada para alerta: ${alert.id}`);
  }

  // Após processar todos os alertas, enviar emails consolidados
  console.log(`\n📊 ============================================`);
  console.log(`📊 RESUMO DE ALERTAS COLETADOS:`);
  console.log(`   Tanque: ${tankAlertsToEmail.length} alerta(s)`);
  console.log(`   Manutenção: ${maintenanceAlertsToEmail.length} alerta(s)`);
  console.log(`   TOTAL: ${tankAlertsToEmail.length + maintenanceAlertsToEmail.length} alerta(s)`);
  console.log(`📊 ============================================\n`);

  // Log detalhado de todos os alertas de manutenção coletados
  if (maintenanceAlertsToEmail.length > 0) {
    console.log(`📋 Detalhes dos alertas de manutenção coletados:`);
    maintenanceAlertsToEmail.forEach((alert, index) => {
      console.log(`   ${index + 1}. ${alert.machineName} - ${alert.maintenanceItem} (${alert.status})`);
    });
  }

  if (shouldSendEmails && emailsArray.length > 0 && userName) {
    // Enviar email de tanque (se houver)
    if (tankAlertsToEmail.length > 0) {
      console.log(`\n📧 Enviando email de tanque para ${emailsArray.length} destinatário(s)...`);
      try {
        const tankAlert = tankAlertsToEmail[0]; // Usar o primeiro (deveria haver apenas 1 tanque)
        await sendTankAlertEmail(
          emailsArray,
          userName,
          tankAlert.tankCurrentLiters,
          tankAlert.tankCapacityLiters,
          tankAlert.tankAlertLevelLiters,
          tankAlert.status
        );
        console.log(`✅ Email de tanque enviado com sucesso!`);
      } catch (error) {
        console.error(`❌ Erro ao enviar email de tanque:`, error);
      }
    }

    // Enviar email consolidado de manutenções (se houver)
    if (maintenanceAlertsToEmail.length > 0) {
      console.log(`\n📧 Enviando email consolidado com ${maintenanceAlertsToEmail.length} manutenção(ões) para ${emailsArray.length} destinatário(s)...`);
      try {
        await sendConsolidatedAlertsEmail(emailsArray, userName, maintenanceAlertsToEmail);
        console.log(`✅ Email consolidado de manutenções enviado com sucesso!`);
      } catch (error) {
        console.error(`❌ Erro ao enviar email consolidado de manutenções:`, error);
      }
    }
  } else if (!shouldSendEmails) {
    console.log(`\n⏰ Emails não enviados (aguardando horário das 21h)`);
  } else {
    console.log(`\n⚠️ Emails não enviados (falta informações: emails=${emailsArray.length}, user=${userName})`);
  }

  console.log(`\n✅ Processamento de alertas concluído!`);
}

/**
 * Limpa o histórico de notificações (útil para testes)
 */
export async function clearNotificationHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ALERT_HISTORY_KEY);
    console.log('🗑️ Histórico de notificações limpo com sucesso');
    return;
  } catch (error) {
    console.error('❌ Erro ao limpar histórico:', error);
    throw error;
  }
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
