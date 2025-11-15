-- ========================================
-- DIAGNÓSTICO COMPLETO - Sistema de Emails
-- ========================================
-- Execute este SQL no SQL Editor do Supabase para diagnosticar o problema

-- 1. Ver estrutura da tabela properties
SELECT '=== 1. ESTRUTURA DA TABELA PROPERTIES ===' as info;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
ORDER BY ordinal_position;

-- 2. Ver dados das propriedades (primeiras 5)
SELECT '=== 2. DADOS DAS PROPRIEDADES ===' as info;
SELECT
  id,
  name,
  user_id,
  created_at
FROM properties
ORDER BY created_at DESC
LIMIT 5;

-- 3. Ver usuários do Auth
SELECT '=== 3. USUÁRIOS AUTH ===' as info;
SELECT
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Ver associação entre properties e users
SELECT '=== 4. ASSOCIAÇÃO PROPERTIES <-> USERS ===' as info;
SELECT
  p.id as property_id,
  p.name as property_name,
  p.user_id,
  u.email,
  CASE
    WHEN p.user_id = u.id THEN '✅ OK'
    ELSE '❌ PROBLEMA'
  END as status
FROM properties p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. Ver emails de notificação cadastrados
SELECT '=== 5. EMAILS DE NOTIFICAÇÃO ===' as info;
SELECT
  ne.email,
  ne.user_id,
  u.email as auth_email,
  ne.created_at
FROM notification_emails ne
LEFT JOIN auth.users u ON ne.user_id = u.id
ORDER BY ne.created_at DESC
LIMIT 10;

-- 6. Ver máquinas e suas propriedades
SELECT '=== 6. MÁQUINAS E PROPRIEDADES ===' as info;
SELECT
  m.id as machine_id,
  m.model,
  m.type,
  m.current_hour_meter,
  m.property_id,
  p.name as property_name,
  p.user_id,
  u.email as user_email
FROM machines m
LEFT JOIN properties p ON m.property_id = p.id
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE m.archived = false
ORDER BY m.created_at DESC
LIMIT 5;

-- 7. Ver manutenções
SELECT '=== 7. MANUTENÇÕES ===' as info;
SELECT
  ma.id as maintenance_id,
  ma.hour_meter,
  ma.items,
  ma.item_revisions,
  ma.machine_id,
  m.model as machine_model,
  p.name as property_name,
  u.email as user_email
FROM maintenances ma
LEFT JOIN machines m ON ma.machine_id = m.id
LEFT JOIN properties p ON ma.property_id = p.id
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY ma.created_at DESC
LIMIT 5;

-- 8. VERIFICAÇÃO CRÍTICA: Qual user_id deveria estar em properties?
SELECT '=== 8. VERIFICAÇÃO: TIPOS DE user_id ===' as info;
SELECT
  'Tipo user_id em properties:' as descricao,
  pg_typeof(user_id) as tipo
FROM properties
LIMIT 1;

SELECT
  'Tipo id em auth.users:' as descricao,
  pg_typeof(id) as tipo
FROM auth.users
LIMIT 1;

-- 9. Buscar especificamente seu usuário
SELECT '=== 9. SEU USUÁRIO ESPECÍFICO ===' as info;
SELECT
  u.id as auth_user_id,
  u.email,
  (SELECT COUNT(*) FROM properties WHERE user_id = u.id) as num_properties,
  (SELECT COUNT(*) FROM notification_emails WHERE user_id = u.id) as num_emails
FROM auth.users u
WHERE u.email LIKE '%manoelgiansante%'
OR u.email LIKE '%manoel%';

-- 10. Se seu usuário tem propriedades, mostrar quais são
SELECT '=== 10. SUAS PROPRIEDADES ===' as info;
SELECT
  p.*
FROM properties p
WHERE p.user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%manoelgiansante%' OR email LIKE '%manoel%'
);
