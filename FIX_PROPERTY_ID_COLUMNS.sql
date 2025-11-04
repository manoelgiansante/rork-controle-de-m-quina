-- SQL para adicionar a coluna property_id nas tabelas que estão faltando
-- Execute este SQL no SQL Editor do Supabase

-- 1. Verificar se a coluna property_id já existe na tabela machines
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='machines' AND column_name='property_id'
    ) THEN
        ALTER TABLE machines ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_machines_property_id ON machines(property_id);
        
        -- Atualizar RLS policies
        DROP POLICY IF EXISTS "Users can view own machines" ON machines;
        CREATE POLICY "Users can view own machines" ON machines
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = machines.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can insert own machines" ON machines;
        CREATE POLICY "Users can insert own machines" ON machines
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = machines.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can update own machines" ON machines;
        CREATE POLICY "Users can update own machines" ON machines
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = machines.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can delete own machines" ON machines;
        CREATE POLICY "Users can delete own machines" ON machines
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = machines.property_id 
              AND properties.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 2. Verificar se a coluna property_id já existe na tabela alerts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='alerts' AND column_name='property_id'
    ) THEN
        ALTER TABLE alerts ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_alerts_property_id ON alerts(property_id);
        
        -- Atualizar RLS policies
        DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
        CREATE POLICY "Users can view own alerts" ON alerts
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = alerts.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
        CREATE POLICY "Users can insert own alerts" ON alerts
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = alerts.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
        CREATE POLICY "Users can update own alerts" ON alerts
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = alerts.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can delete own alerts" ON alerts;
        CREATE POLICY "Users can delete own alerts" ON alerts
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = alerts.property_id 
              AND properties.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 3. Verificar se a coluna property_id já existe na tabela farm_tanks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='farm_tanks' AND column_name='property_id'
    ) THEN
        -- Se a tabela não tem property_id como PRIMARY KEY, vamos adicionar como coluna
        ALTER TABLE farm_tanks ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
        
        -- Criar constraint UNIQUE se necessário
        ALTER TABLE farm_tanks ADD CONSTRAINT farm_tanks_property_id_key UNIQUE (property_id);
        
        -- Atualizar RLS policies
        DROP POLICY IF EXISTS "Users can view own farm_tanks" ON farm_tanks;
        CREATE POLICY "Users can view own farm_tanks" ON farm_tanks
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = farm_tanks.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can insert own farm_tanks" ON farm_tanks;
        CREATE POLICY "Users can insert own farm_tanks" ON farm_tanks
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = farm_tanks.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can update own farm_tanks" ON farm_tanks;
        CREATE POLICY "Users can update own farm_tanks" ON farm_tanks
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = farm_tanks.property_id 
              AND properties.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS "Users can delete own farm_tanks" ON farm_tanks;
        CREATE POLICY "Users can delete own farm_tanks" ON farm_tanks
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM properties 
              WHERE properties.id = farm_tanks.property_id 
              AND properties.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 4. Verificar se user_preferences existe e tem as colunas corretas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name='user_preferences'
    ) THEN
        -- Criar tabela de preferências do usuário se não existir
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
    END IF;
END $$;
