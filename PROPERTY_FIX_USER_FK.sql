-- Correção da Foreign Key da tabela properties
-- O problema: properties_user_id_fkey está apontando para uma tabela users que não existe
-- A solução: Remover a FK antiga e criar uma nova apontando para auth.users

-- 1. Remover a foreign key antiga
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_user_id_fkey;

-- 2. Adicionar a foreign key correta apontando para auth.users
ALTER TABLE public.properties 
ADD CONSTRAINT properties_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. Adicionar default para user_id (preencher automaticamente com auth.uid())
ALTER TABLE public.properties 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4. Habilitar RLS (se ainda não estiver)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 5. Recriar policies (garantir que estão corretas)
DROP POLICY IF EXISTS properties_sel ON public.properties;
CREATE POLICY properties_sel ON public.properties 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS properties_ins ON public.properties;
CREATE POLICY properties_ins ON public.properties 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS properties_upd ON public.properties;
CREATE POLICY properties_upd ON public.properties 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS properties_del ON public.properties;
CREATE POLICY properties_del ON public.properties 
  FOR DELETE USING (auth.uid() = user_id);
