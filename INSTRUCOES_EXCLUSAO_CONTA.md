# Instruções para Configurar Exclusão de Conta

## 📋 O que foi implementado

1. **Botão de Exclusão na página de Assinatura** (`app/(tabs)/subscription.tsx`)
   - Ícone de lixeira no final da página
   - Direciona para a página de exclusão de dados

2. **Página de Exclusão de Dados** (`app/exclusao-dados.tsx`)
   - Rota: `/exclusao-dados` (web) ou `https://controledemaquina.com.br/exclusao-dados` (mobile)
   - Interface completa com avisos e confirmação
   - Requer que o usuário digite "EXCLUIR" para confirmar
   - Lista todos os dados que serão excluídos

3. **Função do Supabase** (`SUPABASE_DELETE_ACCOUNT_FUNCTION.sql`)
   - Deleta todos os dados do usuário em cascata
   - Deleta: refueling, maintenance, machines, properties, subscriptions, profiles

4. **API Endpoint** (`api/delete-account.ts`)
   - Para uso no mobile
   - Usa a service role key do Supabase para deletar o usuário do Auth

## 🔧 Configuração no Supabase

### Passo 1: Criar a Função de Deletar Conta

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `SUPABASE_DELETE_ACCOUNT_FUNCTION.sql`
4. Clique em **Run** para executar

### Passo 2: Configurar Service Role Key (para API)

A API endpoint precisa da **Service Role Key** do Supabase para deletar usuários do Auth.

1. Acesse o Supabase Dashboard
2. Vá em **Settings** > **API**
3. Copie a **service_role key** (não é a anon key!)
4. Adicione ao arquivo `.env` ou nas variáveis de ambiente do Vercel:

```env
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

⚠️ **IMPORTANTE**: A Service Role Key tem permissões de admin. NUNCA a exponha no código do cliente!

## 📱 Para Google Play Store

Use esta URL para o campo de "URL de exclusão de conta":

```
https://controledemaquina.com.br/exclusao-dados
```

### Informações para preencher no Google Play Console:

**URL para exclusão de contas:**
```
https://controledemaquina.com.br/exclusao-dados
```

**Descrição do processo de exclusão:**
```
Os usuários podem solicitar a exclusão de sua conta através da página de Assinatura no aplicativo ou acessando diretamente a URL https://controledemaquina.com.br/exclusao-dados. 

Ao solicitar a exclusão, o usuário deverá:
1. Estar autenticado no aplicativo
2. Confirmar a ação digitando "EXCLUIR"
3. Confirmar novamente através de um diálogo de confirmação

Após a confirmação, todos os dados do usuário serão permanentemente excluídos, incluindo:
- Todas as máquinas cadastradas
- Todo o histórico de manutenções
- Todo o histórico de abastecimentos
- Todas as propriedades
- Perfil do usuário
- Assinatura (se houver)

A exclusão é imediata e irreversível.
```

**Prazo para exclusão:**
```
Imediatamente após a confirmação do usuário
```

## 🧪 Como Testar

### Na Web:
1. Faça login no aplicativo
2. Vá para a aba **Assinatura**
3. Role até o final da página
4. Clique em **Excluir Minha Conta**
5. Será redirecionado para `/exclusao-dados`
6. Digite "EXCLUIR" no campo de confirmação
7. Clique em **Excluir Permanentemente Minha Conta**
8. Confirme no diálogo
9. Aguarde a exclusão
10. Será redirecionado para a tela de login

### No Mobile:
1. Faça login no aplicativo
2. Vá para a aba **Assinatura**
3. Role até o final da página
4. Toque em **Excluir Minha Conta**
5. Será mostrado um alerta com a URL
6. Acesse a URL no navegador: `https://controledemaquina.com.br/exclusao-dados`
7. Siga os mesmos passos do web

## 📊 O que é Deletado

Quando um usuário deleta sua conta, os seguintes dados são **permanentemente removidos**:

1. **Tabela `refueling`**: Todos os registros de abastecimento
2. **Tabela `maintenance`**: Todos os registros de manutenção
3. **Tabela `machines`**: Todas as máquinas cadastradas
4. **Tabela `properties`**: Todas as propriedades
5. **Tabela `subscriptions`**: Registro de assinatura
6. **Tabela `profiles`**: Perfil do usuário
7. **Auth**: Usuário removido do sistema de autenticação

## 🛡️ Segurança

- A função `delete_user_account` usa `SECURITY DEFINER` para garantir que apenas o próprio usuário possa deletar seus dados
- Apenas usuários autenticados podem chamar a função
- A API endpoint valida o userId antes de executar qualquer operação
- A Service Role Key é mantida no servidor e nunca exposta ao cliente
- Confirmação dupla: usuário precisa digitar "EXCLUIR" e confirmar no diálogo

## 📞 Suporte

O email de suporte mostrado na página de exclusão:
```
suporte@controledemaquina.com.br
```

Certifique-se de que este email existe e está sendo monitorado!

## ✅ Checklist Final

- [ ] Executar SQL no Supabase para criar a função `delete_user_account`
- [ ] Adicionar `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente
- [ ] Testar exclusão de conta na web
- [ ] Testar exclusão de conta no mobile (via URL)
- [ ] Verificar se todos os dados são deletados
- [ ] Verificar se o usuário é redirecionado para login
- [ ] Configurar email de suporte (se ainda não existe)
- [ ] Adicionar URL no Google Play Console
- [ ] Testar URL no navegador mobile
