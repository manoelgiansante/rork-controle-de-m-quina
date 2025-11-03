import AsyncStorage from '@/lib/storage';
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
import { useProperty } from '@/contexts/PropertyContext';

const DEFAULT_MAINTENANCE_ITEMS: MaintenanceItem[] = [
  'Troca de óleo do motor',
  'Troca do filtro de óleo',
  'Troca do filtro de diesel',
  'Troca do filtro de ar do motor',
  'Troca do filtro hidráulico',
  'Troca do óleo da transmissão',
  'Troca do óleo hidráulico',
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
  const { currentPropertyId } = useProperty();
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [allRefuelings, setAllRefuelings] = useState<Refueling[]>([]);
  const [allMaintenances, setAllMaintenances] = useState<Maintenance[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>(DEFAULT_MAINTENANCE_ITEMS);
  const [allFarmTanks, setAllFarmTanks] = useState<FarmTank[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const machines = useMemo(
    () => allMachines.filter(m => m.propertyId === currentPropertyId),
    [allMachines, currentPropertyId]
  );

  const refuelings = useMemo(
    () => allRefuelings.filter(r => r.propertyId === currentPropertyId),
    [allRefuelings, currentPropertyId]
  );

  const maintenances = useMemo(
    () => allMaintenances.filter(m => m.propertyId === currentPropertyId),
    [allMaintenances, currentPropertyId]
  );

  const alerts = useMemo(
    () => allAlerts.filter(a => a.propertyId === currentPropertyId),
    [allAlerts, currentPropertyId]
  );

  const farmTank = useMemo(
    () => allFarmTanks.find(t => t.propertyId === currentPropertyId) || null,
    [allFarmTanks, currentPropertyId]
  );

  const loadData = useCallback(async () => {
    try {
      const [
        machinesData,
        refuelingsData,
        maintenancesData,
        alertsData,
        serviceTypesData,
        maintenanceItemsData,
        farmTanksData,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MACHINES),
        AsyncStorage.getItem(STORAGE_KEYS.REFUELINGS),
        AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCES),
        AsyncStorage.getItem(STORAGE_KEYS.ALERTS),
        AsyncStorage.getItem(STORAGE_KEYS.SERVICE_TYPES),
        AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCE_ITEMS),
        AsyncStorage.getItem(STORAGE_KEYS.FARM_TANK),
      ]);

      if (machinesData) setAllMachines(JSON.parse(machinesData));
      if (refuelingsData) setAllRefuelings(JSON.parse(refuelingsData));
      if (maintenancesData) setAllMaintenances(JSON.parse(maintenancesData));
      if (alertsData) setAllAlerts(JSON.parse(alertsData));
      if (serviceTypesData) setServiceTypes(JSON.parse(serviceTypesData));
      if (maintenanceItemsData) {
        const savedItems = JSON.parse(maintenanceItemsData);
        const mergedItems = [...new Set([...DEFAULT_MAINTENANCE_ITEMS, ...savedItems])];
        setMaintenanceItems(mergedItems);
        await AsyncStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_ITEMS,
          JSON.stringify(mergedItems)
        );
      } else {
        setMaintenanceItems(DEFAULT_MAINTENANCE_ITEMS);
        await AsyncStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_ITEMS,
          JSON.stringify(DEFAULT_MAINTENANCE_ITEMS)
        );
      }
      if (farmTanksData) {
        const tanks = JSON.parse(farmTanksData);
        if (Array.isArray(tanks)) {
          setAllFarmTanks(tanks);
        } else {
          setAllFarmTanks([tanks]);
        }
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
    async (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt' | 'propertyId'>) => {
      if (!currentPropertyId) {
        throw new Error('No property selected');
      }

      const newMachine: Machine = {
        ...machine,
        propertyId: currentPropertyId,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...allMachines, newMachine];
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
      return newMachine;
    },
    [allMachines, currentPropertyId]
  );

  const updateMachine = useCallback(
    async (machineId: string, updates: Partial<Machine>) => {
      const updated = allMachines.map((m) =>
        m.id === machineId
          ? { ...m, ...updates, updatedAt: new Date().toISOString() }
          : m
      );
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [allMachines]
  );

  const deleteMachine = useCallback(
    async (machineId: string) => {
      const updated = allMachines.filter((m) => m.id !== machineId);
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [allMachines]
  );

  const addRefueling = useCallback(
    async (
      refueling: Omit<Refueling, 'id' | 'createdAt' | 'averageConsumption' | 'propertyId'>
    ) => {
      if (!currentPropertyId) {
        throw new Error('No property selected');
      }

      const machineRefuelings = allRefuelings
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
        propertyId: currentPropertyId,
        id: Date.now().toString(),
        averageConsumption,
        createdAt: new Date().toISOString(),
      };

      const updated = [...allRefuelings, newRefueling];
      setAllRefuelings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.REFUELINGS, JSON.stringify(updated));

      await updateMachine(refueling.machineId, {
        currentHourMeter: refueling.hourMeter,
      });

      return newRefueling;
    },
    [allRefuelings, updateMachine, currentPropertyId]
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
      if (!currentPropertyId) {
        throw new Error('No property selected');
      }

      const newMaintenance: Maintenance = {
        ...maintenance,
        propertyId: currentPropertyId,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const updated = [...allMaintenances, newMaintenance];
      setAllMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );

      await updateMachine(maintenance.machineId, {
        currentHourMeter: maintenance.hourMeter,
      });

      const machine = allMachines.find((m) => m.id === maintenance.machineId);
      if (machine) {
        const newAlerts: Alert[] = maintenance.itemRevisions.map((revision) => ({
          id: `${newMaintenance.id}-${revision.item}`,
          propertyId: currentPropertyId,
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

        const updatedAlerts = [...allAlerts, ...newAlerts];
        setAllAlerts(updatedAlerts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.ALERTS,
          JSON.stringify(updatedAlerts)
        );
      }

      return newMaintenance;
    },
    [allMaintenances, allAlerts, allMachines, updateMachine, calculateAlertStatus, currentPropertyId]
  );

  const updateMaintenance = useCallback(
    async (maintenanceId: string, updates: Partial<Maintenance>) => {
      const updated = allMaintenances.map((m) =>
        m.id === maintenanceId ? { ...m, ...updates } : m
      );
      setAllMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );
    },
    [allMaintenances]
  );

  const deleteMaintenance = useCallback(
    async (maintenanceId: string) => {
      const updated = allMaintenances.filter((m) => m.id !== maintenanceId);
      setAllMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );

      const updatedAlerts = allAlerts.filter(
        (a) => a.maintenanceId !== maintenanceId
      );
      setAllAlerts(updatedAlerts);
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
    },
    [allMaintenances, allAlerts]
  );

  const alertsRef = useRef(allAlerts);
  
  useEffect(() => {
    alertsRef.current = allAlerts;
  }, [allAlerts]);

  useEffect(() => {
    if (!isLoading && allMachines.length > 0 && alertsRef.current.length > 0) {
      const currentAlerts = alertsRef.current;
      const updatedAlerts = currentAlerts.map((alert) => {
        const machine = allMachines.find((m) => m.id === alert.machineId);
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
        setAllAlerts(updatedAlerts);
        AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
      }
    }
  }, [allMachines, isLoading, calculateAlertStatus]);

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

  const updateTankInitialData = useCallback(async (data: Omit<FarmTank, 'propertyId'>) => {
    if (!currentPropertyId) {
      throw new Error('No property selected');
    }

    const tankData: FarmTank = {
      ...data,
      propertyId: currentPropertyId,
    };

    const updated = allFarmTanks.filter(t => t.propertyId !== currentPropertyId);
    updated.push(tankData);
    setAllFarmTanks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
  }, [allFarmTanks, currentPropertyId]);

  const updateTankCapacity = useCallback(
    async (newCapacity: number) => {
      if (!farmTank || !currentPropertyId) return;

      const updatedTank: FarmTank = {
        ...farmTank,
        capacityLiters: newCapacity,
      };

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
    },
    [farmTank, allFarmTanks, currentPropertyId]
  );

  const registerUnloggedConsumption = useCallback(
    async (litersConsumed: number) => {
      if (!farmTank || !currentPropertyId) return;

      const newCurrentLiters = Math.max(farmTank.currentLiters - litersConsumed, 0);

      const updatedTank: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      if (newCurrentLiters <= farmTank.alertLevelLiters) {
        console.log(
          `ALERTA: Tanque de combustível baixo: restam apenas ${newCurrentLiters.toFixed(0)} litros`
        );
      }
    },
    [farmTank, allFarmTanks, currentPropertyId]
  );

  const addFuel = useCallback(
    async (litersAdded: number) => {
      if (!farmTank || !currentPropertyId) return { success: false, overflow: 0 };

      const potentialTotal = farmTank.currentLiters + litersAdded;
      const overflow = Math.max(0, potentialTotal - farmTank.capacityLiters);

      if (overflow > 0) {
        return { success: false, overflow };
      }

      const newCurrentLiters = farmTank.currentLiters + litersAdded;

      const updatedTank: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
      return { success: true, overflow: 0 };
    },
    [farmTank, allFarmTanks, currentPropertyId]
  );

  const consumeFuel = useCallback(
    async (litersUsed: number) => {
      if (!currentPropertyId) return;

      if (!farmTank) {
        const virtualTank: FarmTank = {
          propertyId: currentPropertyId,
          capacityLiters: 0,
          currentLiters: -litersUsed,
          fuelType: 'Diesel comum',
          alertLevelLiters: 0,
        };

        const updated = [...allFarmTanks, virtualTank];
        setAllFarmTanks(updated);
        await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
        console.log(`⚠️ Tanque não configurado - criado com saldo negativo: ${virtualTank.currentLiters.toFixed(0)} litros`);
        return;
      }

      const oldLiters = farmTank.currentLiters;
      const newCurrentLiters = farmTank.currentLiters - litersUsed;

      const updatedTank: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      if (newCurrentLiters <= farmTank.alertLevelLiters && oldLiters > farmTank.alertLevelLiters) {
        console.log(
          `⚠️ ALERTA: Tanque de combustível baixo: restam apenas ${newCurrentLiters.toFixed(0)} litros`
        );
      }
    },
    [farmTank, allFarmTanks, currentPropertyId]
  );

  const deletePropertyData = useCallback(
    async (propertyId: string) => {
      console.log(`Deletando todos os dados da propriedade ${propertyId}`);

      const updatedMachines = allMachines.filter(m => m.propertyId !== propertyId);
      const updatedRefuelings = allRefuelings.filter(r => r.propertyId !== propertyId);
      const updatedMaintenances = allMaintenances.filter(m => m.propertyId !== propertyId);
      const updatedAlerts = allAlerts.filter(a => a.propertyId !== propertyId);
      const updatedTanks = allFarmTanks.filter(t => t.propertyId !== propertyId);

      setAllMachines(updatedMachines);
      setAllRefuelings(updatedRefuelings);
      setAllMaintenances(updatedMaintenances);
      setAllAlerts(updatedAlerts);
      setAllFarmTanks(updatedTanks);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updatedMachines)),
        AsyncStorage.setItem(STORAGE_KEYS.REFUELINGS, JSON.stringify(updatedRefuelings)),
        AsyncStorage.setItem(STORAGE_KEYS.MAINTENANCES, JSON.stringify(updatedMaintenances)),
        AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts)),
        AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks)),
      ]);

      console.log('Dados da propriedade deletados com sucesso');
    },
    [allMachines, allRefuelings, allMaintenances, allAlerts, allFarmTanks]
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
      updateTankCapacity,
      addFuel,
      consumeFuel,
      registerUnloggedConsumption,
      deletePropertyData,
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
      updateTankCapacity,
      addFuel,
      consumeFuel,
      registerUnloggedConsumption,
      deletePropertyData,
    ]
  );
});
