import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { Machine, MachineType } from '@/types';
import { useRouter } from 'expo-router';
import { AlertTriangle, Edit2, Plus, Tractor as TractorIcon, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { confirm } from '@/lib/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMeterLabel, formatMeterValue } from '@/lib/machine-utils';

const MACHINE_TYPES: MachineType[] = [
  'Trator',
  'Caminhão',
  'Carro',
  'Pá Carregadeira',
  'Vagão',
  'Colheitadeira',
  'Uniport',
  'Outro',
];

export default function MachinesScreen() {
  const { machines, addMachine, updateMachine, deleteMachine, archiveMachine, checkMachineCanBeDeleted, getAlertsForMachine } = useData();
  const { isMaster } = useAuth();
  const { canAddMachine, subscriptionInfo } = useSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<MachineType>('Trator');
  const [model, setModel] = useState<string>('');
  const [initialHourMeter, setInitialHourMeter] = useState<string>('');
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [machineToDelete, setMachineToDelete] = useState<{ machine: Machine, canDelete: any } | null>(null);



  const handleAddMachine = async () => {
    if (!model.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o modelo da máquina');
      return;
    }

    if (editingMachine) {
      await updateMachine(editingMachine.id, {
        type: selectedType,
        model: model.trim(),
      });
      setModel('');
      setInitialHourMeter('');
      setSelectedType('Trator');
      setEditingMachine(null);
      setIsModalOpen(false);
      Alert.alert('Sucesso', 'Máquina atualizada com sucesso!');
      return;
    }

    if (!canAddMachine(machines.length)) {
      const planName = subscriptionInfo.planType === 'basic' ? 'Básico' : 'Pro';
      Alert.alert(
        'Limite de Máquinas Atingido',
        `Você atingiu o limite de ${subscriptionInfo.machineLimit} máquinas do plano ${planName}.\n\nPara continuar cadastrando máquinas, faça o upgrade para o plano Pro (máquinas ilimitadas).`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Fazer upgrade agora',
            onPress: () => {
              setIsModalOpen(false);
              router.push('/(tabs)/subscription');
            },
          },
        ]
      );
      return;
    }

    const hourMeterValue = initialHourMeter.trim() ? parseFloat(initialHourMeter) : 0;

    if (initialHourMeter.trim() && (isNaN(hourMeterValue) || hourMeterValue < 0)) {
      const meterLabel = getMeterLabel(selectedType).toLowerCase();
      Alert.alert('Erro', `Por favor, insira um ${meterLabel} válido`);
      return;
    }

    await addMachine({
      type: selectedType,
      model: model.trim(),
      currentHourMeter: hourMeterValue,
    });

    setModel('');
    setInitialHourMeter('');
    setSelectedType('Trator');
    setIsModalOpen(false);
    Alert.alert('Sucesso', 'Máquina cadastrada com sucesso!');
  };

  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setSelectedType(machine.type);
    setModel(machine.model);
    setInitialHourMeter('');
    setIsModalOpen(true);
  };

  const handleDeleteMachine = async (machine: Machine) => {
    // Verificar se a máquina tem histórico
    const canDelete = await checkMachineCanBeDeleted(machine.id);

    if (!canDelete.canDelete) {
      // Máquina tem histórico - mostrar modal com 3 opções
      setMachineToDelete({ machine, canDelete });
      setDeleteModalOpen(true);
      return;
    }

    // Máquina sem histórico - pode deletar diretamente
    const ok = await confirm(
      'Excluir Máquina',
      `Tem certeza que deseja excluir ${machine.model}?`
    );
    if (!ok) return;

    await deleteMachine(machine.id);
    Alert.alert('Sucesso', 'Máquina excluída com sucesso!');
  };

  const handleArchive = async () => {
    if (!machineToDelete) return;

    setDeleteModalOpen(false);
    await archiveMachine(machineToDelete.machine.id);
    Alert.alert('Sucesso', `${machineToDelete.machine.model} foi arquivada!\n\nTodo o histórico foi preservado.`);
    setMachineToDelete(null);
  };

  const handleDeletePermanently = async () => {
    if (!machineToDelete) return;

    setDeleteModalOpen(false);
    await deleteMachine(machineToDelete.machine.id);
    Alert.alert('Excluído', `${machineToDelete.machine.model} e todo histórico foram excluídos.\n\nCombustível devolvido ao tanque.`);
    setMachineToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setMachineToDelete(null);
  };

  const getMachineAlerts = (machineId: string) => {
    const alerts = getAlertsForMachine(machineId);
    const redAlerts = alerts.filter((a) => a.status === 'red').length;
    const yellowAlerts = alerts.filter((a) => a.status === 'yellow').length;
    return { red: redAlerts, yellow: yellowAlerts };
  };

  const renderMachine = ({ item }: { item: Machine }) => {
    const alerts = getMachineAlerts(item.id);
    const hasAlerts = alerts.red > 0 || alerts.yellow > 0;

    return (
      <View style={styles.machineCard}>
        <View style={styles.machineIcon}>
          <TractorIcon size={28} color="#2D5016" strokeWidth={1.5} />
        </View>
        <View style={styles.machineInfo}>
          <View style={styles.machineHeader}>
            <Text style={styles.machineType}>[{item.type}]</Text>
            {hasAlerts && (
              <View style={styles.alertBadge}>
                <AlertTriangle size={16} color="#FFF" />
                <Text style={styles.alertBadgeText}>
                  {alerts.red + alerts.yellow}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.machineModel}>{item.model}</Text>
          <Text style={styles.machineHours}>
            {getMeterLabel(item.type)}: {formatMeterValue(item.currentHourMeter, item.type, 0)}
          </Text>
        </View>
        {isMaster && (
          <View style={styles.machineActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditMachine(item)}
            >
              <Edit2 size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteMachine(item)}
            >
              <Trash2 size={20} color="#FF5722" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerTitle}>Minhas Máquinas</Text>
          {subscriptionInfo.machineLimit !== -1 && (
            <Text style={styles.headerSubtitle}>
              {machines.length} de {subscriptionInfo.machineLimit} máquinas
            </Text>
          )}
        </View>
      </View>

      {machines.length === 0 ? (
        <View style={styles.emptyState}>
          <TractorIcon size={64} color="#CCC" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Nenhuma máquina cadastrada</Text>
          <Text style={styles.emptyText}>
            Adicione sua primeira máquina para começar
          </Text>
        </View>
      ) : (
        <FlatList
          data={machines}
          renderItem={renderMachine}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {isMaster && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsModalOpen(true)}
        >
          <Plus size={28} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingMachine ? 'Editar Máquina' : 'Cadastrar Nova Máquina'}
                </Text>

                <Text style={styles.label}>Tipo do Maquinário</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.typeScroll}
                >
                  {MACHINE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        selectedType === type && styles.typeButtonSelected,
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          selectedType === type && styles.typeButtonTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Modelo do Maquinário</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="Ex: Massey Ferguson 6713"
                  placeholderTextColor="#999"
                />

                {!editingMachine && (
                  <>
                    <Text style={styles.label}>{getMeterLabel(selectedType)} Inicial (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      value={initialHourMeter}
                      onChangeText={setInitialHourMeter}
                      placeholder="Ex: 1500"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={() => {
                      setIsModalOpen(false);
                      setModel('');
                      setInitialHourMeter('');
                      setSelectedType('Trator');
                      setEditingMachine(null);
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonSave}
                    onPress={handleAddMachine}
                  >
                    <Text style={styles.modalButtonSaveText}>
                      {editingMachine ? 'Salvar' : 'Cadastrar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Delete/Archive Modal */}
      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Máquina com Histórico</Text>

            {machineToDelete && (
              <Text style={styles.deleteModalMessage}>
                {machineToDelete.machine.model} possui histórico de uso:{'\n\n'}
                • {machineToDelete.canDelete.refuelingCount} abastecimento(s){'\n'}
                • {machineToDelete.canDelete.maintenanceCount} manutenção(ões){'\n\n'}
                O que deseja fazer?
              </Text>
            )}

            <TouchableOpacity
              style={[styles.deleteModalButton, styles.archiveButton]}
              onPress={handleArchive}
            >
              <Text style={styles.deleteModalButtonText}>📦 ARQUIVAR</Text>
              <Text style={styles.deleteModalButtonSubtext}>Preserva todo o histórico</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteModalButton, styles.deleteButton]}
              onPress={handleDeletePermanently}
            >
              <Text style={styles.deleteModalButtonText}>🗑️ EXCLUIR TUDO</Text>
              <Text style={styles.deleteModalButtonSubtext}>Apaga e devolve combustível</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteModalButton, styles.cancelButton]}
              onPress={handleCancelDelete}
            >
              <Text style={styles.cancelButtonText}>✖ CANCELAR</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  list: {
    padding: 16,
  },
  machineCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  machineIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  machineInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  machineType: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  machineModel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 4,
  },
  machineHours: {
    fontSize: 14,
    color: '#666',
  },
  machineActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2D5016',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  typeScroll: {
    marginBottom: 24,
  },
  typeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 12,
  },
  typeButtonSelected: {
    borderColor: '#2D5016',
    backgroundColor: '#E8F5E9',
  },
  typeButtonText: {
    fontSize: 15,
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#CCC',
    marginBottom: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
  deleteModalButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  archiveButton: {
    backgroundColor: '#3478F6',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
    marginTop: 4,
  },
  deleteModalButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFF',
    marginBottom: 4,
  },
  deleteModalButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#FFF',
  },
});
