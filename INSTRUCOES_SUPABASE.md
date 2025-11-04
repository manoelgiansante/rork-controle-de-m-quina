# 🛠️ Instruções para Configurar o Supabase - Controle de Máquina

## ✅ Passo a Passo Completo

### 1️⃣ **Abrir o SQL Editor do Supabase**

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. No menu lateral esquerdo, clique em **SQL Editor**
3. Clique em **New query** (ou "+ New Query")

---

### 2️⃣ **Copiar e Colar o Script SQL**

1. Abra o arquivo `SUPABASE_FINAL_SETUP.sql` que está na raiz do seu projeto
2. **Copie TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)
3. **Cole no SQL Editor** do Supabase
4. Clique em **Run** (botão no canto inferior direito)

⏳ **Aguarde a execução** - pode levar de 5 a 10 segundos.

---

### 3️⃣ **Verificar se Funcionou**

Após executar, você deve ver:

✅ **Success. No rows returned**  
ou  
✅ Uma lista com várias mensagens de "Success"

---

### 4️⃣ **Confirmar que as Tabelas Foram Criadas**

1. No menu lateral, clique em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - ✅ `properties`
   - ✅ `machines`
   - ✅ `refuelings`
   - ✅ `maintenances`
   - ✅ `alerts`
   - ✅ `farm_tanks`
   - ✅ `user_preferences`

---

### 5️⃣ **Testar no Site**

1. Vá para **controledemaquina.com.br**
2. Faça login
3. Tente **cadastrar uma nova máquina**

Se tudo estiver correto:
- ✅ A máquina será salva sem erros
- ✅ Não aparecerá mais o erro 403 ou "violates row-level security policy"

---

## 🔧 O Que Foi Corrigido

### No Banco de Dados (SQL):
1. ✅ Todas as tabelas foram recriadas do zero
2. ✅ Coluna `user_id` adicionada à tabela `properties`
3. ✅ Coluna `type` confirmada na tabela `machines`
4. ✅ Policies (RLS) configuradas corretamente
5. ✅ Índices criados para performance
6. ✅ Triggers para atualizar `updated_at` automaticamente

### No Código (TypeScript):
1. ✅ Função `createProperty()` agora envia o `user_id` corretamente
2. ✅ Função `fetchUserPreferences()` usa `.maybeSingle()` para evitar erro 406

---

## ❓ Possíveis Problemas

### Erro: "relation already exists"
**Solução:** O script já deleta as tabelas antigas antes de criar. Se der erro, execute apenas a parte de DELETE primeiro:

```sql
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS maintenances CASCADE;
DROP TABLE IF EXISTS refuelings CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS farm_tanks CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
```

Depois execute o resto do script.

---

### Erro: "new row violates row-level security policy"
**Causa:** As policies não estão permitindo o INSERT.

**Solução:** Verifique se você está logado no site. As policies verificam `auth.uid()`, então você precisa estar autenticado.

---

### Erro 403 ao buscar propriedades
**Causa:** O usuário não tem permissão para ver propriedades.

**Solução:** Faça logout e login novamente para renovar o token do Supabase.

---

## 📞 Precisa de Ajuda?

Se ainda tiver problemas após seguir estes passos, me avise e forneça:

1. O erro exato que aparece no console (F12 → Console)
2. Uma captura de tela da aba **Table Editor** mostrando as tabelas criadas
3. O resultado da query SQL (Success ou erro)

Boa sorte! 🚀
