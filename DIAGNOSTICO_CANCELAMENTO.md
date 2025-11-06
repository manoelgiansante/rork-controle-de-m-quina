# 🔍 Diagnóstico: Erro ao Cancelar Assinatura

## ❌ Problema
O erro "Não foi possível cancelar sua assinatura" está ocorrendo mesmo com o plano ativo no Stripe.

## 🔧 Correção Aplicada

Melhorei o endpoint `api/stripe/cancel-subscription.ts` para:

1. **Melhor tratamento de erros** - Logs mais detalhados
2. **Validação do stripe_subscription_id** - Verifica se está vazio ou nulo
3. **Fallback inteligente** - Se não consegue buscar do Stripe, usa período baseado no tipo de plano
4. **Mais informação de debug** - Logs adicionais para identificar problemas

## 📋 Próximos Passos para Testar

### 1. Verificar o que está no banco de dados

Execute este SQL no Supabase para ver a assinatura atual:

```sql
-- Substitua 'seu-user-id-aqui' pelo ID do usuário logado
SELECT 
  user_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  plan_type,
  billing_cycle,
  current_period_end,
  cancel_at_period_end,
  created_at
FROM subscriptions
WHERE user_id = 'seu-user-id-aqui';
```

### 2. Verificar logs do Vercel

1. Acesse: https://vercel.com/seu-projeto/logs
2. Procure por logs com `[CANCEL]`
3. Veja qual erro específico está acontecendo

### 3. Verificar no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/subscriptions
2. Procure pela assinatura do usuário
3. Verifique:
   - ✅ Status está "Active"?
   - ✅ Subscription ID está correto?
   - ✅ Customer ID está correto?

## 🐛 Possíveis Causas do Erro

### Causa 1: stripe_subscription_id incorreto no banco
- **Sintoma**: `stripe_subscription_id` no Supabase não bate com o do Stripe
- **Solução**: Atualizar manualmente ou refazer a assinatura

### Causa 2: Webhook não processado
- **Sintoma**: Assinatura está no Stripe mas não no Supabase (ou dados incompletos)
- **Solução**: Processar webhook manualmente ou refazer assinatura

### Causa 3: Permissões do Stripe
- **Sintoma**: API Key do Stripe sem permissão para cancelar
- **Solução**: Verificar permissões da API Key

### Causa 4: userId incorreto
- **Sintoma**: App está enviando userId errado
- **Solução**: Verificar contexto de autenticação

## 🔧 Correção Temporária (Caso seja Causa 1 ou 2)

Se você identificar que o `stripe_subscription_id` está errado, execute este SQL:

```sql
-- 1. Primeiro, encontre o stripe_subscription_id correto no Stripe Dashboard
-- 2. Depois execute este SQL substituindo os valores:

UPDATE subscriptions
SET 
  stripe_subscription_id = 'sub_XXXXXXXXXXXXX',  -- ← ID correto do Stripe
  stripe_customer_id = 'cus_XXXXXXXXXXXXX'        -- ← ID correto do customer
WHERE user_id = 'seu-user-id-aqui';
```

## ✅ Testar Novamente

Depois das correções:

1. Faça logout e login novamente
2. Aguarde 10 segundos (para sincronizar)
3. Tente cancelar a assinatura novamente
4. Verifique os logs do Vercel

## 📝 O Que Verificar Nos Logs

Procure por estas linhas nos logs do Vercel:

```
[CANCEL] 🔍 Iniciando cancelamento para userId: xxx
[CANCEL] ✅ Subscription encontrada: sub_xxx
[CANCEL] stripe_subscription_id: sub_xxx
[CANCEL] subscription.status: active
[CANCEL] 🔄 Configurando cancelamento no final do período no Stripe: sub_xxx
```

Se aparecer `stripe_subscription_id: null` ou `stripe_subscription_id: sub_test_xxx`, significa que o problema está no banco de dados.

## 🚨 Se o Erro Persistir

Me envie:

1. Screenshot dos logs do Vercel (com `[CANCEL]`)
2. Resultado do SQL acima (com dados sensíveis ocultados)
3. Screenshot da subscription no Stripe Dashboard

Assim posso identificar exatamente qual é o problema!
