-- ==========================================
-- CONTROLE DE MÁQUINA - SETUP COMPLETO SUPABASE
-- ==========================================
-- Este script recria todo o banco de dados do zero
-- Rode no SQL Editor do Supabase

-- ==========================================
-- 1. DELETAR TUDO (se houver)
-- ==========================================

DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS maintenances CASCADE;
DROP TABLE IF EXISTS refuelings CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS farm_tanks CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- ==========================================
-- 2. CRIAR TABELAS
-- ==========================================

-- Tabela: properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: machines
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'Trator',
  model TEXT NOT NULL,
  current_hour_meter NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: refuelings
CREATE TABLE refuelings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  liters NUMERIC NOT NULL,
  hour_meter NUMERIC NOT NULL,
  service_type TEXT,
  average_consumption NUMERIC,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: maintenances
CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  hour_meter NUMERIC NOT NULL,
  items TEXT[] NOT NULL,
  observation TEXT,
  item_revisions JSONB NOT NULL DEFAULT '[]',
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: alerts
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  maintenance_id UUID NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  maintenance_item TEXT NOT NULL,
  service_hour_meter NUMERIC NOT NULL,
  interval_hours INTEGER NOT NULL,
  next_revision_hour_meter NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ NOT NULL
);

-- Tabela: farm_tanks
CREATE TABLE farm_tanks (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  capacity_liters NUMERIC NOT NULL,
  current_liters NUMERIC NOT NULL,
  fuel_type TEXT NOT NULL,
  alert_level_liters NUMERIC NOT NULL
);

-- Tabela: user_preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  service_types TEXT[] DEFAULT '{}',
  maintenance_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_machines_property_id ON machines(property_id);
CREATE INDEX idx_refuelings_property_id ON refuelings(property_id);
CREATE INDEX idx_refuelings_machine_id ON refuelings(machine_id);
CREATE INDEX idx_maintenances_property_id ON maintenances(property_id);
CREATE INDEX idx_maintenances_machine_id ON maintenances(machine_id);
CREATE INDEX idx_alerts_property_id ON alerts(property_id);
CREATE INDEX idx_alerts_machine_id ON alerts(machine_id);
CREATE INDEX idx_alerts_maintenance_id ON alerts(maintenance_id);

-- ==========================================
-- 4. ATIVAR ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE refuelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. CRIAR POLICIES PARA PROPERTIES
-- ==========================================

-- Usuários podem VER suas próprias propriedades
CREATE POLICY "Users can view own properties"
ON properties FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem CRIAR suas próprias propriedades
CREATE POLICY "Users can insert own properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem ATUALIZAR suas próprias propriedades
CREATE POLICY "Users can update own properties"
ON properties FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Usuários podem DELETAR suas próprias propriedades
CREATE POLICY "Users can delete own properties"
ON properties FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- 6. CRIAR POLICIES PARA MACHINES
-- ==========================================

-- Usuários podem VER máquinas das suas propriedades
CREATE POLICY "Users can view own machines"
ON machines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
);

-- Usuários podem CRIAR máquinas nas suas propriedades
CREATE POLICY "Users can insert own machines"
ON machines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
);

-- Usuários podem ATUALIZAR máquinas das suas propriedades
CREATE POLICY "Users can update own machines"
ON machines FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
);

-- Usuários podem DELETAR máquinas das suas propriedades
CREATE POLICY "Users can delete own machines"
ON machines FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = machines.property_id
    AND properties.user_id = auth.uid()
  )
);

-- ==========================================
-- 7. CRIAR POLICIES PARA REFUELINGS
-- ==========================================

CREATE POLICY "Users can view own refuelings"
ON refuelings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = refuelings.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own refuelings"
ON refuelings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = refuelings.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own refuelings"
ON refuelings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = refuelings.property_id
    AND properties.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = refuelings.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own refuelings"
ON refuelings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = refuelings.property_id
    AND properties.user_id = auth.uid()
  )
);

-- ==========================================
-- 8. CRIAR POLICIES PARA MAINTENANCES
-- ==========================================

CREATE POLICY "Users can view own maintenances"
ON maintenances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = maintenances.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own maintenances"
ON maintenances FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = maintenances.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own maintenances"
ON maintenances FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = maintenances.property_id
    AND properties.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = maintenances.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own maintenances"
ON maintenances FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = maintenances.property_id
    AND properties.user_id = auth.uid()
  )
);

-- ==========================================
-- 9. CRIAR POLICIES PARA ALERTS
-- ==========================================

CREATE POLICY "Users can view own alerts"
ON alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = alerts.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own alerts"
ON alerts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = alerts.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own alerts"
ON alerts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = alerts.property_id
    AND properties.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = alerts.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own alerts"
ON alerts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = alerts.property_id
    AND properties.user_id = auth.uid()
  )
);

-- ==========================================
-- 10. CRIAR POLICIES PARA FARM_TANKS
-- ==========================================

CREATE POLICY "Users can view own farm tanks"
ON farm_tanks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = farm_tanks.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upsert own farm tanks"
ON farm_tanks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = farm_tanks.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own farm tanks"
ON farm_tanks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = farm_tanks.property_id
    AND properties.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = farm_tanks.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own farm tanks"
ON farm_tanks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = farm_tanks.property_id
    AND properties.user_id = auth.uid()
  )
);

-- ==========================================
-- 11. CRIAR POLICIES PARA USER_PREFERENCES
-- ==========================================

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- 12. CRIAR FUNÇÃO E TRIGGER PARA AUTO-ATUALIZAR updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
BEFORE UPDATE ON machines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SETUP COMPLETO! ✅
-- ==========================================
-- Agora você pode testar criando uma propriedade e uma máquina.
-- O sistema deve funcionar corretamente.
