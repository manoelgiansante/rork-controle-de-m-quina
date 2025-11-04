# Correção: Erro ao Salvar Máquina

## Problema
O erro que está aparecendo é:
```
Error creating machine: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'current_hour_meter' column of 'machines' in the schema cache"}
```

Isso significa que a coluna `current_hour_meter` não existe na tabela `machines` do Supabase.

## Solução

### Opção 1: Script SQL Automático (Recomendado)
Execute o seguinte script no **SQL Editor do Supabase**:

```sql
-- Verificar se a coluna existe e adicionar se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machines' AND column_name = 'current_hour_meter'
    ) THEN
        ALTER TABLE public.machines ADD COLUMN current_hour_meter DECIMAL NOT NULL DEFAULT 0;
        RAISE NOTICE 'Coluna current_hour_meter adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna current_hour_meter já existe';
    END IF;
END $$;
```

### Opção 2: Script SQL Manual (se a Opção 1 não funcionar)
Se por algum motivo o script automático não funcionar, execute diretamente:

```sql
-- Adicionar a coluna current_hour_meter
ALTER TABLE public.machines ADD COLUMN current_hour_meter DECIMAL NOT NULL DEFAULT 0;
```

Se você receber um erro dizendo que a coluna já existe, significa que o problema é outro. Nesse caso, tente:

```sql
-- Recriar a tabela machines completamente
DROP TABLE IF EXISTS public.machines CASCADE;

CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  current_hour_meter DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por propriedade
CREATE INDEX idx_machines_property_id ON machines(property_id);

-- Habilitar RLS
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário só vê máquinas de suas propriedades
CREATE POLICY "Users can view own machines" ON machines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = machines.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own machines" ON machines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = machines.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own machines" ON machines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = machines.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own machines" ON machines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = machines.property_id 
      AND properties.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**⚠️ ATENÇÃO**: Esta opção 2 vai **deletar todas as máquinas existentes**! Use apenas se não tiver máquinas importantes no banco ou se tiver um backup.

## Como Executar

1. Acesse o **Supabase Dashboard**: https://byfgflxlmcdciupjpoaz.supabase.co
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New query**
4. Cole o script (comece pela Opção 1)
5. Clique em **Run** ou pressione `Ctrl+Enter`
6. Verifique se apareceu a mensagem de sucesso

## Verificação

Após executar o script, verifique se a coluna foi criada:

1. No Supabase Dashboard, vá em **Database** → **Tables**
2. Clique na tabela `machines`
3. Verifique se existe a coluna `current_hour_meter` com tipo `DECIMAL`

## Testar

Após executar o script:
1. Volte para o site: https://controledemaquina.com.br
2. Faça um **Hard Refresh**: `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
3. Tente cadastrar uma nova máquina
4. Verifique se o erro desapareceu

## Se o Erro Persistir

Se mesmo após executar o script o erro continuar:

1. Verifique no Console do navegador se há outros erros
2. Faça logout e login novamente
3. Limpe o cache do navegador completamente
4. Verifique se as variáveis de ambiente no Vercel estão corretas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Suporte

Se nada funcionar, entre em contato com o suporte fornecendo:
- Screenshot do erro no console
- Screenshot da estrutura da tabela `machines` no Supabase
- Resultado do script SQL executado
