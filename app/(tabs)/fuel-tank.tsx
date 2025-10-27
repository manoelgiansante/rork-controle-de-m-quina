import { useData } from '@/contexts/DataContext';
import type { FuelType } from '@/types';
import { AlertTriangle, Droplets, Fuel, Plus } from 'lucide-react-native';
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
  const { farmTank, updateTankInitialData, addFuel } = useData();

  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isAddFuelModalOpen, setIsAddFuelModalOpen] = useState<boolean>(false);

  const [capacityLiters, setCapacityLiters] = useState<string>('');
  const [currentLiters, setCurrentLiters] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('Diesel comum');
  const [alertLevelLiters, setAlertLevelLiters] = useState<string>('');

  const [litersToAdd, setLitersToAdd] = useState<string>('');

  const handleSetupTank = async () => {
    const capacity = parseFloat(capacityLiters);
    const current = parseFloat(currentLiters);
    const alertLevel = parseFloat(alertLevelLiters);

    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Erro', 'Por favor, insira uma capacidade válida');
      return;
    }

    if (isNaN(current) || current < 0) {
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

    await addFuel(liters);
    setLitersToAdd('');
    setIsAddFuelModalOpen(false);
    Alert.alert('Sucesso', `${liters.toFixed(0)} litros adicionados ao tanque!`);
  };



  if (!farmTank) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Fuel size={80} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Tanque não configurado</Text>
          <Text style={styles.emptyText}>
            Configure o tanque de combustível da fazenda para começar a gerenciar o estoque de
            diesel
          </Text>
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

  const percentFilled = (farmTank.currentLiters / farmTank.capacityLiters) * 100;
  const isLowFuel = farmTank.currentLiters <= farmTank.alertLevelLiters;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLowFuel && (
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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsAddFuelModalOpen(true)}
        >
          <Plus size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Adicionar Combustível</Text>
        </TouchableOpacity>
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
});
