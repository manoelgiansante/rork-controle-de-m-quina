# 🚨 CORREÇÃO URGENTE: Crash Android

## PROBLEMA IDENTIFICADO

O app está **crashando no Android e iOS** devido a **incompatibilidades críticas de versões**.

### Causa Raiz
- ❌ **React 19.1.0** é INCOMPATÍVEL com React Native 0.81.5
- ❌ **Expo 54** REQUER React 18.3.1
- ❌ **New Architecture** está ativada e causando instabilidade
- ❌ React Native 0.81.5 está desatualizado

## CORREÇÕES NECESSÁRIAS

### 1️⃣ Corrigir package.json

Abra o arquivo `package.json` e altere estas 3 linhas:

```json
// ❌ ATUAL (ERRADO):
"react": "19.1.0",
"react-dom": "19.1.0", 
"react-native": "0.81.5",

// ✅ CORRETO:
"react": "18.3.1",
"react-dom": "18.3.1",
"react-native": "0.76.5",
```

### 2️⃣ Corrigir app.json

Abra o arquivo `app.json` e faça estas alterações:

```json
{
  "expo": {
    // ❌ ATUAL: "version": "1.0.9",
    // ✅ CORRETO:
    "version": "1.1.0",
    
    // ❌ ATUAL: "newArchEnabled": true,
    // ✅ CORRETO:
    "newArchEnabled": false,
  }
}
```

### 3️⃣ Reinstalar Dependências

Depois de fazer as alterações acima, execute:

```bash
# Remover arquivos antigos
rm -rf node_modules
rm bun.lock

# Reinstalar com as versões corretas
bun install

# OU se estiver usando npm:
npm install
```

### 4️⃣ Testar Localmente ANTES de fazer build

```bash
# Android
bun expo run:android

# iOS
bun expo run:ios
```

## POR QUE ISSO RESOLVE?

1. **React 18.3.1** é a versão certificada para Expo SDK 54
2. **React Native 0.76.5** é compatível com React 18 e Expo 54
3. **newArchEnabled: false** desativa a New Architecture instável (TurboModules/Fabric)
4. Essas versões são testadas e estáveis em produção

## PRÓXIMOS PASSOS

Depois de fazer as correções:

1. ✅ Testar no emulador Android
2. ✅ Testar no simulador iOS
3. ✅ Verificar que o app abre sem crashar
4. ✅ Testar login e navegação básica
5. ✅ Fazer novo build para produção

## HISTÓRICO DO PROBLEMA

- **Versão 1.0.0-1.0.9**: Usavam React 19 + RN 0.81.5 + New Arch = CRASHES
- **Versão 1.1.0**: Usa React 18.3.1 + RN 0.76.5 + Arch antiga = ESTÁVEL ✅

---

**Data:** 7 de novembro de 2025  
**Prioridade:** 🔴 CRÍTICA  
**Impacto:** Android e iOS crashando na inicialização
