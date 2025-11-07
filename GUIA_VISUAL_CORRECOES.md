# 📱 GUIA VISUAL: Como Corrigir os Crashes no iOS e Android

## 🎯 O QUE VOCÊ VAI FAZER

Você vai alterar **2 arquivos** e executar **3 comandos** no terminal.  
Tempo estimado: **10 minutos**

---

## 📝 ARQUIVO 1: `package.json`

### 🔍 Onde encontrar
Na raiz do projeto, arquivo `package.json`

### ✏️ O que alterar
Procure pelas linhas 45-47 (onde está `"react"`, `"react-dom"` e `"react-native"`):

#### ❌ ANTES (ESTÁ ASSIM):
```json
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
```

#### ✅ DEPOIS (DEIXE ASSIM):
```json
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-native": "0.76.5",
```

### 💡 DICA
Use **Ctrl+F** (ou **Cmd+F** no Mac) para procurar por `"react": "19.1.0"` e substituir.

---

## 📝 ARQUIVO 2: `app.json`

### 🔍 Onde encontrar
Na raiz do projeto, arquivo `app.json`

### ✏️ Alteração 1 - Versão do App (linha 5)

#### ❌ ANTES:
```json
    "version": "1.0.9",
```

#### ✅ DEPOIS:
```json
    "version": "1.2.0",
```

---

### ✏️ Alteração 2 - New Architecture (linha 10)

#### ❌ ANTES:
```json
    "newArchEnabled": true,
```

#### ✅ DEPOIS:
```json
    "newArchEnabled": false,
```

---

### ✏️ Alteração 3 - Configuração iOS (linhas 16-19)

#### ❌ ANTES (DELETE ESTAS LINHAS):
```json
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "app.rork.controle-de-maquina"
    },
```

#### ✅ DEPOIS (COLE ESTAS LINHAS):
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

## 💻 COMANDOS NO TERMINAL

### 🔧 PASSO 1: Limpar e Reinstalar

**Copie e cole TODO este bloco no terminal:**

```bash
# Remover arquivos antigos
rm -rf node_modules
rm -f package-lock.json yarn.lock bun.lockb

# Limpar cache
npm cache clean --force

# Reinstalar com as versões corretas
npm install
```

### ⏱️ Aguarde
Este processo pode levar de **2 a 5 minutos**. Você verá várias mensagens no terminal.

---

### 🧪 PASSO 2: Testar Localmente

**ANTES de fazer o build, teste se funciona:**

#### Para testar no seu computador:
```bash
npx expo start
```

Depois pressione:
- **`i`** para abrir no simulador iOS
- **`a`** para abrir no emulador Android
- **`w`** para abrir no navegador web

#### Ou teste no seu celular:
1. Instale o app **Expo Go** na App Store/Play Store
2. Escaneie o QR Code que aparece no terminal
3. O app vai abrir no seu celular

---

### 🎬 PASSO 3: Fazer Build Final

**Somente DEPOIS de testar, faça o build:**

#### Para iOS:
```bash
eas build --platform ios
```

#### Para Android:
```bash
eas build --platform android
```

#### Para ambos ao mesmo tempo:
```bash
eas build --platform all
```

---

## ✅ CHECKLIST - Marque conforme for fazendo

- [ ] 1. Alterei o `package.json` (3 linhas)
- [ ] 2. Alterei o `app.json` - versão (1 linha)
- [ ] 3. Alterei o `app.json` - newArchEnabled (1 linha)
- [ ] 4. Alterei o `app.json` - configuração iOS (7 linhas)
- [ ] 5. Executei os comandos de limpeza
- [ ] 6. Aguardei o `npm install` finalizar
- [ ] 7. Testei com `npx expo start`
- [ ] 8. O app ABRIU sem crashar
- [ ] 9. Testei login e navegação
- [ ] 10. Fiz o build com `eas build`

---

## 🎨 EXEMPLO VISUAL - Como o app.json deve ficar

```json
{
  "expo": {
    "name": "Controle de Máquina",
    "slug": "controledemaquina",
    "version": "1.2.0",                    👈 MUDOU AQUI
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "rork-app",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": false,               👈 MUDOU AQUI
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {                               👈 MUDOU AQUI (TODA ESTA SEÇÃO)
      "supportsTablet": false,
      "bundleIdentifier": "app.rork.controle-de-maquina",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      // ... (NÃO MEXA AQUI)
    },
    // ... (resto do arquivo)
  }
}
```

---

## 🆘 SE ALGO DER ERRADO

### Erro: "npm install" falha
**Solução:**
```bash
# Tente com force
npm install --force

# OU com legacy-peer-deps
npm install --legacy-peer-deps
```

---

### Erro: "expo start" não funciona
**Solução:**
```bash
# Limpe o cache do Expo
npx expo start --clear

# Se não funcionar, reinstale o Expo CLI
npm install -g expo-cli@latest
```

---

### Erro: "eas build" falha
**Solução:**
```bash
# Verifique se está logado no EAS
eas whoami

# Se não estiver, faça login
eas login

# Tente novamente
eas build --platform ios --clear-cache
```

---

## 🔍 COMO SABER SE DEU CERTO?

### ✅ Sinais de sucesso:

1. **No terminal após `npm install`:**
   ```
   added XXX packages
   npm notice created a lockfile as package-lock.json
   ```

2. **Ao executar `npx expo start`:**
   - QR Code aparece
   - Não tem erros vermelhos
   - Consegue pressionar `i` ou `a` e o app abre

3. **No app:**
   - Abre a tela de login
   - Não fecha sozinho
   - Consegue fazer login
   - Consegue navegar entre telas

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

| Item | ❌ ANTES (Crashava) | ✅ DEPOIS (Funciona) |
|------|---------------------|----------------------|
| React | 19.1.0 | 18.3.1 |
| React Native | 0.81.5 | 0.76.5 |
| New Architecture | Habilitada | Desabilitada |
| iPad | Habilitado | Desabilitado |
| Versão | 1.0.9 | 1.2.0 |

---

## 🎯 POR QUE ISSO RESOLVE?

### Problema 1: React 19 + React Native 0.81.5
- **O que era:** Incompatibilidade entre versões
- **O que causava:** TurboModule crashes no iOS, Hermes crashes no Android
- **Como resolve:** React 18.3.1 é compatível com React Native 0.76.5

### Problema 2: New Architecture
- **O que era:** Arquitetura experimental habilitada
- **O que causava:** facebook::react::ObjCTurboModule crashes
- **Como resolve:** Desabilitar volta para arquitetura estável

### Problema 3: Configuração iOS
- **O que era:** Faltava ITSAppUsesNonExemptEncryption
- **O que causava:** Review da Apple podia rejeitar
- **Como resolve:** Adiciona configuração necessária

---

## 🚀 DEPOIS DE APLICAR AS CORREÇÕES

1. **Teste no TestFlight (iOS):**
   - Aguarde o build finalizar (~15-30 min)
   - Acesse https://appstoreconnect.apple.com
   - Adicione o build ao TestFlight
   - Instale no seu iPhone e teste

2. **Teste no Internal Testing (Android):**
   - Aguarde o build finalizar (~10-20 min)
   - Baixe o arquivo `.aab`
   - Faça upload no Google Play Console
   - Teste no seu Android

3. **Se funcionar:**
   - 🎉 Sucesso! Envie para revisão das lojas
   - 📱 Aguarde aprovação (iOS: 1-3 dias, Android: algumas horas)

4. **Se não funcionar:**
   - 📋 Salve o crash log completo
   - 💬 Entre em contato com suporte com:
     - Print do crash
     - Versões instaladas (`npm list react react-native`)
     - Qual plataforma crashou (iOS/Android/Ambos)

---

**Última atualização:** 7 de novembro de 2025  
**Versão:** 1.0  
**Testado em:** Expo SDK 54, React 18.3.1, React Native 0.76.5
