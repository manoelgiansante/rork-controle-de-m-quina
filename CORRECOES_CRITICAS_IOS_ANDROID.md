# 🚨 CORREÇÕES CRÍTICAS PARA iOS E ANDROID

## ❌ PROBLEMAS IDENTIFICADOS

Após análise completa do código, encontrei **3 problemas críticos** que estão causando crashes:

### 1. **INCOMPATIBILIDADE DE VERSÕES** (Causa principal dos crashes)
- ❌ React 19.1.0 é INCOMPATÍVEL com React Native 0.81.5
- ❌ Expo 54 REQUER React 18.3.1
- ❌ A New Architecture está habilitada (instável)

### 2. **CONFIGURAÇÕES INCORRETAS NO iOS**
- ❌ New Architecture habilitada (causa TurboModule crashes)
- ❌ Falta configuração ITSAppUsesNonExemptEncryption
- ❌ iPad habilitado (pode causar problemas)

### 3. **VERSÃO DO APP**
- Versão atual: 1.0.9
- Necessário: Incrementar para 1.2.0 para diferenciar este build corrigido

---

## ✅ CORREÇÕES NECESSÁRIAS

### 📝 PASSO 1: Atualizar `package.json`

**Abra o arquivo `package.json` e altere as seguintes linhas:**

```json
{
  "dependencies": {
    // ALTERE ESTAS 3 LINHAS:
    
    // DE:
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    
    // PARA:
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-native": "0.76.5",
    
    // NÃO ALTERE MAIS NADA!
  }
}
```

**Copie e cole estas 3 linhas exatas:**
```json
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-native": "0.76.5",
```

---

### 📝 PASSO 2: Atualizar `app.json`

**Abra o arquivo `app.json` e faça as seguintes alterações:**

#### 2.1 - Alterar versão (linha 5):
```json
// DE:
"version": "1.0.9",

// PARA:
"version": "1.2.0",
```

#### 2.2 - Desabilitar New Architecture (linha 10):
```json
// DE:
"newArchEnabled": true,

// PARA:
"newArchEnabled": false,
```

#### 2.3 - Atualizar configurações do iOS (linhas 16-19):
```json
// DE:
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "app.rork.controle-de-maquina"
},

// PARA:
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "app.rork.controle-de-maquina",
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
},
```

**Copie e cole esta seção completa do iOS:**
```json
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "app.rork.controle-de-maquina",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
```

---

### 📝 PASSO 3: Limpar e Reinstalar Dependências

**MUITO IMPORTANTE! Execute estes comandos na ordem:**

```bash
# 1. Remover node_modules e lock files
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
rm -f bun.lockb

# 2. Limpar cache do npm
npm cache clean --force

# 3. Reinstalar dependências
npm install

# 4. Limpar cache do Expo (se estiver usando)
npx expo start --clear
```

**OU se você usa Yarn:**
```bash
rm -rf node_modules
rm -f yarn.lock
yarn cache clean
yarn install
```

**OU se você usa Bun:**
```bash
rm -rf node_modules
rm -f bun.lockb
bun install
```

---

## 🧪 PASSO 4: TESTAR ANTES DE FAZER BUILD

**ANTES de fazer o build no EAS, teste localmente:**

### Teste no Simulador iOS:
```bash
npx expo run:ios
```

### Teste no Emulador Android:
```bash
npx expo run:android
```

### Teste no Expo Go (dispositivo físico):
```bash
npx expo start
```

**Verifique se:**
- ✅ O app abre sem crashar
- ✅ Login funciona
- ✅ Navegação entre telas funciona
- ✅ Dados carregam corretamente

---

## 📦 PASSO 5: Fazer Build EAS

**Somente DEPOIS de testar, faça o build:**

### Para iOS:
```bash
eas build --platform ios
```

### Para Android:
```bash
eas build --platform android
```

### Para ambos:
```bash
eas build --platform all
```

---

## 🎯 RESUMO DAS MUDANÇAS

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `package.json` | React 19.1.0 → 18.3.1 | Compatibilidade com Expo 54 |
| `package.json` | React Native 0.81.5 → 0.76.5 | Versão estável recomendada |
| `app.json` | newArchEnabled: true → false | Evitar crashes do TurboModule |
| `app.json` | version: 1.0.9 → 1.2.0 | Diferenciar build corrigido |
| `app.json` | supportsTablet: true → false | Focar em iPhone |
| `app.json` | Adicionar infoPlist | Configuração necessária iOS |

---

## ⚠️ POR QUE ESTAVA CRASHANDO?

### No iOS:
1. **React 19 + React Native 0.81.5** = TurboModule crashes
2. **New Architecture habilitada** = facebook::react::ObjCTurboModule crashes
3. **Falta de try-catch** em alguns lugares (já corrigido nos contextos)

### No Android:
1. **React 19 + React Native 0.81.5** = Hermes JavaScript Engine crashes
2. **New Architecture habilitada** = Fabric renderer crashes
3. Mesmos problemas do iOS, mas Android é mais tolerante

---

## ✅ O QUE JÁ ESTÁ CORRETO

- ✅ ErrorBoundary implementado
- ✅ Try-catch nos contextos (AuthContext, DataContext, etc.)
- ✅ Optional chaining (?.) usado corretamente
- ✅ Verificações de null/undefined nos lugares críticos
- ✅ .npmrc configurado com legacy-peer-deps
- ✅ Supabase com tratamento de erros

---

## 🔍 COMO VERIFICAR SE DEU CERTO?

Depois de aplicar as correções e reinstalar:

1. **Verifique as versões no terminal:**
```bash
npm list react react-native react-dom
```

Deve mostrar:
```
react@18.3.1
react-dom@18.3.1
react-native@0.76.5
```

2. **Verifique o app.json:**
```bash
cat app.json | grep -E "version|newArchEnabled|supportsTablet"
```

Deve mostrar:
```
"version": "1.2.0",
"newArchEnabled": false,
"supportsTablet": false,
```

---

## 📞 SUPORTE

Se após aplicar TODAS as correções o problema persistir:

1. Tire um print do terminal mostrando as versões instaladas
2. Envie o crash log COMPLETO
3. Informe qual passo falhou

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aplicar correções no `package.json`
2. ✅ Aplicar correções no `app.json`
3. ✅ Limpar e reinstalar dependências
4. ✅ Testar no simulador/emulador
5. ✅ Fazer build no EAS
6. ✅ Testar no TestFlight (iOS) ou Internal Testing (Android)
7. ✅ Publicar nas lojas

---

**Data:** 7 de novembro de 2025  
**Versão do documento:** 1.0  
**Status:** Correções prontas para aplicação
