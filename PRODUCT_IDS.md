# Product IDs para Assinatura - iOS e Android

Este documento contém todos os Product IDs configurados no aplicativo para as lojas iOS (App Store Connect) e Android (Google Play Console).

## ⚠️ IMPORTANTE

Antes de publicar o aplicativo, você deve cadastrar estes Product IDs exatamente como estão listados abaixo nas respectivas lojas.

## Product IDs Configurados

### 1. Teste Gratuito (Trial)
- **Product ID**: `com.2m.controledemaquina.teste.7dias`
- **Nome visível**: "Teste grátis 7 dias"
- **Preço**: R$ 0,00
- **Tipo**: Período de Teste
- **Duração**: 7 dias
- **Descrição**: Teste gratuito com acesso Premium completo
- **Benefícios**:
  - Acesso Premium completo por 7 dias
  - Máquinas ilimitadas
  - Todas as funcionalidades Premium
  - Sem cobrança durante o período de teste

### 2. Plano Básico Mensal
- **Product ID**: `com.2m.controledemaquina.basico.mensal19`
- **Nome visível**: "Plano Básico – R$19,99/mês"
- **Preço**: R$ 19,99
- **Tipo**: Assinatura Renovável Automaticamente
- **Duração**: 1 mês
- **Descrição**: Até 10 máquinas
- **Benefícios**:
  - Até 10 máquinas
  - Controle de abastecimento
  - Manutenção básica
  - Alertas automáticos

### 3. Plano Básico Anual
- **Product ID**: `com.2m.controledemaquina.basico.anual`
- **Nome visível**: "Plano Básico Anual – R$199,99/ano"
- **Preço**: R$ 199,99
- **Tipo**: Assinatura Renovável Automaticamente
- **Duração**: 1 ano
- **Descrição**: Até 10 máquinas (economize ~2 meses)
- **Benefícios**:
  - Até 10 máquinas
  - Controle de abastecimento
  - Manutenção básica
  - Alertas automáticos
  - Economia em relação ao mensal

### 4. Plano Premium Mensal
- **Product ID**: `com.2m.controledemaquina.premium.mensal`
- **Nome visível**: "Plano Premium – R$49,90/mês"
- **Preço**: R$ 49,90
- **Tipo**: Assinatura Renovável Automaticamente
- **Duração**: 1 mês
- **Descrição**: Máquinas ilimitadas
- **Benefícios**:
  - Máquinas ilimitadas
  - Controle de abastecimento
  - Manutenção completa
  - Alertas inteligentes
  - Relatórios avançados
  - Suporte prioritário

### 5. Plano Premium Anual
- **Product ID**: `com.2m.controledemaquina.premium.anual`
- **Nome visível**: "Plano Premium Anual – R$499,90/ano"
- **Preço**: R$ 499,90
- **Tipo**: Assinatura Renovável Automaticamente
- **Duração**: 1 ano
- **Descrição**: Máquinas ilimitadas (economize ~2 meses)
- **Benefícios**:
  - Máquinas ilimitadas
  - Controle de abastecimento
  - Manutenção completa
  - Alertas inteligentes
  - Relatórios avançados
  - Suporte prioritário
  - Economia em relação ao mensal

## Configuração nas Lojas

### App Store Connect (iOS)

1. Acesse App Store Connect
2. Vá em "Meu App" > "Assinaturas e Compras no App"
3. Clique em "+" para adicionar um novo Grupo de Assinatura
4. Para cada plano, crie um novo produto com:
   - **ID do Produto**: Use exatamente o Product ID listado acima
   - **Nome de Referência**: Nome interno para você
   - **Duração**: Conforme especificado acima
   - **Preço**: Conforme especificado acima

#### Configuração do Trial no iOS
- O teste gratuito de 7 dias deve ser configurado DENTRO do plano Premium Mensal (`com.2m.vetra.premium.mensal`)
- Na configuração do produto Premium Mensal, marque "Oferecer período de teste gratuito"
- Defina a duração como 7 dias
- O Product ID `com.2m.vetra.teste.7dias` será usado internamente no app para controlar o trial

### Google Play Console (Android)

1. Acesse o Google Play Console
2. Vá em seu aplicativo > "Monetização" > "Produtos"
3. Selecione "Criar assinatura"
4. Para cada plano, configure:
   - **ID do Produto**: Use exatamente o Product ID listado acima
   - **Nome**: Nome visível para o usuário
   - **Descrição**: Descrição dos benefícios
   - **Preço**: Defina o preço em BRL
   - **Período de cobrança**: Conforme especificado
   - **Período de teste gratuito**: 7 dias (para o plano com trial)

## Localização dos Product IDs no Código

Os Product IDs estão configurados em:
- **Arquivo**: `contexts/SubscriptionContext.tsx`
- **Constante**: `SUBSCRIPTION_PLANS`

## Status Atual

✅ Product IDs configurados no código
⚠️ Aguardando cadastro nas lojas (iOS e Android)

## Próximos Passos

1. Cadastre todos os Product IDs no App Store Connect (iOS)
2. Cadastre todos os Product IDs no Google Play Console (Android)
3. Teste as compras no ambiente de sandbox/teste
4. Após aprovação nas lojas, as assinaturas estarão ativas para os usuários

## Observações Importantes

- Os Product IDs devem ser **exatamente iguais** ao que está no código
- Não pode haver espaços ou caracteres especiais além dos listados
- Uma vez criados nas lojas, os Product IDs **não podem ser alterados**
- Certifique-se de testar as compras em ambiente de sandbox antes de publicar
- O teste gratuito só pode ser usado uma vez por usuário (Apple/Google controlam isso automaticamente)
