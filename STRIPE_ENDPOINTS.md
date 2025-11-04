# ✅ Stripe Endpoints - Vercel Serverless Functions

## 📂 Nova Estrutura

Os endpoints do Stripe agora usam **Vercel Serverless Functions** diretamente, sem depender do Hono.

```
api/
├── ping.ts                    → GET/POST /api/ping (teste)
├── stripe/
│   ├── checkout.ts           → POST /api/stripe/checkout
│   └── webhook.ts            → POST /api/stripe/webhook
```

## 🚀 Endpoints

### 1. **Ping** (Teste)
```bash
GET https://controledemaquina.com.br/api/ping
POST https://controledemaquina.com.br/api/ping
```
**Resposta:**
```json
{
  "ok": true,
  "method": "GET",
  "path": "/api/ping",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### 2. **Checkout** (Criar sessão de pagamento)
```bash
POST https://controledemaquina.com.br/api/stripe/checkout
Content-Type: application/json

{
  "priceId": "price_xxxxxxxxxxxxx",
  "userId": "user-uuid-here"
}
```

**Resposta de sucesso (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Resposta de erro (400):**
```json
{
  "error": "priceId e userId são obrigatórios"
}
```

**Resposta de erro (500):**
```json
{
  "error": "checkout_failed",
  "details": "Mensagem de erro do Stripe"
}
```

---

### 3. **Webhook** (Receber eventos do Stripe)
```bash
POST https://controledemaquina.com.br/api/stripe/webhook
Stripe-Signature: t=xxx,v1=yyy
Content-Type: application/json

{...evento do Stripe...}
```

**Eventos tratados:**
- ✅ `checkout.session.completed` → Cria/atualiza subscription no Supabase
- 💰 `invoice.paid` → Atualiza status para "active"
- ❌ `invoice.payment_failed` → Marca como "expired"
- 🟢 `customer.subscription.created` → Log
- 🔄 `customer.subscription.updated` → Atualiza plano/status
- 🔴 `customer.subscription.deleted` → Marca como "expired"

**Resposta de sucesso (200):**
```json
{
  "received": true
}
```

---

## 🔧 Configuração no Vercel

### Variáveis de ambiente necessárias:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
EXPO_PUBLIC_APP_URL=https://controledemaquina.com.br
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_PRICE_BASIC_MONTHLY=price_...
NEXT_PUBLIC_PRICE_BASIC_YEARLY=price_...
NEXT_PUBLIC_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_PRICE_PREMIUM_YEARLY=price_...
```

---

## 🧪 Testes após deploy

### 1. Testar Ping
```bash
curl https://controledemaquina.com.br/api/ping
```
✅ Esperado: `{"ok": true, ...}`

---

### 2. Testar Checkout (POST)
```bash
curl -i -X POST https://controledemaquina.com.br/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_1XXXXXX","userId":"test-user"}'
```
✅ Esperado: `200 OK` + `{"url":"https://checkout.stripe.com/..."}`

---

### 3. Testar Checkout (GET) - deve dar erro
```bash
curl https://controledemaquina.com.br/api/stripe/checkout
```
✅ Esperado: `405 Method Not Allowed`

---

### 4. Verificar logs na Vercel
Após um teste, vá em:
- Vercel → Seu projeto → **Functions** → Logs
- Deve aparecer: `[CHECKOUT] POST recebido!`

---

## 🔍 Troubleshooting

### ❌ Erro 405 Method Not Allowed
**Causa:** Método HTTP errado (ex: GET em vez de POST)  
**Solução:** Use `POST` para `/api/stripe/checkout`

---

### ❌ Erro 400 "priceId e userId são obrigatórios"
**Causa:** Faltam campos no body  
**Solução:** Envie JSON com `priceId` e `userId`

---

### ❌ Erro 500 "checkout_failed"
**Causa:** Erro ao criar sessão no Stripe  
**Solução:** 
1. Verifique se `STRIPE_SECRET_KEY` está configurada
2. Verifique se o `priceId` é válido no Stripe Dashboard
3. Cheque os logs da Vercel para ver o erro detalhado

---

### ❌ Webhook retorna 400 "Missing signature"
**Causa:** Stripe não está enviando o header `Stripe-Signature`  
**Solução:** Configure o webhook endpoint no Stripe Dashboard

---

### ❌ Webhook retorna 400 "Webhook Error: ..."
**Causa:** Assinatura inválida  
**Solução:** Verifique se `STRIPE_WEBHOOK_SECRET` está correto

---

## 📋 Checklist de deploy

- [ ] Criar pasta `api/` na raiz
- [ ] Criar `api/ping.ts`
- [ ] Criar `api/stripe/checkout.ts`
- [ ] Criar `api/stripe/webhook.ts`
- [ ] Atualizar `vercel.json` para usar `api/**/*.ts`
- [ ] Fazer deploy com **Clear build cache**
- [ ] Verificar em **Vercel → Functions** se as 3 funções aparecem
- [ ] Testar `GET /api/ping` → deve retornar `200 OK`
- [ ] Testar `POST /api/stripe/checkout` → deve retornar `200 + url`
- [ ] Configurar webhook no Stripe Dashboard apontando para `/api/stripe/webhook`

---

## 🎯 Resultado final

Após seguir todos os passos:

✅ `POST /api/stripe/checkout` → retorna `{ url }` do Stripe  
✅ Frontend redireciona para o Stripe Checkout  
✅ Webhook recebe eventos e atualiza Supabase  
✅ Não depende mais do Hono (funciona direto com Vercel Functions)
