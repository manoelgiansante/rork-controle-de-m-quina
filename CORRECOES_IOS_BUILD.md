# 🚨 CORREÇÕES URGENTES PARA BUILD iOS

**Data:** 7 de novembro de 2025  
**Status:** CRÍTICO - Requer ação imediata

---

## 📋 PROBLEMA IDENTIFICADO

O app **crasha imediatamente ao abrir no iOS** devido a incompatibilidades de versões:

- ❌ React 19.1.0 é **INCOMPATÍVEL** com React Native 0.81.5
- ❌ Expo SDK 54 **REQUER** React 18.3.1
- ❌ New Architecture causando crashes de TurboModules

---

## ✅ MUDANÇA 1: Atualizar package.json

### Editar: `package.json`

Altere estas 3 linhas:

```diff
- "react": "19.1.0",
+ "react": "18.3.1",

- "react-dom": "19.1.0",
+ "react-dom": "18.3.1",

- "react-native": "0.81.5",
+ "react-native": "0.76.5",
```

### ⚠️ Por que esta mudança é necessária?

- Expo SDK 54 é certificado para React 18.3.1
- React 19 introduziu breaking changes incompatíveis com RN 0.81.x
- React Native 0.76.5 é a versão estável recomendada

---

## ✅ MUDANÇA 2: Atualizar app.json

### Editar: `app.json`

Fazer 4 alterações:

#### 2.1 - Atualizar versão do app:

```diff
- "version": "1.0.9",
+ "version": "1.2.0",
```

#### 2.2 - Desabilitar New Architecture:

```diff
- "newArchEnabled": true,
+ "newArchEnabled": false,
```

#### 2.3 - Corrigir Bundle ID e desabilitar iPad:

```diff
- "ios": {
-   "supportsTablet": true,
-   "bundleIdentifier": "app.rork.controle-de-maquina"
- },
+ "ios": {
+   "supportsTablet": false,
+   "bundleIdentifier": "com.manoel.controledemaquina",
+   "infoPlist": {
+     "ITSAppUsesNonExemptEncryption": false
+   }
+ },
```

### ⚠️ Por que esta mudança é necessária?

- `newArchEnabled: false` → Reverte para arquitetura estável (a New Architecture está causando crashes)
- `bundleIdentifier` → Precisa ser `com.manoel.controledemaquina` para publicar
- `supportsTablet: false` → iPad desabilitado conforme solicitado
- `version: 1.2.0` → Para diferenciar este build dos anteriores

---

## ✅ MUDANÇA 3: Código já corrigido ✓

As correções de `try-catch` e `optional chaining` nos arquivos:
- ✅ `contexts/AuthContext.tsx` 
- ✅ `contexts/DataContext.tsx`

**Já foram aplicadas** no commit anterior. Não precisa fazer nada aqui.

---

## 🚀 CHECKLIST DE AÇÕES

Após aplicar as mudanças acima:

### 1. Limpar e Reinstalar Dependências

```bash
# Remover node_modules e cache
rm -rf node_modules
rm -rf .expo
rm -rf ios
rm -rf android

# Limpar cache do bun
rm -rf bun.lock

# Reinstalar tudo do zero
bun install

# Regenerar pastas nativas
bunx expo prebuild --clean
```

### 2. Testar no Simulador iOS (OBRIGATÓRIO)

```bash
# Rodar no simulador
bunx expo run:ios
```

**Verificar:**
- ✅ O app abre sem crashar?
- ✅ O login funciona?
- ✅ Os dados carregam?
- ✅ Navegação entre telas funciona?

### 3. Build para Produção

Se o teste local funcionar:

```bash
# Fazer build para iOS
eas build --platform ios

# Ou ambos
eas build --platform all
```

---

## 📊 RESULTADO ESPERADO

### Antes (versão 1.0.x):
- ❌ Build compila mas crasha ao abrir
- ❌ Hermes JavaScript Engine error
- ❌ TurboModule error
- ❌ iOS inutilizável

### Depois (versão 1.2.0):
- ✅ Build compila
- ✅ App abre normalmente
- ✅ Funcionalidades funcionam
- ✅ iOS e Android funcionais

---

## 🎯 PRIORIDADE

**URGENTE** - Cliente aguardando há mais de 8 horas

---

## 📎 REFERÊNCIAS

- Expo SDK 54 Docs: https://docs.expo.dev/
- React Native 0.76 Release: https://reactnative.dev/
- App Store Connect: https://appstoreconnect.apple.com/

---

## ✉️ CONTATO

**Cliente:** Manoel Nascimento  
**Email:** manoelgiansante2m@gmail.com  
**Bundle ID:** com.manoel.controledemaquina
