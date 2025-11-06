import { useData } from '@/contexts/DataContext';
import type { AlertStatus, Maintenance, Refueling } from '@/types';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Droplet,
  Edit2,
  Settings,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ReportSection = 'alerts' | 'maintenance' | 'refueling' | 'consumption';

export default function ReportsScreen() {
  const {
    machines,
    alerts,
    getMaintenancesForMachine,
    getRefuelingsForMachine,
    updateMaintenance,
    deleteMaintenance,
    updateRefueling,
    deleteRefueling,
  } = useData();
  const [selectedSection, setSelectedSection] =
    useState<ReportSection>('alerts');
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [editingRefueling, setEditingRefueling] = useState<Refueling | null>(null);

  const alertsData = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => {
      const statusPriority: Record<AlertStatus, number> = {
        red: 0,
        yellow: 1,
        green: 2,
      };
      return statusPriority[a.status] - statusPriority[b.status];
    });
    return sorted;
  }, [alerts]);

  const getAlertColor = (status: AlertStatus) => {
    switch (status) {
      case 'red':
        return '#F44336';
      case 'yellow':
        return '#FF9800';
      case 'green':
        return '#4CAF50';
    }
  };

  const getAlertIcon = (status: AlertStatus) => {
    switch (status) {
      case 'red':
        return AlertCircle;
      case 'yellow':
        return AlertTriangle;
      case 'green':
        return CheckCircle;
    }
  };

  const renderAlert = ({ item }: { item: typeof alertsData[0] }) => {
    const machine = machines.find((m) => m.id === item.machineId);
    if (!machine) return null;

    const Icon = getAlertIcon(item.status);
    const color = getAlertColor(item.status);

    const remaining = item.nextRevisionHourMeter - machine.currentHourMeter;
    const isOverdue = remaining < 0;

    return (
      <View style={[styles.alertCard, { borderLeftColor: color }]}>
        <View style={styles.alertHeader}>
          <Icon size={24} color={color} />
          <View style={styles.alertInfo}>
            <Text style={styles.alertMachine}>
              [{machine.type}] {machine.model}
            </Text>
            <Text style={styles.alertItem}>{item.maintenanceItem}</Text>
          </View>
        </View>
        <View style={styles.alertDetails}>
          <Text style={styles.alertDetailText}>
            Previsto: {item.nextRevisionHourMeter}h
          </Text>
          <Text style={styles.alertDetailText}>
            Atual: {machine.currentHourMeter}h
          </Text>
          <Text
            style={[
              styles.alertRemaining,
              { color: isOverdue ? '#F44336' : '#666' },
            ]}
          >
            {isOverdue
              ? `Atrasado ${Math.abs(remaining)}h`
              : `Faltam ${remaining}h`}
          </Text>
        </View>
      </View>
    );
  };

  const renderConsumptionReport = () => {
    const consumptionData = machines.map((machine) => {
      const refuelings = getRefuelingsForMachine(machine.id);
      const refuelingsWithConsumption = refuelings.filter(
        (r) => r.averageConsumption !== undefined
      );

      if (refuelingsWithConsumption.length === 0) {
        return { machine, avgConsumption: null };
      }

      const totalConsumption = refuelingsWithConsumption.reduce(
        (sum, r) => sum + (r.averageConsumption || 0),
        0
      );
      const avgConsumption =
        totalConsumption / refuelingsWithConsumption.length;

      return { machine, avgConsumption };
    });

    return consumptionData.map(({ machine, avgConsumption }) => (
      <View key={machine.id} style={styles.consumptionCard}>
        <Text style={styles.consumptionMachine}>
          [{machine.type}] {machine.model}
        </Text>
        {avgConsumption !== null ? (
          <Text style={styles.consumptionValue}>
            {avgConsumption.toFixed(2)} L/h
          </Text>
        ) : (
          <Text style={styles.consumptionEmpty}>
            Sem dados suficientes
          </Text>
        )}
      </View>
    ));
  };

  const renderSectionContent = () => {
    switch (selectedSection) {
      case 'alerts':
        return (
          <View style={styles.sectionContent}>
            {alertsData.length === 0 ? (
              <View style={styles.emptyState}>
                <CheckCircle size={64} color="#4CAF50" />
                <Text style={styles.emptyTitle}>Nenhum alerta</Text>
                <Text style={styles.emptyText}>
                  Todas as máquinas estão em dia!
                </Text>
              </View>
            ) : (
              <FlatList
                data={alertsData}
                renderItem={renderAlert}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.alertsList}
              />
            )}
          </View>
        );

      case 'maintenance':
        return (
          <ScrollView style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Histórico de Manutenção</Text>
            {machines.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
            ) : (
              <View style={styles.historyContainer}>
                {machines.map((machine) => {
                  const maintenances = getMaintenancesForMachine(machine.id);
                  return (
                    <View key={machine.id} style={styles.machineSection}>
                      <View style={styles.machineSectionHeader}>
                        <Text style={styles.machineSectionTitle}>
                          [{machine.type}] {machine.model}
                        </Text>
                        <Text style={styles.maintenanceCount}>
                          {maintenances.length} manutenções
                        </Text>
                      </View>
                      {maintenances.length === 0 ? (
                        <Text style={styles.emptyText}>
                          Nenhuma manutenção registrada
                        </Text>
                      ) : (
                        maintenances.map((maintenance) => (
                          <View key={maintenance.id} style={styles.historyCard}>
                            <View style={styles.historyHeader}>
                              <Settings size={20} color="#2D5016" />
                              <Text style={styles.historyDate}>
                                {new Date(maintenance.createdAt).toLocaleDateString('pt-BR')}
                              </Text>
                              <View style={styles.actionButtons}>
                                <TouchableOpacity
                                  onPress={() => setEditingMaintenance(maintenance)}
                                  style={styles.actionButton}
                                >
                                  <Edit2 size={18} color="#2D5016" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => {
                                    console.log('[REPORTS] Botão excluir manutenção pressionado:', maintenance.id);
                                    handleDeleteMaintenance(maintenance.id);
                                  }}
                                  style={styles.deleteButton}
                                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                  testID={`delete-maintenance-${maintenance.id}`}
                                >
                                  <Trash2 size={20} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <Text style={styles.historyHourMeter}>
                              Horímetro: {maintenance.hourMeter}h
                            </Text>
                            <View style={styles.historyItems}>
                              {maintenance.items.map((item, idx) => (
                                <Text key={idx} style={styles.historyItem}>
                                  • {item}
                                </Text>
                              ))}
                            </View>
                            {maintenance.observation && (
                              <Text style={styles.historyObservation}>
                                Obs: {maintenance.observation}
                              </Text>
                            )}
                            <Text style={styles.historyUser}>
                              Registrado por: {maintenance.userName}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        );

      case 'refueling':
        return (
          <ScrollView style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Histórico de Abastecimento</Text>
            {machines.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
            ) : (
              <View style={styles.historyContainer}>
                {machines.map((machine) => {
                  const refuelings = getRefuelingsForMachine(machine.id);
                  return (
                    <View key={machine.id} style={styles.machineSection}>
                      <View style={styles.machineSectionHeader}>
                        <Text style={styles.machineSectionTitle}>
                          [{machine.type}] {machine.model}
                        </Text>
                        <Text style={styles.refuelingCount}>
                          {refuelings.length} abastecimentos
                        </Text>
                      </View>
                      {refuelings.length === 0 ? (
                        <Text style={styles.emptyText}>
                          Nenhum abastecimento registrado
                        </Text>
                      ) : (
                        refuelings.map((refueling) => (
                          <View key={refueling.id} style={styles.historyCard}>
                            <View style={styles.historyHeader}>
                              <Droplet size={20} color="#2196F3" />
                              <Text style={styles.historyDate}>
                                {new Date(refueling.date).toLocaleDateString('pt-BR')}
                              </Text>
                              <View style={styles.actionButtons}>
                                <TouchableOpacity
                                  onPress={() => setEditingRefueling(refueling)}
                                  style={styles.actionButton}
                                >
                                  <Edit2 size={18} color="#2D5016" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => {
                                    console.log('[REPORTS] Botão excluir pressionado:', refueling.id);
                                    console.log('[REPORTS] Refueling completo:', JSON.stringify(refueling, null, 2));
                                    handleDeleteRefueling(refueling.id);
                                  }}
                                  style={styles.deleteButton}
                                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                  testID={`delete-refueling-${refueling.id}`}
                                >
                                  <Trash2 size={20} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={styles.refuelingDetails}>
                              <View style={styles.refuelingRow}>
                                <Text style={styles.refuelingLabel}>Litros:</Text>
                                <Text style={styles.refuelingValue}>{refueling.liters}L</Text>
                              </View>
                              <View style={styles.refuelingRow}>
                                <Text style={styles.refuelingLabel}>Horímetro:</Text>
                                <Text style={styles.refuelingValue}>{refueling.hourMeter}h</Text>
                              </View>
                              {refueling.averageConsumption && (
                                <View style={styles.refuelingRow}>
                                  <Text style={styles.refuelingLabel}>Consumo médio:</Text>
                                  <Text style={styles.refuelingValue}>
                                    {refueling.averageConsumption.toFixed(2)} L/h
                                  </Text>
                                </View>
                              )}
                              {refueling.serviceType && (
                                <View style={styles.refuelingRow}>
                                  <Text style={styles.refuelingLabel}>Serviço:</Text>
                                  <Text style={styles.refuelingValue}>{refueling.serviceType}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.historyUser}>
                              Registrado por: {refueling.userName}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        );

      case 'consumption':
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Consumo Médio por Máquina</Text>
            {machines.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
            ) : (
              <ScrollView style={styles.consumptionList}>
                {renderConsumptionReport()}
              </ScrollView>
            )}
          </View>
        );
    }
  };

  const handleDeleteMaintenance = (maintenanceId: string) => {
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    if (isWeb) {
      const confirmed = window.confirm(
        'Tem certeza que deseja excluir esta manutenção? Os alertas relacionados também serão removidos.'
      );
      
      if (confirmed) {
        (async () => {
          try {
            console.log('[REPORTS] Excluindo manutenção:', maintenanceId);
            await deleteMaintenance(maintenanceId);
            console.log('[REPORTS] Manutenção excluída com sucesso');
            window.alert('Manutenção excluída com sucesso!');
          } catch (error) {
            console.error('[REPORTS] Erro ao excluir manutenção:', error);
            window.alert(`Não foi possível excluir a manutenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        })();
      } else {
        console.log('[REPORTS] Cancelado');
      }
    } else {
      Alert.alert(
        'Excluir Manutenção',
        'Tem certeza que deseja excluir esta manutenção? Os alertas relacionados também serão removidos.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log('[REPORTS] Cancelado') },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('[REPORTS] Excluindo manutenção:', maintenanceId);
                await deleteMaintenance(maintenanceId);
                console.log('[REPORTS] Manutenção excluída com sucesso');
                Alert.alert('Sucesso', 'Manutenção excluída com sucesso!');
              } catch (error) {
                console.error('[REPORTS] Erro ao excluir manutenção:', error);
                Alert.alert('Erro', `Não foi possível excluir a manutenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
              }
            },
          },
        ]
      );
    }
  };

  const handleDeleteRefueling = (refuelingId: string) => {
    console.log('[REPORTS] handleDeleteRefueling chamado:', refuelingId);
    
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    if (isWeb) {
      const confirmed = window.confirm(
        'Tem certeza que deseja excluir este abastecimento? O combustível será devolvido ao tanque.'
      );
      
      if (confirmed) {
        (async () => {
          try {
            console.log('[REPORTS] Excluindo abastecimento:', refuelingId);
            console.log('[REPORTS] deleteRefueling disponível?', typeof deleteRefueling);
            await deleteRefueling(refuelingId);
            console.log('[REPORTS] Abastecimento excluído com sucesso');
            window.alert('Abastecimento excluído com sucesso!');
          } catch (error) {
            console.error('[REPORTS] Erro ao excluir abastecimento:', error);
            window.alert(`Não foi possível excluir o abastecimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        })();
      } else {
        console.log('[REPORTS] Cancelado');
      }
    } else {
      Alert.alert(
        'Excluir Abastecimento',
        'Tem certeza que deseja excluir este abastecimento? O combustível será devolvido ao tanque.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log('[REPORTS] Cancelado') },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('[REPORTS] Excluindo abastecimento:', refuelingId);
                console.log('[REPORTS] deleteRefueling disponível?', typeof deleteRefueling);
                await deleteRefueling(refuelingId);
                console.log('[REPORTS] Abastecimento excluído com sucesso');
                Alert.alert('Sucesso', 'Abastecimento excluído com sucesso!');
              } catch (error) {
                console.error('[REPORTS] Erro ao excluir abastecimento:', error);
                Alert.alert('Erro', `Não foi possível excluir o abastecimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
              }
            },
          },
        ]
      );
    }
  };

  const handleSaveMaintenance = async () => {
    if (!editingMaintenance) return;

    try {
      await updateMaintenance(editingMaintenance.id, {
        hourMeter: editingMaintenance.hourMeter,
        observation: editingMaintenance.observation,
      });
      setEditingMaintenance(null);
    } catch (error) {
      console.error('Erro ao atualizar manutenção:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a manutenção');
    }
  };

  const handleSaveRefueling = async () => {
    if (!editingRefueling) return;

    try {
      await updateRefueling(editingRefueling.id, {
        liters: editingRefueling.liters,
        hourMeter: editingRefueling.hourMeter,
      });
      setEditingRefueling(null);
    } catch (error) {
      console.error('Erro ao atualizar abastecimento:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o abastecimento');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedSection === 'alerts' && styles.tabActive]}
          onPress={() => setSelectedSection('alerts')}
        >
          <AlertTriangle
            size={20}
            color={selectedSection === 'alerts' ? '#2D5016' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              selectedSection === 'alerts' && styles.tabTextActive,
            ]}
          >
            Alertas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedSection === 'maintenance' && styles.tabActive,
          ]}
          onPress={() => setSelectedSection('maintenance')}
        >
          <Settings
            size={20}
            color={selectedSection === 'maintenance' ? '#2D5016' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              selectedSection === 'maintenance' && styles.tabTextActive,
            ]}
          >
            Manutenção
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedSection === 'refueling' && styles.tabActive,
          ]}
          onPress={() => setSelectedSection('refueling')}
        >
          <Droplet
            size={20}
            color={selectedSection === 'refueling' ? '#2D5016' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              selectedSection === 'refueling' && styles.tabTextActive,
            ]}
          >
            Abastecimento
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedSection === 'consumption' && styles.tabActive,
          ]}
          onPress={() => setSelectedSection('consumption')}
        >
          <Clock
            size={20}
            color={selectedSection === 'consumption' ? '#2D5016' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              selectedSection === 'consumption' && styles.tabTextActive,
            ]}
          >
            Consumo
          </Text>
        </TouchableOpacity>
      </View>

      {renderSectionContent()}

      <Modal
        visible={editingMaintenance !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingMaintenance(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Manutenção</Text>
              <TouchableOpacity onPress={() => setEditingMaintenance(null)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {editingMaintenance && (
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Horímetro (h)</Text>
                  <TextInput
                    style={styles.input}
                    value={editingMaintenance.hourMeter.toString()}
                    onChangeText={(text) =>
                      setEditingMaintenance({
                        ...editingMaintenance,
                        hourMeter: parseFloat(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Observação</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingMaintenance.observation || ''}
                    onChangeText={(text) =>
                      setEditingMaintenance({
                        ...editingMaintenance,
                        observation: text,
                      })
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveMaintenance}
                >
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={editingRefueling !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingRefueling(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Abastecimento</Text>
              <TouchableOpacity onPress={() => setEditingRefueling(null)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {editingRefueling && (
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Litros</Text>
                  <TextInput
                    style={styles.input}
                    value={editingRefueling.liters.toString()}
                    onChangeText={(text) =>
                      setEditingRefueling({
                        ...editingRefueling,
                        liters: parseFloat(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Horímetro (h)</Text>
                  <TextInput
                    style={styles.input}
                    value={editingRefueling.hourMeter.toString()}
                    onChangeText={(text) =>
                      setEditingRefueling({
                        ...editingRefueling,
                        hourMeter: parseFloat(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveRefueling}
                >
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            )}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#2D5016',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#999',
  },
  tabTextActive: {
    color: '#2D5016',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  alertsList: {
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertMachine: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 4,
  },
  alertItem: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
  },
  alertDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  alertDetailText: {
    fontSize: 13,
    color: '#666',
  },
  alertRemaining: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  machineButtons: {
    paddingHorizontal: 20,
  },
  machineButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  machineButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#333',
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#333',
  },
  historyHourMeter: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  historyItems: {
    marginBottom: 12,
  },
  historyItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  historyObservation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic' as const,
    marginBottom: 12,
  },
  historyUser: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  refuelingDetails: {
    marginBottom: 12,
  },
  refuelingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  refuelingLabel: {
    fontSize: 14,
    color: '#666',
  },
  refuelingValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  consumptionList: {
    paddingHorizontal: 20,
  },
  consumptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  consumptionMachine: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#333',
    marginRight: 12,
  },
  consumptionValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2D5016',
  },
  consumptionEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic' as const,
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
  historyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  machineSection: {
    marginBottom: 24,
  },
  machineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2D5016',
    borderRadius: 12,
    marginBottom: 12,
  },
  machineSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  maintenanceCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#E8F5E9',
  },
  refuelingCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#E8F5E9',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 4,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 6,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#2D5016',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
