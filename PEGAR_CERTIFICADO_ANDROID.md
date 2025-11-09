# 🔐 Como Baixar o Certificado Android do EAS

## 📋 Informações do Keystore Atual

**SHA1 do EAS (que o Google Play está recusando):**
```
7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35
```

**SHA1 que o Google Play espera (keystore antigo):**
```
3E:72:E2:81:13:6F:4A:9A:6F:FA:0F:68:33:36:B8:2D:D9:3F:AF:51
```

---

## 🎯 OPÇÃO 1: Via Expo Dashboard (MAIS FÁCIL)

### Passo 1: Acessar Expo.dev
1. Acesse: https://expo.dev/accounts/manoelgiansante/projects/controledemaquina/credentials
2. Faça login com sua conta Expo
3. Clique em **"Android"**
4. Clique em **"Production"**

### Passo 2: Baixar Certificado
1. Procure pela seção **"Keystore"** ou **"Build Credentials"**
2. Clique em **"Download"** ou **"Export certificate"**
3. Salve o arquivo `.pem` em `~/Documents/controle/android-cert/`

---

## 🎯 OPÇÃO 2: Via Terminal (COMANDO DIRETO)

Execute este comando e siga as instruções interativas:

```bash
cd ~/Documents/controle
eas credentials -p android
```

Depois:
1. Escolha **"production"** profile
2. Escolha **"Keystore"**
3. Escolha **"Download"** ou **"Export certificate"**
4. O arquivo `.pem` será salvo automaticamente

---

## 📱 Depois de Baixar o Certificado

### Passo 1: Acessar Google Play Console
1. Acesse: https://play.google.com/console
2. Selecione o app **"Controle de Máquina"**

### Passo 2: Ir para Integridade do App
1. No menu lateral, vá em: **"Configuração"** → **"Integridade do app"**
2. Ou acesse direto: **Setup → App integrity**

### Passo 3: Fazer Upload do Novo Certificado

**MÉTODO A: Trocar Chave de Upload (Recomendado)**
1. Procure por **"Upload key certificate"** (Chave de upload do app)
2. Clique em **"Request upload key reset"** (Solicitar troca de chave)
3. Faça upload do arquivo `.pem` que você baixou
4. Aguarde aprovação do Google (algumas horas)

**MÉTODO B: Informar SHA1 Diretamente**
Se não houver opção de upload, você pode informar o SHA1:
```
7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35
```

---

## ⚡ ALTERNATIVA RÁPIDA: Internal App Sharing

**Se quiser testar AGORA sem esperar aprovação de keystore:**

1. Acesse: https://play.google.com/console/internal-app-sharing
2. Faça upload do `.aab` diretamente
3. Copie o link de teste
4. Instale no Android e teste!

**Vantagem:** Funciona IMEDIATAMENTE, não precisa keystore matching!

---

## 📊 Status Atual

| Item | Status |
|------|--------|
| Build iOS com versões corretas | ⏳ Aguardando novo build |
| Build Android com versões corretas | ⏳ Aguardando novo build |
| Certificado Android | 🔄 Precisamos baixar |
| Upload no Google Play | ⏸️ Bloqueado (aguardando keystore) |
| Upload no TestFlight (iOS) | ✅ Pronto para fazer |

---

## 🚀 Próximos Passos

1. **AGORA:** Baixar certificado Android (Opção 1 ou 2)
2. **DEPOIS:** Fazer upload no Google Play Console
3. **EM PARALELO:** Aguardar novo build com versões corretas
4. **POR ÚLTIMO:** Testar no TestFlight (iOS) e Internal App Sharing (Android)
