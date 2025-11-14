# 🔴 PROBLEMA CRÍTICO - Compras iOS Falhando no TestFlight

**Data:** 14 de novembro de 2025
**Status:** 🔴 CRÍTICO - Compras in-app não funcionam no iOS

---

## 📋 Resumo do Problema

As compras in-app no iOS estão falhando porque **faltam variáveis de ambiente essenciais no Vercel**. Sem essas variáveis, o backend não consegue validar compras da Apple nem atualizar o banco de dados Supabase.

### O que está acontecendo:

1. Usuário tenta comprar no TestFlight
2. Apple processa o pagamento com sucesso
3. App envia recibo para validação: `https://controle-de-maquina.rork.app/api/iap/validate-apple`
4. ❌ **Backend falha** porque `SUPABASE_SERVICE_ROLE_KEY` não está configurada
5. ❌ **Compra não é ativada** no app

---

## 🔧 Variáveis que Faltam no Vercel

| Variável | Status | Criticidade | Onde é Usada |
|----------|--------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **FALTANDO** | 🔴 CRÍTICO | Todos os endpoints da API que precisam escrever no Supabase |
| `APPLE_SHARED_SECRET` | ⚠️ **VERIFICAR** | 🔴 CRÍTICO | Endpoint `/api/iap/validate-apple` |

---

## 🚀 Como Resolver (Passo a Passo)

### 1️⃣ Obter a SUPABASE_SERVICE_ROLE_KEY

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **"controle-de-maquina"**
3. Vá em: **Settings → API**
4. Copie a chave: **`service_role` (secret)**

   > ⚠️ **IMPORTANTE:** Esta é uma chave SECRETA. Nunca compartilhe ou commite no GitHub!

### 2️⃣ Verificar/Obter a APPLE_SHARED_SECRET

**Se você JÁ tem a chave (mostrada no RESUMO-IAP.md):**
- Use: `de3fe355593044efbdac8e90869596f4`

**Se você NÃO tem ou quer gerar uma nova:**

1. Acesse: https://appstoreconnect.apple.com/
2. Vá em: **Meu Aplicativo → Informações do App**
3. Role até: **App-Specific Shared Secret**
4. Clique em: **Gerenciar** → **Gerar Chave**
5. Copie a chave gerada

### 3️⃣ Adicionar as Variáveis no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto: **"controle-de-maquina"**
3. Vá em: **Settings → Environment Variables**
4. Adicione as variáveis:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `SUPABASE_SERVICE_ROLE_KEY` | *(cole a chave do Supabase)* | ✅ Production, ✅ Preview, ✅ Development |
   | `APPLE_SHARED_SECRET` | `de3fe355593044efbdac8e90869596f4` (ou a nova) | ✅ Production, ✅ Preview, ✅ Development |

5. Clique em **Save**

### 4️⃣ Fazer Redeploy no Vercel

Após adicionar as variáveis, você precisa fazer um novo deploy para que elas sejam aplicadas:

**Opção A: Redeploy automático**
1. Faça qualquer commit no GitHub
2. Vercel vai detectar e fazer redeploy automaticamente

**Opção B: Redeploy manual**
1. No Vercel Dashboard, vá em: **Deployments**
2. Encontre o último deployment
3. Clique nos 3 pontinhos → **Redeploy**
4. Confirme o redeploy

---

## ✅ Como Verificar se Funcionou

Depois de configurar as variáveis e fazer redeploy:

1. Abra o TestFlight no seu iPhone
2. Tente fazer uma compra de teste
3. A compra deve ser aprovada e a assinatura deve aparecer no app

**Para verificar os logs:**
1. Acesse: Vercel Dashboard → Deployments → View Function Logs
2. Procure por logs do endpoint `/api/iap/validate-apple`
3. Deve ver: `[APPLE IAP] ✅ Assinatura criada` ou `✅ Assinatura atualizada`

---

## 📝 Endpoints que Precisam Dessas Variáveis

### Precisam de `SUPABASE_SERVICE_ROLE_KEY`:
- `/api/iap/validate-apple.ts` (linha 205)
- `/api/iap/validate-google.ts` (linha 198)
- `/api/apple/webhook.ts` (linha 18)
- `/api/google/webhook.ts` (linha 18)
- `/api/stripe/webhook.ts` (linha 40)
- `/api/stripe/checkout.ts` (linha 54)
- `/api/stripe/cancel-subscription.ts` (linha 26)
- `/api/stripe/reactivate-subscription.ts` (linha 26)
- `/api/delete-account.ts` (linha 4)

### Precisam de `APPLE_SHARED_SECRET`:
- `/api/iap/validate-apple.ts` (linha 49)

---

## 🔒 Segurança

### ✅ O que está correto:
- A chave `EXPO_PUBLIC_SUPABASE_ANON_KEY` pode ficar exposta no código (é pública)
- Ela está protegida pelas políticas RLS do Supabase

### ⚠️ O que precisa ficar no Vercel (NUNCA no código):
- `SUPABASE_SERVICE_ROLE_KEY` - bypassa RLS, tem acesso total
- `APPLE_SHARED_SECRET` - necessária para validar recibos da Apple

---

## 🎯 Checklist Final

- [ ] ✅ Obtive a `SUPABASE_SERVICE_ROLE_KEY` do Supabase Dashboard
- [ ] ✅ Verifiquei/obtive a `APPLE_SHARED_SECRET` do App Store Connect
- [ ] ✅ Adicionei ambas as variáveis no Vercel (Production, Preview, Development)
- [ ] ✅ Fiz redeploy no Vercel
- [ ] ✅ Testei uma compra no TestFlight
- [ ] ✅ Compra foi aprovada e assinatura apareceu no app

---

## ❓ Dúvidas Frequentes

**P: Por que a SUPABASE_SERVICE_ROLE_KEY é tão importante?**
R: Sem ela, o backend não consegue escrever na tabela `subscriptions` do Supabase, então a compra não é ativada no app.

**P: Por que não posso colocar essas chaves no código?**
R: São chaves secretas que dão acesso total ao seu backend. Se alguém pegar essas chaves, pode deletar todos os seus dados ou fazer compras falsas.

**P: E se eu já tiver configurado antes?**
R: Verifique se as variáveis ainda estão lá. Às vezes o Vercel perde as variáveis depois de um redeploy ou mudança de projeto.

---

**Última atualização:** 14/11/2025
**Autor:** Manus AI
