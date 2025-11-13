import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useProperty } from '@/contexts/PropertyContext';
import { getMeterLabel, getMeterUnit } from '@/lib/machine-utils';
import type { MaintenanceItem, MaintenanceItemRevision } from '@/types';
import { Plus, Settings, FileText, Edit2, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MaintenanceScreen() {
  const { machines, addMaintenance, maintenanceItems, addMaintenanceItem, updateMaintenanceItem, deleteMaintenanceItem, maintenances } = useData();
  const { currentUser } = useAuth();
  const { currentPropertyId } = useProperty();

  const sortedMaintenances = React.useMemo(() => {
    return [...maintenances].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB.getTime() - dateA.getTime(); // Descendente (mais recente primeiro)
    });
  }, [maintenances]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [hourMeter, setHourMeter] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<MaintenanceItem[]>([]);
  const [observation, setObservation] = useState<string>('');
  const [itemRevisions, setItemRevisions] = useState<Record<MaintenanceItem, string>>({});
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<MaintenanceItem | null>(null);
  const [editedItemName, setEditedItemName] = useState<string>('');

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
      if (Platform.OS === 'web') {
        window.alert('Digite o nome do item de manutenção');
      } else {
        Alert.alert('Erro', 'Digite o nome do item de manutenção');
      }
      return;
    }

    await addMaintenanceItem(trimmedName);
    setNewItemName('');
    setIsAddItemModalOpen(false);

    if (Platform.OS === 'web') {
      window.alert('Novo item de manutenção adicionado!');
    } else {
      Alert.alert('Sucesso', 'Novo item de manutenção adicionado!');
    }
  };

  const handleEditItem = (item: MaintenanceItem) => {
    setItemToEdit(item);
    setEditedItemName(item);
    setIsEditItemModalOpen(true);
  };

  const handleSaveEditedItem = async () => {
    const trimmedName = editedItemName.trim();
    if (!trimmedName) {
      if (Platform.OS === 'web') {
        window.alert('Digite o nome do item de manutenção');
      } else {
        Alert.alert('Erro', 'Digite o nome do item de manutenção');
      }
      return;
    }

    if (itemToEdit) {
      await updateMaintenanceItem(itemToEdit, trimmedName);
      setIsEditItemModalOpen(false);
      setItemToEdit(null);
      setEditedItemName('');

      if (Platform.OS === 'web') {
        window.alert('Item de manutenção atualizado!');
      } else {
        Alert.alert('Sucesso', 'Item de manutenção atualizado!');
      }
    }
  };

  const handleDeleteItem = (item: MaintenanceItem) => {
    console.log('[MAINTENANCE] Excluir item clicado:', item);

    if (Platform.OS === 'web') {
      // Para web, usar confirm nativo
      const confirmed = window.confirm(`Deseja realmente excluir o item "${item}"?`);
      if (confirmed) {
        console.log('[MAINTENANCE] Confirmado exclusão de:', item);
        deleteMaintenanceItem(item).then(() => {
          window.alert('Item de manutenção removido!');
        });
      }
    } else {
      // Para mobile, usar Alert do React Native
      Alert.alert(
        'Confirmar Exclusão',
        `Deseja realmente excluir o item "${item}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              console.log('[MAINTENANCE] Confirmado exclusão de:', item);
              await deleteMaintenanceItem(item);
              Alert.alert('Sucesso', 'Item de manutenção removido!');
            },
          },
        ]
      );
    }
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

        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <FileText size={22} color="#333" />
            <Text style={styles.historySectionTitle}>Histórico de Manutenções</Text>
          </View>

          {sortedMaintenances.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>Nenhuma manutenção registrada</Text>
            </View>
          ) : (
            <ScrollView style={styles.historyList}>
              {sortedMaintenances.map((maintenance) => {
                const machine = machines.find(m => m.id === maintenance.machineId);
                if (!machine) return null;

                return (
                  <View key={maintenance.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <Settings size={18} color="#2D5016" />
                      <Text style={styles.historyCardDate}>
                        {new Date(maintenance.date).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    <Text style={styles.historyCardMachine}>
                      [{machine.type}] {machine.model}
                    </Text>
                    <View style={styles.historyCardRow}>
                      <Text style={styles.historyCardLabel}>{getMeterLabel(machine.type)}:</Text>
                      <Text style={styles.historyCardValue}>
                        {maintenance.hourMeter} {getMeterUnit(machine.type)}
                      </Text>
                    </View>
                    <View style={styles.historyCardRow}>
                      <Text style={styles.historyCardLabel}>Itens:</Text>
                      <Text style={styles.historyCardValue}>
                        {maintenance.items.join(', ')}
                      </Text>
                    </View>
                    {maintenance.observation && (
                      <View style={styles.historyCardRow}>
                        <Text style={styles.historyCardLabel}>Observação:</Text>
                        <Text style={styles.historyCardValue}>{maintenance.observation}</Text>
                      </View>
                    )}
                    <View style={styles.historyCardRow}>
                      <Text style={styles.historyCardLabel}>Realizado por:</Text>
                      <Text style={styles.historyCardValue}>{maintenance.performedBy}</Text>
                    </View>
                    <Text style={styles.historyCardUser}>
                      Registrado por: {maintenance.userName}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
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
                  <View key={item} style={styles.itemRow}>
                    <TouchableOpacity
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
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        onPress={() => {
                          console.log('[MAINTENANCE] Editar item clicado:', item);
                          handleEditItem(item);
                        }}
                        style={styles.itemActionButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={18} color="#2D5016" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          console.log('[MAINTENANCE] Botão excluir pressionado:', item);
                          handleDeleteItem(item);
                        }}
                        style={styles.itemActionButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
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

      <Modal
        visible={isEditItemModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setIsEditItemModalOpen(false);
          setItemToEdit(null);
          setEditedItemName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addItemModalContent}>
            <Text style={styles.modalTitle}>Editar Item de Manutenção</Text>
            <Text style={styles.label}>Nome do Item</Text>
            <TextInput
              style={styles.input}
              value={editedItemName}
              onChangeText={setEditedItemName}
              placeholder="Ex: Troca de óleo do motor"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setIsEditItemModalOpen(false);
                  setItemToEdit(null);
                  setEditedItemName('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSaveEditedItem}
              >
                <Text style={styles.modalButtonSaveText}>Salvar</Text>
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemActionButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexShrink: 1,
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
  historySection: {
    marginTop: 32,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
  },
  historyList: {
    // Sem limitação de altura para permitir scroll completo
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic' as const,
  },
  historyCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2D5016',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historyCardDate: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
  },
  historyCardMachine: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 12,
  },
  historyCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyCardLabel: {
    fontSize: 14,
    color: '#666',
  },
  historyCardValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    flexShrink: 1,
  },
  historyCardUser: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
});
