-- ==========================================
-- CORREÇÃO URGENTE - PROFILES E SUBSCRIPTIONS
-- ==========================================
-- Este script cria a tabela profiles, trigger automático
-- e popula os perfis para usuários existentes
-- Execute no SQL Editor do Supabase
-- ==========================================

-- ==========================================
-- 1. CRIAR TABELA PROFILES (se não existir)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. ATIVAR ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. CRIAR POLICIES PARA PROFILES
-- ==========================================

-- Drop policies se já existirem
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Usuários podem criar seu próprio perfil
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ==========================================
-- 4. CRIAR FUNÇÃO E TRIGGER PARA AUTO-CRIAR PROFILE
-- ==========================================

-- Remover função e trigger se já existirem
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar função que será executada quando um novo usuário for criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Usuário'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa a função acima
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. CRIAR PROFILES PARA USUÁRIOS EXISTENTES
-- ==========================================

-- Inserir perfis para todos os usuários que ainda não têm perfil
INSERT INTO public.profiles (id, full_name, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.email, 'Usuário') as full_name,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ==========================================
-- 6. VERIFICAR TABELA SUBSCRIPTIONS
-- ==========================================

-- Criar tabela subscriptions se não existir
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan_type TEXT,
  billing_cycle TEXT,
  machine_limit INTEGER DEFAULT 0,
  status TEXT DEFAULT 'inactive',
  trial_active BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==========================================
-- 7. ATIVAR ROW LEVEL SECURITY PARA SUBSCRIPTIONS
-- ==========================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. CRIAR POLICIES PARA SUBSCRIPTIONS
-- ==========================================

-- Drop policies se já existirem
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Usuários podem ver sua própria assinatura
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar sua própria assinatura
CREATE POLICY "Users can insert own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar sua própria assinatura
CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 9. CRIAR ÍNDICE PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- ==========================================
-- 10. CRIAR TRIGGER PARA AUTO-ATUALIZAR updated_at
-- ==========================================

-- Criar função se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers se já existirem
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;

-- Criar triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ✅ VERIFICAÇÃO FINAL
-- ==========================================

-- Contar quantos usuários existem
SELECT COUNT(*) as total_usuarios FROM auth.users;

-- Contar quantos perfis foram criados
SELECT COUNT(*) as total_perfis FROM public.profiles;

-- Listar usuários com seus perfis
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.created_at as profile_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- ==========================================
-- SETUP COMPLETO! ✅
-- ==========================================
-- Após executar este script:
-- 1. Todos os usuários existentes terão perfis criados
-- 2. Novos usuários terão perfis criados automaticamente
-- 3. A tabela subscriptions está pronta para uso
-- 4. O webhook do Stripe poderá salvar assinaturas
-- ==========================================
