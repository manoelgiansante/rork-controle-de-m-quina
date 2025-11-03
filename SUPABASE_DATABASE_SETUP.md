# Configuração do Banco de Dados Supabase

## Passo 1: Criar as Tabelas

Acesse o Supabase Dashboard → SQL Editor e execute os comandos abaixo:

### 1. Tabela de Propriedades

```sql
-- Criar tabela de propriedades
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por usuário
CREATE INDEX idx_properties_user_id ON properties(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: usuário só vê suas próprias propriedades
CREATE POLICY "Users can view own properties" ON properties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties" ON properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties" ON properties
  FOR DELETE USING (auth.uid() = user_id);
```

### 2. Tabela de Máquinas

```sql
-- Criar tabela de máquinas
CREATE TABLE machines (
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
```

### 3. Tabela de Abastecimentos

```sql
-- Criar tabela de abastecimentos
CREATE TABLE refuelings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  liters DECIMAL NOT NULL,
  hour_meter DECIMAL NOT NULL,
  service_type TEXT,
  average_consumption DECIMAL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_refuelings_property_id ON refuelings(property_id);
CREATE INDEX idx_refuelings_machine_id ON refuelings(machine_id);
CREATE INDEX idx_refuelings_date ON refuelings(date);

-- Habilitar RLS
ALTER TABLE refuelings ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own refuelings" ON refuelings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = refuelings.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own refuelings" ON refuelings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = refuelings.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own refuelings" ON refuelings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = refuelings.property_id 
      AND properties.user_id = auth.uid()
    )
  );
```

### 4. Tabela de Manutenções

```sql
-- Criar tabela de manutenções
CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  hour_meter DECIMAL NOT NULL,
  items TEXT[] NOT NULL,
  observation TEXT,
  item_revisions JSONB NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_maintenances_property_id ON maintenances(property_id);
CREATE INDEX idx_maintenances_machine_id ON maintenances(machine_id);
CREATE INDEX idx_maintenances_created_at ON maintenances(created_at);

-- Habilitar RLS
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own maintenances" ON maintenances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenances.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own maintenances" ON maintenances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenances.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own maintenances" ON maintenances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenances.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own maintenances" ON maintenances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenances.property_id 
      AND properties.user_id = auth.uid()
    )
  );
```

### 5. Tabela de Alertas

```sql
-- Criar tabela de alertas
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  maintenance_id UUID NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  maintenance_item TEXT NOT NULL,
  service_hour_meter DECIMAL NOT NULL,
  interval_hours INTEGER NOT NULL,
  next_revision_hour_meter DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_alerts_property_id ON alerts(property_id);
CREATE INDEX idx_alerts_machine_id ON alerts(machine_id);
CREATE INDEX idx_alerts_maintenance_id ON alerts(maintenance_id);
CREATE INDEX idx_alerts_status ON alerts(status);

-- Habilitar RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = alerts.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own alerts" ON alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = alerts.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = alerts.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own alerts" ON alerts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = alerts.property_id 
      AND properties.user_id = auth.uid()
    )
  );
```

### 6. Tabela de Tanques de Combustível

```sql
-- Criar tabela de tanques
CREATE TABLE farm_tanks (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  capacity_liters DECIMAL NOT NULL,
  current_liters DECIMAL NOT NULL,
  fuel_type TEXT NOT NULL,
  alert_level_liters DECIMAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE farm_tanks ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own farm_tanks" ON farm_tanks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = farm_tanks.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own farm_tanks" ON farm_tanks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = farm_tanks.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own farm_tanks" ON farm_tanks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = farm_tanks.property_id 
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own farm_tanks" ON farm_tanks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = farm_tanks.property_id 
      AND properties.user_id = auth.uid()
    )
  );
```

### 7. Tabela de Tipos de Serviço e Itens de Manutenção (usuário)

```sql
-- Criar tabela de preferências do usuário
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  service_types TEXT[] DEFAULT '{}',
  maintenance_items TEXT[] DEFAULT ARRAY[
    'Troca de óleo do motor',
    'Troca do filtro de óleo',
    'Troca do filtro de diesel',
    'Troca do filtro de ar do motor',
    'Troca do filtro hidráulico',
    'Troca do óleo da transmissão',
    'Troca do óleo hidráulico'
  ],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);
```

### 8. Função para atualizar updated_at automaticamente

```sql
-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para as tabelas
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_tanks_updated_at
  BEFORE UPDATE ON farm_tanks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Passo 2: Verificar a Configuração

Após executar todos os comandos SQL acima:

1. Vá em **Database** → **Tables** e verifique se todas as tabelas foram criadas:
   - `properties`
   - `machines`
   - `refuelings`
   - `maintenances`
   - `alerts`
   - `farm_tanks`
   - `user_preferences`

2. Verifique se o RLS (Row Level Security) está habilitado em todas as tabelas

3. Verifique as políticas (Policies) de cada tabela

## Passo 3: Testar

Após executar o SQL e implementar o novo código do aplicativo:

1. Faça login no app
2. Adicione uma máquina
3. Vá no Supabase Dashboard → **Table Editor**
4. Verifique se os dados aparecem nas tabelas

## Segurança

✅ **Row Level Security (RLS)** habilitado em todas as tabelas
✅ Cada usuário só acessa seus próprios dados
✅ Cascata de exclusão configurada (deletar propriedade → deleta tudo relacionado)
✅ Validações de tipo e constraints no banco
✅ Políticas de acesso granulares

## Benefícios

✅ Dados nunca são perdidos (mesmo que o usuário desinstale o app)
✅ Sincronização automática entre dispositivos
✅ Backup automático no Supabase
✅ Possibilidade de acessar de qualquer dispositivo
✅ Segurança com autenticação e RLS
