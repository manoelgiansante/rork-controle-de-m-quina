# 🔧 INSTRUÇÕES - CORREÇÃO PROFILES E SUBSCRIPTIONS

## 🚨 PROBLEMA IDENTIFICADO

- **6 usuários cadastrados** na tabela `auth.users`
- **0 registros** na tabela `public.profiles`
- **0 registros** na tabela `public.subscriptions`
- **Trigger automático NÃO existe ou NÃO está funcionando**

## ✅ SOLUÇÃO

Este guia explica como corrigir o problema executando o script SQL `FIX_PROFILES_SUBSCRIPTIONS.sql`.

---

## 📋 PASSO A PASSO

### 1️⃣ Acessar o Supabase

1. Acesse: https://supabase.com/dashboard
2. Faça login com sua conta
3. Selecione o projeto: **Controle de Máquina**
4. No menu lateral, clique em **SQL Editor**

### 2️⃣ Executar o Script de Correção

1. No SQL Editor, clique em **New Query** (Nova Consulta)
2. Abra o arquivo `FIX_PROFILES_SUBSCRIPTIONS.sql` que foi criado
3. Copie **TODO O CONTEÚDO** do arquivo
4. Cole no editor SQL do Supabase
5. Clique em **Run** (Executar) ou pressione `Ctrl+Enter`

### 3️⃣ Verificar os Resultados

Após executar o script, você verá no final:

```
✅ total_usuarios: 6
✅ total_perfis: 6
```

E uma tabela listando todos os usuários com seus perfis:

| id | email | full_name | profile_created_at |
|----|-------|-----------|-------------------|
| 021b0e89... | manoelgiansante@gmail.com | Nome do Usuário | 2025-01-... |
| 16293c41... | reviewnovo1@gmail.com | Nome do Usuário | 2025-01-... |
| ... | ... | ... | ... |

### 4️⃣ Confirmar que o Trigger Está Funcionando

Execute esta query para testar (NÃO precisa executar, apenas para referência):

```sql
-- Ver se o trigger existe
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

**Resultado esperado:**
- `trigger_name`: on_auth_user_created
- `event_manipulation`: INSERT
- `event_object_table`: users

---

## 🔍 O QUE O SCRIPT FAZ

### 1. Cria a Tabela `profiles`
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Cria Políticas de Segurança (RLS)
- Usuários podem ver apenas seu próprio perfil
- Usuários podem criar/atualizar apenas seu próprio perfil

### 3. Cria Trigger Automático
Quando um novo usuário se cadastrar, o trigger automaticamente:
- Cria um registro em `public.profiles`
- Preenche `full_name` com o nome do usuário ou email
- Define `created_at` como a data atual

### 4. Popula Perfis para Usuários Existentes
Para os 6 usuários que já existem:
- Cria um perfil para cada um
- Extrai o nome do `user_metadata` ou usa o email

### 5. Cria/Verifica Tabela `subscriptions`
- Cria a tabela se não existir
- Configura RLS
- Cria índices para performance

---

## 🧪 COMO TESTAR APÓS APLICAR

### Teste 1: Verificar Perfis Criados
```sql
SELECT COUNT(*) FROM public.profiles;
-- Resultado esperado: 6
```

### Teste 2: Ver Todos os Perfis
```sql
SELECT 
  p.id,
  p.full_name,
  u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;
```

### Teste 3: Criar Novo Usuário (Teste Manual)
1. Vá para: https://controledemaquina.com.br/login
2. Clique em "Criar Conta"
3. Preencha os dados e crie uma conta de teste
4. Volte ao Supabase e execute:
```sql
SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 1;
-- Deve mostrar o perfil do usuário recém-criado
```

---

## 📊 USUÁRIOS AFETADOS

Os seguintes usuários receberão perfis criados automaticamente:

1. **manoelgiansante@gmail.com** (ID: 021b0e89-7ce2-4d1f-944e-15e77bf3fd89)
2. **reviewnovo1@gmail.com** (ID: 16293c41-ccc0-4dfd-9675-55e5c971840b)
3. **confinamento2m@gmail.com** (ID: 7567233c-1954-4443-b3fe-43645668bf08)
4. **confinamento@gmail.com** (ID: c5bf7abd-2c65-47c1-9773-402633a461da)
5. **reviewnovo@gmail.com** (ID: e18f9e5f-1097-46a3-82f4-76685597aaba)
6. **valentina.amad.herzog@gmail.com** (ID: e43187cf-3a59-48f2-a902-095c61961523)

---

## ⚠️ IMPORTANTE

### ✅ O QUE SERÁ CORRIGIDO
- [x] Tabela `profiles` será criada com estrutura correta
- [x] Políticas RLS configuradas
- [x] Trigger automático para novos usuários
- [x] Perfis criados para os 6 usuários existentes
- [x] Tabela `subscriptions` pronta para uso
- [x] Webhook do Stripe poderá salvar dados

### ❌ O QUE NÃO SERÁ AFETADO
- [ ] Dados existentes em outras tabelas (machines, properties, etc.)
- [ ] Usuários não perderão acesso
- [ ] Nenhum dado será deletado

---

## 🎯 PRÓXIMOS PASSOS APÓS CORREÇÃO

### 1. Testar Login no App
1. Faça login no app: https://controledemaquina.com.br
2. Verifique se o app carrega normalmente
3. Verifique se as funcionalidades funcionam

### 2. Testar Webhook do Stripe
1. Faça uma compra de teste
2. Verifique se a assinatura é salva em `subscriptions`
3. Execute:
```sql
SELECT * FROM subscriptions WHERE user_id = 'SEU_USER_ID';
```

### 3. Testar Sincronização de Assinatura
1. Faça login no app
2. Vá para a aba "Assinatura"
3. Clique em "Atualizar Status da Assinatura"
4. Verifique se o status atualiza corretamente

---

## 📞 SUPORTE

Se encontrar algum problema:
1. Capture o erro exibido no Supabase
2. Execute esta query para diagnóstico:
```sql
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_usuarios,
  (SELECT COUNT(*) FROM public.profiles) as total_perfis,
  (SELECT COUNT(*) FROM public.subscriptions) as total_assinaturas;
```
3. Envie os resultados para análise

---

## ✅ CHECKLIST FINAL

Após executar o script, confirme:

- [ ] Script executou sem erros
- [ ] `SELECT COUNT(*) FROM profiles` retorna 6
- [ ] Todos os 6 usuários têm perfil criado
- [ ] Trigger `on_auth_user_created` existe
- [ ] Tabela `subscriptions` existe e tem RLS ativado
- [ ] App funciona normalmente após a correção

---

**PRIORIDADE:** 🔴 CRÍTICA - Bloqueando funcionamento do app

**TEMPO ESTIMADO:** 5-10 minutos

**RISCO:** ✅ Baixo - Script usa `IF NOT EXISTS` e não deleta dados
