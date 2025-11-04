-- =========================================
-- CORREÇÃO COMPLETA - SUPABASE DATABASE
-- Controle de Máquina
-- =========================================

-- 1. Adicionar coluna user_id à tabela properties (caso não exista)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Definir default para user_id (preenche automaticamente com o usuário logado)
ALTER TABLE properties 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Adicionar coluna type à tabela machines (caso não exista)
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Trator';

-- 3. Ativar Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- 4. Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "properties_sel" ON properties;
DROP POLICY IF EXISTS "properties_ins" ON properties;
DROP POLICY IF EXISTS "Users can manage own properties" ON properties;
DROP POLICY IF EXISTS "Users can manage own machines" ON machines;

-- 5. Criar policy para properties (permitir SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage own properties" 
ON properties
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Criar policy para machines (verifica se a property pertence ao usuário)
CREATE POLICY "Users can manage own machines" 
ON machines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
);

-- =========================================
-- FIM DAS CORREÇÕES
-- =========================================

-- Para verificar se as alterações foram aplicadas, execute:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name IN ('properties', 'machines');
