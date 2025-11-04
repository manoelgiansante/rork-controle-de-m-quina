# 🔄 Fluxo de Integração Stripe + Supabase

## 📋 Resumo

Quando um usuário faz o pagamento do plano via Stripe, o sistema **automaticamente** atualiza a conta para o plano pago e remove o "teste grátis".

---

## 🛠️ Como Funciona

### 1️⃣ Usuário clica em "Selecionar Plano"
- Frontend chama: `POST /api/stripe/checkout`
- Stripe retorna URL do checkout
- Usuário é redirecionado para página de pagamento do Stripe

### 2️⃣ Usuário completa o pagamento
- Stripe processa o pagamento
- Stripe envia webhook para: `POST /api/stripe/webhook`

### 3️⃣ Webhook processa o evento `checkout.session.completed`
**Arquivo:** `api/stripe/webhook.ts` (linhas 44-105)

O webhook:
- ✅ Identifica o `userId` do metadata
- ✅ Busca os dados da subscription do Stripe
- ✅ Determina o tipo de plano (basic/premium) baseado no `priceId`
- ✅ Salva no Supabase (tabela `subscriptions`):
  ```typescript
  {
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    plan_type: 'basic' | 'premium',
    billing_cycle: 'monthly' | 'annual',
    machine_limit: 10 | -1,
    status: 'active',
    trial_active: false,  // ⭐ Desativa o trial
    current_period_start: '2025-01-04',
    current_period_end: '2025-02-04'
  }
  ```

### 4️⃣ App detecta a mudança automaticamente

**Arquivo:** `contexts/SubscriptionContext.tsx`

#### Na Web:
- Busca do Supabase a cada 30 segundos (linha 335-344)
- Função `loadSubscription()` verifica se há subscription ativa (linha 165-227)
- Se encontrar `status: 'active'` → atualiza UI
- Badge "Teste Grátis" desaparece ✅
- Mostra "Plano Basic/Premium Ativo" ✅

#### No Mobile:
- Usa AsyncStorage local
- (Futuramente pode usar mesma lógica do web)

---

## 🔍 Verificação Manual

Se o usuário quiser forçar a atualização:
1. Vai na aba **Assinatura**
2. Clica em **"Atualizar Status da Assinatura"**
3. O app busca novamente no Supabase

---

## 📊 Tabela `subscriptions` no Supabase

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- 'basic' | 'premium'
  billing_cycle TEXT NOT NULL, -- 'monthly' | 'annual'
  machine_limit INTEGER NOT NULL, -- 10 para basic, -1 para premium
  status TEXT NOT NULL, -- 'active' | 'expired'
  trial_active BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Variáveis de Ambiente Necessárias

**Na Vercel:**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
EXPO_PUBLIC_SUPABASE_URL=https://....supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_PRICE_BASIC_MONTHLY=price_...
NEXT_PUBLIC_PRICE_BASIC_YEARLY=price_...
NEXT_PUBLIC_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_PRICE_PREMIUM_YEARLY=price_...
```

---

## ✅ Checklist de Configuração

- [x] Webhook do Stripe configurado para `https://controledemaquina.com.br/api/stripe/webhook`
- [x] Eventos do Stripe habilitados:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [x] Tabela `subscriptions` criada no Supabase
- [x] RLS (Row Level Security) configurada
- [x] Context `SubscriptionContext` busca do Supabase
- [x] Verificação periódica a cada 30s (web)
- [x] Botão manual "Atualizar Status" na tela de assinatura

---

## 🎯 Resultado Final

Quando o pagamento é aprovado:
1. ✅ Webhook salva no Supabase
2. ✅ App detecta em até 30s (ou imediatamente com botão manual)
3. ✅ Badge "Teste Grátis" **desaparece**
4. ✅ Mostra "Plano X Ativo"
5. ✅ `machineLimit` atualizado (10 ou ilimitado)
6. ✅ Usuário pode adicionar máquinas conforme o limite do plano

---

## 🐛 Debug

Para verificar se está funcionando:
1. Abra o console do navegador
2. Procure por logs `[SUBSCRIPTION]` e `[WEBHOOK]`
3. Verifique no Supabase se a linha foi criada na tabela `subscriptions`
4. No Stripe Dashboard → Webhooks → veja se os eventos foram entregues com sucesso

---

## 📞 Suporte

Se algo não funcionar:
1. Verifique os logs do webhook no Stripe Dashboard
2. Veja os logs no Vercel (Functions → `api/stripe/webhook`)
3. Confirme que o `userId` está sendo enviado no metadata do checkout
