# Correções Aplicadas - Android Build versionCode 21

## ✅ Problema 1: expo-in-app-purchases incompatível - RESOLVIDO
**Erro:** Dependência `expo-in-app-purchases` incompatível com Expo SDK 54

**Solução:**
- Removida dependência de `package.json`
- Reescrito `lib/SubscriptionService.ts` para desabilitar IAP
- Métodos retornam null/vazio com console warnings
- Interfaces TypeScript mantidas para compatibilidade

**Commit:** ca965dc

## ✅ Problema 2: BuildConfig unresolved reference - RESOLVIDO
**Erro:** Kotlin compilation - `Unresolved reference 'BuildConfig'`
- MainActivity.kt:39
- MainApplication.kt:32, 34, 44

**Solução:**
Adicionado import: `import app.rork.controle_de_maquina.BuildConfig`

**Commit:** d5ded33

## ⚠️ Problema 3: Keystore Signing Mismatch - REQUER AÇÃO MANUAL

**Erro:**
```
App Bundle assinado com chave incorreta
Esperado SHA1: 7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35
Recebido SHA1: 3E:72:E2:81:13:6F:4A:9A:6F:FA:0F:68:33:36:B8:2D:D9:3F:AF:51
```

### SOLUÇÕES:

**A) Usar keystore original (RECOMENDADO)**
```bash
eas credentials
# Selecione Android > production > Keystore
# Upload keystore original (.jks/.keystore)
```

**B) Google Play App Signing**
- Google Play Console > Setup > App signing
- Migrar para Google Play App Signing

**C) Novo app (ÚLTIMA OPÇÃO)**
- Publicar como novo app
- Usuários perdem histórico/reviews

## Status Atual

### Android Build 0ffc6348-b862-4e47-9553-59d67bc35e21
- Status: FAILED (keystore mismatch)
- Version Code: 21
- Commit: d5ded33

### iOS Build 25
- Status: ✅ SUCCESS
- Version: 1.3.3
- Supabase Sync: Funcionando

## Próximos Passos
1. **URGENTE:** Resolver keystore (ver Problema 3)
2. Nova build Android após resolver keystore
3. Submit para Google Play Store
