-- Função para deletar todos os dados de um usuário
-- Execute este SQL no Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleta refueling records
  DELETE FROM refueling WHERE user_id = user_id_to_delete;
  
  -- Deleta maintenance records
  DELETE FROM maintenance WHERE user_id = user_id_to_delete;
  
  -- Deleta machines
  DELETE FROM machines WHERE user_id = user_id_to_delete;
  
  -- Deleta properties
  DELETE FROM properties WHERE user_id = user_id_to_delete;
  
  -- Deleta subscription
  DELETE FROM subscriptions WHERE user_id = user_id_to_delete;
  
  -- Deleta profile
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  RAISE NOTICE 'Usuário % e todos os seus dados foram deletados com sucesso', user_id_to_delete;
END;
$$;

-- Permite que usuários autenticados chamem esta função para deletar sua própria conta
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
