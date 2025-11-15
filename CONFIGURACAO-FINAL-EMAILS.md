# ✅ CONFIGURAÇÃO FINAL - Emails Automáticos às 21h

## 🎯 O QUE FOI FEITO:

1. ✅ **Edge Function Criada**: `send-daily-alerts`
   - Calcula alertas dinamicamente (não depende de tabela alerts)
   - Busca manutenções e máquinas do banco
   - Calcula status vermelho/amarelo baseado no horímetro
   - Envia emails consolidados

2. ✅ **Deploy Realizado**: Função deployada no Supabase

3. ✅ **Correções Implementadas**:
   - `useNotifications.ts` agora carrega emails do Supabase
   - Arquivamento de máquinas funcionando corretamente
   - Tutorial atualizado com todas as funcionalidades

## 📋 ÚLTIMO PASSO (VOCÊ PRECISA FAZER):

### Configurar CRON para Rodar Automaticamente às 21h

**1. Abra o SQL Editor do Supabase:**
   - Vá em: https://supabase.com/dashboard/project/byfgflxlmcdciupjpoaz
   - Clique em "SQL Editor" no menu lateral esquerdo
   - Clique em "New query"

**2. Cole TODO o conteúdo do arquivo `setup-cron.sql` e clique em RUN**

O arquivo está em: `/Users/manoelnascimento/Documents/controle/setup-cron.sql`

Ou copie daqui:

```sql
-- Ativar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Remover job antigo se existir
SELECT cron.unschedule('send-daily-alerts-21h');

-- Criar CRON job para rodar TODO DIA às 21h Brasília (00:00 UTC)
SELECT cron.schedule(
  'send-daily-alerts-21h',
  '0 0 * * *',
  $$
  SELECT
    http_post(
      url := 'https://byfgflxlmcdciupjpoaz.supabase.co/functions/v1/send-daily-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Verificar se criou
SELECT * FROM cron.job WHERE jobname = 'send-daily-alerts-21h';
```

**3. Verificar se funcionou:**

Após rodar o SQL, você deve ver uma linha retornada com:
- **jobname**: send-daily-alerts-21h
- **schedule**: 0 0 * * *
- **active**: true

## 🧪 TESTAR AGORA (OPCIONAL):

Para testar se funciona SEM esperar até às 21h:

**Opção A - Via Dashboard:**
1. Vá em: https://supabase.com/dashboard/project/byfgflxlmcdciupjpoaz/functions/send-daily-alerts
2. Clique em "Test"
3. Clique em "Send Request"
4. Vá na aba "Logs" para ver o resultado

**Opção B - Via SQL:**
Execute no SQL Editor:
```sql
SELECT
  http_post(
    url := 'https://byfgflxlmcdciupjpoaz.supabase.co/functions/v1/send-daily-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
```

## 📊 COMO FUNCIONA:

### Todos os Dias às 21h (Brasília):

1. **CRON roda automaticamente** no servidor Supabase
2. **Busca todos os usuários** do sistema
3. **Para cada usuário:**
   - Busca suas propriedades
   - Busca máquinas (não arquivadas)
   - Busca última manutenção de cada máquina
   - **CALCULA dinamicamente** quais alertas estão vermelhos/amarelos:
     - **Vermelho**: Manutenção vencida ou faltam ≤ 20h
     - **Amarelo**: Faltam entre 20-50h
   - Busca tanque de combustível
   - **CALCULA** se tanque está baixo:
     - **Vermelho**: Abaixo do nível de alerta
     - **Amarelo**: Até 10% acima do nível de alerta
   - Se houver alertas críticos:
     - Busca emails configurados em `notification_emails`
     - Envia email consolidado com TODOS os alertas

4. **Email enviado** automaticamente via Resend

## ✅ CHECKLIST FINAL:

- [x] Edge Function deployada
- [x] Função calcula alertas dinamicamente
- [x] useNotifications carrega emails do Supabase
- [x] Arquivamento de máquinas corrigido
- [x] Tutorial atualizado
- [ ] **CRON configurado (VOCÊ PRECISA FAZER!)**

## 🎉 DEPOIS DE CONFIGURAR O CRON:

### O que vai acontecer:

- ✅ **TODO DIA às 21h (horário de Brasília)**
- ✅ Funciona **MESMO COM O APP FECHADO**
- ✅ Processa **TODOS os usuários** automaticamente
- ✅ Envia emails **APENAS** para quem tem alertas críticos
- ✅ **Máximo 1 email por dia** por usuário

### Como verificar amanhã às 21h:

1. Veja se recebeu o email (verifique spam também)
2. Ou veja os logs da função:
   - https://supabase.com/dashboard/project/byfgflxlmcdciupjpoaz/functions/send-daily-alerts/logs
3. Ou execute no SQL:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-alerts-21h')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

## 🔧 TROUBLESHOOTING:

### Se não receber email:

1. **Verifique se tem alertas críticos** (vermelhos/amarelos) no app
2. **Verifique se cadastrou email** em Configurações → Notificações
3. **Verifique spam** da caixa de email
4. **Veja os logs** da função no Dashboard
5. **Execute teste manual** conforme acima

### Se o CRON não rodar:

1. Execute: `SELECT * FROM cron.job WHERE jobname = 'send-daily-alerts-21h'`
   - Se não retornar nada: rode o setup-cron.sql novamente
   - Se mostrar `active: false`: ative manualmente

2. Verifique extensões:
   ```sql
   SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'http');
   ```

## 📞 SUPORTE:

Se tiver qualquer problema, verifique:
1. Logs da função no Dashboard
2. Histórico do CRON (SQL acima)
3. Se RESEND_API_KEY está configurada nos Secrets

---

**PRONTO! Depois de rodar o SQL do CRON, está 100% configurado!** 🎉
