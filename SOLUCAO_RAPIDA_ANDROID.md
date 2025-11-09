# ⚡ SOLUÇÃO RÁPIDA - Keystore Android

## O Problema:
Google Play esperava: `SHA1: 3E:72:E2:81:13:6F:4A:9A:6F:FA:0F:68:33:36:B8:2D:D9:3F:AF:51`
Mas recebeu: `SHA1: 7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35`

---

## ✅ SOLUÇÃO MAIS RÁPIDA (Sem arquivo .pem):

### Passo 1: Acessar Google Play Console
1. Acesse: **https://play.google.com/console**
2. Faça login
3. Selecione o app **"Controle de Máquina"**

### Passo 2: Ir para Integridade do App
1. No menu lateral esquerdo, clique em **"Configuração"** (Setup)
2. Clique em **"Integridade do app"** (App integrity)

### Passo 3: Atualizar a Chave de Upload
1. Procure pela seção **"Chave de upload do app"** (Upload key certificate)
2. Você vai ver o SHA1 antigo: `3E:72:E2:81...`
3. Clique em **"Solicitar troca de chave de upload"** (Request upload key reset)
   - OU se houver opção "Adicionar certificado de chave de upload"

### Passo 4: Informar o Novo SHA1
Quando solicitado, informe:

**SHA-1:** `7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35`

### Passo 5: Aguardar Aprovação
- O Google Play pode levar algumas horas para processar
- Você receberá um email quando aprovado

### Passo 6: Fazer Upload do .aab Novamente
Depois que o Google Play aprovar a nova chave:
1. Volte para "Production" ou "Internal testing"
2. Faça upload do arquivo: `xxaKbuCqsYHnTT9dUpqcFP.aab`
3. Agora deve funcionar!

---

## 📱 ALTERNATIVA: Usar Internal App Sharing

Se não quiser esperar aprovação, você pode testar rapidamente usando **Internal App Sharing**:

1. No Google Play Console, vá em **"Internal app sharing"**
2. Faça upload do `.aab` diretamente lá
3. Compartilhe o link de teste com você mesmo
4. Instale e teste no seu celular

**IMPORTANTE:** Internal App Sharing NÃO exige verificação de keystore! É perfeito para testar rapidamente.

---

## 🎯 RECOMENDAÇÃO:

**Use Internal App Sharing primeiro** para testar se o app está funcionando, enquanto aguarda a aprovação da nova chave de upload para Production.

Link direto: https://play.google.com/console/internal-app-sharing

---

## ℹ️ Informações do Build Atual:

- **Arquivo:** `xxaKbuCqsYHnTT9dUpqcFP.aab`
- **Download:** https://expo.dev/artifacts/eas/xxaKbuCqsYHnTT9dUpqcFP.aab
- **Version code:** 10
- **SHA1 do certificado:** `7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35`
