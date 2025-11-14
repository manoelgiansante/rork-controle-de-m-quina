-- ============================================
-- INVESTIGAÇÃO: Histórico de Tanque - confinamento2m@gmail.com
-- ============================================
-- Data: 14 de novembro de 2025
-- Objetivo: Investigar adições de ~2.700L no tanque e histórico de abastecimentos
-- ============================================

-- ============================================
-- 1. ENCONTRAR O USER_ID DO USUÁRIO
-- ============================================
SELECT
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'confinamento2m@gmail.com';

-- RESULTADO: Copie o user_id aqui → _________________


-- ============================================
-- 2. VER DADOS ATUAIS DO TANQUE
-- ============================================
-- Substitua 'USER_ID_AQUI' pelo ID encontrado acima
SELECT
    id,
    property_id,
    capacity_liters,
    current_liters,
    alert_level_liters,
    fuel_type,
    created_at,
    updated_at
FROM farm_tanks
WHERE property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
ORDER BY created_at DESC;


-- ============================================
-- 3. HISTÓRICO DE ADIÇÕES DE COMBUSTÍVEL AO TANQUE
-- ============================================
-- Procurar adições próximas a 2.700 litros
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
SELECT
    id,
    property_id,
    liters_added,
    timestamp,
    created_at
FROM farm_tank_additions
WHERE property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
AND liters_added >= 2500  -- Procurar adições entre 2500 e 3000 litros
AND liters_added <= 3000
ORDER BY timestamp DESC;


-- ============================================
-- 4. TODAS AS ADIÇÕES DE COMBUSTÍVEL (ÚLTIMAS 30 DIAS)
-- ============================================
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
SELECT
    id,
    property_id,
    liters_added,
    timestamp,
    created_at,
    DATE_TRUNC('day', timestamp) as dia
FROM farm_tank_additions
WHERE property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;


-- ============================================
-- 5. HISTÓRICO DE ABASTECIMENTOS DAS MÁQUINAS
-- ============================================
-- Ver todos os abastecimentos que deveriam ter descontado do tanque
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
SELECT
    r.id,
    r.machine_id,
    m.name as machine_name,
    r.liters,
    r.fuel_type,
    r.timestamp,
    r.created_at,
    DATE_TRUNC('day', r.timestamp) as dia
FROM refuelings r
LEFT JOIN machines m ON r.machine_id = m.id
WHERE r.property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
ORDER BY r.timestamp DESC
LIMIT 100;


-- ============================================
-- 6. SOMA TOTAL DE ABASTECIMENTOS (ÚLTIMOS 30 DIAS)
-- ============================================
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
SELECT
    COUNT(*) as total_abastecimentos,
    SUM(liters) as total_litros_abastecidos,
    MIN(timestamp) as primeiro_abastecimento,
    MAX(timestamp) as ultimo_abastecimento
FROM refuelings
WHERE property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
AND timestamp >= NOW() - INTERVAL '30 days';


-- ============================================
-- 7. CÁLCULO: BALANÇO DO TANQUE
-- ============================================
-- Comparar: Total Adicionado VS Total Consumido
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
WITH property_ids AS (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
),
additions AS (
    SELECT
        COALESCE(SUM(liters_added), 0) as total_adicionado
    FROM farm_tank_additions
    WHERE property_id IN (SELECT id FROM property_ids)
    AND timestamp >= NOW() - INTERVAL '30 days'
),
consumptions AS (
    SELECT
        COALESCE(SUM(liters), 0) as total_consumido
    FROM refuelings
    WHERE property_id IN (SELECT id FROM property_ids)
    AND timestamp >= NOW() - INTERVAL '30 days'
)
SELECT
    a.total_adicionado,
    c.total_consumido,
    (a.total_adicionado - c.total_consumido) as diferenca,
    CASE
        WHEN (a.total_adicionado - c.total_consumido) >= 0
        THEN 'Positivo (Sobrou combustível)'
        ELSE 'Negativo (Consumiu mais do que foi adicionado)'
    END as status
FROM additions a, consumptions c;


-- ============================================
-- 8. VER ABASTECIMENTOS REMOVIDOS (DELETADOS)
-- ============================================
-- NOTA: Esta query só funciona se você tiver um trigger de auditoria
-- Se não tiver, pule esta query
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
SELECT
    id,
    machine_id,
    liters,
    fuel_type,
    timestamp,
    deleted_at
FROM refuelings
WHERE property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
AND deleted_at IS NOT NULL
ORDER BY deleted_at DESC;


-- ============================================
-- 9. VERIFICAR SE HÁ ADIÇÃO DE ~2700L ESPECÍFICA
-- ============================================
-- Substitua 'USER_ID_AQUI' pelo ID encontrado
SELECT
    id,
    property_id,
    liters_added,
    timestamp,
    created_at,
    TO_CHAR(timestamp, 'DD/MM/YYYY HH24:MI:SS') as data_formatada
FROM farm_tank_additions
WHERE property_id IN (
    SELECT id FROM properties WHERE user_id = 'USER_ID_AQUI'
)
AND liters_added >= 2600
AND liters_added <= 2800
ORDER BY timestamp DESC;


-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Execute a Query #1 primeiro para pegar o user_id
-- 2. Substitua 'USER_ID_AQUI' em todas as queries seguintes
-- 3. Execute as queries na ordem para investigar o problema
-- 4. Compare os resultados da Query #7 (Balanço) com os dados do tanque (Query #2)
--
-- IMPORTANTE:
-- - Se o balanço (Query #7) não bater com current_liters do tanque (Query #2),
--   há uma inconsistência
-- - Verifique a Query #9 para encontrar a adição de ~2700L
-- - Compare a soma dos abastecimentos (Query #6) com as adições (Query #4)
-- ============================================
