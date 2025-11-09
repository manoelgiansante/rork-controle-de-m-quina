#!/bin/bash

# Script para baixar certificado do Android do EAS

echo "📱 Baixando certificado Android do EAS..."
echo ""

# Criar diretório para certificados
mkdir -p ~/Documents/controle/android-cert

cd ~/Documents/controle

# Tentar método 1: Via EAS CLI
echo "Tentando método 1: EAS CLI..."
eas credentials -p android --profile production 2>&1

echo ""
echo "---"
echo ""
echo "📋 INSTRUÇÕES MANUAIS:"
echo ""
echo "1. Acesse: https://expo.dev/accounts/manoelgiansante/projects/controledemaquina/credentials"
echo "2. Clique em 'Android' → 'Production'"
echo "3. Na seção 'Keystore', procure por informações do certificado"
echo "4. Se houver opção 'Download', baixe o arquivo .pem"
echo ""
echo "5. Se NÃO houver download direto:"
echo "   - Copie o SHA1 fingerprint mostrado no Expo"
echo "   - Vá no Google Play Console"
echo "   - Configure usando o SHA1: 7C:75:8C:E6:21:79:DE:66:AF:87:D5:19:8B:CF:8B:B2:FF:02:26:35"
echo ""
echo "6. Google Play Console:"
echo "   - https://play.google.com/console"
echo "   - Vá em: Configuração → Integridade do app → Chave de upload"
echo "   - Clique em 'Solicitar troca de chave de upload'"
echo ""
