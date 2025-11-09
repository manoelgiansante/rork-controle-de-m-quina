# 🔑 Como Corrigir o Erro de Keystore no Android

## ❌ O Erro que Você Recebeu:
```
Seu Android App Bundle foi assinado com uma chave incorreta.
SHA1 Esperado: 3E:72:E2:81:13:6F:4A:9A:6F:FA:0F:68:33:36:B8:2D:D9:3F:AF:51
SHA1 Recebido: 7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35
```

Isso acontece porque o EAS está usando um keystore diferente do que o Google Play espera.

---

## ✅ SOLUÇÃO MAIS FÁCIL: Fazer Upload do Novo Certificado

### Passo 1: Acessar Expo.dev
1. Acesse: https://expo.dev/accounts/manoelgiansante/projects/controledemaquina/credentials
2. Faça login com sua conta
3. Clique em "Android" → "Production"
4. Procure pela seção "Keystore" ou "Build Credentials"

### Passo 2: Baixar o Certificado
1. Na interface do Expo, procure por "Download certificate" ou "Export certificate"
2. Baixe o arquivo `.pem` (certificado público)
3. OU você pode gerar o certificado a partir do SHA1 que você já tem

### Passo 3: Fazer Upload no Google Play Console
1. Acesse: https://play.google.com/console
2. Selecione seu app "Controle de Máquina"
3. No menu lateral, vá em: **"Configuração"** → **"Integridade do app"** (ou "App Integrity")
4. Procure por **"Chave de upload do app"** (ou "Upload key certificate")
5. Clique em **"Trocar chave de upload"** ou **"Add upload key"**
6. Faça upload do arquivo `.pem` que você baixou do Expo

---

## 🔄 SOLUÇÃO ALTERNATIVA: Usar o Keystore Antigo

Se você tem o keystore original (arquivo `.jks` ou `.keystore`) que foi usado anteriormente:

### Passo 1: Configurar o Keystore no EAS
```bash
cd ~/Documents/controle
eas credentials
```

Depois:
1. Escolha "Android"
2. Escolha "Production" profile
3. Escolha "Keystore: Manage everything needed to build your project"
4. Escolha "Upload a new Keystore"
5. Forneça o arquivo `.jks` antigo
6. Forneça a senha do keystore
7. Forneça o alias e senha da chave

### Passo 2: Fazer Novo Build
```bash
eas build --platform android --profile production --clear-cache
```

---

## 📱 RECOMENDAÇÃO:

Use a **SOLUÇÃO MAIS FÁCIL** (fazer upload do novo certificado no Google Play), porque:
- ✅ Não precisa do keystore antigo
- ✅ Google Play aceita trocar a chave de upload
- ✅ Mais rápido e simples
- ✅ Você já tem o build pronto

---

## 🎯 Próximos Passos:

1. **Acesse Expo.dev** e baixe o certificado `.pem`
2. **Acesse Google Play Console** e faça upload do certificado
3. **Tente fazer upload do .aab novamente**
4. **Aguarde aprovação e teste!**

---

## 📧 Se Precisar de Ajuda:

Se não conseguir baixar o certificado pelo Expo.dev, você pode:
- Enviar um email para o suporte do Expo
- Ou me avisar e eu te ajudo a extrair o certificado do keystore do EAS
