# Implementação de Melhorias - Histórico + Edição Centralizada + Decimais + Alertas de Tanque

## Status: EM ANDAMENTO

### ✅ Concluído

1. **Função Utilitária para Decimais** (`lib/decimal-utils.ts`)
   - `normalizeDecimal(value: string)`: Converte vírgula para ponto
   - `parseDecimal(value: string)`: Parse de string para número com normalização
   - `formatDecimal(value: number, decimals)`: Formata número para exibição (com vírgula)
   - `formatLiters(liters: number)`: Formata litros com 1 casa decimal
   - `formatHours(hours: number)`: Formata horas com 1 casa decimal  
   - `validateDecimalInput(value: string)`: Valida entrada decimal

2. **Tipos TypeScript Atualizados** (`types/index.ts`)
   - Criado `AlertType = 'maintenance' | 'tank'`
   - Separado `Alert` em `MaintenanceAlert` e `TankAlert`
   - `Alert = MaintenanceAlert | TankAlert` (union type)
   - Estrutura do `TankAlert`:
     ```typescript
     interface TankAlert {
       id: string;
       type: 'tank';
       propertyId: string;
       tankCurrentLiters: number;
       tankCapacityLiters: number;
       tankAlertLevelLiters: number;
       percentageFilled: number;
       status: AlertStatus;
       message: string;
       createdAt: string;
     }
     ```

3. **Aba Abastecimento Refatorada** (`app/(tabs)/refueling.tsx`)
   - ✅ Transformada em histórico somente leitura
   - ✅ Ordenação por data descendente
   - ✅ Exibição de volume com 1 casa decimal usando `formatLiters()`
   - ✅ Parse de decimais com `parseDecimal()` no cadastro
   - ✅ Histórico exibe: data, máquina, volume, horímetro, consumo médio, serviço, usuário
   - ✅ Layout mobile otimizado com cards

### 🚧 Em Andamento / Pendente

4. **Aba Manutenção** (`app/(tabs)/maintenance.tsx`)
   - ⏳ Transformar em histórico somente leitura
   - ⏳ Ordenação por data descendente
   - ⏳ Atualizar parseFloat para parseDecimal
   - ⏳ Formatar horímetros com 1 casa decimal

5. **Formulários de Edição no Relatório** (`app/(tabs)/reports.tsx`)
   - ⏳ Atualizar edição de abastecimento para aceitar decimais
   - ⏳ Atualizar edição de manutenção para aceitar decimais  
   - ⏳ Usar `parseDecimal()` em todos os inputs numéricos
   - ⏳ Normalizar vírgula para ponto automaticamente
   - ⏳ Validar inputs com `validateDecimalInput()`
   - ⏳ Exibir valores formatados com vírgula

6. **Lógica de Alertas de Tanque** (`contexts/DataContext.tsx`)
   - ⏳ Criar função `checkTankAlerts()` que:
     - Verifica se `farmTank.currentLiters <= farmTank.alertLevelLiters`
     - Cria/atualiza alerta de tanque se necessário
     - Remove alerta quando nível normalizar
   - ⏳ Chamar `checkTankAlerts()` após:
     - `addFuel()`
     - `consumeFuel()`
     - `adjustTankFuel()`
     - `updateTankInitialData()`
   - ⏳ Integrar alertas de tanque na lista `allAlerts`
   - ⏳ Garantir compatibilidade com Supabase

7. **Aba Alertas Atualizada** (`app/(tabs)/reports.tsx` - seção alerts)
   - ⏳ Detectar tipo de alerta (`alert.type === 'maintenance' | 'tank'`)
   - ⏳ Renderizar alertas de tanque com:
     - Ícone de tanque/combustível
     - Nível atual e percentual
     - Limiar configurado
     - Ação sugerida ("Agendar reabastecimento")
   - ⏳ Ordenar alertas: tanque primeiro, depois manutenção (por status)

8. **Atualização de Exibições**
   - ⏳ Substituir `.toFixed(0)` por `formatLiters()` em:
     - `app/(tabs)/fuel-tank.tsx`
     - `app/(tabs)/reports.tsx` (abastecimentos)
   - ⏳ Formatar horímetros com 1 casa: `.toFixed(1)`
   - ⏳ Consumo médio: `.toFixed(2)` (já correto)

9. **Scripts SQL do Supabase**
   - ⏳ Revisar `SUPABASE_COMPLETE_SETUP.sql`
   - ⏳ Garantir colunas numéricas são `NUMERIC(12,3)` ou `NUMERIC(12,2)`:
     - `refuelings.liters` → `NUMERIC(12,3)`
     - `refuelings.hour_meter` → `NUMERIC(12,2)`
     - `maintenances.hour_meter` → `NUMERIC(12,2)`
     - `farm_tanks.capacity_liters` → `NUMERIC(12,2)`
     - `farm_tanks.current_liters` → `NUMERIC(12,3)`
     - `farm_tanks.alert_level_liters` → `NUMERIC(12,2)`
     - `machines.current_hour_meter` → `NUMERIC(12,2)`
   - ⏳ Criar migração SQL se necessário

10. **Testes Obrigatórios (Checklist de QA)**
    - [ ] Editar abastecimento de 40 para 40.2 → histórico reflete 40,2 L
    - [ ] Saldo do tanque soma +0,2 corretamente
    - [ ] Somatório de vários decimais (0.2 + 0.5 + 0.8) mantém precisão no saldo
    - [ ] Cadastrar com vírgula (40,2) → resultado idêntico a cadastrar com ponto (40.2)
    - [ ] Alerta de tanque dispara ao cruzar limiar
    - [ ] Alerta não repete sem novo cruzamento
    - [ ] Ordenação do histórico por data desc
    - [ ] Após editar data no relatório, item reposiciona corretamente no histórico
    - [ ] Mobile e Web com mesmo comportamento

## Próximos Passos (Ordem de Prioridade)

### 1. Completar Aba Manutenção (maintenance.tsx)
- Adicionar seção de histórico similar ao refueling
- Usar `parseDecimal()` e `formatHours()` 
- Ordenar por `createdAt` descendente

### 2. Atualizar Formulários de Edição (reports.tsx)
- Modal de edição de abastecimento: aceitar e validar decimais
- Modal de edição de manutenção: aceitar e validar decimais
- Normalizar vírgula automaticamente

### 3. Implementar Alertas de Tanque (DataContext.tsx)
- Função `checkTankAlerts()` 
- Integrar com fluxo de combustível
- Sincronizar com Supabase

### 4. Atualizar Aba Alertas (reports.tsx)
- Renderizar alertas de tanque
- Type guards para diferenciar tipos
- UI específica para cada tipo

### 5. Revisar SQL e Deploy
- Atualizar tipos de colunas no Supabase
- Testar precisão decimal
- Validar em produção

## Regras Importantes

✅ **Decimais:**
- Sempre use `parseDecimal()` para converter strings
- Sempre use `formatLiters()` para exibir volumes
- Nunca use `parseInt()` para volumes
- Aceite vírgula E ponto como separador decimal

✅ **Histórico:**
- Somente leitura nas abas Abastecimento e Manutenção
- Edição exclusiva no Relatório
- Ordenação por data descendente

✅ **Alertas de Tanque:**
- Disparar quando `currentLiters <= alertLevelLiters`
- Não duplicar alertas enquanto permanecer abaixo
- Remover alerta quando nível normalizar

✅ **Consistência:**
- Qualquer edição no Relatório reflete imediatamente no histórico
- Recalcular saldos e alertas após cada mudança
- Manter sincronização entre AsyncStorage e Supabase

## Arquivos Modificados

- ✅ `lib/decimal-utils.ts` (NOVO)
- ✅ `types/index.ts` (ATUALIZADO)
- ✅ `app/(tabs)/refueling.tsx` (ATUALIZADO)
- ⏳ `app/(tabs)/maintenance.tsx` (PENDENTE)
- ⏳ `app/(tabs)/reports.tsx` (PENDENTE)
- ⏳ `app/(tabs)/fuel-tank.tsx` (PENDENTE - exibições)
- ⏳ `contexts/DataContext.tsx` (PENDENTE - alertas de tanque)
- ⏳ `SUPABASE_COMPLETE_SETUP.sql` (PENDENTE - tipos numéricos)

## Notas de Implementação

### Para o DataContext.tsx

```typescript
// Adicionar esta função
const checkTankAlerts = useCallback(async () => {
  if (!farmTank || !currentPropertyId) return;

  const shouldHaveAlert = farmTank.currentLiters <= farmTank.alertLevelLiters;
  const existingAlert = allAlerts.find(
    a => a.type === 'tank' && a.propertyId === currentPropertyId
  ) as TankAlert | undefined;

  if (shouldHaveAlert && !existingAlert) {
    // Criar alerta
    const newAlert: TankAlert = {
      id: `tank-alert-${currentPropertyId}`,
      type: 'tank',
      propertyId: currentPropertyId,
      tankCurrentLiters: farmTank.currentLiters,
      tankCapacityLiters: farmTank.capacityLiters,
      tankAlertLevelLiters: farmTank.alertLevelLiters,
      percentageFilled: (farmTank.currentLiters / farmTank.capacityLiters) * 100,
      status: farmTank.currentLiters <= 0 ? 'red' : 'yellow',
      message: `Nível baixo: ${farmTank.currentLiters.toFixed(0)}L (${farmTank.alertLevelLiters.toFixed(0)}L mínimo)`,
      createdAt: new Date().toISOString(),
    };

    const updatedAlerts = [...allAlerts, newAlert];
    setAllAlerts(updatedAlerts);
    await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));

    if (isWeb) {
      // Salvar no Supabase (criar tabela tank_alerts se necessário)
    }
  } else if (!shouldHaveAlert && existingAlert) {
    // Remover alerta
    const updatedAlerts = allAlerts.filter(a => a.id !== existingAlert.id);
    setAllAlerts(updatedAlerts);
    await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));

    if (isWeb) {
      // Remover do Supabase
    }
  } else if (shouldHaveAlert && existingAlert) {
    // Atualizar alerta existente
    const updatedAlerts = allAlerts.map(a => {
      if (a.id !== existingAlert.id) return a;
      return {
        ...existingAlert,
        tankCurrentLiters: farmTank.currentLiters,
        percentageFilled: (farmTank.currentLiters / farmTank.capacityLiters) * 100,
        status: farmTank.currentLiters <= 0 ? 'red' : 'yellow',
        message: `Nível baixo: ${farmTank.currentLiters.toFixed(0)}L (${farmTank.alertLevelLiters.toFixed(0)}L mínimo)`,
      };
    });
    setAllAlerts(updatedAlerts);
    await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
  }
}, [farmTank, allAlerts, currentPropertyId, isWeb]);

// Chamar após operações de tanque:
// - No final de addFuel()
// - No final de consumeFuel()
// - No final de adjustTankFuel()
// - No final de updateTankInitialData()
```

### Para reports.tsx (Alertas)

```typescript
const renderAlert = ({ item }: { item: Alert }) => {
  if (item.type === 'tank') {
    return (
      <View style={[styles.alertCard, { borderLeftColor: getAlertColor(item.status) }]}>
        <View style={styles.alertHeader}>
          <Fuel size={24} color={getAlertColor(item.status)} />
          <View style={styles.alertInfo}>
            <Text style={styles.alertMachine}>Tanque de Combustível</Text>
            <Text style={styles.alertItem}>{item.message}</Text>
          </View>
        </View>
        <View style={styles.alertDetails}>
          <Text style={styles.alertDetailText}>
            Atual: {formatLiters(item.tankCurrentLiters)}
          </Text>
          <Text style={styles.alertDetailText}>
            Mínimo: {formatLiters(item.tankAlertLevelLiters)}
          </Text>
          <Text style={[styles.alertDetailText, { fontWeight: '700' }]}>
            {item.percentageFilled.toFixed(0)}% da capacidade
          </Text>
        </View>
        <TouchableOpacity
          style={styles.alertAction}
          onPress={() => {
            // Navegar para tela de tanque ou abrir modal de reabastecimento
          }}
        >
          <Text style={styles.alertActionText}>Agendar Reabastecimento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Renderizar alerta de manutenção (código existente)
  // ...
};
```
