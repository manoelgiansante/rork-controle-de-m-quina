import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useProperty } from '@/contexts/PropertyContext';
import { getMeterLabel, getMeterUnit } from '@/lib/machine-utils';
import type { MaintenanceItem, MaintenanceItemRevision } from '@/types';
import { Plus, Settings } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MaintenanceScreen() {
  const { machines, addMaintenance, maintenanceItems, addMaintenanceItem } = useData();
  const { currentUser } = useAuth();
  const { currentPropertyId } = useProperty();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [hourMeter, setHourMeter] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<MaintenanceItem[]>([]);
  const [observation, setObservation] = useState<string>('');
  const [itemRevisions, setItemRevisions] = useState<Record<MaintenanceItem, string>>({});
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');

  const resetForm = () => {
    setSelectedMachineId('');
    setHourMeter('');
    setPerformedBy('');
    setSelectedItems([]);
    setObservation('');
    setItemRevisions({});
  };

  const toggleItem = (item: MaintenanceItem) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
      const newRevisions = { ...itemRevisions };
      delete newRevisions[item];
      setItemRevisions(newRevisions);
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleAddNewItem = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      Alert.alert('Erro', 'Digite o nome do item de manutenção');
      return;
    }

    await addMaintenanceItem(trimmedName);
    setNewItemName('');
    setIsAddItemModalOpen(false);
    Alert.alert('Sucesso', 'Novo item de manutenção adicionado!');
  };

  const handleAddMaintenance = async () => {
    if (!selectedMachineId) {
      Alert.alert('Erro', 'Selecione uma máquina');
      return;
    }

    const machine = machines.find((m) => m.id === selectedMachineId);
    const meterLabel = machine ? getMeterLabel(machine.type).toLowerCase() : 'horímetro';

    if (!hourMeter || parseFloat(hourMeter) < 0) {
      Alert.alert('Erro', `Informe o ${meterLabel} atual da máquina`);
      return;
    }
    if (!performedBy.trim()) {
      Alert.alert('Erro', 'Informe quem realizou a manutenção');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um item de manutenção');
      return;
    }

    for (const item of selectedItems) {
      const revisionHours = itemRevisions[item];
      if (!revisionHours || parseFloat(revisionHours) <= 0) {
        Alert.alert(
          'Erro',
          `Informe o intervalo de próxima revisão para "${item}"`
        );
        return;
      }
    }

    if (!currentUser || !currentPropertyId) return;

    const revisions: MaintenanceItemRevision[] = selectedItems.map((item) => ({
      item,
      nextRevisionHours: parseFloat(itemRevisions[item]),
    }));

    await addMaintenance({
      propertyId: currentPropertyId,
      machineId: selectedMachineId,
      hourMeter: parseFloat(hourMeter),
      performedBy: performedBy.trim(),
      items: selectedItems,
      observation: observation.trim() || undefined,
      itemRevisions: revisions,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    // Fechar modal e resetar formulário
    setIsModalOpen(false);
    resetForm();

    // Aguardar um breve momento para garantir que os dados sejam atualizados na UI
    setTimeout(() => {
      Alert.alert('Sucesso', 'Manutenção registrada com sucesso!');
    }, 100);
  };

  useEffect(() => {
    setItemRevisions((prev) => {
      const newRevisions = { ...prev };
      selectedItems.forEach((item) => {
        if (!(item in newRevisions)) {
          newRevisions[item] = '';
        }
      });
      return newRevisions;
    });
  }, [selectedItems]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Settings size={40} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.infoTitle}>Registrar Manutenção</Text>
          <Text style={styles.infoText}>
            Registre as manutenções preventivas e corretivas para manter o
            histórico e receber alertas de revisão.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalOpen(true)}
        >
          <Settings size={22} color="#FFF" strokeWidth={2} />
          <Text style={styles.addButtonText}>Registrar Manutenção</Text>
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
              <Text style={styles.modalTitle}>Registrar Manutenção</Text>

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
                {selectedMachineId && machines.find(m => m.id === selectedMachineId)
                  ? getMeterLabel(machines.find(m => m.id === selectedMachineId)!.type)
                  : 'Horímetro'} Atual <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={hourMeter}
                onChangeText={setHourMeter}
                placeholder="Ex: 2025"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Text style={styles.label}>
                Feito por: <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={performedBy}
                onChangeText={setPerformedBy}
                placeholder="Ex: João Silva"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                Itens de Manutenção <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.itemsList}>
                {maintenanceItems.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.checkboxContainer,
                      selectedItems.includes(item) &&
                        styles.checkboxContainerSelected,
                    ]}
                    onPress={() => toggleItem(item)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selectedItems.includes(item) && styles.checkboxSelected,
                      ]}
                    >
                      {selectedItems.includes(item) && (
                        <View style={styles.checkboxInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.checkboxLabel,
                        selectedItems.includes(item) &&
                          styles.checkboxLabelSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => setIsAddItemModalOpen(true)}
                >
                  <Plus size={20} color="#2D5016" strokeWidth={2} />
                  <Text style={styles.addItemButtonText}>Adicionar Novo Item</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Observação (opcional)</Text>
              <TextInput
                style={styles.textArea}
                value={observation}
                onChangeText={setObservation}
                placeholder="Ex: Usado óleo 15W40"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              {selectedItems.length > 0 && selectedMachineId && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>Próxima Revisão</Text>
                  <Text style={styles.sectionSubtitle}>
                    Configure o intervalo de {getMeterUnit(machines.find(m => m.id === selectedMachineId)!.type)} para cada serviço executado
                  </Text>
                  <View style={styles.revisionsList}>
                    {selectedItems.map((item) => (
                      <View key={item} style={styles.revisionItem}>
                        <Text style={styles.revisionItemLabel}>{item}</Text>
                        <View style={styles.revisionInputContainer}>
                          <TextInput
                            style={styles.revisionInput}
                            value={itemRevisions[item] || ''}
                            onChangeText={(value) => {
                              setItemRevisions({ ...itemRevisions, [item]: value });
                            }}
                            placeholder="250"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            returnKeyType="done"
                            blurOnSubmit={true}
                            onSubmitEditing={() => Keyboard.dismiss()}
                          />
                          <Text style={styles.revisionInputSuffix}>{getMeterUnit(machines.find(m => m.id === selectedMachineId)!.type)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

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
                  onPress={handleAddMaintenance}
                >
                  <Text style={styles.modalButtonSaveText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={isAddItemModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setIsAddItemModalOpen(false);
          setNewItemName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addItemModalContent}>
            <Text style={styles.modalTitle}>Novo Item de Manutenção</Text>
            <Text style={styles.label}>Nome do Item</Text>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Ex: Solda no chassi"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsAddItemModalOpen(false);
                  setNewItemName('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleAddNewItem}
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
  textArea: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemsList: {
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  checkboxContainerSelected: {
    backgroundColor: '#E8F5E9',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#2D5016',
    backgroundColor: '#2D5016',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  checkboxLabelSelected: {
    color: '#2D5016',
    fontWeight: '600' as const,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2D5016',
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 8,
  },
  addItemButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  revisionsList: {
    marginBottom: 8,
  },
  revisionItem: {
    marginBottom: 16,
  },
  revisionItemLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  revisionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  revisionInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  revisionInputSuffix: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
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
  addItemModalContent: {
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
