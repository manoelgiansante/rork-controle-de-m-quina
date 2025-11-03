# Guia de Migração: AsyncStorage → Supabase

## O que vai mudar?

Atualmente, todos os dados do aplicativo são salvos localmente no dispositivo usando AsyncStorage. Isso significa que:
- ❌ Se o usuário desinstalar o app, perde todos os dados
- ❌ Não pode acessar os dados de outro dispositivo
- ❌ Não tem backup automático

Com o Supabase, os dados serão salvos na nuvem:
- ✅ Dados nunca são perdidos
- ✅ Sincronização automática entre dispositivos
- ✅ Backup automático
- ✅ Acesso de qualquer lugar

## Passo a Passo

### 1. Configurar o Banco de Dados no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Vá no seu projeto
3. Clique em **SQL Editor** no menu lateral
4. Abra o arquivo `SUPABASE_DATABASE_SETUP.md` que criei
5. Copie e execute TODOS os comandos SQL, um bloco por vez
6. Verifique se as tabelas foram criadas em **Database** → **Tables**

### 2. Verificar se está tudo certo

Após executar os comandos SQL, você deve ver estas tabelas:
- `properties` (Propriedades)
- `machines` (Máquinas)
- `refuelings` (Abastecimentos)
- `maintenances` (Manutenções)
- `alerts` (Alertas)
- `farm_tanks` (Tanques de combustível)
- `user_preferences` (Preferências do usuário)

### 3. Modificar os Contexts

Agora preciso modificar os arquivos:
- `contexts/PropertyContext.tsx` - Para salvar propriedades no Supabase
- `contexts/DataContext.tsx` - Para salvar todos os dados no Supabase

Isso vai fazer com que:
1. Quando o usuário adicionar uma máquina → salva no Supabase
2. Quando o usuário fizer login → busca os dados do Supabase
3. Todas as alterações → sincronizadas automaticamente

## Estrutura do Banco de Dados

```
auth.users (Supabase Auth)
└── properties (Propriedades do usuário)
    ├── machines (Máquinas da propriedade)
    │   ├── refuelings (Abastecimentos da máquina)
    │   ├── maintenances (Manutenções da máquina)
    │   └── alerts (Alertas da máquina)
    └── farm_tanks (Tanque de combustível da propriedade)

user_preferences (Tipos de serviço e itens de manutenção customizados)
```

## Segurança

Todas as tabelas têm **Row Level Security (RLS)** ativado:
- Cada usuário só vê seus próprios dados
- Não é possível acessar dados de outros usuários
- As políticas são gerenciadas automaticamente pelo Supabase

## Próximos Passos

Quer que eu continue e modifique os contexts para salvar no Supabase?

**O que vai acontecer:**
1. Vou modificar `PropertyContext.tsx`
2. Vou modificar `DataContext.tsx`
3. O app vai começar a salvar tudo no Supabase
4. Os dados existentes (AsyncStorage) serão migrados automaticamente na primeira vez

**Não vai quebrar nada:**
- Os dados locais continuarão funcionando até a migração
- A migração será automática e transparente para o usuário
- Se der erro, o app continua usando AsyncStorage
