-- ================================================
-- CONFIGURAR CRON PARA ENVIAR EMAILS ÀS 21H
-- ================================================
-- Execute este SQL no SQL Editor do Supabase

-- 1. Ativar extensão pg_cron (se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Ativar extensão http para fazer requests
CREATE EXTENSION IF NOT EXISTS http;

-- 3. Remover job antigo se existir
SELECT cron.unschedule('send-daily-alerts-21h');

-- 4. Criar novo CRON job para rodar TODO DIA às 21h (Brasília)
--
-- IMPORTANTE: Supabase usa UTC!
-- 21h Brasília = 00:00 UTC (meia-noite UTC do dia seguinte)
-- Brasília é UTC-3
--
SELECT cron.schedule(
  'send-daily-alerts-21h',           -- Nome do job
  '0 0 * * *',                       -- Todo dia à meia-noite UTC (21h Brasília)
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

-- 5. Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'send-daily-alerts-21h';

-- 6. Para ver o histórico de execuções (depois que rodar)
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-alerts-21h')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- ================================================
-- PRONTO!
-- ================================================
-- A função vai rodar automaticamente TODO DIA às 21h (horário de Brasília)
-- e enviar emails para todos os usuários que tiverem alertas críticos!
