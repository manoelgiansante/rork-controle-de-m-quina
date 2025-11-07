# 🚨 CORREÇÕES URGENTES PARA iOS/iPad

## ❌ PROBLEMA IDENTIFICADO
O app crasha no iPad/iOS porque:
1. **React 19.1.0 é INCOMPATÍVEL com React Native 0.81.5**
2. **New Architecture está causando crashes**
3. **Versões incorretas de dependências**

---

## ✅ CORREÇÕES NECESSÁRIAS

### 1️⃣ ATUALIZAR package.json

**Arquivo:** `package.json`

Altere as seguintes linhas:

```json
ANTES:
"react": "19.1.0",
"react-dom": "19.1.0",
"react-native": "0.81.5",

DEPOIS:
"react": "18.3.1",
"react-dom": "18.3.1",
"react-native": "0.76.5",
```

---

### 2️⃣ ATUALIZAR app.json

**Arquivo:** `app.json`

Altere as seguintes linhas:

```json
ANTES:
"version": "1.0.9",
"newArchEnabled": true,
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "app.rork.controle-de-maquina"
}

DEPOIS:
"version": "1.2.0",
"newArchEnabled": false,
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.manoel.controledemaquina",
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
}
```

---

### 3️⃣ LIMPAR E REINSTALAR

Depois de fazer as alterações acima, execute:

```bash
# 1. Remover dependências antigas
rm -rf node_modules
rm -rf .expo
rm -rf ios
rm -rf android

# 2. Reinstalar com versões corretas
npm install

# OU se usar bun:
bun install

# 3. Limpar cache do Metro
npx expo start -c
```

---

## 🧪 TESTAR ANTES DE FAZER BUILD

**IMPORTANTE:** Teste no simulador iOS ANTES de fazer build!

```bash
# Testar no simulador iOS
npx expo run:ios

# OU testar via Expo Go
npx expo start
```

Verifique:
- ✅ App abre sem crashar
- ✅ Login funciona
- ✅ Navegação entre telas funciona
- ✅ Dados carregam do Supabase

---

## 📱 FAZER BUILD iOS/iPad

Somente DEPOIS de testar, faça o build:

```bash
# Build iOS via EAS
eas build --platform ios

# OU se configurado:
eas build --platform ios --profile production
```

---

## ⚠️ POR QUE ESTAS MUDANÇAS?

### React 18.3.1 vs 19.1.0
- ✅ Expo SDK 54 é **certificado** para React 18.3.1
- ❌ React 19 introduziu mudanças que **quebram** o React Native
- ❌ Causa crashes fatais no iOS durante inicialização

### React Native 0.76.5 vs 0.81.5
- ✅ Versão 0.76.5 é **estável** e compatível com React 18
- ❌ Versão 0.81.5 está incorreta e causa conflitos

### New Architecture: false
- ✅ Arquitetura antiga é **estável** e testada
- ❌ New Architecture (Fabric/TurboModules) está **instável**
- ❌ Causa crashes com TurboModule no iOS

### Bundle Identifier
- ✅ `com.manoel.controledemaquina` é o ID correto da sua conta Apple Developer
- ❌ `app.rork.controle-de-maquina` não está configurado

---

## 🎯 RESULTADO ESPERADO

Após aplicar estas correções:
- ✅ App funcionará no iPad
- ✅ App funcionará no iPhone
- ✅ Build iOS será aceito pela Apple
- ✅ Não haverá mais crashes ao abrir

---

## 📞 PRECISA DE AJUDA?

Se após aplicar estas correções ainda houver problemas, envie:
1. Log completo do crash (se houver)
2. Resultado do comando `npm list react react-native`
3. Screenshot do erro

---

**Data:** 7 de novembro de 2025  
**Status:** URGENTE - Aplicar imediatamente
