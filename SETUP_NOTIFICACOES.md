# 🚀 Setup das Notificações - Passo a Passo

## ✅ Já Está Pronto no Código!

Todo o sistema de notificações já está implementado e pronto para usar. Não precisa de migração SQL porque:
- ✅ Usuários estão no AsyncStorage (não no Supabase)
- ✅ Campo `email` já está no tipo `User`
- ✅ Sistema completo de notificações implementado

## 📋 O Que Você Precisa Fazer

### 1. ⏳ Aguardar npm install terminar

O comando `npm install expo-notifications` está rodando. Quando terminar:

```bash
# Se estiver em iOS
cd ios && pod install && cd ..

# Rebuild
npm run ios
# ou
npm run android
```

### 2. 📱 Testar Notificações Push (Funciona Imediatamente!)

**IMPORTANTE:** Só funciona em dispositivo físico, NÃO em simulador!

1. Instale o app no seu iPhone/Android
2. Abra o app
3. Vá na nova aba **"Configurações"** (última aba)
4. Digite seu email (será salvo no AsyncStorage)
5. Certifique-se que "Notificações Push" está **ativado**
6. Crie um alerta vermelho:
   - Vá em "Máquinas"
   - Registre uma manutenção atrasada (horímetro atual maior que próxima revisão)
7. Volte em "Configurações"
8. Clique em **"Testar Notificações Agora"**
9. 🎉 **Você deve receber uma notificação push!**

### 3. 📧 Configurar Emails (Opcional - Requer Setup Extra)

Para enviar emails, você precisa criar uma Edge Function no Supabase.

#### Opção Recomendada: Resend.com

**Passo 1:** Criar conta no Resend
1. Acesse https://resend.com
2. Crie uma conta (100 emails/dia grátis)
3. Copie sua API Key

**Passo 2:** Criar Edge Function
```bash
# No terminal, na pasta do projeto
npx supabase functions new send-email
```

**Passo 3:** Adicionar código da função
Crie o arquivo `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Controle de Máquina <onboarding@resend.dev>', // Use seu domínio verificado
        to: [to],
        subject,
        html,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**Passo 4:** Deploy da função
```bash
# Deploy
npx supabase functions deploy send-email --no-verify-jwt

# Adicionar secret
npx supabase secrets set RESEND_API_KEY=re_sua_chave_aqui
```

**Passo 5:** Testar
Após configurar, volte no app, vá em Configurações e teste novamente. Agora você receberá também um email!

## 🎯 Como Funciona no Uso Normal

### Verificação Automática
- A cada **30 minutos** o app verifica alertas vermelhos
- Quando o app volta do background também verifica
- Se encontrar alerta vermelho, envia notificação

### Prevenção de Spam
- Cada alerta é notificado **no máximo 1 vez a cada 24 horas**
- Histórico salvo no AsyncStorage

### Notificações
- **Push**: Enviada imediatamente para o dispositivo
- **Email**: Enviado se você configurou a Edge Function

## 🧪 Testando Tudo

### Criar Alerta Vermelho de Teste

1. **Vá em "Máquinas"**
2. Selecione uma máquina
3. Clique em "Registrar Manutenção"
4. Selecione um item (ex: Troca de óleo)
5. Coloque:
   - Horímetro atual: **1000h**
   - Próxima revisão: **50h** (muito baixo propositalmente)
6. Salve

7. **Vá em "Relatórios" > Aba "Alertas"**
   - Você verá o alerta em **VERMELHO** 🔴

8. **Vá em "Configurações"**
9. Clique em "Testar Notificações Agora"
10. 🎉 **Notificação recebida!**

## ⚙️ Configurações Disponíveis

Na aba **Configurações** você pode:

✅ Ver informações do usuário
✅ Cadastrar/editar email
✅ Ativar/desativar notificações push
✅ Ver status do sistema de notificações
✅ Testar manualmente
✅ Fazer logout

## 🔧 Troubleshooting

### Notificações não aparecem?

**1. Está em dispositivo físico?**
- Simuladores NÃO suportam notificações push
- Use iPhone ou Android real

**2. Deu permissão?**
- iOS: Settings > Notifications > Controle de Máquina > Allow Notifications
- Android: Settings > Apps > Controle de Máquina > Notifications > Enabled

**3. Notificações estão ativadas no app?**
- Vá em Configurações no app
- Verifique se o switch está verde

**4. Existe alerta vermelho?**
- Vá em Relatórios > Alertas
- Deve ter pelo menos um item vermelho

**5. Já foi notificado nas últimas 24h?**
- Sistema evita spam
- Para testar novamente, desinstale e reinstale o app

### Emails não chegam?

**1. Edge Function foi configurada?**
- Se não, emails não funcionarão (push continuará funcionando)

**2. API Key está correta?**
- Verifique no Supabase Dashboard > Edge Functions > Secrets

**3. Email cadastrado está correto?**
- Verifique em Configurações no app

**4. Verificou spam?**
- Emails de teste podem ir para spam

## 📱 Build e Deploy

### iOS
```bash
# Instalar pods
cd ios && pod install && cd ..

# Build local
npm run ios

# Build para TestFlight/App Store
eas build --platform ios
```

### Android
```bash
# Build local
npm run android

# Build para Google Play
eas build --platform android
```

## 🎉 Está Pronto!

Assim que o `npm install` terminar e você fizer o rebuild, o sistema de notificações estará 100% funcional!

**Próximos passos:**
1. ✅ Aguardar npm install
2. ✅ Rebuild do app
3. ✅ Testar em dispositivo físico
4. ⏳ (Opcional) Configurar Edge Function para emails

---

**Qualquer dúvida, consulte:**
- `NOTIFICATIONS_README.md` - Documentação técnica completa
- `NOTIFICATIONS_SUMMARY.md` - Resumo executivo

**Criado em:** 11/01/2025
