import { useData } from '@/contexts/DataContext';
import type { AlertStatus } from '@/types';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Droplet,
  Settings,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
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
  } = useData();
  const [selectedSection, setSelectedSection] =
    useState<ReportSection>('alerts');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  const renderMaintenanceHistory = (machineId: string) => {
    const maintenances = getMaintenancesForMachine(machineId);
    if (maintenances.length === 0) {
      return (
        <Text style={styles.emptyText}>
          Nenhuma manutenção registrada para esta máquina
        </Text>
      );
    }

    return maintenances.map((maintenance) => (
      <View key={maintenance.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Settings size={20} color="#2D5016" />
          <Text style={styles.historyDate}>
            {new Date(maintenance.createdAt).toLocaleDateString('pt-BR')}
          </Text>
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
    ));
  };

  const renderRefuelingHistory = (machineId: string) => {
    const refuelings = getRefuelingsForMachine(machineId);
    if (refuelings.length === 0) {
      return (
        <Text style={styles.emptyText}>
          Nenhum abastecimento registrado para esta máquina
        </Text>
      );
    }

    return refuelings.map((refueling) => (
      <View key={refueling.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Droplet size={20} color="#2196F3" />
          <Text style={styles.historyDate}>
            {new Date(refueling.date).toLocaleDateString('pt-BR')}
          </Text>
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
    ));
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
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Histórico de Manutenção</Text>
            {machines.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
            ) : (
              <View style={styles.machineButtons}>
                {machines.map((machine) => (
                  <TouchableOpacity
                    key={machine.id}
                    style={styles.machineButton}
                    onPress={() => {
                      setSelectedMachineId(machine.id);
                      setIsModalOpen(true);
                    }}
                  >
                    <Text style={styles.machineButtonText}>
                      [{machine.type}] {machine.model}
                    </Text>
                    <ChevronRight size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      case 'refueling':
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Histórico de Abastecimento</Text>
            {machines.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
            ) : (
              <View style={styles.machineButtons}>
                {machines.map((machine) => (
                  <TouchableOpacity
                    key={machine.id}
                    style={styles.machineButton}
                    onPress={() => {
                      setSelectedMachineId(machine.id);
                      setIsModalOpen(true);
                    }}
                  >
                    <Text style={styles.machineButtonText}>
                      [{machine.type}] {machine.model}
                    </Text>
                    <ChevronRight size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
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
        visible={isModalOpen}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedSection === 'maintenance'
                ? 'Histórico de Manutenção'
                : 'Histórico de Abastecimento'}
            </Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={styles.modalClose}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {selectedSection === 'maintenance'
              ? renderMaintenanceHistory(selectedMachineId)
              : renderRefuelingHistory(selectedMachineId)}
          </ScrollView>
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  modalScroll: {
    flex: 1,
    padding: 16,
  },
});
