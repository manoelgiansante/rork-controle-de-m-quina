/**
 * Serviço de envio de emails para alertas
 *
 * IMPORTANTE: Este serviço precisa ser executado no backend (Supabase Edge Functions)
 * por questões de segurança (não expor API keys no app)
 */

import { supabase } from '@/lib/supabase/client';
import { getMeterLabel, getMeterUnit } from '@/lib/machine-utils';
import type { MachineType } from '@/types';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia email através de uma Edge Function do Supabase
 *
 * Para configurar:
 * 1. Criar uma Edge Function no Supabase
 * 2. Configurar um serviço de email (Resend, SendGrid, AWS SES)
 * 3. A função deve receber: to, subject, html
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    console.log('📧 [EMAIL-SERVICE] Tentando enviar email para:', data.to);
    console.log('📧 [EMAIL-SERVICE] Subject:', data.subject);

    const { data: responseData, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: data.to,
        subject: data.subject,
        html: data.html,
      },
    });

    if (error) {
      console.error('📧 [EMAIL-SERVICE] Erro do Supabase:', error);
      throw error;
    }

    console.log('📧 [EMAIL-SERVICE] Response data:', responseData);
    console.log('✅ Email enviado com sucesso para:', data.to);
    return true;
  } catch (error) {
    console.error('❌ [EMAIL-SERVICE] Erro ao enviar email:', error);
    return false;
  }
}

/**
 * Gera HTML formatado para email de alerta vermelho
 */
export function generateAlertEmailHTML(
  userName: string,
  machineName: string,
  machineType: MachineType,
  maintenanceItem: string,
  currentHourMeter: number,
  nextRevisionHourMeter: number
): string {
  const hoursOverdue = Math.abs(nextRevisionHourMeter - currentHourMeter);
  const meterLabel = getMeterLabel(machineType);
  const meterUnit = getMeterUnit(machineType);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #F44336;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .alert-box {
      background-color: #fff;
      border-left: 4px solid #F44336;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      margin: 10px 0;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      color: #333;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
    .cta-button {
      display: inline-block;
      background-color: #2D5016;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 Alerta de Manutenção Urgente</h1>
  </div>
  <div class="content">
    <p>Olá <strong>${userName}</strong>,</p>

    <p>Uma manutenção está com <strong>status vermelho</strong> e requer atenção imediata:</p>

    <div class="alert-box">
      <div class="info-row">
        <span class="label">Máquina:</span>
        <span class="value">${machineName}</span>
      </div>
      <div class="info-row">
        <span class="label">Item de Manutenção:</span>
        <span class="value">${maintenanceItem}</span>
      </div>
      <div class="info-row">
        <span class="label">${meterLabel} Atual:</span>
        <span class="value">${currentHourMeter.toFixed(1)}${meterUnit}</span>
      </div>
      <div class="info-row">
        <span class="label">Próxima Revisão:</span>
        <span class="value">${nextRevisionHourMeter.toFixed(1)}${meterUnit}</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value" style="color: #F44336; font-weight: bold;">
          ${hoursOverdue > 0 ? `ATRASADO (${hoursOverdue.toFixed(1)}${meterUnit})` : 'URGENTE'}
        </span>
      </div>
    </div>

    <p>
      <strong>Ação requerida:</strong> Por favor, realize a manutenção o quanto antes para evitar
      danos à máquina e garantir a segurança operacional.
    </p>

    <center>
      <a href="rork-app://reports/alerts" class="cta-button">Ver Alertas no App</a>
    </center>
  </div>

  <div class="footer">
    <p>Este é um email automático do sistema Controle de Máquina.</p>
    <p>© ${new Date().getFullYear()} Controle de Máquina. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Envia email de alerta vermelho para um ou mais destinatários
 */
export async function sendRedAlertEmail(
  userEmails: string | string[],
  userName: string,
  machineName: string,
  machineType: MachineType,
  maintenanceItem: string,
  currentHourMeter: number,
  nextRevisionHourMeter: number
): Promise<boolean> {
  const html = generateAlertEmailHTML(
    userName,
    machineName,
    machineType,
    maintenanceItem,
    currentHourMeter,
    nextRevisionHourMeter
  );

  const subject = `🚨 Alerta Urgente: Manutenção ${maintenanceItem} - ${machineName}`;

  // Converter para array se for string única
  const emails = Array.isArray(userEmails) ? userEmails : [userEmails];

  // Enviar para todos os emails
  const results = await Promise.all(
    emails.map(email =>
      sendEmail({
        to: email,
        subject,
        html,
      })
    )
  );

  // Retorna true se pelo menos um email foi enviado com sucesso
  return results.some(result => result === true);
}

/**
 * Gera HTML formatado para email de alerta de tanque
 */
export function generateTankAlertEmailHTML(
  userName: string,
  currentLiters: number,
  capacityLiters: number,
  alertLevelLiters: number,
  status: 'red' | 'yellow' | 'green'
): string {
  const percentageFilled = (currentLiters / capacityLiters) * 100;
  const isUrgent = status === 'red';
  const headerColor = isUrgent ? '#F44336' : '#FF9800';
  const emoji = isUrgent ? '🚨' : '⚠️';
  const title = isUrgent ? 'Alerta URGENTE: Tanque de Combustível Baixo' : 'Atenção: Tanque de Combustível';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: ${headerColor};
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .alert-box {
      background-color: #fff;
      border-left: 4px solid ${headerColor};
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      margin: 10px 0;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      color: #333;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
    .cta-button {
      display: inline-block;
      background-color: #2D5016;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${emoji} ${title}</h1>
  </div>
  <div class="content">
    <p>Olá <strong>${userName}</strong>,</p>

    <p>O tanque de combustível da fazenda está ${isUrgent ? '<strong>ABAIXO</strong>' : 'próximo'} do nível de alerta configurado:</p>

    <div class="alert-box">
      <div class="info-row">
        <span class="label">Combustível Atual:</span>
        <span class="value">${currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%)</span>
      </div>
      <div class="info-row">
        <span class="label">Capacidade Total:</span>
        <span class="value">${capacityLiters.toFixed(0)}L</span>
      </div>
      <div class="info-row">
        <span class="label">Nível de Alerta:</span>
        <span class="value">${alertLevelLiters.toFixed(0)}L</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value" style="color: ${headerColor}; font-weight: bold;">
          ${isUrgent ? 'URGENTE - Reabasteça imediatamente!' : 'ATENÇÃO - Considere reabastecer em breve'}
        </span>
      </div>
    </div>

    <p>
      <strong>Ação requerida:</strong> ${isUrgent ? 'Solicite o reabastecimento do tanque o quanto antes para evitar interrupções nas operações.' : 'Planeje o reabastecimento do tanque para os próximos dias.'}
    </p>
  </div>

  <div class="footer">
    <p>Este é um email automático do sistema Controle de Máquina.</p>
    <p>© ${new Date().getFullYear()} Controle de Máquina. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Envia email consolidado com TODOS os alertas críticos
 */
export async function sendConsolidatedAlertsEmail(
  userEmails: string | string[],
  userName: string,
  alertsData: Array<{
    type: 'tank' | 'maintenance';
    status: 'red' | 'yellow';
    // Tank data
    tankCurrentLiters?: number;
    tankCapacityLiters?: number;
    tankAlertLevelLiters?: number;
    // Maintenance data
    machineName?: string;
    machineType?: MachineType;
    maintenanceItem?: string;
    currentHourMeter?: number;
    nextRevisionHourMeter?: number;
  }>
): Promise<boolean> {
  // Converter para array se for string única
  const emails = Array.isArray(userEmails) ? userEmails : [userEmails];

  // Contar alertas por tipo
  const redCount = alertsData.filter(a => a.status === 'red').length;
  const yellowCount = alertsData.filter(a => a.status === 'yellow').length;

  // Gerar HTML para cada alerta
  let alertsHtml = '';

  alertsData.forEach((alertData, index) => {
    const bgColor = alertData.status === 'red' ? '#FFEBEE' : '#FFF9C4';
    const borderColor = alertData.status === 'red' ? '#F44336' : '#FF9800';
    const emoji = alertData.status === 'red' ? '🚨' : '⚠️';
    const statusText = alertData.status === 'red' ? 'URGENTE' : 'ATENÇÃO';

    if (alertData.type === 'tank') {
      const percentageFilled = ((alertData.tankCurrentLiters || 0) / (alertData.tankCapacityLiters || 1)) * 100;
      alertsHtml += `
        <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 16px; margin: 12px 0; border-radius: 4px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">${emoji}</span>
            <strong style="color: ${borderColor}; font-size: 16px;">${statusText}: Tanque de Combustível</strong>
          </div>
          <div style="margin-left: 32px;">
            <p style="margin: 4px 0;"><strong>Nível Atual:</strong> ${alertData.tankCurrentLiters?.toFixed(0)}L (${percentageFilled.toFixed(0)}%)</p>
            <p style="margin: 4px 0;"><strong>Capacidade Total:</strong> ${alertData.tankCapacityLiters?.toFixed(0)}L</p>
            <p style="margin: 4px 0;"><strong>Nível de Alerta:</strong> ${alertData.tankAlertLevelLiters?.toFixed(0)}L</p>
            <p style="margin: 4px 0; color: ${borderColor};"><strong>Status:</strong> ${alertData.status === 'red' ? 'Reabasteça imediatamente!' : 'Considere reabastecer em breve'}</p>
          </div>
        </div>
      `;
    } else {
      const hoursOverdue = Math.abs((alertData.nextRevisionHourMeter || 0) - (alertData.currentHourMeter || 0));
      const isOverdue = (alertData.currentHourMeter || 0) >= (alertData.nextRevisionHourMeter || 0);
      const meterLabel = alertData.machineType ? getMeterLabel(alertData.machineType) : 'Horímetro';
      const meterUnit = alertData.machineType ? getMeterUnit(alertData.machineType) : 'h';

      alertsHtml += `
        <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 16px; margin: 12px 0; border-radius: 4px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">${emoji}</span>
            <strong style="color: ${borderColor}; font-size: 16px;">${statusText}: ${alertData.machineName}</strong>
          </div>
          <div style="margin-left: 32px;">
            <p style="margin: 4px 0;"><strong>Manutenção:</strong> ${alertData.maintenanceItem}</p>
            <p style="margin: 4px 0;"><strong>${meterLabel} Atual:</strong> ${alertData.currentHourMeter?.toFixed(1)}${meterUnit}</p>
            <p style="margin: 4px 0;"><strong>Próxima Revisão:</strong> ${alertData.nextRevisionHourMeter?.toFixed(1)}${meterUnit}</p>
            <p style="margin: 4px 0; color: ${borderColor};"><strong>Status:</strong> ${isOverdue ? `ATRASADO (${hoursOverdue.toFixed(0)}${meterUnit})` : `Faltam ${hoursOverdue.toFixed(0)}${meterUnit}`}</p>
          </div>
        </div>
      `;
    }
  });

  const subject = `🚨 ${redCount > 0 ? `${redCount} URGENTE` : ''}${yellowCount > 0 ? ` ${yellowCount} Atenção` : ''} - Alertas de Manutenção`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #F44336; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Relatório de Alertas Críticos</h1>
      </div>

      <div style="background-color: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 8px;">Olá <strong>${userName}</strong>,</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          Você possui <strong>${alertsData.length} alerta${alertsData.length > 1 ? 's' : ''} crítico${alertsData.length > 1 ? 's' : ''}</strong>
          que ${alertsData.length > 1 ? 'requerem' : 'requer'} atenção:
        </p>

        <div style="background-color: #E3F2FD; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
          <strong style="color: #1976D2;">Resumo:</strong>
          ${redCount > 0 ? `<span style="color: #F44336; margin-left: 12px;">🚨 ${redCount} Urgente${redCount > 1 ? 's' : ''}</span>` : ''}
          ${yellowCount > 0 ? `<span style="color: #FF9800; margin-left: 12px;">⚠️ ${yellowCount} Atenção</span>` : ''}
        </div>

        ${alertsHtml}

        <div style="background-color: #FFF3E0; border-left: 4px solid #FF9800; padding: 16px; margin-top: 24px; border-radius: 4px;">
          <strong style="color: #E65100;">📋 Ação Requerida:</strong>
          <p style="margin: 8px 0 0 0; color: #555;">
            Por favor, verifique e resolva os alertas acima o quanto antes para garantir o bom funcionamento das operações.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>Este é um email automático do sistema Controle de Máquina.</p>
        <p>© ${new Date().getFullYear()} Controle de Máquina. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `;

  // Enviar para todos os emails
  const results = await Promise.all(
    emails.map(email =>
      sendEmail({
        to: email,
        subject,
        html,
      })
    )
  );

  // Retorna true se pelo menos um email foi enviado com sucesso
  return results.some(result => result === true);
}

/**
 * Envia email de alerta de tanque para um ou mais destinatários
 */
export async function sendTankAlertEmail(
  userEmails: string | string[],
  userName: string,
  currentLiters: number,
  capacityLiters: number,
  alertLevelLiters: number,
  status: 'red' | 'yellow' | 'green'
): Promise<boolean> {
  const html = generateTankAlertEmailHTML(
    userName,
    currentLiters,
    capacityLiters,
    alertLevelLiters,
    status
  );

  const percentageFilled = (currentLiters / capacityLiters) * 100;
  const subject = status === 'red'
    ? `🚨 URGENTE: Tanque Baixo - ${currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%)`
    : `⚠️ Atenção: Tanque de Combustível - ${currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%)`;

  // Converter para array se for string única
  const emails = Array.isArray(userEmails) ? userEmails : [userEmails];

  // Enviar para todos os emails
  const results = await Promise.all(
    emails.map(email =>
      sendEmail({
        to: email,
        subject,
        html,
      })
    )
  );

  // Retorna true se pelo menos um email foi enviado com sucesso
  return results.some(result => result === true);
}
