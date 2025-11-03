# Configuração do Supabase Auth (Web Only)

Este projeto integra Supabase Auth **apenas para o website**, mantendo o fluxo local no mobile.

## ✅ Pré-requisitos

1. Criar conta no [Supabase](https://supabase.com)
2. Criar um novo projeto
3. Obter as credenciais:
   - Project URL (formato: `https://xxx.supabase.co`)
   - Anon/Public Key (formato: `eyJh...`)

## 🔧 Configuração no Vercel

Adicione as seguintes variáveis de ambiente no Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

**Importante:**
- Marcar ambas como **Public** (para serem acessíveis no frontend)
- Aplicar para **All Environments** (Production, Preview, Development)

## 📝 Configuração no Supabase Dashboard

### 1. Ativar Email/Password Provider

1. Vá em **Authentication → Providers**
2. Certifique-se que **Email** está **ON**
3. Para testes iniciais, você pode:
   - Desativar "Confirm email" (para evitar precisar confirmar emails durante testes)
   - ⚠️ **Reative antes de ir para produção!**

### 2. Configurar URL do Site

1. Vá em **Authentication → URL Configuration**
2. Adicione o site em **Site URL**: `https://controledemaquina.com.br`
3. Adicione em **Redirect URLs**:
   - `https://controledemaquina.com.br/**`
   - Se usar subdomínios, adicione também: `https://*.controledemaquina.com.br/**`

### 3. (Opcional) Desativar confirmação de email para testes

1. Vá em **Authentication → Providers → Email**
2. Desabilite "Confirm email"
3. ⚠️ **Lembre-se de reabilitar antes da produção!**

## 🧪 Testando

### Criar Conta (Web)
1. Acesse o site
2. Clique em "Criar nova conta"
3. Preencha email, senha e nome
4. Se tudo estiver correto, será logado automaticamente

### Login (Web)
1. Use o email e senha criados no Supabase
2. Os dados serão globais entre todos os dispositivos web

### Logout (Web)
1. Clique em "Sair da conta"
2. A sessão será limpa do Supabase e localStorage

## 🔍 Verificando Usuários

No Supabase Dashboard:
1. Vá em **Authentication → Users**
2. Você verá todos os usuários cadastrados
3. Pode editar, deletar ou criar usuários manualmente

## 📱 Mobile

O mobile **não foi alterado** - continua usando o sistema local de usuários (AsyncStorage).

## 🐛 Logs de Debug

O código inclui vários logs para facilitar o debug:
- `[WEB AUTH]` - logs específicos do Supabase no web
- `[AUTH MOBILE]` - logs do sistema local no mobile
- `[AUTH]` - logs gerais de autenticação

Abra o console do navegador (F12) para ver os logs.

## ❗ Problemas Comuns

### "Invalid login credentials"
- Verifique se o email/senha estão corretos
- Se criou a conta recentemente, aguarde alguns segundos

### "Email not confirmed"
- Se ativou "Confirm email", precisa clicar no link enviado por email
- Ou desative "Confirm email" nas configurações

### Sessão não persiste após reload
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se que `NEXT_PUBLIC_` está no início das variáveis
- Verifique se as variáveis estão marcadas como "Public" no Vercel

### Dados não aparecem após login
- Isso é esperado inicialmente - o sistema de dados (máquinas, abastecimentos) ainda usa localStorage no web
- Para sincronizar dados, seria necessário criar tabelas no Supabase (próximo passo)

## 🚀 Próximos Passos (Opcional)

Para ter dados globais (máquinas, abastecimentos, etc) entre dispositivos:

1. Criar tabelas no Supabase:
   - `machines`
   - `refuelings`
   - `maintenances`
   - `alerts`
   - `farm_tanks`

2. Modificar `DataContext.tsx` para usar Supabase no web (similar ao que foi feito em `AuthContext.tsx`)

3. Configurar Row Level Security (RLS) para cada usuário ver apenas seus dados
