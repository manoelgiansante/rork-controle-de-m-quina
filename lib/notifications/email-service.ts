/**
 * Serviço de envio de emails para alertas
 *
 * IMPORTANTE: Este serviço precisa ser executado no backend (Supabase Edge Functions)
 * por questões de segurança (não expor API keys no app)
 */

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
    // TODO: Substituir pela URL da sua Edge Function quando criada
    const edgeFunctionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/send-email';

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Email service error: ${response.status}`);
    }

    console.log('✅ Email enviado com sucesso para:', data.to);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return false;
  }
}

/**
 * Gera HTML formatado para email de alerta vermelho
 */
export function generateAlertEmailHTML(
  userName: string,
  machineName: string,
  maintenanceItem: string,
  currentHourMeter: number,
  nextRevisionHourMeter: number
): string {
  const hoursOverdue = Math.abs(nextRevisionHourMeter - currentHourMeter);

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
        <span class="label">Horímetro Atual:</span>
        <span class="value">${currentHourMeter.toFixed(1)}h</span>
      </div>
      <div class="info-row">
        <span class="label">Próxima Revisão:</span>
        <span class="value">${nextRevisionHourMeter.toFixed(1)}h</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value" style="color: #F44336; font-weight: bold;">
          ${hoursOverdue > 0 ? `ATRASADO (${hoursOverdue.toFixed(1)}h)` : 'URGENTE'}
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
 * Envia email de alerta vermelho
 */
export async function sendRedAlertEmail(
  userEmail: string,
  userName: string,
  machineName: string,
  maintenanceItem: string,
  currentHourMeter: number,
  nextRevisionHourMeter: number
): Promise<boolean> {
  const html = generateAlertEmailHTML(
    userName,
    machineName,
    maintenanceItem,
    currentHourMeter,
    nextRevisionHourMeter
  );

  return sendEmail({
    to: userEmail,
    subject: `🚨 Alerta Urgente: Manutenção ${maintenanceItem} - ${machineName}`,
    html,
  });
}
