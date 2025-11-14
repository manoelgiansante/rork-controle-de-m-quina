-- ============================================
-- SCRIPT DE CORREÇÃO - POLÍTICAS RLS CRÍTICAS
-- ============================================
--
-- Data: 14 de novembro de 2025
-- Objetivo: Corrigir políticas de segurança (RLS) que faltam
--           nas tabelas alerts, farm_tanks e user_preferences
--
-- Status: 🔴 CRÍTICO - Essas políticas são essenciais
--         para que o app funcione corretamente
--
-- ============================================

-- ============================================
-- 1. POLÍTICAS PARA A TABELA: alerts
-- ============================================
-- Descrição: Permite que usuários vejam, criem, atualizem
--           e deletem alertas apenas das suas propriedades

-- Limpar políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON alerts;

-- Criar novas políticas
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = alerts.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own alerts" ON alerts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = alerts.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = alerts.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own alerts" ON alerts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = alerts.property_id
        AND properties.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. POLÍTICAS PARA A TABELA: farm_tanks
-- ============================================
-- Descrição: Permite que usuários vejam, criem, atualizem
--           e deletem tanques apenas das suas propriedades

-- Limpar políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own farm_tanks" ON farm_tanks;
DROP POLICY IF EXISTS "Users can insert own farm_tanks" ON farm_tanks;
DROP POLICY IF EXISTS "Users can update own farm_tanks" ON farm_tanks;
DROP POLICY IF EXISTS "Users can delete own farm_tanks" ON farm_tanks;

-- Criar novas políticas
CREATE POLICY "Users can view own farm_tanks" ON farm_tanks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = farm_tanks.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own farm_tanks" ON farm_tanks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = farm_tanks.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own farm_tanks" ON farm_tanks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = farm_tanks.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own farm_tanks" ON farm_tanks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = farm_tanks.property_id
        AND properties.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. POLÍTICAS PARA A TABELA: user_preferences
-- ============================================
-- Descrição: Permite que usuários vejam, criem, atualizem
--           e deletem apenas suas próprias preferências

-- Limpar políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

-- Criar novas políticas
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. ADICIONAR POLÍTICA DE DELETE PARA: maintenances
-- ============================================
-- Descrição: Permite que usuários deletem manutenções
--           das suas propriedades

-- Limpar política existente (se houver)
DROP POLICY IF EXISTS "Users can delete own maintenances" ON maintenances;

-- Criar nova política
CREATE POLICY "Users can delete own maintenances" ON maintenances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = maintenances.property_id
        AND properties.user_id = auth.uid()
    )
  );

-- ============================================
-- ✅ VERIFICAÇÃO FINAL
-- ============================================

-- Verificar políticas criadas para alerts
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'alerts'
ORDER BY policyname;

-- Verificar políticas criadas para farm_tanks
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'farm_tanks'
ORDER BY policyname;

-- Verificar políticas criadas para user_preferences
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_preferences'
ORDER BY policyname;

-- Verificar políticas criadas para maintenances
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'maintenances'
ORDER BY policyname;

-- ============================================
-- 📝 NOTAS IMPORTANTES
-- ============================================
--
-- 1. Este script pode ser executado múltiplas vezes sem problemas
--    (DROP POLICY IF EXISTS garante isso)
--
-- 2. As políticas usam auth.uid() que é fornecida automaticamente
--    pelo Supabase quando um usuário está logado
--
-- 3. EXISTS é usado para verificar se o usuário é dono da propriedade
--    antes de permitir acesso aos dados relacionados
--
-- 4. Essas políticas seguem o princípio de "least privilege"
--    (mínimo privilégio necessário)
--
-- ============================================
