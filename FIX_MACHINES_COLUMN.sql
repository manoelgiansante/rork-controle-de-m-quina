-- Este script corrige a coluna current_hour_meter na tabela machines
-- Execute este script no SQL Editor do Supabase

-- Verificar se a coluna existe
DO $$
BEGIN
    -- Se a coluna não existe, cria ela
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
