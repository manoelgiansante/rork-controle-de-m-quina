# 🐛 BUG CORRIGIDO: Customer com Email Errado

## 📋 DESCRIÇÃO DO BUG

**Cenário:**
1. Usuário tinha conta `manoelgiansante@gmail.com` (antiga)
2. Criou nova conta `manoelgiansante123@gmail.com`  
3. Fez checkout/compra logado como `manoelgiansante123@gmail.com`
4. **Stripe criou/atualizou subscription para `manoelgiansante@gmail.com`** (email errado!)
5. Ao tentar cancelar, dava erro: "Não foi possível cancelar sua assinatura"

---

## 🔍 CAUSA RAIZ

No arquivo `api/stripe/checkout.ts` (linhas 69-86), o código buscava customers no Stripe **apenas por email**:

```typescript
const existingCustomers = await stripe.customers.list({
  email: userEmail,  // ❌ Busca apenas por email
  limit: 1,
});
```

**Problema:** Se existisse um customer antigo com email similar (ou mesmo email com variação), o Stripe retornava o customer errado, associando a nova compra à conta antiga.

---

## ✅ SOLUÇÃO IMPLEMENTADA

Modificado o fluxo de checkout para buscar customers **por `userId` no metadata** em vez de apenas por email:

### Antes:
```typescript
// ❌ Busca por email (pode pegar customer errado)
const existingCustomers = await stripe.customers.list({
  email: userEmail,
  limit: 1,
});
```

### Depois:
```typescript
// ✅ Busca por userId no metadata (único por conta)
const customersByUserId = await stripe.customers.search({
  query: `metadata['userId']:'${userId}'`,
  limit: 1,
});

// Se encontrou, atualiza email se necessário
if (customersByUserId.data.length > 0) {
  const existingCustomer = customersByUserId.data[0];
  customerId = existingCustomer.id;
  
  // Atualiza email se mudou
  if (existingCustomer.email !== userEmail) {
    await stripe.customers.update(customerId, {
      email: userEmail,
    });
  }
} else {
  // Cria novo customer
  const newCustomer = await stripe.customers.create({
    email: userEmail,
    metadata: { userId },
  });
  customerId = newCustomer.id;
}
```

---

## 🎯 BENEFÍCIOS

1. ✅ **Cada userId tem seu próprio customer no Stripe** (nunca mais confunde contas)
2. ✅ **Email é atualizado automaticamente** se usuário mudar email
3. ✅ **Subscriptions são criadas para o userId correto**
4. ✅ **Cancelamento funciona corretamente** (busca subscription pelo userId logado)
5. ✅ **Suporta múltiplos usuários com emails similares**

---

## 🧪 COMO TESTAR

### Teste 1: Nova Compra (Usuário Sem Customer)
1. Criar conta nova: `teste1@example.com`
2. Fazer checkout
3. Verificar logs: `[CHECKOUT] Novo customer criado: cus_xxx`
4. ✅ Customer deve ter `metadata.userId` correto
5. ✅ Subscription deve estar associada ao `userId` correto no Supabase

### Teste 2: Nova Compra (Usuário Com Customer Existente)
1. Usar conta que já tem customer: `manoelgiansante123@gmail.com`
2. Fazer checkout
3. Verificar logs: `[CHECKOUT] Customer existente encontrado pelo userId: cus_xxx`
4. ✅ Deve reutilizar o customer correto
5. ✅ Não deve criar customer duplicado

### Teste 3: Mudança de Email
1. Criar customer com email `teste@example.com`
2. Usuário muda email para `novoemail@example.com` no Supabase Auth
3. Fazer checkout
4. Verificar logs: `[CHECKOUT] ⚠️ Email do customer está desatualizado, atualizando...`
5. ✅ Email do customer deve ser atualizado no Stripe

### Teste 4: Cancelamento
1. Fazer checkout e completar pagamento
2. Ir para página de Assinatura
3. Clicar em "Cancelar Assinatura"
4. ✅ Deve cancelar sem erro
5. ✅ Deve mostrar card amarelo de período de graça

---

## 📊 LOGS ESPERADOS

### Checkout (Novo Customer):
```
[CHECKOUT] POST recebido!
[CHECKOUT] Email do usuário: teste@example.com
[CHECKOUT] Nenhum customer encontrado para userId: abc123 - criando novo...
[CHECKOUT] Novo customer criado: cus_xxx
[CHECKOUT] Sessão criada: cs_xxx
```

### Checkout (Customer Existente):
```
[CHECKOUT] POST recebido!
[CHECKOUT] Email do usuário: teste@example.com
[CHECKOUT] Customer existente encontrado pelo userId: cus_xxx
[CHECKOUT] Sessão criada: cs_xxx
```

### Checkout (Email Desatualizado):
```
[CHECKOUT] POST recebido!
[CHECKOUT] Email do usuário: novoemail@example.com
[CHECKOUT] Customer existente encontrado pelo userId: cus_xxx
[CHECKOUT] ⚠️ Email do customer está desatualizado, atualizando de teste@example.com para novoemail@example.com
[CHECKOUT] Sessão criada: cs_xxx
```

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Correção aplicada** no `api/stripe/checkout.ts`
2. 🔄 **Aguardar deploy automático** (Vercel)
3. 🧪 **Testar com conta real** (fazer nova compra)
4. 📊 **Monitorar logs** do Vercel para confirmar funcionamento
5. 🎯 **Verificar Stripe Dashboard** - customer deve ter `metadata.userId` preenchido

---

## ⚠️ NOTA IMPORTANTE

### Para corrigir subscriptions existentes com email/userId errado:

**Opção 1: Correção Manual no Stripe Dashboard**
1. Abrir [Stripe Dashboard](https://dashboard.stripe.com/customers)
2. Buscar customer com email errado
3. Editar customer → Metadata → Adicionar `userId` correto
4. Atualizar subscription → Metadata → Adicionar `userId` correto

**Opção 2: Script de Correção (Supabase SQL)**
```sql
-- Ver subscriptions com problema
SELECT * FROM subscriptions 
WHERE user_id IN (
  'userId_da_conta_manoelgiansante123',
  'userId_da_conta_manoelgiansante'
);

-- Transferir subscription para userId correto
UPDATE subscriptions
SET user_id = 'userId_CORRETO_manoelgiansante123'
WHERE stripe_subscription_id = 'sub_xxx';
```

---

## 📝 ARQUIVOS MODIFICADOS

- `api/stripe/checkout.ts` - Linhas 67-101 (busca customer por userId)

---

## ✅ STATUS

- [x] Bug identificado
- [x] Causa raiz encontrada
- [x] Correção implementada
- [x] Documentação criada
- [ ] Testar em produção
- [ ] Corrigir subscriptions existentes (se necessário)

---

**Data da Correção:** 2025-11-06  
**Relatado por:** Manoel Giansante  
**Corrigido por:** Rork AI Assistant
