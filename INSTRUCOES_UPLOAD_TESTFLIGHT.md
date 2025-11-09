# 📱 Como Subir para o TestFlight

## Passo a Passo:

### 1. Baixar o arquivo .ipa
- Link: https://expo.dev/artifacts/eas/oPf9FgNMnFZDuWoKocWPkR.ipa
- Build number: 10 (corrigido!)
- Salve no seu Mac (ex: Downloads)

### 2. Abrir o Transporter
- Abra o app "Transporter" (se não tiver, baixe da App Store)
- Ou procure "Transporter" no Spotlight (Cmd + Space)

### 3. Fazer Upload
1. Arraste o arquivo .ipa para dentro do Transporter
2. Faça login com seu Apple ID (manoelgiansante@icloud.com ou outro)
3. Clique em "Deliver"
4. Aguarde o upload completar (5-10 minutos)

### 4. Aguardar Processamento
- Após o upload, a Apple vai processar o app (10-20 minutos)
- Você receberá um email quando estiver pronto para testar
- Acesse App Store Connect ou TestFlight para ver o status

### 5. Testar no TestFlight
1. Abra o app TestFlight no seu iPhone
2. A versão 1.3.2 vai aparecer
3. Clique em "Install" ou "Update"
4. Teste o app - NÃO DEVE MAIS CRASHAR!

## ✅ O que foi corrigido na versão 1.3.2:
- ✅ Crash `facebook::react::RCTNativeModule` RESOLVIDO
- ✅ Versões corretas: React 19.1.0 + RN 0.81.5 + Expo SDK 54
- ✅ Stripe API version corrigida
- ✅ Todas as variáveis de ambiente configuradas
- ✅ SUPABASE_SERVICE_ROLE_KEY adicionada

## 📊 Comparação:

| Versão | Status |
|--------|--------|
| 1.1.0 (atual no TestFlight) | ❌ Crashando com RCTNativeModule |
| 1.3.2 (nova build) | ✅ Corrigido - pronto para testar |

---

# 🤖 Como Subir para o Google Play (Android)

## Passo a Passo:

### 1. Baixar o arquivo .aab
- Link: https://expo.dev/artifacts/eas/xxaKbuCqsYHnTT9dUpqcFP.aab
- Version code: 10 (corrigido!)
- Salve no seu computador

### 2. IMPORTANTE: Configurar Keystore ANTES de fazer upload
⚠️ **VOCÊ PRECISA FAZER ISSO PRIMEIRO, SENÃO O UPLOAD VAI FALHAR!**

Execute no terminal:
```bash
cd ~/Documents/controle
eas credentials -p android
```

Depois:
1. Escolha opção para download do certificado (signing certificate)
2. Baixe o arquivo .pem
3. Acesse Google Play Console: https://play.google.com/console
4. Vá em: App Integrity → Upload key certificate
5. Faça upload do arquivo .pem
6. Aguarde confirmação

### 3. Fazer Upload no Google Play Console
1. Acesse Google Play Console: https://play.google.com/console
2. Selecione seu app "Controle de Máquina"
3. Vá em "Production" ou "Internal Testing"
4. Clique em "Create new release"
5. Faça upload do arquivo .aab
6. Preencha as informações de lançamento
7. Clique em "Review release" → "Start rollout"

### 4. Aguardar Processamento
- Google Play vai processar o app (1-2 horas)
- Você receberá um email quando estiver aprovado
- Depois aparecerá no Google Play ou Internal Testing

