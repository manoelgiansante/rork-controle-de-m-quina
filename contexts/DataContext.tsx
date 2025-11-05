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
import { useAuth } from '@/contexts/AuthContext';
import * as db from '@/lib/supabase/database';

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
  const { currentUser } = useAuth();
  const { currentPropertyId } = useProperty();
  const [isWeb] = useState(() => typeof window !== 'undefined' && typeof document !== 'undefined');
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
    if (!currentPropertyId || !currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('[DATA] Carregando dados...', { currentPropertyId, isWeb });
      
      if (isWeb) {
        console.log('[DATA WEB] Carregando do Supabase...');
        const [
          machinesFromDB,
          refuelingsFromDB,
          maintenancesFromDB,
          alertsFromDB,
          farmTankFromDB,
          preferencesFromDB,
        ] = await Promise.all([
          db.fetchMachines(currentPropertyId),
          db.fetchRefuelings(currentPropertyId),
          db.fetchMaintenances(currentPropertyId),
          db.fetchAlerts(currentPropertyId),
          db.fetchFarmTank(currentPropertyId),
          db.fetchUserPreferences(currentUser.id),
        ]);

        console.log('[DATA WEB] Dados carregados do Supabase:', {
          machines: machinesFromDB.length,
          refuelings: refuelingsFromDB.length,
          maintenances: maintenancesFromDB.length,
          alerts: alertsFromDB.length,
          hasTank: !!farmTankFromDB,
        });

        setAllMachines(machinesFromDB);
        setAllRefuelings(refuelingsFromDB);
        setAllMaintenances(maintenancesFromDB);
        setAllAlerts(alertsFromDB);
        setAllFarmTanks(farmTankFromDB ? [farmTankFromDB] : []);
        
        if (preferencesFromDB) {
          setServiceTypes(preferencesFromDB.serviceTypes);
          const mergedItems = [...new Set([...DEFAULT_MAINTENANCE_ITEMS, ...preferencesFromDB.maintenanceItems])];
          setMaintenanceItems(mergedItems);
        } else {
          setServiceTypes([]);
          setMaintenanceItems(DEFAULT_MAINTENANCE_ITEMS);
        }

        await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machinesFromDB));
        await AsyncStorage.setItem(STORAGE_KEYS.REFUELINGS, JSON.stringify(refuelingsFromDB));
        await AsyncStorage.setItem(STORAGE_KEYS.MAINTENANCES, JSON.stringify(maintenancesFromDB));
        await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alertsFromDB));
        if (farmTankFromDB) {
          await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify([farmTankFromDB]));
        }
      } else {
        console.log('[DATA MOBILE] Carregando do AsyncStorage...');
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
        } else {
          setMaintenanceItems(DEFAULT_MAINTENANCE_ITEMS);
        }
        if (farmTanksData) {
          const tanks = JSON.parse(farmTanksData);
          if (Array.isArray(tanks)) {
            setAllFarmTanks(tanks);
          } else {
            setAllFarmTanks([tanks]);
          }
        }
      }
    } catch (error) {
      console.error('[DATA] Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPropertyId, currentUser, isWeb]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addMachine = useCallback(
    async (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt' | 'propertyId'>) => {
      if (!currentPropertyId) {
        throw new Error('No property selected');
      }

      let newMachine: Machine;

      if (isWeb) {
        console.log('[DATA WEB] Criando máquina no Supabase...');
        newMachine = await db.createMachine({
          ...machine,
          propertyId: currentPropertyId,
        });
      } else {
        newMachine = {
          ...machine,
          propertyId: currentPropertyId,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const updated = [...allMachines, newMachine];
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
      return newMachine;
    },
    [allMachines, currentPropertyId, isWeb]
  );

  const updateMachine = useCallback(
    async (machineId: string, updates: Partial<Machine>) => {
      if (isWeb) {
        console.log('[DATA WEB] Atualizando máquina no Supabase...');
        await db.updateMachine(machineId, updates);
      }

      const updated = allMachines.map((m) =>
        m.id === machineId
          ? { ...m, ...updates, updatedAt: new Date().toISOString() }
          : m
      );
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [allMachines, isWeb]
  );

  const deleteMachine = useCallback(
    async (machineId: string) => {
      if (isWeb) {
        console.log('[DATA WEB] Deletando máquina no Supabase...');
        await db.deleteMachine(machineId);
      }

      const updated = allMachines.filter((m) => m.id !== machineId);
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [allMachines, isWeb]
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

      let newRefueling: Refueling;

      if (isWeb) {
        console.log('[DATA WEB] Criando abastecimento no Supabase...');
        newRefueling = await db.createRefueling({
          ...refueling,
          propertyId: currentPropertyId,
          averageConsumption,
        });
      } else {
        newRefueling = {
          ...refueling,
          propertyId: currentPropertyId,
          id: Date.now().toString(),
          averageConsumption,
          createdAt: new Date().toISOString(),
        };
      }

      const updated = [...allRefuelings, newRefueling];
      setAllRefuelings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.REFUELINGS, JSON.stringify(updated));

      await updateMachine(refueling.machineId, {
        currentHourMeter: refueling.hourMeter,
      });

      return newRefueling;
    },
    [allRefuelings, updateMachine, currentPropertyId, isWeb]
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

      let newMaintenance: Maintenance;

      if (isWeb) {
        console.log('[DATA WEB] Criando manutenção no Supabase...');
        newMaintenance = await db.createMaintenance({
          ...maintenance,
          propertyId: currentPropertyId,
        });
      } else {
        newMaintenance = {
          ...maintenance,
          propertyId: currentPropertyId,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
      }

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

        if (isWeb) {
          console.log('[DATA WEB] Criando alertas no Supabase...');
          await Promise.all(newAlerts.map(alert => db.createAlert(alert)));
        }

        const updatedAlerts = [...allAlerts, ...newAlerts];
        setAllAlerts(updatedAlerts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.ALERTS,
          JSON.stringify(updatedAlerts)
        );
      }

      return newMaintenance;
    },
    [allMaintenances, allAlerts, allMachines, updateMachine, calculateAlertStatus, currentPropertyId, isWeb]
  );

  const updateMaintenance = useCallback(
    async (maintenanceId: string, updates: Partial<Maintenance>) => {
      if (isWeb) {
        console.log('[DATA WEB] Atualizando manutenção no Supabase...');
        await db.updateMaintenance(maintenanceId, updates);
      }

      const updated = allMaintenances.map((m) =>
        m.id === maintenanceId ? { ...m, ...updates } : m
      );
      setAllMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );
    },
    [allMaintenances, isWeb]
  );

  const updateRefueling = useCallback(
    async (refuelingId: string, updates: Partial<Refueling>) => {
      const refueling = allRefuelings.find(r => r.id === refuelingId);
      if (!refueling) {
        console.error('[DATA] Abastecimento não encontrado:', refuelingId);
        return;
      }

      if (isWeb) {
        console.log('[DATA WEB] Atualizando abastecimento no Supabase...');
        await db.updateRefueling(refuelingId, updates);
      }

      const updated = allRefuelings.map((r) =>
        r.id === refuelingId ? { ...r, ...updates } : r
      );
      setAllRefuelings(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REFUELINGS,
        JSON.stringify(updated)
      );

      if (updates.liters !== undefined && updates.liters !== refueling.liters) {
        const oldLiters = refueling.liters;
        const newLiters = updates.liters;
        const difference = newLiters - oldLiters;

        console.log('[DATA] Ajustando tanque devido a edição de abastecimento:', {
          oldLiters,
          newLiters,
          difference,
          operacao: difference > 0 ? 'Aumentou consumo - subtrai do tanque' : 'Diminuiu consumo - adiciona ao tanque',
        });

        if (difference !== 0) {
          if (!farmTank) {
            console.log('[DATA] Tanque não encontrado, criando com saldo ajustado...');
            const virtualTank: FarmTank = {
              propertyId: refueling.propertyId,
              capacityLiters: 0,
              currentLiters: -difference,
              fuelType: 'Diesel comum',
              alertLevelLiters: 0,
            };

            if (isWeb) {
              await db.upsertFarmTank(virtualTank);
            }

            const updatedTanks = [...allFarmTanks, virtualTank];
            setAllFarmTanks(updatedTanks);
            await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks));
          } else {
            const newCurrentLiters = farmTank.currentLiters - difference;

            const updatedTank: FarmTank = {
              ...farmTank,
              currentLiters: newCurrentLiters,
            };

            if (isWeb) {
              console.log('[DATA WEB] Atualizando tanque no Supabase...');
              await db.upsertFarmTank(updatedTank);
            }

            const updatedTanks = allFarmTanks.map(t => 
              t.propertyId === refueling.propertyId ? updatedTank : t
            );
            setAllFarmTanks(updatedTanks);
            await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks));

            console.log('[DATA] Tanque ajustado:', {
              antigosLitros: farmTank.currentLiters,
              novosLitros: newCurrentLiters,
              diferenca: difference,
              explicacao: `Reverteu ${oldLiters}L e aplicou ${newLiters}L = ${farmTank.currentLiters} - ${difference} = ${newCurrentLiters}L`,
            });
          }
        }
      }
    },
    [allRefuelings, farmTank, allFarmTanks, isWeb]
  );

  const deleteRefueling = useCallback(
    async (refuelingId: string) => {
      const refueling = allRefuelings.find(r => r.id === refuelingId);
      if (!refueling) {
        console.error('[DATA] Abastecimento não encontrado:', refuelingId);
        return;
      }

      if (isWeb) {
        console.log('[DATA WEB] Deletando abastecimento no Supabase...');
        await db.deleteRefueling(refuelingId);
      }

      const updated = allRefuelings.filter((r) => r.id !== refuelingId);
      setAllRefuelings(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REFUELINGS,
        JSON.stringify(updated)
      );

      console.log('[DATA] Ajustando tanque devido a exclusão de abastecimento:', {
        litros: refueling.liters,
      });

      if (!farmTank) {
        console.log('[DATA] Tanque não encontrado, criando com saldo ajustado...');
        const virtualTank: FarmTank = {
          propertyId: refueling.propertyId,
          capacityLiters: 0,
          currentLiters: refueling.liters,
          fuelType: 'Diesel comum',
          alertLevelLiters: 0,
        };

        if (isWeb) {
          await db.upsertFarmTank(virtualTank);
        }

        const updatedTanks = [...allFarmTanks, virtualTank];
        setAllFarmTanks(updatedTanks);
        await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks));
      } else {
        const newCurrentLiters = farmTank.currentLiters + refueling.liters;

        const updatedTank: FarmTank = {
          ...farmTank,
          currentLiters: newCurrentLiters,
        };

        if (isWeb) {
          console.log('[DATA WEB] Atualizando tanque no Supabase...');
          await db.upsertFarmTank(updatedTank);
        }

        const updatedTanks = allFarmTanks.map(t => 
          t.propertyId === refueling.propertyId ? updatedTank : t
        );
        setAllFarmTanks(updatedTanks);
        await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks));

        console.log('[DATA] Tanque ajustado após exclusão:', {
          antigosLitros: farmTank.currentLiters,
          novosLitros: newCurrentLiters,
          litrosDevolvidos: refueling.liters,
        });
      }
    },
    [allRefuelings, farmTank, allFarmTanks, isWeb]
  );

  const deleteMaintenance = useCallback(
    async (maintenanceId: string) => {
      if (isWeb) {
        console.log('[DATA WEB] Deletando manutenção no Supabase...');
        await db.deleteMaintenance(maintenanceId);
        await db.deleteAlertsByMaintenanceId(maintenanceId);
      }

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
    [allMaintenances, allAlerts, isWeb]
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
        if (isWeb) {
          updatedAlerts.forEach(alert => {
            const originalAlert = currentAlerts.find(a => a.id === alert.id);
            if (originalAlert && alert.status !== originalAlert.status) {
              db.updateAlert(alert.id, { status: alert.status }).catch(err => 
                console.error('[DATA WEB] Erro ao atualizar status do alerta:', err)
              );
            }
          });
        }
        setAllAlerts(updatedAlerts);
        AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
      }
    }
  }, [allMachines, isLoading, calculateAlertStatus, isWeb]);

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
        
        if (isWeb && currentUser) {
          console.log('[DATA WEB] Salvando tipo de serviço no Supabase...');
          await db.upsertUserPreferences(currentUser.id, {
            serviceTypes: updated,
          });
        }
      }
    },
    [serviceTypes, isWeb, currentUser]
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
        
        if (isWeb && currentUser) {
          console.log('[DATA WEB] Salvando item de manutenção no Supabase...');
          await db.upsertUserPreferences(currentUser.id, {
            maintenanceItems: updated,
          });
        }
      }
    },
    [maintenanceItems, isWeb, currentUser]
  );

  const updateTankInitialData = useCallback(async (data: Omit<FarmTank, 'propertyId'>) => {
    if (!currentPropertyId) {
      throw new Error('No property selected');
    }

    const tankData: FarmTank = {
      ...data,
      propertyId: currentPropertyId,
    };

    if (isWeb) {
      console.log('[DATA WEB] Salvando tanque no Supabase...');
      await db.upsertFarmTank(tankData);
    }

    const updated = allFarmTanks.filter(t => t.propertyId !== currentPropertyId);
    updated.push(tankData);
    setAllFarmTanks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
  }, [allFarmTanks, currentPropertyId, isWeb]);

  const updateTankCapacity = useCallback(
    async (newCapacity: number) => {
      if (!farmTank || !currentPropertyId) return;

      const updatedTank: FarmTank = {
        ...farmTank,
        capacityLiters: newCapacity,
      };

      if (isWeb) {
        console.log('[DATA WEB] Atualizando tanque no Supabase...');
        await db.upsertFarmTank(updatedTank);
      }

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
    },
    [farmTank, allFarmTanks, currentPropertyId, isWeb]
  );

  const registerUnloggedConsumption = useCallback(
    async (litersConsumed: number) => {
      if (!farmTank || !currentPropertyId) return;

      const newCurrentLiters = Math.max(farmTank.currentLiters - litersConsumed, 0);

      const updatedTank: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      if (isWeb) {
        console.log('[DATA WEB] Atualizando tanque no Supabase...');
        await db.upsertFarmTank(updatedTank);
      }

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
    [farmTank, allFarmTanks, currentPropertyId, isWeb]
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

      if (isWeb) {
        console.log('[DATA WEB] Atualizando tanque no Supabase...');
        await db.upsertFarmTank(updatedTank);
      }

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));
      return { success: true, overflow: 0 };
    },
    [farmTank, allFarmTanks, currentPropertyId, isWeb]
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

        if (isWeb) {
          console.log('[DATA WEB] Criando tanque virtual no Supabase...');
          await db.upsertFarmTank(virtualTank);
        }

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

      if (isWeb) {
        console.log('[DATA WEB] Atualizando tanque no Supabase...');
        await db.upsertFarmTank(updatedTank);
      }

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
    [farmTank, allFarmTanks, currentPropertyId, isWeb]
  );

  const adjustTankFuel = useCallback(
    async (adjustment: number, reason: string) => {
      if (!currentPropertyId) return;

      if (!farmTank) {
        console.error('[DATA] Tanque não configurado');
        return;
      }

      const newCurrentLiters = farmTank.currentLiters + adjustment;

      const updatedTank: FarmTank = {
        ...farmTank,
        currentLiters: newCurrentLiters,
      };

      if (isWeb) {
        console.log('[DATA WEB] Ajustando tanque no Supabase...', {
          adjustment,
          reason,
          oldValue: farmTank.currentLiters,
          newValue: newCurrentLiters,
        });
        await db.upsertFarmTank(updatedTank);
      }

      const updated = allFarmTanks.map(t => 
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      console.log('[DATA] Ajuste de tanque realizado:', {
        adjustment: adjustment > 0 ? `+${adjustment}L` : `${adjustment}L`,
        reason,
        from: farmTank.currentLiters.toFixed(0),
        to: newCurrentLiters.toFixed(0),
      });
    },
    [farmTank, allFarmTanks, currentPropertyId, isWeb]
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
      updateRefueling,
      deleteRefueling,
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
      adjustTankFuel,
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
      updateRefueling,
      deleteRefueling,
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
      adjustTankFuel,
      deletePropertyData,
    ]
  );
});
