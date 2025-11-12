# Sistema de Notificações de Alertas

Este documento descreve como funciona o sistema de notificações de alertas vermelhos implementado no app.

## 📋 Visão Geral

O sistema envia notificações automáticas quando alertas de manutenção ficam com status **vermelho** (urgente). Suporta:
- ✅ **Notificações Push** (iOS e Android)
- ✅ **Emails** (complementar)

## 🚀 Como Funciona

### 1. Monitoramento Automático
- O app verifica alertas a cada **30 minutos** quando está ativo
- Verifica também quando o app volta ao foreground (sai do background)
- Só notifica **1 vez a cada 24 horas** por alerta (evita spam)

### 2. Notificações Push
Quando um alerta fica vermelho:
1. **Notificação local** é enviada imediatamente ao dispositivo
2. Aparece mesmo com o app fechado
3. Ao tocar, o usuário é direcionado para a tela de alertas

### 3. Emails
Emails formatados são enviados para o endereço cadastrado contendo:
- Nome da máquina
- Item de manutenção
- Horímetro atual vs próxima revisão
- Quantidade de horas atrasadas

## 📁 Estrutura de Arquivos

```
lib/notifications/
├── push-notifications.ts    # Gerenciamento de notificações push
├── email-service.ts          # Serviço de envio de emails
└── alert-monitor.ts          # Monitoramento e lógica de alertas

hooks/
└── useNotifications.ts       # Hook React para notificações

components/
└── NotificationsProvider.tsx # Provider para inicializar sistema

app/(tabs)/
└── settings.tsx              # Tela de configurações
```

## ⚙️ Configuração Necessária

### 1. App Configuration (app.json)
Já configurado automaticamente pelo Expo.

### 2. Supabase Edge Function (Email)
Para enviar emails, você precisa criar uma Edge Function no Supabase:

#### Passo 1: Criar a função
```bash
cd supabase
npx supabase functions new send-email
```

#### Passo 2: Implementar a função (supabase/functions/send-email/index.ts)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Exemplo usando Resend.com
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { to, subject, html } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Controle de Máquina <alertas@seudominio.com>',
      to: [to],
      subject,
      html,
    }),
  })

  const data = await res.json()

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

#### Passo 3: Deploy
```bash
npx supabase functions deploy send-email --no-verify-jwt
```

#### Passo 4: Configurar secrets
```bash
npx supabase secrets set RESEND_API_KEY=sua_chave_aqui
```

### 3. Adicionar campo email na tabela users
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN users.email IS 'Email do usuário para receber alertas';
```

### 4. Atualizar .env
```
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

## 📱 Uso pelo Usuário

### Tela de Configurações
1. Acessar tab "Configurações"
2. Cadastrar email
3. Ativar/desativar notificações push
4. Testar notificações manualmente

### Comportamento
- **Status Verde**: Tudo OK, sem notificações
- **Status Amarelo**: Atenção, sem notificações
- **Status Vermelho**: 🚨 Notificação enviada!

## 🧪 Testes

### Testar Notificações Locais
1. Abra o app em um dispositivo físico (não funciona em simulador)
2. Va em Configurações
3. Clique em "Testar Notificações Agora"
4. Se houver alertas vermelhos, você receberá notificações

### Testar Emails
1. Cadastre um email válido
2. Crie um alerta vermelho (manutenção atrasada)
3. Aguarde a verificação automática (ou force com o botão de teste)
4. Verifique sua caixa de entrada

## 🔧 Troubleshooting

### Notificações não aparecem
- Verificar se está em dispositivo físico (não funciona em simulador)
- Verificar permissões de notificação nas configurações do celular
- iOS: Settings > Notifications > Controle de Máquina
- Android: Settings > Apps > Controle de Máquina > Notifications

### Emails não chegam
- Verificar se a Edge Function foi deployada
- Verificar logs no Supabase Dashboard
- Verificar se o email cadastrado está correto
- Checar pasta de spam

### Notificações duplicadas
- O sistema já previne isso (máximo 1 por 24h)
- Se ainda assim ocorrer, limpe o cache do app

## 📊 Limites e Considerações

### Notificações Push
- **Expo**: 1 milhão de notificações/mês (grátis)
- Depois disso, precisará de conta paga ou FCM direto

### Emails
- **Resend**: 100 emails/dia (grátis)
- **SendGrid**: 100 emails/dia (grátis)
- **AWS SES**: Pague conforme uso

## 🔒 Segurança

- Tokens de notificação são privados do dispositivo
- Emails são enviados pelo backend (Supabase)
- Não exponha API keys no app
- Use variáveis de ambiente

## 📈 Próximas Melhorias

- [ ] Salvar tokens de push no banco de dados
- [ ] Permitir horário personalizado de notificações
- [ ] Notificações para alertas amarelos (opcional)
- [ ] Dashboard de histórico de notificações enviadas
- [ ] Suporte a múltiplos emails por usuário
- [ ] SMS como alternativa (via Twilio)

## 💡 Dicas

- Configure testes inicialmente para o seu próprio email
- Use alertas amarelos como "pre-alerta" antes de ficarem vermelhos
- Mantenha os dados de horímetro atualizados para alertas precisos

---

**Documentação criada em:** 11/01/2025
**Última atualização:** 11/01/2025
