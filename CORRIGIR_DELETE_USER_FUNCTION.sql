-- ============================================
-- SCRIPT DE CORREÇÃO - FUNÇÃO DELETE_USER_ACCOUNT
-- ============================================
--
-- Data: 14 de novembro de 2025
-- Objetivo: Corrigir a função que deleta a conta do usuário
--           e todos os seus dados relacionados
--
-- Status: 🔴 CRÍTICO - A função atual tem erros graves
--         (nome de tabela errado, tabelas faltando)
--
-- ============================================

-- ============================================
-- 1. REMOVER FUNÇÃO ANTIGA (se existir)
-- ============================================

DROP FUNCTION IF EXISTS delete_user_account();

-- ============================================
-- 2. CRIAR FUNÇÃO CORRIGIDA
-- ============================================
--
-- Descrição: Esta função deleta a conta do usuário logado
--            e TODOS os dados relacionados em cascata
--
-- Segurança: SECURITY DEFINER permite que a função execute
--            com privilégios elevados para deletar dados
--
-- Importante: A ordem dos DELETEs respeita as foreign keys
--             para evitar erros de integridade referencial
--
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_to_delete UUID := auth.uid();
BEGIN
  -- ============================================
  -- VALIDAÇÃO: Verificar se o usuário está logado
  -- ============================================
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Usuário não está logado';
  END IF;

  RAISE NOTICE 'Iniciando deleção da conta do usuário: %', user_id_to_delete;

  -- ============================================
  -- DELETAR DADOS RELACIONADOS ÀS PROPRIEDADES
  -- ============================================
  -- A ordem é importante para respeitar as foreign keys

  -- 1. Deletar alertas das propriedades do usuário
  DELETE FROM public.alerts
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE user_id = user_id_to_delete
  );
  RAISE NOTICE 'Alertas deletados';

  -- 2. Deletar manutenções das propriedades do usuário
  DELETE FROM public.maintenances
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE user_id = user_id_to_delete
  );
  RAISE NOTICE 'Manutenções deletadas';

  -- 3. Deletar abastecimentos das propriedades do usuário
  -- ⚠️ CORREÇÃO: nome correto é "refuelings", não "refueling"
  DELETE FROM public.refuelings
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE user_id = user_id_to_delete
  );
  RAISE NOTICE 'Abastecimentos deletados';

  -- 4. Deletar máquinas das propriedades do usuário
  DELETE FROM public.machines
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE user_id = user_id_to_delete
  );
  RAISE NOTICE 'Máquinas deletadas';

  -- 5. Deletar tanques das propriedades do usuário
  -- ⚠️ ADIÇÃO: esta tabela estava faltando
  DELETE FROM public.farm_tanks
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE user_id = user_id_to_delete
  );
  RAISE NOTICE 'Tanques deletados';

  -- 6. Deletar as propriedades do usuário
  DELETE FROM public.properties
  WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Propriedades deletadas';

  -- ============================================
  -- DELETAR DADOS DIRETOS DO USUÁRIO
  -- ============================================

  -- 7. Deletar preferências do usuário
  DELETE FROM public.user_preferences
  WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Preferências deletadas';

  -- 8. Deletar assinaturas do usuário
  DELETE FROM public.subscriptions
  WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Assinaturas deletadas';

  -- 9. Deletar perfil do usuário
  DELETE FROM public.profiles
  WHERE id = user_id_to_delete;
  RAISE NOTICE 'Perfil deletado';

  -- ============================================
  -- DELETAR CONTA DE AUTENTICAÇÃO
  -- ============================================
  -- Último passo: deletar o usuário da tabela auth.users
  -- Isso remove o login e desvincula todos os tokens

  DELETE FROM auth.users
  WHERE id = user_id_to_delete;
  RAISE NOTICE 'Conta de autenticação deletada';

  -- ============================================
  -- SUCESSO
  -- ============================================
  RAISE NOTICE '✅ Usuário % e todos os seus dados foram deletados com sucesso', user_id_to_delete;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, fazer rollback e mostrar mensagem
    RAISE EXCEPTION 'Erro ao deletar conta: %', SQLERRM;
END;
$$;

-- ============================================
-- 3. COMENTAR A FUNÇÃO
-- ============================================

COMMENT ON FUNCTION delete_user_account() IS
'Deleta a conta do usuário logado e todos os seus dados relacionados.
Inclui: alertas, manutenções, abastecimentos, máquinas, tanques,
propriedades, preferências, assinaturas, perfil e conta de autenticação.
A ordem de deleção respeita as foreign keys para evitar erros.';

-- ============================================
-- ✅ VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se a função foi criada corretamente
SELECT
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'delete_user_account';

-- ============================================
-- 📝 COMO USAR
-- ============================================
--
-- Para deletar a conta do usuário logado, execute:
--
--   SELECT delete_user_account();
--
-- A função vai:
-- 1. Verificar se há um usuário logado (auth.uid())
-- 2. Deletar todos os dados relacionados
-- 3. Deletar a conta de autenticação
-- 4. Retornar sucesso ou erro
--
-- ⚠️ IMPORTANTE: Esta operação é IRREVERSÍVEL!
--
-- ============================================

-- ============================================
-- 🔒 SEGURANÇA
-- ============================================
--
-- SECURITY DEFINER: A função executa com privilégios do
--                   criador (geralmente admin), não do usuário
--
-- Por que isso é seguro?
-- - A função usa auth.uid() para identificar o usuário
-- - Só deleta dados do usuário logado
-- - Não aceita parâmetros externos
-- - Impede que usuários deletem dados de outros usuários
--
-- ============================================
