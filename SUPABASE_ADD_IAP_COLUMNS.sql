-- ==================================================
-- ADD IAP COLUMNS TO SUBSCRIPTIONS TABLE
-- ==================================================
-- Este script adiciona colunas necessárias para suportar
-- In-App Purchases (IAP) da Apple e Google Play
-- ==================================================

-- Adicionar coluna para identificar o provider de pagamento
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'apple', 'google'));

-- Adicionar colunas para Apple IAP
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS apple_product_id TEXT;

-- Adicionar colunas para Google Play IAP
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS google_purchase_token TEXT,
ADD COLUMN IF NOT EXISTS google_product_id TEXT;

-- Adicionar coluna para armazenar quando a assinatura deve ser cancelada
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_provider ON public.subscriptions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_apple_transaction_id ON public.subscriptions(apple_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_google_purchase_token ON public.subscriptions(google_purchase_token);

-- Comentários para documentação
COMMENT ON COLUMN public.subscriptions.payment_provider IS 'Provedor de pagamento: stripe, apple ou google';
COMMENT ON COLUMN public.subscriptions.apple_transaction_id IS 'ID da transação da Apple (para IAP)';
COMMENT ON COLUMN public.subscriptions.apple_product_id IS 'ID do produto da Apple (ex: com.2m.controledemaquina.basico.mensal19)';
COMMENT ON COLUMN public.subscriptions.google_purchase_token IS 'Token de compra do Google Play';
COMMENT ON COLUMN public.subscriptions.google_product_id IS 'ID do produto do Google Play (ex: com.manoel.controledemaquina.basic.monthly)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Se true, a assinatura será cancelada no fim do período atual';

-- ==================================================
-- INSTRUÇÕES DE USO
-- ==================================================
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em "SQL Editor"
-- 3. Cole este script completo
-- 4. Execute (clique em "Run")
-- 5. Verifique se não há erros
--
-- Para verificar se as colunas foram adicionadas:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'subscriptions'
-- ORDER BY ordinal_position;
-- ==================================================
