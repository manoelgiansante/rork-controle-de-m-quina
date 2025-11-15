import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Types
type AlertStatus = 'green' | 'yellow' | 'red'
type MachineType = 'Trator' | 'Caminhão' | 'Carro' | 'Pá Carregadeira' | 'Vagão' | 'Colheitadeira' | 'Uniport' | 'Outro'

interface MaintenanceAlert {
  id: string
  type: 'maintenance'
  propertyId: string
  machineId: string
  maintenanceId: string
  maintenanceItem: string
  serviceHourMeter: number
  intervalHours: number
  nextRevisionHourMeter: number
  status: AlertStatus
  createdAt: string
}

interface TankAlert {
  id: string
  type: 'tank'
  propertyId: string
  tankCurrentLiters: number
  tankCapacityLiters: number
  tankAlertLevelLiters: number
  percentageFilled: number
  status: AlertStatus
  message: string
  createdAt: string
}

type Alert = MaintenanceAlert | TankAlert

interface Machine {
  id: string
  propertyId: string
  type: MachineType
  model: string
  currentHourMeter: number
  createdAt: string
  updatedAt: string
  archived?: boolean
  archivedAt?: string
}

// Helper functions
function getMeterLabel(machineType: MachineType): string {
  switch (machineType) {
    case 'Trator':
    case 'Pá Carregadeira':
    case 'Colheitadeira':
    case 'Uniport':
      return 'Horímetro'
    case 'Caminhão':
    case 'Carro':
      return 'Odômetro'
    case 'Vagão':
      return 'Contador'
    default:
      return 'Horímetro'
  }
}

function getMeterUnit(machineType: MachineType): string {
  switch (machineType) {
    case 'Trator':
    case 'Pá Carregadeira':
    case 'Colheitadeira':
    case 'Uniport':
      return 'h'
    case 'Caminhão':
    case 'Carro':
      return 'km'
    case 'Vagão':
      return 'ciclos'
    default:
      return 'h'
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Controle de Máquina <alertas@controledemaquina.com.br>',
        to: [to],
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro do Resend:', data)
      return false
    }

    console.log('✅ Email enviado:', data.id)
    return true
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error)
    return false
  }
}

function generateConsolidatedAlertsEmailHTML(
  userName: string,
  alertsData: Array<{
    type: 'tank' | 'maintenance'
    status: 'red' | 'yellow'
    tankCurrentLiters?: number
    tankCapacityLiters?: number
    tankAlertLevelLiters?: number
    machineName?: string
    machineType?: MachineType
    maintenanceItem?: string
    currentHourMeter?: number
    nextRevisionHourMeter?: number
  }>
): string {
  const redCount = alertsData.filter(a => a.status === 'red').length
  const yellowCount = alertsData.filter(a => a.status === 'yellow').length

  let alertsHtml = ''

  alertsData.forEach((alertData) => {
    const bgColor = alertData.status === 'red' ? '#FFEBEE' : '#FFF9C4'
    const borderColor = alertData.status === 'red' ? '#F44336' : '#FF9800'
    const emoji = alertData.status === 'red' ? '🚨' : '⚠️'
    const statusText = alertData.status === 'red' ? 'URGENTE' : 'ATENÇÃO'

    if (alertData.type === 'tank') {
      const percentageFilled = ((alertData.tankCurrentLiters || 0) / (alertData.tankCapacityLiters || 1)) * 100
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
      `
    } else {
      const hoursOverdue = Math.abs((alertData.nextRevisionHourMeter || 0) - (alertData.currentHourMeter || 0))
      const isOverdue = (alertData.currentHourMeter || 0) >= (alertData.nextRevisionHourMeter || 0)
      const meterLabel = alertData.machineType ? getMeterLabel(alertData.machineType) : 'Horímetro'
      const meterUnit = alertData.machineType ? getMeterUnit(alertData.machineType) : 'h'

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
      `
    }
  })

  const subject = `🚨 ${redCount > 0 ? `${redCount} URGENTE` : ''}${yellowCount > 0 ? ` ${yellowCount} Atenção` : ''} - Alertas de Manutenção`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #F44336; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Relatório Diário de Alertas - 21h</h1>
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
        <p>Este é um email automático enviado diariamente às 21h (horário de Brasília).</p>
        <p>© ${new Date().getFullYear()} Controle de Máquina. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕐 [CRON] Iniciando verificação de alertas diários às 21h...')

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis de ambiente não configuradas')
    }

    // Criar cliente Supabase com service role (admin)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Buscar todos os usuários
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) throw usersError

    console.log(`📊 Encontrados ${users.users.length} usuários`)

    let totalEmailsSent = 0
    let totalUsersWithAlerts = 0

    // 2. Para cada usuário, verificar alertas
    for (const authUser of users.users) {
      console.log(`\n👤 Processando usuário: ${authUser.email}`)

      // Buscar dados do usuário (nome)
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', authUser.id)
        .single()

      const userName = userData?.name || authUser.email?.split('@')[0] || 'Usuário'

      // Buscar propriedades do usuário
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', authUser.id)

      if (!properties || properties.length === 0) {
        console.log('  ⏭️ Sem propriedades')
        continue
      }

      const propertyIds = properties.map(p => p.id)
      console.log(`  📍 Propriedades: ${propertyIds.length}`)

      // Buscar todos os alertas críticos do usuário (vermelhos e amarelos)
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .in('property_id', propertyIds)
        .in('status', ['red', 'yellow'])

      if (!alerts || alerts.length === 0) {
        console.log('  ✅ Sem alertas críticos')
        continue
      }

      console.log(`  🚨 Alertas críticos: ${alerts.length}`)

      // Buscar máquinas para pegar informações
      const { data: machines } = await supabase
        .from('machines')
        .select('*')
        .in('property_id', propertyIds)

      const machinesMap = new Map(machines?.map(m => [m.id, m]) || [])

      // Buscar emails de notificação do usuário
      const { data: emailsData } = await supabase
        .from('notification_emails')
        .select('email')
        .eq('user_id', authUser.id)

      const notificationEmails = emailsData?.map(e => e.email) || []

      if (notificationEmails.length === 0) {
        console.log('  ⚠️ Sem emails de notificação configurados')
        continue
      }

      console.log(`  📧 Emails configurados: ${notificationEmails.length}`)

      // Preparar dados dos alertas para o email
      const alertsData: any[] = []

      for (const alert of alerts) {
        if (alert.type === 'tank') {
          alertsData.push({
            type: 'tank',
            status: alert.status,
            tankCurrentLiters: alert.tank_current_liters,
            tankCapacityLiters: alert.tank_capacity_liters,
            tankAlertLevelLiters: alert.tank_alert_level_liters,
          })
        } else if (alert.type === 'maintenance') {
          const machine = machinesMap.get(alert.machine_id)
          if (machine) {
            alertsData.push({
              type: 'maintenance',
              status: alert.status,
              machineName: `[${machine.type}] ${machine.model}`,
              machineType: machine.type,
              maintenanceItem: alert.maintenance_item,
              currentHourMeter: machine.current_hour_meter,
              nextRevisionHourMeter: alert.next_revision_hour_meter,
            })
          }
        }
      }

      if (alertsData.length === 0) continue

      // Gerar HTML do email
      const emailHtml = generateConsolidatedAlertsEmailHTML(userName, alertsData)

      const redCount = alertsData.filter(a => a.status === 'red').length
      const yellowCount = alertsData.filter(a => a.status === 'yellow').length
      const subject = `🚨 ${redCount > 0 ? `${redCount} URGENTE` : ''}${yellowCount > 0 ? ` ${yellowCount} Atenção` : ''} - Alertas de Manutenção`

      // Enviar para todos os emails configurados
      let emailsSentForUser = 0
      for (const email of notificationEmails) {
        const sent = await sendEmail(email, subject, emailHtml)
        if (sent) {
          emailsSentForUser++
          totalEmailsSent++
        }
      }

      if (emailsSentForUser > 0) {
        totalUsersWithAlerts++
        console.log(`  ✅ ${emailsSentForUser} email(s) enviado(s)`)
      }
    }

    console.log(`\n📊 ============================================`)
    console.log(`📊 RESUMO FINAL:`)
    console.log(`   Usuários processados: ${users.users.length}`)
    console.log(`   Usuários com alertas: ${totalUsersWithAlerts}`)
    console.log(`   Total de emails enviados: ${totalEmailsSent}`)
    console.log(`📊 ============================================`)

    return new Response(
      JSON.stringify({
        success: true,
        usersProcessed: users.users.length,
        usersWithAlerts: totalUsersWithAlerts,
        emailsSent: totalEmailsSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Erro fatal:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
