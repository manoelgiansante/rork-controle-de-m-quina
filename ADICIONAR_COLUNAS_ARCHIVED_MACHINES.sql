-- ============================================
-- ADICIONAR COLUNAS DE ARQUIVAMENTO NA TABELA MACHINES
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. ADICIONAR COLUNA archived (BOOLEAN, padrão FALSE)
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- 2. ADICIONAR COLUNA archivedAt (TIMESTAMPTZ, pode ser NULL)
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3. CRIAR ÍNDICE para melhorar performance nas consultas de máquinas arquivadas
CREATE INDEX IF NOT EXISTS idx_machines_archived
    ON machines(archived);

-- ============================================
-- VERIFICAR SE AS COLUNAS FORAM CRIADAS
-- ============================================
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'machines'
    AND column_name IN ('archived', 'archived_at')
ORDER BY column_name;

-- ============================================
-- TESTAR (OPCIONAL)
-- ============================================
-- Descomente para testar:
-- SELECT id, model, archived, archived_at FROM machines LIMIT 5;
