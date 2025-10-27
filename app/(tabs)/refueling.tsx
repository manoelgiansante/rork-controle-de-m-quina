import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { ServiceType } from '@/types';
import { Calendar, Droplet, Plus } from 'lucide-react-native';
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



export default function RefuelingScreen() {
  const { machines, addRefueling, serviceTypes, addServiceType, farmTank, consumeFuel } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [liters, setLiters] = useState<string>('');
  const [hourMeter, setHourMeter] = useState<string>('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');

  const resetForm = () => {
    setSelectedMachineId('');
    setDate(new Date().toISOString().split('T')[0]);
    setLiters('');
    setHourMeter('');
    setServiceType('');
  };

  const handleAddNewService = async () => {
    const trimmedName = newServiceName.trim();
    if (!trimmedName) {
      Alert.alert('Erro', 'Digite o nome do serviço');
      return;
    }

    await addServiceType(trimmedName);
    setServiceType(trimmedName);
    setNewServiceName('');
    setIsAddServiceModalOpen(false);
    Alert.alert('Sucesso', 'Novo serviço adicionado!');
  };

  const handleAddRefueling = async () => {
    if (!selectedMachineId) {
      Alert.alert('Erro', 'Selecione uma máquina');
      return;
    }
    if (!liters || parseFloat(liters) <= 0) {
      Alert.alert('Erro', 'Informe a quantidade de litros abastecidos');
      return;
    }
    if (!hourMeter || parseFloat(hourMeter) < 0) {
      Alert.alert('Erro', 'Informe o horímetro atual da máquina');
      return;
    }

    const machine = machines.find((m) => m.id === selectedMachineId);
    if (machine && parseFloat(hourMeter) < machine.currentHourMeter) {
      Alert.alert(
        'Atenção',
        `O horímetro informado (${hourMeter}h) é menor que o horímetro atual da máquina (${machine.currentHourMeter}h). Deseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => saveRefueling() },
        ]
      );
      return;
    }

    await saveRefueling();
  };

  const saveRefueling = async () => {
    if (!currentUser) {
      console.log('❌ Erro: currentUser não definido');
      return;
    }

    const litersValue = parseFloat(liters);
    console.log('🔄 Iniciando salvamento de abastecimento:', {
      selectedMachineId,
      date,
      litersValue,
      hourMeter,
      serviceType,
    });

    if (!farmTank) {
      console.log('❌ Tanque não configurado');
      Alert.alert(
        'Tanque não configurado',
        'Tanque de combustível ainda não configurado. Vá até a aba Tanque de Combustível para cadastrar a capacidade inicial.'
      );
      return;
    }

    console.log('📊 Estado do tanque:', {
      capacidade: farmTank.capacityLiters,
      atual: farmTank.currentLiters,
      tentandoAbastecer: litersValue,
    });

    if (farmTank.currentLiters < litersValue) {
      console.log('❌ Combustível insuficiente no tanque');
      Alert.alert(
        'Combustível insuficiente',
        `O tanque possui apenas ${farmTank.currentLiters.toFixed(0)}L disponíveis. Não é possível abastecer ${litersValue.toFixed(0)}L.`,
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      console.log('💾 Salvando abastecimento...');
      await addRefueling({
        machineId: selectedMachineId,
        date: date,
        liters: litersValue,
        hourMeter: parseFloat(hourMeter),
        serviceType: serviceType || undefined,
        userId: currentUser.id,
        userName: currentUser.name,
      });
      console.log('✅ Abastecimento salvo com sucesso');

      console.log('⛽ Consumindo combustível do tanque...');
      await consumeFuel(litersValue);
      console.log('✅ Combustível consumido do tanque');

      resetForm();
      setIsModalOpen(false);
      Alert.alert('Sucesso', 'Abastecimento registrado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar abastecimento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o abastecimento. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Droplet size={40} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.infoTitle}>Registrar Abastecimento</Text>
          <Text style={styles.infoText}>
            Registre cada abastecimento para acompanhar o consumo e controlar os
            custos de combustível de suas máquinas.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalOpen(true)}
        >
          <Droplet size={22} color="#FFF" strokeWidth={2} />
          <Text style={styles.addButtonText}>Registrar Abastecimento</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Registrar Abastecimento</Text>

              <Text style={styles.label}>
                Máquina <Text style={styles.required}>*</Text>
              </Text>
              {machines.length === 0 ? (
                <Text style={styles.noMachinesText}>
                  Nenhuma máquina cadastrada. Cadastre uma máquina na aba
                  Máquinas.
                </Text>
              ) : (
                <View style={styles.machineList}>
                  {machines.map((machine) => (
                    <TouchableOpacity
                      key={machine.id}
                      style={[
                        styles.machineButton,
                        selectedMachineId === machine.id &&
                          styles.machineButtonSelected,
                      ]}
                      onPress={() => setSelectedMachineId(machine.id)}
                    >
                      <Text
                        style={[
                          styles.machineButtonText,
                          selectedMachineId === machine.id &&
                            styles.machineButtonTextSelected,
                        ]}
                      >
                        [{machine.type}] {machine.model}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>
                Data <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <Calendar size={20} color="#666" />
                <TextInput
                  style={styles.inputText}
                  value={date}
                  onChangeText={setDate}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#999"
                />
              </View>

              <Text style={styles.label}>
                Litros Abastecidos <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={liters}
                onChangeText={setLiters}
                placeholder="Ex: 100"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <Text style={styles.label}>
                Horímetro Atual <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={hourMeter}
                onChangeText={setHourMeter}
                placeholder="Ex: 2025"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Serviço Atual (opcional)</Text>
              <View style={styles.serviceList}>
                <TouchableOpacity
                  style={[
                    styles.serviceButton,
                    serviceType === '' && styles.serviceButtonSelected,
                  ]}
                  onPress={() => setServiceType('')}
                >
                  <Text
                    style={[
                      styles.serviceButtonText,
                      serviceType === '' && styles.serviceButtonTextSelected,
                    ]}
                  >
                    Nenhum
                  </Text>
                </TouchableOpacity>
                {serviceTypes.map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.serviceButton,
                      serviceType === service && styles.serviceButtonSelected,
                    ]}
                    onPress={() => setServiceType(service)}
                  >
                    <Text
                      style={[
                        styles.serviceButtonText,
                        serviceType === service &&
                          styles.serviceButtonTextSelected,
                      ]}
                    >
                      {service}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addServiceButton}
                  onPress={() => setIsAddServiceModalOpen(true)}
                >
                  <Plus size={20} color="#2D5016" strokeWidth={2} />
                  <Text style={styles.addServiceButtonText}>Adicionar Novo Serviço</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonSave}
                  onPress={handleAddRefueling}
                >
                  <Text style={styles.modalButtonSaveText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={isAddServiceModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setIsAddServiceModalOpen(false);
          setNewServiceName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addServiceModalContent}>
            <Text style={styles.modalTitle}>Novo Serviço</Text>
            <Text style={styles.label}>Nome do Serviço</Text>
            <TextInput
              style={styles.input}
              value={newServiceName}
              onChangeText={setNewServiceName}
              placeholder="Ex: Distribuição de Ração"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsAddServiceModalOpen(false);
                  setNewServiceName('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleAddNewService}
              >
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
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2D5016',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 10,
    marginTop: 16,
  },
  required: {
    color: '#FF5722',
  },
  machineList: {
    marginBottom: 8,
  },
  machineButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    marginBottom: 8,
  },
  machineButtonSelected: {
    borderColor: '#2D5016',
    backgroundColor: '#E8F5E9',
  },
  machineButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#666',
  },
  machineButtonTextSelected: {
    color: '#2D5016',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
    marginBottom: 8,
  },
  serviceList: {
    marginBottom: 8,
  },
  serviceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    marginBottom: 8,
  },
  serviceButtonSelected: {
    borderColor: '#2D5016',
    backgroundColor: '#E8F5E9',
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  serviceButtonTextSelected: {
    color: '#2D5016',
  },
  noMachinesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic' as const,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2D5016',
    borderStyle: 'dashed',
    marginBottom: 8,
    gap: 8,
  },
  addServiceButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  addServiceModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
