import AsyncStorage from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type {
  Alert,
  AlertStatus,
  FarmTank,
  TankAddition,
  Machine,
  Maintenance,
  MaintenanceItem,
  Refueling,
  ServiceType,
  TankAlert,
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

/**
 * DataContext - Gerenciamento de dados com isolamento por usuário
 *
 * SEGURANÇA: Este contexto garante que cada usuário veja APENAS seus próprios dados.
 * O isolamento é garantido através da seguinte cadeia:
 * 1. user_id (AuthContext) →
 * 2. properties (PropertyContext - filtradas por user_id) →
 * 3. machines/refuelings/maintenances (DataContext - filtradas por property_id)
 *
 * Todos os dados são filtrados pelas propriedades do usuário logado,
 * garantindo que NUNCA sejam acessados dados de outros usuários.
 */
export const [DataProvider, useData] = createContextHook(() => {
  const { currentUser } = useAuth();
  const { currentPropertyId, properties: userProperties } = useProperty();
  const [isWeb] = useState(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return true;
    }
    return Platform.OS === 'web';
  });

  // Estados para armazenar TODOS os dados do usuário (de todas as suas propriedades)
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [allRefuelings, setAllRefuelings] = useState<Refueling[]>([]);
  const [allMaintenances, setAllMaintenances] = useState<Maintenance[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>(DEFAULT_MAINTENANCE_ITEMS);
  const [allFarmTanks, setAllFarmTanks] = useState<FarmTank[]>([]);
  const [allTankAdditions, setAllTankAdditions] = useState<TankAddition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dados filtrados pela propriedade atualmente selecionada
  const machines = useMemo(
    () => allMachines.filter(m => m.propertyId === currentPropertyId && !m.archived),
    [allMachines, currentPropertyId]
  );

  const archivedMachines = useMemo(
    () => allMachines.filter(m => m.propertyId === currentPropertyId && m.archived),
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

  const tankAdditions = useMemo(
    () => allTankAdditions.filter(t => t.propertyId === currentPropertyId),
    [allTankAdditions, currentPropertyId]
  );

  /**
   * Carrega dados do Supabase com filtro por user_id
   *
   * IMPORTANTE: Os dados são carregados apenas das propriedades que pertencem ao usuário logado,
   * garantindo isolamento total. Nunca são buscados dados de outras propriedades.
   *
   * CORREÇÃO: Agora busca do Supabase tanto em WEB quanto em MOBILE!
   * AsyncStorage é usado apenas como cache/fallback offline.
   */
  const loadData = useCallback(async () => {
    if (!currentPropertyId || !currentUser) {
      console.log('[DATA] Aguardando property e user...', { currentPropertyId, currentUser: !!currentUser });
      setIsLoading(false);
      return;
    }

    try {
      console.log('[DATA] 🔒 Carregando dados com filtro por user_id...', {
        userId: currentUser.id,
        currentPropertyId,
        isWeb,
        userPropertiesCount: userProperties.length
      });

      // SEGURANÇA: Buscar dados apenas das propriedades do usuário
      // Isso garante que NUNCA sejam carregados dados de outros usuários
      const userPropertyIds = userProperties.map(p => p.id);
      console.log('[DATA] 🔐 Propriedades do usuário:', userPropertyIds);
      console.log('[DATA] 🔄 Buscando dados do Supabase (WEB e MOBILE)...');

      let allMachinesFromDB: Machine[] = [];
      let allRefuelingsFromDB: Refueling[] = [];
      let allMaintenancesFromDB: Maintenance[] = [];
      let allAlertsFromDB: Alert[] = [];
      let allFarmTanksFromDB: FarmTank[] = [];
      let allTankAdditionsFromDB: TankAddition[] = [];
      let preferencesFromDB: { serviceTypes: ServiceType[]; maintenanceItems: MaintenanceItem[] } | null = null;

      try {
        // Carregar dados de TODAS as propriedades do usuário
        const dataPromises = userPropertyIds.map(async (propertyId) => {
          const [machines, refuelings, maintenances, alerts, farmTank, tankAdditions] = await Promise.all([
            db.fetchMachines(propertyId).catch(err => {
              console.error(`[DATA] Erro ao buscar máquinas da property ${propertyId}:`, err);
              return [];
            }),
            db.fetchRefuelings(propertyId).catch(err => {
              console.error(`[DATA] Erro ao buscar abastecimentos da property ${propertyId}:`, err);
              return [];
            }),
            db.fetchMaintenances(propertyId).catch(err => {
              console.error(`[DATA] Erro ao buscar manutenções da property ${propertyId}:`, err);
              return [];
            }),
            db.fetchAlerts(propertyId).catch(err => {
              console.error(`[DATA] Erro ao buscar alertas da property ${propertyId}:`, err);
              return [];
            }),
            db.fetchFarmTank(propertyId).catch(err => {
              console.error(`[DATA] Erro ao buscar tanque da property ${propertyId}:`, err);
              return null;
            }),
            db.fetchTankAdditions(propertyId).catch(err => {
              console.error(`[DATA] Erro ao buscar adições do tanque da property ${propertyId}:`, err);
              return [];
            }),
          ]);

          return { machines, refuelings, maintenances, alerts, farmTank, tankAdditions };
        });

        const allPropertyData = await Promise.all(dataPromises);

        // Consolidar dados de todas as propriedades
        allPropertyData.forEach(data => {
          allMachinesFromDB.push(...data.machines);
          allRefuelingsFromDB.push(...data.refuelings);
          allMaintenancesFromDB.push(...data.maintenances);
          allAlertsFromDB.push(...data.alerts);
          allTankAdditionsFromDB.push(...data.tankAdditions);
          if (data.farmTank) {
            allFarmTanksFromDB.push(data.farmTank);
          }
        });

        // Buscar preferências do usuário (não vinculadas a propriedades)
        preferencesFromDB = await db.fetchUserPreferences(currentUser.id).catch(err => {
          console.error('[DATA] Erro ao buscar preferências:', err);
          return null;
        });

        console.log('[DATA] ✅ Dados carregados do Supabase (isolados por user_id):', {
          machines: allMachinesFromDB.length,
          refuelings: allRefuelingsFromDB.length,
          maintenances: allMaintenancesFromDB.length,
          alerts: allAlertsFromDB.length,
          farmTanks: allFarmTanksFromDB.length,
          tankAdditions: allTankAdditionsFromDB.length,
        });

      } catch (err) {
        console.error('[DATA] ❌ Exceção ao carregar dados do Supabase:', err);

        // FALLBACK: Se falhar ao buscar do Supabase (sem internet), tenta carregar do cache
        console.log('[DATA] 📱 Tentando carregar do cache (modo offline)...');
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

        if (machinesData) allMachinesFromDB = JSON.parse(machinesData);
        if (refuelingsData) allRefuelingsFromDB = JSON.parse(refuelingsData);
        if (maintenancesData) allMaintenancesFromDB = JSON.parse(maintenancesData);
        if (alertsData) allAlertsFromDB = JSON.parse(alertsData);
        if (farmTanksData) {
          const tanks = JSON.parse(farmTanksData);
          allFarmTanksFromDB = Array.isArray(tanks) ? tanks : [tanks];
        }
        if (serviceTypesData && maintenanceItemsData) {
          preferencesFromDB = {
            serviceTypes: JSON.parse(serviceTypesData),
            maintenanceItems: JSON.parse(maintenanceItemsData),
          };
        }

        console.log('[DATA] 📦 Dados carregados do cache:', {
          machines: allMachinesFromDB.length,
          refuelings: allRefuelingsFromDB.length,
          maintenances: allMaintenancesFromDB.length,
          alerts: allAlertsFromDB.length,
          farmTanks: allFarmTanksFromDB.length,
        });
      }

      // Atualizar estados com dados carregados
      setAllMachines(allMachinesFromDB);
      setAllRefuelings(allRefuelingsFromDB);
      setAllMaintenances(allMaintenancesFromDB);
      setAllAlerts(allAlertsFromDB);
      setAllFarmTanks(allFarmTanksFromDB);
      setAllTankAdditions(allTankAdditionsFromDB);

      if (preferencesFromDB) {
        setServiceTypes(preferencesFromDB.serviceTypes);
        const mergedItems = [...new Set([...DEFAULT_MAINTENANCE_ITEMS, ...preferencesFromDB.maintenanceItems])];
        setMaintenanceItems(mergedItems);
      } else {
        setServiceTypes([]);
        setMaintenanceItems(DEFAULT_MAINTENANCE_ITEMS);
      }

      // Salvar no cache local (para uso offline)
      console.log('[DATA] 💾 Salvando no cache local...');
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(allMachinesFromDB));
      await AsyncStorage.setItem(STORAGE_KEYS.REFUELINGS, JSON.stringify(allRefuelingsFromDB));
      await AsyncStorage.setItem(STORAGE_KEYS.MAINTENANCES, JSON.stringify(allMaintenancesFromDB));
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(allAlertsFromDB));
      if (allFarmTanksFromDB.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(allFarmTanksFromDB));
      }
      if (preferencesFromDB) {
        await AsyncStorage.setItem(STORAGE_KEYS.SERVICE_TYPES, JSON.stringify(preferencesFromDB.serviceTypes));
        await AsyncStorage.setItem(STORAGE_KEYS.MAINTENANCE_ITEMS, JSON.stringify(preferencesFromDB.maintenanceItems));
      }

      // Gerar alerta de tanque se não existir
      if (currentPropertyId && allFarmTanksFromDB.length > 0) {
        const tank = allFarmTanksFromDB.find(t => t.propertyId === currentPropertyId);
        if (tank && tank.capacityLiters > 0) {
          const hasTankAlert = allAlertsFromDB.some(
            a => a.type === 'tank' && a.propertyId === currentPropertyId
          );

          if (!hasTankAlert) {
            console.log('[DATA] Gerando alerta de tanque inicial...');
            const status = calculateTankAlertStatus(
              tank.currentLiters,
              tank.alertLevelLiters,
              tank.capacityLiters
            );

            const percentageFilled = (tank.currentLiters / tank.capacityLiters) * 100;

            let message = '';
            if (status === 'red') {
              message = `URGENTE: Tanque está com apenas ${tank.currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%). Reabasteça imediatamente!`;
            } else if (status === 'yellow') {
              message = `ATENÇÃO: Tanque está com ${tank.currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%). Considere reabastecer em breve.`;
            } else {
              message = `Tanque OK: ${tank.currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%)`;
            }

            const tankAlert: TankAlert = {
              id: `tank-${tank.propertyId}`,
              type: 'tank',
              propertyId: tank.propertyId,
              tankCurrentLiters: tank.currentLiters,
              tankCapacityLiters: tank.capacityLiters,
              tankAlertLevelLiters: tank.alertLevelLiters,
              percentageFilled,
              status,
              message,
              createdAt: new Date().toISOString(),
            };

            allAlertsFromDB.push(tankAlert);
            setAllAlerts(allAlertsFromDB);
            await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(allAlertsFromDB));
            console.log('[DATA] ✅ Alerta de tanque criado:', { status, message });
          }
        }
      }

    } catch (error) {
      console.error('[DATA] ❌ Erro CRÍTICO ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPropertyId, currentUser, userProperties]);

  useEffect(() => {
    if (!currentPropertyId || !currentUser) {
      console.log('[DATA] Effect: Aguardando inicialização...');
      setIsLoading(false);
      return;
    }
    console.log('[DATA] Effect: Carregando dados...');
    loadData();
  }, [currentPropertyId, currentUser, loadData]);

  const addMachine = useCallback(
    async (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt' | 'propertyId'>) => {
      if (!currentPropertyId) {
        throw new Error('No property selected');
      }

      console.log('[DATA] Criando máquina no Supabase (WEB e MOBILE)...');
      const newMachine = await db.createMachine({
        ...machine,
        propertyId: currentPropertyId,
      });

      const updated = [...allMachines, newMachine];
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
      return newMachine;
    },
    [allMachines, currentPropertyId]
  );

  const updateMachine = useCallback(
    async (machineId: string, updates: Partial<Machine>) => {
      console.log('[DATA] Atualizando máquina no Supabase (WEB e MOBILE)...');
      await db.updateMachine(machineId, updates);

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
      console.log('[DATA] Deletando máquina do Supabase (WEB e MOBILE)...');
      await db.deleteMachine(machineId);

      const updated = allMachines.filter((m) => m.id !== machineId);
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
    },
    [allMachines]
  );

  const archiveMachine = useCallback(
    async (machineId: string) => {
      console.log('[DATA] Arquivando máquina...');
      await db.archiveMachine(machineId);

      const updated = allMachines.map((m) =>
        m.id === machineId ? { ...m, archived: true, archivedAt: new Date().toISOString() } : m
      );
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
      console.log('[DATA] ✅ Máquina arquivada com sucesso');
    },
    [allMachines]
  );

  const unarchiveMachine = useCallback(
    async (machineId: string) => {
      console.log('[DATA] Desarquivando máquina...');
      await db.unarchiveMachine(machineId);

      const updated = allMachines.map((m) =>
        m.id === machineId ? { ...m, archived: false, archivedAt: undefined } : m
      );
      setAllMachines(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
      console.log('[DATA] ✅ Máquina desarquivada com sucesso');
    },
    [allMachines]
  );

  const checkMachineCanBeDeleted = useCallback(
    async (machineId: string) => {
      return await db.checkMachineHasHistory(machineId);
    },
    []
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

      console.log('[DATA] Criando abastecimento no Supabase (WEB e MOBILE)...');
      const newRefueling = await db.createRefueling({
        ...refueling,
        propertyId: currentPropertyId,
        averageConsumption,
      });

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

  const calculateTankAlertStatus = useCallback(
    (currentLiters: number, alertLevelLiters: number, capacityLiters: number): AlertStatus => {
      const percentageFilled = (currentLiters / capacityLiters) * 100;

      // Verde: acima de 50% ou acima do nível de alerta + 25%
      if (currentLiters > alertLevelLiters * 1.25 && percentageFilled > 50) {
        return 'green';
      }

      // Amarelo: entre o nível de alerta e 25% acima dele
      if (currentLiters > alertLevelLiters) {
        return 'yellow';
      }

      // Vermelho: no nível de alerta ou abaixo
      return 'red';
    },
    []
  );

  const updateTankAlert = useCallback(
    async (tank: FarmTank) => {
      if (!tank.propertyId) return;

      const status = calculateTankAlertStatus(
        tank.currentLiters,
        tank.alertLevelLiters,
        tank.capacityLiters
      );

      const percentageFilled = (tank.currentLiters / tank.capacityLiters) * 100;

      let message = '';
      if (status === 'red') {
        message = `URGENTE: Tanque está com apenas ${tank.currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%). Reabasteça imediatamente!`;
      } else if (status === 'yellow') {
        message = `ATENÇÃO: Tanque está com ${tank.currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%). Considere reabastecer em breve.`;
      } else {
        message = `Tanque OK: ${tank.currentLiters.toFixed(0)}L (${percentageFilled.toFixed(0)}%)`;
      }

      const tankAlert: TankAlert = {
        id: `tank-${tank.propertyId}`,
        type: 'tank',
        propertyId: tank.propertyId,
        tankCurrentLiters: tank.currentLiters,
        tankCapacityLiters: tank.capacityLiters,
        tankAlertLevelLiters: tank.alertLevelLiters,
        percentageFilled,
        status,
        message,
        createdAt: new Date().toISOString(),
      };

      // Remover alerta de tanque anterior (se existir)
      const alertsWithoutTank = allAlerts.filter(
        a => !(a.type === 'tank' && a.propertyId === tank.propertyId)
      );

      // Adicionar novo alerta de tanque
      const updatedAlerts = [...alertsWithoutTank, tankAlert];

      setAllAlerts(updatedAlerts);
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));

      console.log('[DATA] Alerta de tanque atualizado:', { status, message });
    },
    [allAlerts, calculateTankAlertStatus]
  );

  const addMaintenance = useCallback(
    async (maintenance: Omit<Maintenance, 'id' | 'createdAt'>) => {
      if (!currentPropertyId) {
        throw new Error('No property selected');
      }

      console.log('[DATA] Criando manutenção no Supabase (WEB e MOBILE)...');
      const newMaintenance = await db.createMaintenance({
        ...maintenance,
        propertyId: currentPropertyId,
      });

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
      if (machine && maintenance.itemRevisions) {
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

        console.log('[DATA] Criando alertas no Supabase (WEB e MOBILE)...');
        await Promise.all(newAlerts.map(alert => db.createAlert(alert)));

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
      const originalMaintenance = allMaintenances.find(m => m.id === maintenanceId);
      if (!originalMaintenance) {
        console.error('[DATA] Manutenção não encontrada:', maintenanceId);
        return;
      }

      console.log('[DATA] Atualizando manutenção no Supabase (WEB e MOBILE)...');
      await db.updateMaintenance(maintenanceId, updates);

      const updatedMaintenance = { ...originalMaintenance, ...updates };
      const updated = allMaintenances.map((m) =>
        m.id === maintenanceId ? updatedMaintenance : m
      );
      setAllMaintenances(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCES,
        JSON.stringify(updated)
      );

      if (updates.hourMeter !== undefined && updates.hourMeter !== originalMaintenance.hourMeter) {
        console.log('[DATA] Horímetro da manutenção foi alterado, verificando se precisa atualizar máquina...');

        const machineMaintenances = updated.filter(m => m.machineId === originalMaintenance.machineId);
        const machineRefuelings = allRefuelings.filter(r => r.machineId === originalMaintenance.machineId);

        const latestMaintenanceHourMeter = machineMaintenances.reduce(
          (max, m) => Math.max(max, m.hourMeter),
          0
        );
        const latestRefuelingHourMeter = machineRefuelings.reduce(
          (max, r) => Math.max(max, r.hourMeter),
          0
        );

        const newMachineHourMeter = Math.max(latestMaintenanceHourMeter, latestRefuelingHourMeter);

        const machine = allMachines.find(m => m.id === originalMaintenance.machineId);
        if (machine && machine.currentHourMeter !== newMachineHourMeter) {
          console.log('[DATA] Atualizando horímetro da máquina:', {
            machineId: originalMaintenance.machineId,
            oldHourMeter: machine.currentHourMeter,
            newHourMeter: newMachineHourMeter,
          });

          await updateMachine(originalMaintenance.machineId, {
            currentHourMeter: newMachineHourMeter,
          });
        }
      }

      if (updates.itemRevisions) {
        console.log('[DATA] Atualizando alertas relacionados à manutenção...');

        const updatedAlerts = allAlerts.map(alert => {
          if (alert.maintenanceId !== maintenanceId) return alert;

          const revision = updates.itemRevisions!.find(r => r.item === alert.maintenanceItem);
          if (!revision) return alert;

          const newNextRevisionHourMeter = updatedMaintenance.hourMeter + revision.nextRevisionHours;
          const machine = allMachines.find(m => m.id === alert.machineId);

          if (!machine) return alert;

          const newStatus = calculateAlertStatus(
            machine.currentHourMeter,
            newNextRevisionHourMeter
          );

          return {
            ...alert,
            serviceHourMeter: updatedMaintenance.hourMeter,
            intervalHours: revision.nextRevisionHours,
            nextRevisionHourMeter: newNextRevisionHourMeter,
            status: newStatus,
          };
        });

        setAllAlerts(updatedAlerts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.ALERTS,
          JSON.stringify(updatedAlerts)
        );

        console.log('[DATA] Atualizando alertas no Supabase (WEB e MOBILE)...');
        await Promise.all(
          updatedAlerts
            .filter(a => a.maintenanceId === maintenanceId)
            .map(alert => db.updateAlert(alert.id, {
              serviceHourMeter: alert.serviceHourMeter,
              intervalHours: alert.intervalHours,
              nextRevisionHourMeter: alert.nextRevisionHourMeter,
              status: alert.status,
            }))
        );
      }
    },
    [allMaintenances, allAlerts, allMachines, allRefuelings, calculateAlertStatus, updateMachine]
  );

  const updateRefueling = useCallback(
    async (refuelingId: string, updates: Partial<Refueling>) => {
      const refueling = allRefuelings.find(r => r.id === refuelingId);
      if (!refueling) {
        console.error('[DATA] Abastecimento não encontrado:', refuelingId);
        return;
      }

      console.log('[DATA] ========== EDIÇÃO DE ABASTECIMENTO ==========');
      console.log('[DATA] Editando abastecimento:', {
        id: refuelingId,
        machineId: refueling.machineId,
        oldHourMeter: refueling.hourMeter,
        newHourMeter: updates.hourMeter,
        oldLiters: refueling.liters,
        newLiters: updates.liters,
      });

      console.log('[DATA] Atualizando abastecimento no Supabase (WEB e MOBILE)...');
      await db.updateRefueling(refuelingId, updates);

      const updated = allRefuelings.map((r) =>
        r.id === refuelingId ? { ...r, ...updates } : r
      );
      setAllRefuelings(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REFUELINGS,
        JSON.stringify(updated)
      );

      if (updates.hourMeter !== undefined && updates.hourMeter !== refueling.hourMeter) {
        console.log('[DATA] Horímetro do abastecimento mudou, recalculando horímetro da máquina...');

        const machineRefuelings = updated.filter(r => r.machineId === refueling.machineId);
        const machineMaintenances = allMaintenances.filter(m => m.machineId === refueling.machineId);

        const latestRefuelingHourMeter = machineRefuelings.reduce(
          (max, r) => Math.max(max, r.hourMeter),
          0
        );
        const latestMaintenanceHourMeter = machineMaintenances.reduce(
          (max, m) => Math.max(max, m.hourMeter),
          0
        );

        const newMachineHourMeter = Math.max(latestRefuelingHourMeter, latestMaintenanceHourMeter);

        console.log('[DATA] 🔄 Novo horímetro da máquina calculado:', {
          machineId: refueling.machineId,
          newHourMeter: newMachineHourMeter,
          fromRefueling: latestRefuelingHourMeter,
          fromMaintenance: latestMaintenanceHourMeter,
        });

        const updatedMachines = allMachines.map((m) =>
          m.id === refueling.machineId
            ? { ...m, currentHourMeter: newMachineHourMeter, updatedAt: new Date().toISOString() }
            : m
        );
        setAllMachines(updatedMachines);
        await AsyncStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updatedMachines));

        console.log('[DATA] Atualizando máquina no Supabase (WEB e MOBILE)...');
        await db.updateMachine(refueling.machineId, {
          currentHourMeter: newMachineHourMeter,
        });

        console.log('[DATA] 📊 Recalculando status dos alertas com novo horímetro...');
        const machineAlerts = allAlerts.filter(a => a.machineId === refueling.machineId);
        console.log('[DATA] Alertas encontrados para esta máquina:', machineAlerts.length);

        if (machineAlerts.length > 0) {
          const updatedAlerts = allAlerts.map(alert => {
            if (alert.machineId !== refueling.machineId) return alert;

            const newStatus = calculateAlertStatus(
              newMachineHourMeter,
              alert.nextRevisionHourMeter
            );

            console.log('[DATA] Alerta:', {
              item: alert.maintenanceItem,
              currentHourMeter: newMachineHourMeter,
              nextRevisionHourMeter: alert.nextRevisionHourMeter,
              remaining: alert.nextRevisionHourMeter - newMachineHourMeter,
              oldStatus: alert.status,
              newStatus,
              needsUpdate: newStatus !== alert.status,
            });

            if (newStatus !== alert.status) {
              console.log('[DATA] ✅ Atualizando status do alerta de', alert.status, 'para', newStatus);

              db.updateAlert(alert.id, { status: newStatus }).catch(err =>
                console.error('[DATA] Erro ao atualizar status do alerta:', err)
              );

              return { ...alert, status: newStatus };
            }
            return alert;
          });

          setAllAlerts(updatedAlerts);
          await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
          console.log('[DATA] ✅ Alertas recalculados e salvos');
        }
      }

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

            await db.upsertFarmTank(virtualTank);

            const updatedTanks = [...allFarmTanks, virtualTank];
            setAllFarmTanks(updatedTanks);
            await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks));
          } else {
            const newCurrentLiters = farmTank.currentLiters - difference;

            const updatedTank: FarmTank = {
              ...farmTank,
              currentLiters: newCurrentLiters,
            };

            console.log('[DATA] Atualizando tanque no Supabase (WEB e MOBILE)...');
            await db.upsertFarmTank(updatedTank);

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
    [allRefuelings, allMaintenances, allAlerts, allMachines, farmTank, allFarmTanks, calculateAlertStatus]
  );

  const deleteRefueling = useCallback(
    async (refuelingId: string) => {
      const refueling = allRefuelings.find(r => r.id === refuelingId);
      if (!refueling) {
        console.error('[DATA] Abastecimento não encontrado:', refuelingId);
        return;
      }

      console.log('[DATA] ========== EXCLUSÃO DE ABASTECIMENTO ==========');
      console.log('[DATA] Excluindo abastecimento:', {
        id: refuelingId,
        machineId: refueling.machineId,
        hourMeter: refueling.hourMeter,
        liters: refueling.liters,
      });

      console.log('[DATA] Deletando abastecimento do Supabase (WEB e MOBILE)...');
      await db.deleteRefueling(refuelingId);

      const updated = allRefuelings.filter((r) => r.id !== refuelingId);
      setAllRefuelings(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.REFUELINGS,
        JSON.stringify(updated)
      );

      console.log('[DATA] Recalculando horímetro da máquina após exclusão...');
      const machineRefuelings = updated.filter(r => r.machineId === refueling.machineId);
      const machineMaintenances = allMaintenances.filter(m => m.machineId === refueling.machineId);

      const machine = allMachines.find(m => m.id === refueling.machineId);
      console.log('[DATA] Estado atual da máquina:', {
        machineId: refueling.machineId,
        currentHourMeter: machine?.currentHourMeter,
        abastecimentosRestantes: machineRefuelings.length,
        manutençõesExistentes: machineMaintenances.length,
      });

      let newHourMeter = 0;

      if (machineRefuelings.length > 0) {
        const latestRefueling = machineRefuelings.reduce((latest, current) => {
          return current.hourMeter > latest.hourMeter ? current : latest;
        });
        newHourMeter = Math.max(newHourMeter, latestRefueling.hourMeter);

        console.log('[DATA] Último abastecimento restante:', {
          id: latestRefueling.id,
          hourMeter: latestRefueling.hourMeter,
        });
      }

      if (machineMaintenances.length > 0) {
        const latestMaintenance = machineMaintenances.reduce((latest, current) => {
          return current.hourMeter > latest.hourMeter ? current : latest;
        });
        newHourMeter = Math.max(newHourMeter, latestMaintenance.hourMeter);

        console.log('[DATA] Última manutenção:', {
          id: latestMaintenance.id,
          hourMeter: latestMaintenance.hourMeter,
        });
      }

      if (newHourMeter === 0) {
        console.log('[DATA] ⚠️ Sem dados de horímetro, resetando para 0');
      }

      console.log('[DATA] 🔄 Atualizando horímetro da máquina:', {
        machineId: refueling.machineId,
        antigoHorímetro: machine?.currentHourMeter,
        novoHorímetro: newHourMeter,
      });

      await updateMachine(refueling.machineId, {
        currentHourMeter: newHourMeter,
      });

      console.log('[DATA] Recalculando status dos alertas após mudança no horímetro...');
      const machineAlerts = allAlerts.filter(a => a.machineId === refueling.machineId);
      if (machineAlerts.length > 0) {
        const updatedAlerts = allAlerts.map(alert => {
          if (alert.machineId !== refueling.machineId) return alert;

          const newStatus = calculateAlertStatus(
            newHourMeter,
            alert.nextRevisionHourMeter
          );

          if (newStatus !== alert.status) {
            console.log('[DATA] Atualizando status do alerta:', {
              alertId: alert.id,
              item: alert.maintenanceItem,
              oldStatus: alert.status,
              newStatus,
            });

            db.updateAlert(alert.id, { status: newStatus }).catch(err =>
              console.error('[DATA] Erro ao atualizar status do alerta:', err)
            );

            return { ...alert, status: newStatus };
          }
          return alert;
        });

        setAllAlerts(updatedAlerts);
        await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updatedAlerts));
      }

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

        await db.upsertFarmTank(virtualTank);

        const updatedTanks = [...allFarmTanks, virtualTank];
        setAllFarmTanks(updatedTanks);
        await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updatedTanks));
      } else {
        const newCurrentLiters = farmTank.currentLiters + refueling.liters;

        const updatedTank: FarmTank = {
          ...farmTank,
          currentLiters: newCurrentLiters,
        };

        console.log('[DATA] Atualizando tanque no Supabase (WEB e MOBILE)...');
        await db.upsertFarmTank(updatedTank);

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
    [allRefuelings, allMaintenances, allAlerts, allMachines, farmTank, allFarmTanks, updateMachine, calculateAlertStatus]
  );

  const deleteMaintenance = useCallback(
    async (maintenanceId: string) => {
      const maintenance = allMaintenances.find(m => m.id === maintenanceId);
      if (!maintenance) {
        console.error('[DATA] Manutenção não encontrada:', maintenanceId);
        return;
      }

      console.log('[DATA] ========== EXCLUSÃO DE MANUTENÇÃO ==========');
      console.log('[DATA] Excluindo manutenção:', {
        id: maintenanceId,
        machineId: maintenance.machineId,
        hourMeter: maintenance.hourMeter,
      });

      console.log('[DATA] Deletando manutenção do Supabase (WEB e MOBILE)...');
      await db.deleteMaintenance(maintenanceId);
      await db.deleteAlertsByMaintenanceId(maintenanceId);

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

      console.log('[DATA] Recalculando horímetro da máquina após exclusão da manutenção...');
      const machineMaintenances = updated.filter(m => m.machineId === maintenance.machineId);
      const machineRefuelings = allRefuelings.filter(r => r.machineId === maintenance.machineId);

      const machine = allMachines.find(m => m.id === maintenance.machineId);
      console.log('[DATA] Estado atual da máquina:', {
        machineId: maintenance.machineId,
        currentHourMeter: machine?.currentHourMeter,
        manutencoesRestantes: machineMaintenances.length,
        abastecimentos: machineRefuelings.length,
      });

      let newHourMeter = 0;

      if (machineRefuelings.length > 0) {
        const latestRefueling = machineRefuelings.reduce((latest, current) => {
          return current.hourMeter > latest.hourMeter ? current : latest;
        });
        newHourMeter = Math.max(newHourMeter, latestRefueling.hourMeter);
        console.log('[DATA] Último abastecimento:', {
          id: latestRefueling.id,
          hourMeter: latestRefueling.hourMeter,
        });
      }

      if (machineMaintenances.length > 0) {
        const latestMaintenance = machineMaintenances.reduce((latest, current) => {
          return current.hourMeter > latest.hourMeter ? current : latest;
        });
        newHourMeter = Math.max(newHourMeter, latestMaintenance.hourMeter);
        console.log('[DATA] Última manutenção restante:', {
          id: latestMaintenance.id,
          hourMeter: latestMaintenance.hourMeter,
        });
      }

      if (newHourMeter === 0) {
        console.log('[DATA] ⚠️ Sem dados de horímetro, resetando para 0');
      }

      console.log('[DATA] 🔄 Atualizando horímetro da máquina:', {
        machineId: maintenance.machineId,
        antigoHorímetro: machine?.currentHourMeter,
        novoHorímetro: newHourMeter,
      });

      await updateMachine(maintenance.machineId, {
        currentHourMeter: newHourMeter,
      });

      console.log('[DATA] Recalculando status dos alertas restantes após mudança no horímetro...');
      const remainingMachineAlerts = updatedAlerts.filter(a => a.machineId === maintenance.machineId);
      if (remainingMachineAlerts.length > 0) {
        const finalAlerts = updatedAlerts.map(alert => {
          if (alert.machineId !== maintenance.machineId) return alert;

          const newStatus = calculateAlertStatus(
            newHourMeter,
            alert.nextRevisionHourMeter
          );

          if (newStatus !== alert.status) {
            console.log('[DATA] Atualizando status do alerta:', {
              alertId: alert.id,
              item: alert.maintenanceItem,
              oldStatus: alert.status,
              newStatus,
            });

            db.updateAlert(alert.id, { status: newStatus }).catch(err =>
              console.error('[DATA] Erro ao atualizar status do alerta:', err)
            );

            return { ...alert, status: newStatus };
          }
          return alert;
        });

        setAllAlerts(finalAlerts);
        await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(finalAlerts));
      }
    },
    [allMaintenances, allAlerts, allRefuelings, allMachines, updateMachine, calculateAlertStatus]
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
        updatedAlerts.forEach(alert => {
          const originalAlert = currentAlerts.find(a => a.id === alert.id);
          if (originalAlert && alert.status !== originalAlert.status) {
            db.updateAlert(alert.id, { status: alert.status }).catch(err =>
              console.error('[DATA] Erro ao atualizar status do alerta:', err)
            );
          }
        });
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

        if (currentUser) {
          console.log('[DATA] Salvando tipo de serviço no Supabase (WEB e MOBILE)...');
          await db.upsertUserPreferences(currentUser.id, {
            serviceTypes: updated,
          });
        }
      }
    },
    [serviceTypes, currentUser]
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

        if (currentUser) {
          console.log('[DATA] Salvando item de manutenção no Supabase (WEB e MOBILE)...');
          await db.upsertUserPreferences(currentUser.id, {
            maintenanceItems: updated,
          });
        }
      }
    },
    [maintenanceItems, currentUser]
  );

  const updateMaintenanceItem = useCallback(
    async (oldItem: MaintenanceItem, newItem: MaintenanceItem) => {
      const index = maintenanceItems.indexOf(oldItem);
      if (index !== -1) {
        const updated = [...maintenanceItems];
        updated[index] = newItem;
        setMaintenanceItems(updated);
        await AsyncStorage.setItem(
          STORAGE_KEYS.MAINTENANCE_ITEMS,
          JSON.stringify(updated)
        );

        if (currentUser) {
          console.log('[DATA] Atualizando item de manutenção no Supabase (WEB e MOBILE)...');
          await db.upsertUserPreferences(currentUser.id, {
            maintenanceItems: updated,
          });
        }
      }
    },
    [maintenanceItems, currentUser]
  );

  const deleteMaintenanceItem = useCallback(
    async (item: MaintenanceItem) => {
      const updated = maintenanceItems.filter(i => i !== item);
      setMaintenanceItems(updated);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MAINTENANCE_ITEMS,
        JSON.stringify(updated)
      );

      if (currentUser) {
        console.log('[DATA] Removendo item de manutenção no Supabase (WEB e MOBILE)...');
        await db.upsertUserPreferences(currentUser.id, {
          maintenanceItems: updated,
        });
      }
    },
    [maintenanceItems, currentUser]
  );

  const updateTankInitialData = useCallback(async (data: Omit<FarmTank, 'propertyId'>) => {
    if (!currentPropertyId) {
      throw new Error('No property selected');
    }

    const tankData: FarmTank = {
      ...data,
      propertyId: currentPropertyId,
    };

    console.log('[DATA] Salvando tanque no Supabase (WEB e MOBILE)...');
    await db.upsertFarmTank(tankData);

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

      console.log('[DATA] Atualizando tanque no Supabase (WEB e MOBILE)...');
      await db.upsertFarmTank(updatedTank);

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

      console.log('[DATA] Atualizando tanque no Supabase (WEB e MOBILE)...');
      await db.upsertFarmTank(updatedTank);

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

      console.log('[DATA] Atualizando tanque no Supabase (WEB e MOBILE)...');
      await db.upsertFarmTank(updatedTank);

      // Registrar adição no histórico
      try {
        const newAddition = await db.createTankAddition({
          propertyId: currentPropertyId,
          litersAdded: litersAdded,
          timestamp: new Date().toISOString(),
          reason: 'Adição de combustível',
        });
        console.log('[DATA] Adição de combustível registrada no histórico');

        // Atualizar estado local com a nova adição
        setAllTankAdditions(prev => [newAddition, ...prev]);
      } catch (error) {
        console.error('[DATA] Erro ao registrar adição no histórico:', error);
      }

      const updated = allFarmTanks.map(t =>
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      // Atualizar alerta de tanque
      await updateTankAlert(updatedTank);

      return { success: true, overflow: 0 };
    },
    [farmTank, allFarmTanks, currentPropertyId, updateTankAlert]
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

        console.log('[DATA] Criando tanque virtual no Supabase (WEB e MOBILE)...');
        await db.upsertFarmTank(virtualTank);

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

      console.log('[DATA] Atualizando tanque no Supabase (WEB e MOBILE)...');
      await db.upsertFarmTank(updatedTank);

      const updated = allFarmTanks.map(t =>
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      // Atualizar alerta de tanque
      await updateTankAlert(updatedTank);

      if (newCurrentLiters <= farmTank.alertLevelLiters && oldLiters > farmTank.alertLevelLiters) {
        console.log(
          `⚠️ ALERTA: Tanque de combustível baixo: restam apenas ${newCurrentLiters.toFixed(0)} litros`
        );
      }
    },
    [farmTank, allFarmTanks, currentPropertyId, updateTankAlert]
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

      console.log('[DATA] Ajustando tanque no Supabase (WEB e MOBILE)...', {
        adjustment,
        reason,
        oldValue: farmTank.currentLiters,
        newValue: newCurrentLiters,
      });
      await db.upsertFarmTank(updatedTank);

      // Registrar ajuste no histórico
      try {
        const newAddition = await db.createTankAddition({
          propertyId: currentPropertyId,
          litersAdded: adjustment,
          timestamp: new Date().toISOString(),
          reason: reason || 'Ajuste manual',
        });
        console.log('[DATA] Ajuste de combustível registrado no histórico');

        // Atualizar estado local com a nova adição
        setAllTankAdditions(prev => [newAddition, ...prev]);
      } catch (error) {
        console.error('[DATA] Erro ao registrar ajuste no histórico:', error);
      }

      const updated = allFarmTanks.map(t =>
        t.propertyId === currentPropertyId ? updatedTank : t
      );
      setAllFarmTanks(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.FARM_TANK, JSON.stringify(updated));

      // Atualizar alerta de tanque
      await updateTankAlert(updatedTank);

      console.log('[DATA] Ajuste de tanque realizado:', {
        adjustment: adjustment > 0 ? `+${adjustment}L` : `${adjustment}L`,
        reason,
        from: farmTank.currentLiters.toFixed(0),
        to: newCurrentLiters.toFixed(0),
      });
    },
    [farmTank, allFarmTanks, currentPropertyId, updateTankAlert]
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
      archivedMachines,
      refuelings,
      maintenances,
      alerts,
      serviceTypes,
      maintenanceItems,
      farmTank,
      tankAdditions,
      isLoading,
      addMachine,
      updateMachine,
      deleteMachine,
      archiveMachine,
      unarchiveMachine,
      checkMachineCanBeDeleted,
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
      updateMaintenanceItem,
      deleteMaintenanceItem,
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
      archivedMachines,
      refuelings,
      maintenances,
      alerts,
      serviceTypes,
      maintenanceItems,
      farmTank,
      tankAdditions,
      isLoading,
      addMachine,
      updateMachine,
      deleteMachine,
      archiveMachine,
      unarchiveMachine,
      checkMachineCanBeDeleted,
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
      updateMaintenanceItem,
      deleteMaintenanceItem,
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
