-- ═══════════════════════════════════════════════════════════════
-- CORREÇÃO URGENTE - POLÍTICAS RLS DA TABELA PROPERTIES
-- ═══════════════════════════════════════════════════════════════
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PARTE 1: DIAGNÓSTICO - Verificar estado atual
-- ═══════════════════════════════════════════════════════════════

-- 1.1. Verificar se RLS está ativado
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ATIVO'
    ELSE '❌ RLS DESATIVADO'
  END as status_rls
FROM pg_tables 
WHERE tablename = 'properties' 
AND schemaname = 'public';

-- 1.2. Verificar políticas existentes
SELECT 
  policyname,
  cmd AS operacao,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Permissiva'
    ELSE '❌ Restritiva'
  END as tipo,
  roles AS papeis
FROM pg_policies 
WHERE tablename = 'properties'
ORDER BY cmd, policyname;

-- 1.3. Verificar ID do usuário atual (auth.uid())
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NENHUM USUÁRIO AUTENTICADO!'
    ELSE '✅ Usuário autenticado'
  END as status_auth;

-- ═══════════════════════════════════════════════════════════════
-- PARTE 2: CORREÇÃO - Recriar todas as políticas de properties
-- ═══════════════════════════════════════════════════════════════

-- 2.1. Deletar todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
DROP POLICY IF EXISTS "Users can update own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON properties;

-- 2.2. Garantir que RLS está ativado
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 2.3. Criar política de SELECT (visualizar)
CREATE POLICY "Users can view own properties"
ON properties FOR SELECT
USING (auth.uid() = user_id);

-- 2.4. Criar política de INSERT (criar) - IMPORTANTE!
CREATE POLICY "Users can insert own properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2.5. Criar política de UPDATE (atualizar)
CREATE POLICY "Users can update own properties"
ON properties FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2.6. Criar política de DELETE (deletar)
CREATE POLICY "Users can delete own properties"
ON properties FOR DELETE
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- PARTE 3: VERIFICAÇÃO - Confirmar que as políticas foram criadas
-- ═══════════════════════════════════════════════════════════════

-- 3.1. Listar todas as políticas criadas
SELECT 
  policyname,
  cmd AS operacao,
  permissive AS tipo,
  roles AS papeis
FROM pg_policies 
WHERE tablename = 'properties'
ORDER BY cmd, policyname;

-- 3.2. Contar as políticas (deve retornar 4)
SELECT 
  COUNT(*) as total_policies,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ TODAS AS 4 POLÍTICAS CRIADAS!'
    ELSE '⚠️ Faltam políticas! Devem ser 4.'
  END as status
FROM pg_policies 
WHERE tablename = 'properties';

-- ═══════════════════════════════════════════════════════════════
-- PARTE 4: TESTE REAL - Testar inserção de propriedade
-- ═══════════════════════════════════════════════════════════════

-- 4.1. Verificar propriedades existentes do usuário
SELECT 
  id,
  name,
  user_id,
  created_at
FROM properties
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 4.2. Teste de inserção (DESCOMENTE PARA TESTAR)
/*
INSERT INTO properties (user_id, name) 
VALUES (auth.uid(), 'Teste de Propriedade - ' || NOW()::TEXT)
RETURNING id, name, user_id, created_at;
*/

-- ═══════════════════════════════════════════════════════════════
-- INSTRUÇÕES DE USO:
-- ═══════════════════════════════════════════════════════════════
--
-- 1. Copie TODO este script
-- 2. Vá para o Supabase Dashboard
-- 3. Clique em "SQL Editor" no menu lateral
-- 4. Cole o conteúdo completo
-- 5. Clique em "Run" (ou Ctrl+Enter)
-- 6. Veja os resultados:
--    - PARTE 1: Mostra o estado atual
--    - PARTE 2: Recria todas as políticas (automático)
--    - PARTE 3: Confirma que as políticas foram criadas
--    - PARTE 4: Lista suas propriedades
-- 7. Se a PARTE 3 mostrar "✅ TODAS AS 4 POLÍTICAS CRIADAS!", 
--    o problema está resolvido!
-- 8. Volte na aplicação e tente criar uma propriedade novamente
--
-- ⚠️ NOTA: A PARTE 4.2 (teste de inserção) está comentada.
-- Só descomente se quiser fazer um teste manual de inserção.
--
-- ═══════════════════════════════════════════════════════════════

-- FIM DO SCRIPT ✅
