-- ============================================
-- CRIAR TABELA DE HISTÓRICO DE ADIÇÕES DO TANQUE
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. CRIAR A TABELA (se não existir)
CREATE TABLE IF NOT EXISTS farm_tank_additions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    liters_added DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

-- 2. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_farm_tank_additions_property
    ON farm_tank_additions(property_id);

CREATE INDEX IF NOT EXISTS idx_farm_tank_additions_timestamp
    ON farm_tank_additions(timestamp DESC);

-- 3. HABILITAR RLS (Row Level Security)
ALTER TABLE farm_tank_additions ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS DE SEGURANÇA

-- Policy: Usuários podem ver apenas adições de suas próprias propriedades
DROP POLICY IF EXISTS "Users can view their own tank additions" ON farm_tank_additions;
CREATE POLICY "Users can view their own tank additions"
    ON farm_tank_additions FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties WHERE user_id = auth.uid()
        )
    );

-- Policy: Usuários podem inserir adições apenas em suas próprias propriedades
DROP POLICY IF EXISTS "Users can insert tank additions to their properties" ON farm_tank_additions;
CREATE POLICY "Users can insert tank additions to their properties"
    ON farm_tank_additions FOR INSERT
    WITH CHECK (
        property_id IN (
            SELECT id FROM properties WHERE user_id = auth.uid()
        )
    );

-- Policy: Usuários podem deletar adições apenas de suas próprias propriedades
DROP POLICY IF EXISTS "Users can delete their own tank additions" ON farm_tank_additions;
CREATE POLICY "Users can delete their own tank additions"
    ON farm_tank_additions FOR DELETE
    USING (
        property_id IN (
            SELECT id FROM properties WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- VERIFICAR SE A TABELA FOI CRIADA
-- ============================================
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'farm_tank_additions'
ORDER BY ordinal_position;

-- ============================================
-- TESTAR INSERÇÃO (OPCIONAL)
-- ============================================
-- Descomente as linhas abaixo para testar:
-- INSERT INTO farm_tank_additions (property_id, liters_added, reason)
-- VALUES (
--     (SELECT id FROM properties WHERE user_id = auth.uid() LIMIT 1),
--     100,
--     'Teste de adição'
-- );

-- SELECT * FROM farm_tank_additions ORDER BY timestamp DESC LIMIT 10;
