# ⚡ Configurar Email em 5 Minutos

**IMPORTANTE:** Como você está no **Plano Free do Supabase**, Edge Functions não funcionam.
Você tem 2 opções:

---

## 🎯 OPÇÃO 1: Usar Supabase Pago (Recomendado)

### Passo 1: Upgrade Supabase (2 min)
1. Acesse: https://supabase.com/dashboard/project/_/settings/billing
2. Clique em "Upgrade to Pro" ($25/mês)
3. Adicione cartão de crédito

### Passo 2: Criar conta Resend (1 min)
1. Acesse: https://resend.com/signup
2. Faça cadastro (100 emails/dia grátis)
3. No dashboard, copie sua **API Key**

### Passo 3: Deploy Edge Function (2 min)
Abra o Terminal e cole estes comandos:

```bash
cd /Users/manoelnascimento/Documents/controle

# Login no Supabase
npx supabase login

# Deploy da função
npx supabase functions deploy send-email --no-verify-jwt

# Configurar API Key (cole a que você copiou do Resend)
npx supabase secrets set RESEND_API_KEY=sua_api_key_aqui
```

### ✅ Pronto! Emails funcionando!

---

## 🎯 OPÇÃO 2: Usar apenas Push Notifications (Grátis)

**Já está funcionando!**

Push notifications já estão implementadas e funcionam perfeitamente no app iOS/Android.
Você NÃO precisa configurar email se não quiser.

### O que funciona AGORA (sem configurar nada):
- ✅ Notificações Push no celular
- ✅ Alertas de manutenção urgente
- ✅ Sistema anti-spam (1 notificação a cada 24h)
- ✅ Verificação automática a cada 30 minutos

### O que NÃO funciona sem configurar email:
- ❌ Email de alertas

---

## 🤔 Qual escolher?

### Escolha OPÇÃO 1 se:
- Quer enviar emails também
- Pode pagar $25/mês pelo Supabase Pro
- Quer recurso extra de backup por email

### Escolha OPÇÃO 2 se:
- Notificações push são suficientes
- Não quer custo adicional
- Prefere simplicidade

---

## 📱 Para testar Push Notifications (já funciona!):

1. Abra o app no celular (físico, NÃO simulador)
2. Vá em **Configurações**
3. Ative "Notificações Push"
4. Crie um alerta vermelho (manutenção atrasada)
5. Clique em "Testar Notificações Agora"
6. 🎉 Deve receber notificação!

---

## 💤 Durma tranquilo!

Se quiser emails, siga OPÇÃO 1 amanhã (5 min).
Se push notifications forem suficientes, está tudo pronto! ✅

**Criado em:** 12/11/2025 às 23:37
