-- ================================================
-- FIX para permitir INSERT em properties no web
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- 1. Adicionar default para user_id (preenche automaticamente com auth.uid())
ALTER TABLE public.properties 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Garantir que RLS está habilitado
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas (se existirem) e recriar
DROP POLICY IF EXISTS properties_sel ON public.properties;
DROP POLICY IF EXISTS properties_ins ON public.properties;
DROP POLICY IF EXISTS properties_upd ON public.properties;
DROP POLICY IF EXISTS properties_del ON public.properties;

DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- 4. Criar policies corretas
-- SELECT: usuário vê suas próprias propriedades
CREATE POLICY properties_select ON public.properties
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: usuário pode inserir com seu próprio user_id
CREATE POLICY properties_insert ON public.properties
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: usuário pode atualizar suas próprias propriedades
CREATE POLICY properties_update ON public.properties
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE: usuário pode deletar suas próprias propriedades
CREATE POLICY properties_delete ON public.properties
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. Verificar se as policies foram criadas corretamente
-- Você pode ver as policies no Supabase Dashboard em:
-- Database → Tables → properties → Policies
