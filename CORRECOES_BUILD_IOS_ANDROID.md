# 🚨 CORREÇÕES URGENTES - Build iOS e Android Crashando

## ❌ PROBLEMA IDENTIFICADO

O app está crashando tanto no iOS quanto no Android por causa de:

1. **React 19.1.0 é INCOMPATÍVEL com React Native 0.81.5**
2. **Expo 54 REQUER React 18.x**
3. **New Architecture está causando crashes**

---

## ✅ CORREÇÃO 1: package.json

### Abra o arquivo: `package.json`

### Localize estas linhas (linhas 45-47):
```json
"react": "19.1.0",
"react-dom": "19.1.0",
"react-native": "0.81.5",
```

### SUBSTITUA por:
```json
"react": "18.3.1",
"react-dom": "18.3.1",
"react-native": "0.76.5",
```

---

## ✅ CORREÇÃO 2: app.json

### Abra o arquivo: `app.json`

### Localize esta linha (linha 5):
```json
"version": "1.0.9",
```

### SUBSTITUA por:
```json
"version": "1.2.0",
```

---

### Localize esta linha (linha 10):
```json
"newArchEnabled": true,
```

### SUBSTITUA por:
```json
"newArchEnabled": false,
```

---

### Localize estas linhas (linhas 16-18):
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "app.rork.controle-de-maquina"
},
```

### SUBSTITUA por:
```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "com.manoel.controledemaquina",
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
},
```

---

## 🔧 PASSO A PASSO APÓS AS MUDANÇAS

### 1. Limpar tudo (OBRIGATÓRIO):
```bash
# Remover node_modules e locks
rm -rf node_modules
rm -rf bun.lock
rm -rf package-lock.json
rm -rf yarn.lock

# Limpar cache do Expo
rm -rf .expo

# Limpar builds nativos (se existirem)
rm -rf ios
rm -rf android
```

### 2. Reinstalar dependências:
```bash
npm install
# OU
bun install
```

### 3. Fazer o commit e push:
```bash
git add .
git commit -m "fix: corrigir versões React/RN para compatibilidade iOS/Android"
git push
```

### 4. Fazer novo build:
- Acesse: https://expo.dev
- Crie um novo build iOS (versão 1.2.0)
- Crie um novo build Android (versão 1.2.0)

---

## 📱 TESTAR ANTES DO BUILD (Recomendado)

### Opção 1 - Expo Go (mais rápido):
```bash
npx expo start
# Escanear QR code com Expo Go no celular
```

### Opção 2 - Simulador iOS (se tiver Mac):
```bash
npx expo run:ios
```

### Opção 3 - Emulador Android:
```bash
npx expo run:android
```

---

## ⚠️ POR QUE ESSAS MUDANÇAS?

### React 18.3.1 (ao invés de 19.1.0)
- Expo SDK 54 é certificado apenas para React 18.x
- React 19 quebra compatibilidade com React Native 0.76.x
- Causa crashes no iOS e Android ao inicializar

### React Native 0.76.5 (ao invés de 0.81.5)
- Versão estável e compatível com Expo 54
- 0.81.5 é uma versão experimental que causa problemas

### newArchEnabled: false
- New Architecture (Fabric/TurboModules) está instável
- Causa crashes em módulos nativos
- Reverter para arquitetura antiga resolve o problema

### bundleIdentifier correto
- Precisa ser `com.manoel.controledemaquina` para sua conta Apple Developer
- O anterior estava errado: `app.rork.controle-de-maquina`

### supportsTablet: false
- Evita problemas no iPad
- Foca apenas em iPhone/smartphones

---

## ✅ CHECKLIST

- [ ] ✏️ Editar `package.json` (React 18.3.1)
- [ ] ✏️ Editar `app.json` (newArchEnabled: false)
- [ ] 🗑️ Limpar node_modules, cache, locks
- [ ] 📦 Reinstalar dependências (npm install)
- [ ] 🧪 Testar com Expo Go (opcional mas recomendado)
- [ ] 💾 Commit e push
- [ ] 🚀 Fazer novo build no Expo

---

## 🎯 RESULTADO ESPERADO

Após essas correções:
- ✅ Build iOS vai compilar sem erros
- ✅ App iOS vai abrir sem crashar
- ✅ Build Android vai compilar sem erros
- ✅ App Android vai abrir sem crashar
- ✅ Todas as funcionalidades vão funcionar normalmente

---

## 📞 EM CASO DE DÚVIDA

Se ainda tiver problemas após aplicar estas correções:
1. Verifique se aplicou TODAS as mudanças corretamente
2. Garanta que limpou tudo antes de reinstalar
3. Teste no Expo Go antes de fazer o build
4. Envie os logs de erro se o problema persistir

---

**Data:** 7 de novembro de 2025  
**Versão:** 1.2.0 (após correções)
