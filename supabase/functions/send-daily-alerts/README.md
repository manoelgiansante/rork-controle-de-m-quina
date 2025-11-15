# Send Daily Alerts - Edge Function com CRON

Esta Edge Function envia emails automáticos diariamente às 21h (horário de Brasília) para todos os usuários que possuem alertas críticos (vermelhos ou amarelos).

## 🎯 Como Funciona

1. **CRON roda automaticamente às 21h todo dia** (no servidor Supabase)
2. Busca **todos os usuários** do sistema
3. Para cada usuário:
   - Busca suas propriedades
   - Busca alertas vermelhos/amarelos
   - Busca emails de notificação configurados
   - Envia email consolidado se houver alertas
4. **Funciona independente do app estar aberto ou fechado**

## 📋 Pré-requisitos

- Supabase CLI instalado: `npm install -g supabase`
- RESEND_API_KEY configurada nas secrets (já está!)

## 🚀 Deploy da Função

### 1. Fazer login no Supabase

```bash
npx supabase login
```

### 2. Link com o projeto

```bash
npx supabase link --project-ref byfgflxlmcdc1upjpoaz
```

### 3. Deploy da função

```bash
npx supabase functions deploy send-daily-alerts
```

## ⏰ Configurar CRON (Automático às 21h)

Após o deploy, você precisa configurar o CRON no Supabase Dashboard:

### Opção 1: Via Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/byfgflxlmcdc1upjpoaz/functions
2. Clique em `send-daily-alerts`
3. Vá na aba **"Cron Jobs"** ou **"Invocations"**
4. Clique em **"Add Cron Job"** ou **"Schedule"**
5. Configure:
   - **Name:** Daily Alerts 21h
   - **Cron Expression:** `0 21 * * *` (Todo dia às 21h UTC)
   - **Timezone:** America/Sao_Paulo (Brasília)
   - Ou use: `0 0 * * *` (meia-noite UTC = 21h Brasília, considerando UTC-3)

### Opção 2: Via Supabase SQL (Alternativa)

Execute no SQL Editor do Supabase:

```sql
-- Criar extensão pg_cron se não existir
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar função para rodar às 21h Brasília (00:00 UTC = 21h UTC-3)
SELECT cron.schedule(
  'daily-alerts-21h',
  '0 0 * * *', -- Meia-noite UTC = 21h Brasília
  $$
  SELECT
    net.http_post(
      url:='https://byfgflxlmcdc1upjpoaz.supabase.co/functions/v1/send-daily-alerts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

### Verificar horário correto

**IMPORTANTE:** O Supabase usa UTC por padrão!

- **21h Brasília = 00:00 UTC** (Brasília é UTC-3)
- Então use: `0 0 * * *` no cron

Se quiser confirmar, use um conversor de timezone ou configure como:
- `0 21 * * *` se o Supabase permitir especificar timezone America/Sao_Paulo

## 🧪 Testar a Função Manualmente

Você pode testar antes de configurar o CRON:

```bash
# Via CLI
npx supabase functions invoke send-daily-alerts --no-verify-jwt

# Via curl
curl -X POST \
  'https://byfgflxlmcdc1upjpoaz.supabase.co/functions/v1/send-daily-alerts' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Ou no Dashboard:
1. Vá em Functions → send-daily-alerts
2. Clique em "Invoke"
3. Clique em "Run"

## 📊 Monitorar Logs

Depois que rodar (manualmente ou via CRON):

1. Acesse: https://supabase.com/dashboard/project/byfgflxlmcdc1upjpoaz/functions/send-daily-alerts/logs
2. Veja os logs de execução
3. Verifique se emails foram enviados

## ✅ Checklist de Implementação

- [ ] 1. Deploy da função (`supabase functions deploy`)
- [ ] 2. Testar manualmente no Dashboard
- [ ] 3. Verificar logs e confirmar que funciona
- [ ] 4. Configurar CRON para 21h Brasília
- [ ] 5. Esperar até amanhã às 21h e verificar se enviou
- [ ] 6. Monitorar logs no dia seguinte

## 🔧 Troubleshooting

### Emails não são enviados

1. Verifique se RESEND_API_KEY está configurada
2. Verifique se a função tem permissão de service_role
3. Veja os logs da função para erros
4. Confirme que usuários têm emails configurados em `notification_emails`

### CRON não está rodando

1. Verifique se o cron foi criado: `SELECT * FROM cron.job;` no SQL Editor
2. Confirme o horário UTC correto
3. Veja logs do cron: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Horário errado

- Lembre-se: Brasília é UTC-3
- 21h Brasília = 00:00 UTC (próximo dia)
- Ajuste o cron expression conforme necessário

## 📝 Notas

- A função roda com **service_role** (admin) para acessar dados de todos os usuários
- Apenas usuários com alertas críticos recebem emails
- Máximo de 1 email por dia por usuário (às 21h)
- Emails são consolidados (todos os alertas em um único email)
