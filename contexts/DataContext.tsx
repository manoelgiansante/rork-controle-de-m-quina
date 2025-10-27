import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Alert,
  AlertStatus,
  FarmTank,
  Machine,
  Maintenance,
  MaintenanceItem,
  Refueling,
  ServiceType,
} from '@/types';

const DEFAULT_MAINTENANCE_ITEMS: MaintenanceItem[] = [
  'Troca de óleo do motor',
  'Troca de filtro de óleo do motor',
  'Troca de filtro de ar',
  'Troca de filtro de combustível',
  'Troca de óleo da transmissão',
  'Troca de óleo hidráulico',
  'Limpeza / troca de filtro hidráulico',
  'Engraxar pontos de lubrificação',
  'Revisão de freios',
  'Aperto geral de parafusos importantes',
  'Calibragem / troca de pneu',
  'Limpeza do radiador / sistema de arrefecimento',
  'Verificação/troca de bateria / parte elétrica',
  'Lavagem / limpeza geral',
];

const STORAGE_KEYS = {
  MACHINES: '@controle_maquina:machines',
  REFUELINGS: '@controle_maquina:refuelings',
  MAINTENANCES: '@controle_maquina:maintenances',
  ALERTS: '@controle_maquina:alerts',
  SERVICE_TYPES: '@controle_maquina:service_types',
  MAINTENANCE_ITEMS: '@controle_maquina:maintenance_items',
  FARM_TANK: '@controle_maquina:farm_tank',
};

export const [DataProvider, useData] = createContextHook(() => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [refuelings, setRefuelings] = useState<Refueling[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>(DEFAULT_MAINTENANCE_ITEMS);
  const [farmTank, setFarmTank] = useState<FarmTank | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const [
        machinesData,
        refuelingsData,
        maintenancesData,
        alertsData,
        serviceTypesData,
        maintenanceItemsData,
        farmTankData,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MACHINES),
        AsyncStorage.getItem(STORAGE_KEYS.REFUELINGS),
        AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCES),
        AsyncStorage.getItem(STORAGE_KEYS.ALERTS),
        AsyncStorage.getItem(STORAGE_KEYS.SERVICE_TYPES),
        AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCE_ITEMS),
        AsyncStorage.getItem(STORAGE_KEYS.FARM_TANK),
      ]);

      if (machinesData) setMachines(JSON.parse(machinesData));
      if (refuelingsData) setRefuelings(JSON.parse(refuelingsData));
      if (maintenancesData) setMaintenances(JSON.parse(maintenancesData));
      if (alertsData) setAlerts(JSON.parse(alertsData));
      if (serviceTypesData) setServiceTypes(JSON.parse(serviceTypesData));
      if (maintenanceItemsData) {
        setMaintenanceItems(JSON.parse(maintenanceItemsData));
      } else {
        await AsyncStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_ITEMS,
          JSON.stringify(DEFAULT_MAINTENANCE_ITEMS)
        );
      }
      if (farmTankData) {
        setFarmTank(JSON.parse(farmTankData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addMachine = useCallback(
    async (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newMachine: Machine = {
        ...machine,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...machines, newMachine];
      setMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
      return newMachine;
    },
    [machines]
  );

  const updateMachine = useCallback(
    async (machineId: string, updates: Partial<Machine>) => {
      const updated = machines.map((m) =>
        m.id === machineId
          ? { ...m, ...updates, updatedAt: new Date().toISOString() }
          : m
      );
      setMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [machines]
  );

  const deleteMachine = useCallback(
    async (machineId: string) => {
      const updated = machines.filter((m) => m.id !== machineId);
      setMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [machines]
  );

  const addRefueling = useCallback(
    async (
      refueling: Omit<Refueling, 'id' | 'createdAt' | 'averageConsumption'>
    ) => {
      const machineRefuelings = refuelings
        .filter((r) => r.machineId === refueling.machineId)
        .sort((a, b) => b.hourMeter - a.hourMeter);

      let averageConsumption: number | undefined;
      if (machineRefuelings.length > 0) {
        const lastRefueling = machineRefuelings[0];
        const hoursDiff = refueling.hourMeter - lastRefueling.hourMeter;
        if (hoursDiff > 0) {
          averageConsumption = refueling.liters / hoursDiff;
        }
      }

      const newRefueling: Refueling = {
        ...refueling,
        id: Date.now().toString(),
        averageConsumption,
        createdAt: new Date().toISOString(),
      };

      const updated = [...refuelings, newRefueling];
      setRefuelings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.REFUELINGS, JSON.stringify(updated));

      await updateMachine(refueling.machineId, {
        currentHourMeter: refueling.hourMeter,
      });

      return newRefueling;
    },
    [refuelings, updateMachine]
  );

  const calculateAlertStatus = useCallback(
    (currentHourMeter: number, targetHourMeter: number): AlertStatus => {
      const remaining = targetHourMeter - currentHourMeter;
      if (remaining > 20) return 'green';
      if (remaining > 0) return 'yellow';
      return 'red';
    },
    []
  );

  const addMaintenance = useCallback(
    async (maintenance: Omit<Maintenance, 'id' | 'createdAt'>) => {
      const newMaintenance: Maintenance = {
        ...maintenance,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const updated = [...maintenances, newMaintenance];
      setMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );

      await updateMachine(maintenance.machineId, {
        currentHourMeter: maintenance.hourMeter,
      });

      const machine = machines.find((m) => m.id === maintenance.machineId);
      if (machine) {
        const newAlerts: Alert[] = maintenance.itemRevisions.map((revision) => ({
          id: `${newMaintenance.id}-${revision.item}`,
          machineId: maintenance.machineId,
          maintenanceId: newMaintenance.id,
          maintenanceItem: revision.item,
          serviceHourMeter: maintenance.hourMeter,
          intervalHours: revision.nextRevisionHours,
          nextRevisionHourMeter:
            maintenance.hourMeter + revision.nextRevisionHours,
          status: calculateAlertStatus(
            machine.currentHourMeter,
            maintenance.hourMeter + revision.nextRevisionHours
          ),
          createdAt: new Date().toISOString(),
        }));

        const updatedAlerts = [...alerts, ...newAlerts];
        setAlerts(updatedAlerts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.ALERTS,
          JSON.stringify(updatedAlerts)
        );
      }

      return newMaintenance;
    },
    [maintenances, alerts, machines, updateMachine, calculateAlertStatus]
  );

  const updateMaintenance = useCallback(
    async (maintenanceId: string, updates: Partial<Maintenance>) => {
      const updated = maintenances.map((m) =>
        m.id === maintenanceId ? { ...m, ...updates } : m
      );
      setMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );
    },
    [maintenances]
  );

  const deleteMaintenance = useCallback(
    async (maintenanceId: string) => {
      const updated = maintenances.filter((m) => m.id !== maintenanceId);
      setMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );

      const updatedAlerts = alerts.filter(
        (a) => a.maintenanceId !== maintenanceId
      );
      setAlerts(updatedAlerts);
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
    },
    [maintenances, alerts]
  );

  const alertsRef = useRef(alerts);
  
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    if (!isLoading && machines.length > 0 && alertsRef.current.length > 0) {
      const currentAlerts = alertsRef.current;
      const updatedAlerts = currentAlerts.map((alert) => {
        const machine = machines.find((m) => m.id === alert.machineId);
        if (!machine) return alert;

        const newStatus = calculateAlertStatus(
          machine.currentHourMeter,
          alert.nextRevisionHourMeter
        );

        if (newStatus !== alert.status) {
          return {
            ...alert,
            status: newStatus,
          };
        }
        return alert;
      });

      const hasChanges = updatedAlerts.some((alert, idx) => alert.status !== currentAlerts[idx]?.status);
      
      if (hasChanges) {
        setAlerts(updatedAlerts);
        AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
      }
    }
  }, [machines, isLoading, calculateAlertStatus]);

  const getAlertsForMachine = useCallback(
    (machineId: string) => {
      return alerts.filter((a) => a.machineId === machineId);
    },
    [alerts]
  );

  const getRefuelingsForMachine = useCallback(
    (machineId: string) => {
      return refuelings
        .filter((r) => r.machineId === machineId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [refuelings]
  );

  const getMaintenancesForMachine = useCallback(
    (machineId: string) => {
      return maintenances
        .filter((m) => m.machineId === machineId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },
    [maintenances]
  );

  const addServiceType = useCallback(
    async (serviceType: ServiceType) => {
      if (!serviceTypes.includes(serviceType)) {
        const updated = [...serviceTypes, serviceType];
        setServiceTypes(updated);
        await AsyncStorage.setItem(
          STORAGE_KEYS.SERVICE_TYPES,
          JSON.stringify(updated)
        );
      }
    },
    [serviceTypes]
  );

  const addMaintenanceItem = useCallback(
    async (item: MaintenanceItem) => {
      if (!maintenanceItems.includes(item)) {
        const updated = [...maintenanceItems, item];
        setMaintenanceItems(updated);
        await AsyncStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_ITEMS,
          JSON.stringify(updated)
        );
      }
    },
    [maintenanceItems]
  );

  const updateTankInitialData = useCallback(async (data: FarmTank) => {
    setFarmTank(data);
    await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(data));
  }, []);

  const addFuel = useCallback(
    async (litersAdded: number) => {
      if (!farmTank) return;

      const newCurrentLiters = Math.min(
        farmTank.currentLiters + litersAdded,
        farmTank.capacityLiters
      );

      const updated: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      setFarmTank(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
    },
    [farmTank]
  );

  const consumeFuel = useCallback(
    async (litersUsed: number) => {
      if (!farmTank) return;

      const newCurrentLiters = Math.max(farmTank.currentLiters - litersUsed, 0);

      const updated: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      setFarmTank(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      if (newCurrentLiters <= farmTank.alertLevelLiters) {
        console.log(
          `ALERTA: Tanque de combustível baixo: restam apenas ${newCurrentLiters.toFixed(0)} litros`
        );
      }
    },
    [farmTank]
  );

  return useMemo(
    () => ({
      machines,
      refuelings,
      maintenances,
      alerts,
      serviceTypes,
      maintenanceItems,
      farmTank,
      isLoading,
      addMachine,
      updateMachine,
      deleteMachine,
      addRefueling,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      getAlertsForMachine,
      getRefuelingsForMachine,
      getMaintenancesForMachine,
      addServiceType,
      addMaintenanceItem,
      updateTankInitialData,
      addFuel,
      consumeFuel,
    }),
    [
      machines,
      refuelings,
      maintenances,
      alerts,
      serviceTypes,
      maintenanceItems,
      farmTank,
      isLoading,
      addMachine,
      updateMachine,
      deleteMachine,
      addRefueling,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      getAlertsForMachine,
      getRefuelingsForMachine,
      getMaintenancesForMachine,
      addServiceType,
      addMaintenanceItem,
      updateTankInitialData,
      addFuel,
      consumeFuel,
    ]
  );
});
