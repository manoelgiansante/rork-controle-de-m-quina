import { useData } from '@/contexts/DataContext';
import type { FuelType } from '@/types';
import { AlertTriangle, Droplets, Fuel, Plus, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const FUEL_TYPES: FuelType[] = ['Diesel comum', 'Diesel S10'];

export default function FuelTankScreen() {
  const { farmTank, updateTankInitialData, addFuel, updateTankCapacity, registerUnloggedConsumption, adjustTankFuel } = useData();

  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isAddFuelModalOpen, setIsAddFuelModalOpen] = useState<boolean>(false);
  const [isOverflowModalOpen, setIsOverflowModalOpen] = useState<boolean>(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [overflowAmount, setOverflowAmount] = useState<number>(0);
  const [pendingLitersToAdd, setPendingLitersToAdd] = useState<number>(0);

  const [capacityLiters, setCapacityLiters] = useState<string>('');
  const [currentLiters, setCurrentLiters] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('Diesel comum');
  const [alertLevelLiters, setAlertLevelLiters] = useState<string>('');

  const [litersToAdd, setLitersToAdd] = useState<string>('');
  const [isConsumptionAdjustModalOpen, setIsConsumptionAdjustModalOpen] = useState<boolean>(false);
  const [consumptionAdjustment, setConsumptionAdjustment] = useState<string>('');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const handleSetupTank = async () => {
    const capacity = parseFloat(capacityLiters);
    const current = parseFloat(currentLiters);
    const alertLevel = parseFloat(alertLevelLiters);

    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Erro', 'Por favor, insira uma capacidade válida');
      return;
    }

    if (isNaN(current)) {
      Alert.alert('Erro', 'Por favor, insira uma quantidade atual válida');
      return;
    }

    if (current > capacity) {
      Alert.alert('Erro', 'A quantidade atual não pode ser maior que a capacidade total');
      return;
    }

    if (isNaN(alertLevel) || alertLevel < 0 || alertLevel > capacity) {
      Alert.alert('Erro', 'Por favor, insira um nível de alerta válido');
      return;
    }

    await updateTankInitialData({
      capacityLiters: capacity,
      currentLiters: current,
      fuelType: selectedFuelType,
      alertLevelLiters: alertLevel,
    });

    setIsSetupModalOpen(false);
    setCapacityLiters('');
    setCurrentLiters('');
    setAlertLevelLiters('');
    Alert.alert('Sucesso', 'Tanque de combustível configurado com sucesso!');
  };

  const handleAddFuel = async () => {
    const liters = parseFloat(litersToAdd);

    if (isNaN(liters) || liters <= 0) {
      Alert.alert('Erro', 'Por favor, insira uma quantidade válida');
      return;
    }

    const result = await addFuel(liters);

    if (!result) {
      Alert.alert('Erro', 'Não foi possível adicionar combustível');
      return;
    }

    if (!result.success && result.overflow > 0) {
      setOverflowAmount(result.overflow);
      setPendingLitersToAdd(liters);
      setIsAddFuelModalOpen(false);
      setIsOverflowModalOpen(true);
      return;
    }

    setLitersToAdd('');
    setIsAddFuelModalOpen(false);
    Alert.alert('Sucesso', `${liters.toFixed(0)} litros adicionados ao tanque!`);
  };

  const handleAdjustment = async () => {
    console.log('[FUEL-TANK] Iniciando ajuste...', { adjustmentValue, adjustmentType, adjustmentReason });
    
    const liters = parseFloat(adjustmentValue);
    console.log('[FUEL-TANK] Litros parseados:', liters);

    if (isNaN(liters) || liters <= 0) {
      console.log('[FUEL-TANK] Erro: valor inválido');
      Alert.alert('Erro', 'Por favor, insira uma quantidade válida');
      return;
    }

    if (!adjustmentReason.trim()) {
      console.log('[FUEL-TANK] Erro: motivo vazio');
      Alert.alert('Erro', 'Por favor, informe o motivo do ajuste');
      return;
    }

    const finalValue = adjustmentType === 'add' ? liters : -liters;
    console.log('[FUEL-TANK] Valor final do ajuste:', finalValue);

    try {
      await adjustTankFuel(finalValue, adjustmentReason);
      console.log('[FUEL-TANK] Ajuste realizado com sucesso');

      setAdjustmentValue('');
      setAdjustmentReason('');
      setIsAdjustModalOpen(false);

      Alert.alert(
        'Ajuste Realizado',
        `${adjustmentType === 'add' ? 'Adicionados' : 'Removidos'} ${liters.toFixed(0)} litros do tanque.\n\nMotivo: ${adjustmentReason}`
      );
    } catch (error) {
      console.error('[FUEL-TANK] Erro ao realizar ajuste:', error);
      Alert.alert('Erro', 'Não foi possível realizar o ajuste. Tente novamente.');
    }
  };



  if (!farmTank || farmTank.capacityLiters === 0) {
    const hasNegativeBalance = farmTank && farmTank.currentLiters < 0;

    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Fuel size={80} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Tanque não configurado</Text>
          <Text style={styles.emptyText}>
            Configure o tanque de combustível da fazenda para começar a gerenciar o estoque de
            diesel
          </Text>
          {hasNegativeBalance && (
            <View style={styles.negativeBalanceCard}>
              <AlertTriangle size={24} color="#FF5722" />
              <Text style={styles.negativeBalanceText}>
                Saldo atual: {farmTank.currentLiters.toFixed(0)}L (negativo)
              </Text>
              <Text style={styles.negativeBalanceHint}>
                Configure o tanque para corrigir o saldo
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.setupButton} onPress={() => setIsSetupModalOpen(true)}>
            <Text style={styles.setupButtonText}>Configurar Tanque</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={isSetupModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsSetupModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Configurar Tanque de Combustível</Text>

                <Text style={styles.label}>Capacidade total do tanque (litros)</Text>
                <TextInput
                  style={styles.input}
                  value={capacityLiters}
                  onChangeText={setCapacityLiters}
                  placeholder="Ex: 5000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Tipo de diesel</Text>
                <View style={styles.typeContainer}>
                  {FUEL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        selectedFuelType === type && styles.typeButtonSelected,
                      ]}
                      onPress={() => setSelectedFuelType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          selectedFuelType === type && styles.typeButtonTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Quantos litros existem atualmente no tanque</Text>
                <TextInput
                  style={styles.input}
                  value={currentLiters}
                  onChangeText={setCurrentLiters}
                  placeholder="Ex: 3000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Nível mínimo de alerta (litros)</Text>
                <TextInput
                  style={styles.input}
                  value={alertLevelLiters}
                  onChangeText={setAlertLevelLiters}
                  placeholder="Ex: 500"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={() => {
                      setIsSetupModalOpen(false);
                      setCapacityLiters('');
                      setCurrentLiters('');
                      setAlertLevelLiters('');
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButtonSave} onPress={handleSetupTank}>
                    <Text style={styles.modalButtonSaveText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const percentFilled = Math.max(0, Math.min(100, (farmTank.currentLiters / farmTank.capacityLiters) * 100));
  const isLowFuel = farmTank.currentLiters <= farmTank.alertLevelLiters;
  const isNegative = farmTank.currentLiters < 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isNegative && (
          <View style={styles.alertCard}>
            <AlertTriangle size={24} color="#FF5722" />
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>ATENÇÃO: Saldo negativo</Text>
              <Text style={styles.alertText}>
                O tanque está com saldo negativo de {Math.abs(farmTank.currentLiters).toFixed(0)} litros. Adicione combustível para regularizar.
              </Text>
            </View>
          </View>
        )}
        {!isNegative && isLowFuel && (
          <View style={styles.alertCard}>
            <AlertTriangle size={24} color="#FF5722" />
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>ATENÇÃO: Estoque de diesel baixo</Text>
              <Text style={styles.alertText}>
                Restam apenas {farmTank.currentLiters.toFixed(0)} litros. É necessário solicitar
                reabastecimento.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Droplets size={32} color="#2D5016" />
            <Text style={styles.statusTitle}>Status do Tanque</Text>
          </View>

          <View style={styles.tankVisual}>
            <View style={styles.tankContainer}>
              <View style={[styles.tankFill, { height: `${percentFilled}%` }]} />
              <Text style={styles.tankPercentage}>{percentFilled.toFixed(0)}%</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Litros atuais</Text>
              <Text style={styles.statValue}>{farmTank.currentLiters.toFixed(0)} L</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Capacidade total</Text>
              <Text style={styles.statValue}>{farmTank.capacityLiters.toFixed(0)} L</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo de combustível:</Text>
            <Text style={styles.infoValue}>{farmTank.fuelType}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nível de alerta:</Text>
            <Text style={styles.infoValue}>{farmTank.alertLevelLiters.toFixed(0)} L</Text>
          </View>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsAddFuelModalOpen(true)}
          >
            <Plus size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>Adicionar Combustível</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => setIsAdjustModalOpen(true)}
          >
            <Settings size={24} color="#2D5016" />
            <Text style={styles.actionButtonSecondaryText}>Ajustar Estoque</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isAddFuelModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddFuelModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Combustível</Text>

            <Text style={styles.label}>Quantos litros foram adicionados?</Text>
            <TextInput
              style={styles.input}
              value={litersToAdd}
              onChangeText={setLitersToAdd}
              placeholder="Ex: 1000"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />

            <Text style={styles.hint}>
              Disponível no tanque: {farmTank.capacityLiters - farmTank.currentLiters} L
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsAddFuelModalOpen(false);
                  setLitersToAdd('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSave} onPress={handleAddFuel}>
                <Text style={styles.modalButtonSaveText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isOverflowModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOverflowModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.overflowHeader}>
              <AlertTriangle size={48} color="#FF5722" />
              <Text style={styles.modalTitle}>Capacidade Excedida</Text>
            </View>

            <Text style={styles.overflowText}>
              Você está tentando adicionar {pendingLitersToAdd.toFixed(0)} litros, mas o tanque
              comporta apenas mais {(farmTank.capacityLiters - farmTank.currentLiters).toFixed(0)} litros.
            </Text>

            <Text style={styles.overflowText}>
              Excedente: <Text style={styles.overflowHighlight}>{overflowAmount.toFixed(0)} litros</Text>
            </Text>

            <Text style={styles.overflowQuestion}>
              O que você gostaria de fazer?
            </Text>

            <TouchableOpacity
              style={styles.overflowOption}
              onPress={async () => {
                const newCapacity = farmTank.currentLiters + pendingLitersToAdd;
                await updateTankCapacity(newCapacity);
                await addFuel(pendingLitersToAdd);
                setIsOverflowModalOpen(false);
                setLitersToAdd('');
                Alert.alert(
                  'Capacidade Atualizada',
                  `A capacidade do tanque foi aumentada para ${newCapacity.toFixed(0)} litros e o combustível foi adicionado.`
                );
              }}
            >
              <Text style={styles.overflowOptionTitle}>Aumentar capacidade do tanque</Text>
              <Text style={styles.overflowOptionDesc}>
                Nova capacidade: {(farmTank.currentLiters + pendingLitersToAdd).toFixed(0)} litros
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overflowOption}
              onPress={() => {
                setIsOverflowModalOpen(false);
                setIsConsumptionAdjustModalOpen(true);
              }}
            >
              <Text style={styles.overflowOptionTitle}>Ajustar consumo não lançado</Text>
              <Text style={styles.overflowOptionDesc}>
                Registrar consumo que não foi lançado no sistema
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonCancel}
              onPress={() => {
                setIsOverflowModalOpen(false);
                setLitersToAdd('');
              }}
            >
              <Text style={styles.modalButtonCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isConsumptionAdjustModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsConsumptionAdjustModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Consumo Não Lançado</Text>

            <Text style={styles.label}>
              Quanto combustível foi consumido sem registro?
            </Text>
            <TextInput
              style={styles.input}
              value={consumptionAdjustment}
              onChangeText={setConsumptionAdjustment}
              placeholder="Ex: 500"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />

            <Text style={styles.hint}>
              Depois de registrar o consumo, você poderá adicionar o combustível novamente.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsConsumptionAdjustModalOpen(false);
                  setConsumptionAdjustment('');
                  setLitersToAdd('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={async () => {
                  const consumed = parseFloat(consumptionAdjustment);
                  if (isNaN(consumed) || consumed <= 0) {
                    Alert.alert('Erro', 'Por favor, insira uma quantidade válida');
                    return;
                  }

                  await registerUnloggedConsumption(consumed);
                  setIsConsumptionAdjustModalOpen(false);
                  setConsumptionAdjustment('');

                  Alert.alert(
                    'Consumo Registrado',
                    `${consumed.toFixed(0)} litros de consumo foram registrados. Agora você pode adicionar o combustível.`,
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          setIsAddFuelModalOpen(true);
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.modalButtonSaveText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAdjustModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAdjustModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajustar Estoque de Combustível</Text>

            <Text style={styles.label}>Tipo de ajuste</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentType === 'add' && styles.typeButtonSelected,
                ]}
                onPress={() => setAdjustmentType('add')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    adjustmentType === 'add' && styles.typeButtonTextSelected,
                  ]}
                >
                  Adicionar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentType === 'subtract' && styles.typeButtonSelected,
                ]}
                onPress={() => setAdjustmentType('subtract')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    adjustmentType === 'subtract' && styles.typeButtonTextSelected,
                  ]}
                >
                  Subtrair
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Quantidade (litros)</Text>
            <TextInput
              style={styles.input}
              value={adjustmentValue}
              onChangeText={setAdjustmentValue}
              placeholder="Ex: 100"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Motivo do ajuste</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
              placeholder="Ex: Correção de estoque, perda por evaporação, medição física"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.hint}>
              {adjustmentType === 'add'
                ? 'Isso aumentará o estoque atual do tanque'
                : 'Isso diminuirá o estoque atual do tanque'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsAdjustModalOpen(false);
                  setAdjustmentValue('');
                  setAdjustmentReason('');
                  setAdjustmentType('add');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSave} onPress={handleAdjustment}>
                <Text style={styles.modalButtonSaveText}>Confirmar Ajuste</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  setupButton: {
    marginTop: 32,
    backgroundColor: '#2D5016',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FF5722',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#E64A19',
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
    marginLeft: 12,
  },
  tankVisual: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tankContainer: {
    width: 120,
    height: 200,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#2D5016',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  tankFill: {
    width: '100%',
    backgroundColor: '#4CAF50',
    position: 'absolute',
    bottom: 0,
  },
  tankPercentage: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -12 }],
    zIndex: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600' as const,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D5016',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#2D5016',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  typeButtonSelected: {
    borderColor: '#2D5016',
    backgroundColor: '#E8F5E9',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#2D5016',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 24,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2D5016',
    alignItems: 'center',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  overflowHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  overflowText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    lineHeight: 22,
  },
  overflowHighlight: {
    fontWeight: '700' as const,
    color: '#FF5722',
  },
  overflowQuestion: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginTop: 8,
    marginBottom: 16,
  },
  overflowOption: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  overflowOptionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
    marginBottom: 4,
  },
  overflowOptionDesc: {
    fontSize: 14,
    color: '#666',
  },
  negativeBalanceCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
    alignItems: 'center',
    gap: 8,
  },
  negativeBalanceText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FF5722',
  },
  negativeBalanceHint: {
    fontSize: 14,
    color: '#E64A19',
    textAlign: 'center',
  },
});
