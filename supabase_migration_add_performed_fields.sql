-- Migration: Adicionar campos "Abastecido por" e "Feito por"
-- Data: 2025-01-11
-- Descrição: Adiciona colunas para rastrear quem realizou abastecimentos e manutenções

-- Adicionar coluna "refueled_by" na tabela refuelings
ALTER TABLE refuelings
ADD COLUMN IF NOT EXISTS refueled_by TEXT NOT NULL DEFAULT '';

-- Adicionar coluna "performed_by" na tabela maintenances
ALTER TABLE maintenances
ADD COLUMN IF NOT EXISTS performed_by TEXT NOT NULL DEFAULT '';

-- Comentários para documentação
COMMENT ON COLUMN refuelings.refueled_by IS 'Nome da pessoa que realizou o abastecimento';
COMMENT ON COLUMN maintenances.performed_by IS 'Nome da pessoa que realizou a manutenção';
