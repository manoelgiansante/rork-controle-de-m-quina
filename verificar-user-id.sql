-- Ver qual user_id está na propriedade vs qual deveria estar
SELECT
  'Propriedade Fazenda sao miguel:' as info,
  p.user_id as user_id_na_propriedade,
  (SELECT id FROM auth.users WHERE email = 'manoelgiansante@gmail.com') as user_id_correto_do_auth,
  CASE
    WHEN p.user_id = (SELECT id FROM auth.users WHERE email = 'manoelgiansante@gmail.com')
    THEN '✅ CORRETO'
    ELSE '❌ ERRADO - PRECISA CORRIGIR!'
  END as status
FROM properties p
WHERE p.name = 'Fazenda sao miguel';
