# Configuração do Supabase Auth (Web + Mobile)

Este projeto integra Supabase Auth **para web e mobile**, com persistência de sessão unificada usando localStorage (web) e AsyncStorage (mobile).

## ✅ Pré-requisitos

1. Criar conta no [Supabase](https://supabase.com)
2. Criar um novo projeto
3. Obter as credenciais:
   - Project URL (formato: `https://xxx.supabase.co`)
   - Anon/Public Key (formato: `eyJh...`)

## 🔧 Configuração de Variáveis de Ambiente

As credenciais já estão configuradas no arquivo `.env` na raiz do projeto:

```
EXPO_PUBLIC_SUPABASE_URL=https://byfgflxlmcdciupjpoaz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZmdmbHhsbWNkY2l1cGpwb2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDEyMjgsImV4cCI6MjA3NzI3NzIyOH0.6XZTCN2LtJYLs9ovXbjk8ljosQjEQVL3IDWq15l4mQg
```

**Para Vercel/Produção:**
- Adicione as mesmas variáveis no painel do Vercel
- Marcar ambas como **Public** (para serem acessíveis no frontend)
- Aplicar para **All Environments** (Production, Preview, Development)

## 📝 Configuração no Supabase Dashboard

### 1. Ativar Email/Password Provider

1. Vá em **Authentication → Providers**
2. Certifique-se que **Email** está **ON**
3. Para testes iniciais, você pode:
   - Desativar "Confirm email" (para evitar precisar confirmar emails durante testes)
   - ⚠️ **Reative antes de ir para produção!**

### 2. Configurar URL do Site e Deep Links

1. Vá em **Authentication → URL Configuration**
2. Adicione o site em **Site URL**: `https://controledemaquina.com.br`
3. Adicione em **Redirect URLs**:
   - `https://controledemaquina.com.br/**`
   - `http://localhost:8081/**` (para desenvolvimento local)
   - `http://localhost:8081/reset-password` (recuperação de senha em dev)
   - `http://localhost:8081/auth/callback` (callback de autenticação)
   - `com.seuapp.controledemquina://reset-password` (deep link mobile para reset de senha)
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
2. Você verá todos os usuários cadastrados (web e mobile)
3. Pode editar, deletar ou criar usuários manualmente

## 🔑 Recuperação de Senha

O sistema possui recuperação de senha via email:
1. Na tela de login, clique em "Esqueci minha senha"
2. Digite seu email
3. Um link será enviado para seu email
4. Clique no link para redefinir a senha

**Configuração do Email Template:**
1. Vá em **Authentication → Email Templates**
2. Selecione "Reset Password"
3. Verifique se o link de redirect está correto
4. Personalize o template conforme necessário

## 📱 Mobile

O mobile agora usa Supabase Auth com persistência via AsyncStorage, permitindo que a sessão seja mantida mesmo após fechar o app. O cliente Supabase detecta automaticamente a plataforma e usa:
- **Web**: localStorage (padrão do navegador)
- **Mobile**: AsyncStorage (React Native)

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
