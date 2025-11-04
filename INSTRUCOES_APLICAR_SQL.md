# Como Aplicar o SQL no Supabase

## Passo a Passo

### 1. Acesse o Supabase
- Vá para https://supabase.com
- Faça login na sua conta
- Selecione o projeto do **Controle de Máquina**

### 2. Abra o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Você verá uma área de texto onde pode colar comandos SQL

### 3. Execute o Script
- Abra o arquivo `SUPABASE_SETUP_CORRETO.sql`
- Copie TODO o conteúdo do arquivo
- Cole no SQL Editor do Supabase
- Clique no botão **"RUN"** (geralmente fica no canto inferior direito)

### 4. Aguarde a Execução
- O script vai:
  - Deletar todas as tabelas antigas (se existirem)
  - Criar todas as tabelas novas
  - Configurar os índices
  - Ativar o RLS (Row Level Security)
  - Criar todas as policies de segurança
  - Configurar os triggers automáticos

### 5. Verifique se Funcionou
- No menu lateral, clique em **"Table Editor"**
- Você deve ver as seguintes tabelas:
  - ✅ properties
  - ✅ machines
  - ✅ refuelings
  - ✅ maintenances
  - ✅ alerts
  - ✅ farm_tanks
  - ✅ user_preferences

### 6. Teste no App
- Faça logout e login novamente no app
- Tente criar uma propriedade
- Tente criar uma máquina
- Os erros devem ter sumido!

## O que o Script Faz

### Tabelas Criadas
1. **properties** - Armazena as propriedades/fazendas do usuário
2. **machines** - Armazena as máquinas (tratores, caminhões, etc)
3. **refuelings** - Registros de abastecimento
4. **maintenances** - Registros de manutenção
5. **alerts** - Alertas de manutenção preventiva
6. **farm_tanks** - Tanques de combustível da fazenda
7. **user_preferences** - Preferências do usuário (tipos de serviço, itens de manutenção)

### Segurança (RLS)
Todas as tabelas têm políticas de segurança que garantem que:
- Você só vê seus próprios dados
- Você só pode criar/editar/deletar seus próprios dados
- Ninguém mais tem acesso aos seus dados

### Relacionamentos
- Todas as máquinas pertencem a uma propriedade
- Todos os abastecimentos e manutenções pertencem a uma máquina
- Todos os alertas são criados a partir de manutenções
- Tudo é deletado em cascata quando você deleta uma propriedade

## Problemas Comuns

### Erro: "permission denied"
- Certifique-se de que está logado no Supabase
- Verifique se está no projeto correto

### Erro: "already exists"
- O script já deleta tudo antes de criar
- Se mesmo assim der erro, rode apenas a parte de DELETE no início do arquivo primeiro

### Tabelas não aparecem
- Atualize a página do Supabase
- Verifique se o script foi executado até o final sem erros

## Dúvidas?

Se algo não funcionar:
1. Copie a mensagem de erro completa
2. Me envie a mensagem
3. Envie uma screenshot do erro se possível
