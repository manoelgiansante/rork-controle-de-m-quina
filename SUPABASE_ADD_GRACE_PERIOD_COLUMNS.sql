-- =====================================================
-- SQL PARA ADICIONAR COLUNAS DE PERÍODO DE GRAÇA
-- =====================================================
-- 
-- ONDE EXECUTAR: Supabase SQL Editor
-- QUANDO: Antes de fazer deploy das correções dos bugs
--
-- Este SQL adiciona 3 novas colunas na tabela subscriptions
-- para suportar período de graça no cancelamento:
--
-- 1. cancel_at_period_end - Indica se assinatura será cancelada no fim do período
-- 2. current_period_end - Data de término do período atual
-- 3. canceled_at - Data em que o cancelamento foi solicitado
--
-- =====================================================

-- Adiciona coluna cancel_at_period_end (se não existir)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Adiciona coluna current_period_end (se não existir)
-- Já existe como current_period_end, então não precisa adicionar

-- Adiciona coluna canceled_at (se não existir)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Adiciona comentários nas colunas
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Indica se a assinatura será cancelada no final do período atual (período de graça)';
COMMENT ON COLUMN subscriptions.canceled_at IS 'Data e hora em que o usuário solicitou o cancelamento';

-- =====================================================
-- VERIFICAÇÃO: Execute este SELECT para confirmar
-- =====================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name IN ('cancel_at_period_end', 'current_period_end', 'canceled_at')
ORDER BY column_name;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
--
-- column_name            | data_type                   | is_nullable | column_default
-- -----------------------|-----------------------------|--------------|-----------------
-- cancel_at_period_end   | boolean                     | YES         | false
-- canceled_at            | timestamp with time zone    | YES         | NULL
-- current_period_end     | timestamp with time zone    | YES         | NULL
--
-- =====================================================
