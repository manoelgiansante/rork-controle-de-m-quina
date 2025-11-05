-- ═══════════════════════════════════════════════════════════════
-- DIAGNÓSTICO E CORREÇÃO - BOTÃO DE EXCLUIR ABASTECIMENTO
-- ═══════════════════════════════════════════════════════════════
-- Execute este script completo no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PARTE 1: VERIFICAR POLÍTICAS RLS ATUAIS
-- ═══════════════════════════════════════════════════════════════

-- 1.1. Verificar se a política de DELETE existe para refuelings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'refuelings' 
AND policyname = 'Users can delete own refuelings';

-- 1.2. Verificar TODAS as políticas da tabela refuelings
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'refuelings'
ORDER BY cmd, policyname;

-- 1.3. Verificar se RLS está ativado na tabela refuelings
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'refuelings' 
AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════
-- PARTE 2: VERIFICAR ESTRUTURA DA TABELA
-- ═══════════════════════════════════════════════════════════════

-- 2.1. Verificar colunas da tabela refuelings
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'refuelings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2.2. Verificar chaves estrangeiras
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='refuelings';

-- ═══════════════════════════════════════════════════════════════
-- PARTE 3: TESTE DE PERMISSÕES (LEIA OS RESULTADOS ABAIXO!)
-- ═══════════════════════════════════════════════════════════════

-- 3.1. Verificar ID do usuário atual
SELECT auth.uid() as current_user_id;

-- 3.2. Verificar se o usuário pode VER refuelings
-- (Se retornar registros, SELECT funciona)
SELECT 
  r.id,
  r.property_id,
  p.user_id,
  p.name as property_name
FROM refuelings r
JOIN properties p ON p.id = r.property_id
WHERE p.user_id = auth.uid()
LIMIT 5;

-- 3.3. Testar permissão de DELETE com uma consulta simulada
-- ATENÇÃO: ISTO NÃO DELETA NADA, APENAS TESTA SE PODE!
DO $$
DECLARE
  test_refueling_id UUID;
  can_delete BOOLEAN := false;
BEGIN
  -- Pegar um refueling qualquer do usuário
  SELECT r.id INTO test_refueling_id
  FROM refuelings r
  JOIN properties p ON p.id = r.property_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF test_refueling_id IS NOT NULL THEN
    -- Tentar verificar se a política permite delete
    -- Isto não deleta, apenas testa a condição da política
    SELECT EXISTS (
      SELECT 1 FROM refuelings r
      WHERE r.id = test_refueling_id
      AND EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = r.property_id
        AND properties.user_id = auth.uid()
      )
    ) INTO can_delete;
    
    RAISE NOTICE 'Teste de DELETE: Refueling ID: %, Pode deletar: %', test_refueling_id, can_delete;
  ELSE
    RAISE NOTICE 'Nenhum refueling encontrado para testar';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PARTE 4: CORREÇÃO AUTOMÁTICA (SE NECESSÁRIO)
-- ═══════════════════════════════════════════════════════════════

-- 4.1. Recriar a política de DELETE se ela não existir ou estiver incorreta
-- ATENÇÃO: Isto vai DROPAR e RECRIAR a política

-- Primeiro, dropar se existir
DROP POLICY IF EXISTS "Users can delete own refuelings" ON refuelings;

-- Depois, criar novamente
CREATE POLICY "Users can delete own refuelings"
ON refuelings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = refuelings.property_id
    AND properties.user_id = auth.uid()
  )
);

-- 4.2. Verificar se foi criada corretamente
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'refuelings' 
AND policyname = 'Users can delete own refuelings';

-- ═══════════════════════════════════════════════════════════════
-- PARTE 5: TESTE REAL DE DELETE (CUIDADO!)
-- ═══════════════════════════════════════════════════════════════

-- ATENÇÃO: DESCOMENTE APENAS SE QUISER FAZER UM TESTE REAL
-- ESTE COMANDO VAI REALMENTE DELETAR UM REGISTRO!

/*
-- 5.1. Criar um refueling de teste e depois deletar
DO $$
DECLARE
  test_property_id UUID;
  test_machine_id UUID;
  test_refueling_id UUID;
BEGIN
  -- Pegar uma propriedade e máquina do usuário
  SELECT id INTO test_property_id
  FROM properties
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF test_property_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma propriedade encontrada para o usuário';
  END IF;

  SELECT id INTO test_machine_id
  FROM machines
  WHERE property_id = test_property_id
  LIMIT 1;

  IF test_machine_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma máquina encontrada na propriedade';
  END IF;

  -- Inserir um refueling de teste
  INSERT INTO refuelings (
    property_id,
    machine_id,
    date,
    liters,
    hour_meter,
    user_id,
    user_name
  ) VALUES (
    test_property_id,
    test_machine_id,
    NOW()::TEXT,
    1,
    1,
    auth.uid()::TEXT,
    'TESTE'
  ) RETURNING id INTO test_refueling_id;

  RAISE NOTICE 'Refueling de teste criado: %', test_refueling_id;

  -- Tentar deletar
  DELETE FROM refuelings WHERE id = test_refueling_id;

  RAISE NOTICE 'Refueling de teste deletado com sucesso!';
  
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao deletar: %', SQLERRM;
END $$;
*/

-- ═══════════════════════════════════════════════════════════════
-- PARTE 6: VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════

-- 6.1. Listar todas as políticas finais da tabela refuelings
SELECT 
  policyname,
  cmd AS operacao,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Permissiva'
    ELSE '❌ Restritiva'
  END as tipo,
  roles AS papeis
FROM pg_policies 
WHERE tablename = 'refuelings'
ORDER BY cmd, policyname;

-- 6.2. Verificar se RLS está ativo
SELECT 
  CASE 
    WHEN rowsecurity THEN '✅ RLS ATIVO'
    ELSE '❌ RLS DESATIVADO'
  END as status_rls
FROM pg_tables 
WHERE tablename = 'refuelings' 
AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════
-- INSTRUÇÕES DE USO:
-- ═══════════════════════════════════════════════════════════════
--
-- 1. Copie TODO este arquivo
-- 2. Vá para o Supabase → SQL Editor
-- 3. Cole o conteúdo completo
-- 4. Execute clicando em "Run"
-- 5. Leia os resultados de cada seção
-- 6. Se a PARTE 4 foi executada, a política foi recriada
-- 7. Teste na aplicação se o botão de excluir funciona agora
--
-- ATENÇÃO: A PARTE 5 está comentada. Só descomente se quiser
-- fazer um teste REAL de deletar um registro.
--
-- ═══════════════════════════════════════════════════════════════

-- FIM DO SCRIPT
