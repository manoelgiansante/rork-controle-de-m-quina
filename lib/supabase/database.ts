import { supabase } from './client';
import type {
  Property,
  Machine,
  Refueling,
  Maintenance,
  Alert,
  FarmTank,
  TankAddition,
  ServiceType,
  MaintenanceItem,
} from '@/types';

// ==================== PROPERTIES ====================

export async function fetchProperties(userId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[DB] Error fetching properties:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createProperty(userId: string, name: string): Promise<Property> {
  console.log('[DB] createProperty chamado:', { userId, name });
  
  const { data, error } = await supabase
    .from('properties')
    .insert({ 
      name,
      user_id: userId 
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating property:', error);
    console.error('[DB] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('[DB] Propriedade criada com sucesso:', data);
  
  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateProperty(
  propertyId: string,
  updates: Partial<Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<Property> {
  console.log('[DB] updateProperty chamado:', { propertyId, updates });
  
  const { data, error } = await supabase
    .from('properties')
    .update({
      name: updates.name,
    })
    .eq('id', propertyId)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating property:', error);
    console.error('[DB] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
  
  console.log('[DB] Propriedade atualizada com sucesso:', data);
  
  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);

  if (error) {
    console.error('[DB] Error deleting property:', error);
    throw error;
  }
}

// ==================== MACHINES ====================

export async function fetchMachines(propertyId: string): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[DB] Error fetching machines:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    model: row.model,
    currentHourMeter: parseFloat(row.current_hour_meter),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createMachine(
  machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Machine> {
  const { data, error } = await supabase
    .from('machines')
    .insert({
      property_id: machine.propertyId,
      type: machine.type,
      model: machine.model,
      current_hour_meter: machine.currentHourMeter,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating machine:', error);
    throw error;
  }

  return {
    id: data.id,
    propertyId: data.property_id,
    type: data.type,
    model: data.model,
    currentHourMeter: parseFloat(data.current_hour_meter),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateMachine(
  machineId: string,
  updates: Partial<Omit<Machine, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.model !== undefined) updateData.model = updates.model;
  if (updates.currentHourMeter !== undefined) updateData.current_hour_meter = updates.currentHourMeter;

  const { error } = await supabase.from('machines').update(updateData).eq('id', machineId);

  if (error) {
    console.error('[DB] Error updating machine:', error);
    throw error;
  }
}

export async function deleteMachine(machineId: string): Promise<void> {
  const { error } = await supabase.from('machines').delete().eq('id', machineId);

  if (error) {
    console.error('[DB] Error deleting machine:', error);
    throw error;
  }
}

// ==================== REFUELINGS ====================

export async function fetchRefuelings(propertyId: string): Promise<Refueling[]> {
  const { data, error } = await supabase
    .from('refuelings')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] Error fetching refuelings:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    machineId: row.machine_id,
    date: row.date,
    liters: parseFloat(row.liters),
    hourMeter: parseFloat(row.hour_meter),
    refueledBy: row.refueled_by || '',
    serviceType: row.service_type,
    averageConsumption: row.average_consumption ? parseFloat(row.average_consumption) : undefined,
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
  }));
}

export async function createRefueling(
  refueling: Omit<Refueling, 'id' | 'createdAt'>
): Promise<Refueling> {
  const { data, error } = await supabase
    .from('refuelings')
    .insert({
      property_id: refueling.propertyId,
      machine_id: refueling.machineId,
      date: refueling.date,
      liters: refueling.liters,
      hour_meter: refueling.hourMeter,
      refueled_by: refueling.refueledBy,
      service_type: refueling.serviceType,
      average_consumption: refueling.averageConsumption,
      user_id: refueling.userId,
      user_name: refueling.userName,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating refueling:', error);
    throw error;
  }

  return {
    id: data.id,
    propertyId: data.property_id,
    machineId: data.machine_id,
    date: data.date,
    liters: parseFloat(data.liters),
    hourMeter: parseFloat(data.hour_meter),
    refueledBy: data.refueled_by,
    serviceType: data.service_type,
    averageConsumption: data.average_consumption ? parseFloat(data.average_consumption) : undefined,
    userId: data.user_id,
    userName: data.user_name,
    createdAt: data.created_at,
  };
}

export async function updateRefueling(
  refuelingId: string,
  updates: Partial<Omit<Refueling, 'id' | 'propertyId' | 'machineId' | 'userId' | 'userName' | 'createdAt'>>
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.liters !== undefined) updateData.liters = updates.liters;
  if (updates.hourMeter !== undefined) updateData.hour_meter = updates.hourMeter;
  if (updates.serviceType !== undefined) updateData.service_type = updates.serviceType;
  if (updates.averageConsumption !== undefined) updateData.average_consumption = updates.averageConsumption;

  const { error } = await supabase.from('refuelings').update(updateData).eq('id', refuelingId);

  if (error) {
    console.error('[DB] Error updating refueling:', error);
    throw error;
  }
}

export async function deleteRefueling(refuelingId: string): Promise<void> {
  console.log('[DB] Tentando deletar refueling:', refuelingId);

  const { data: existing, error: fetchError } = await supabase
    .from('refuelings')
    .select('id, property_id')
    .eq('id', refuelingId)
    .single();

  if (fetchError) {
    console.error('[DB] Erro ao buscar refueling para deletar:', fetchError);
    throw new Error(`Erro ao buscar refueling: ${fetchError.message}`);
  }

  if (!existing) {
    console.error('[DB] Refueling não encontrado para o ID:', refuelingId);
    throw new Error('Abastecimento não encontrado para exclusão.');
  }

  console.log('[DB] Refueling encontrado, tentando deletar:', existing);

  const { error } = await supabase.from('refuelings').delete().eq('id', refuelingId);

  if (error) {
    console.error('[DB] Erro ao deletar refueling:', {
      message: error.message,
      details: error.details,
      code: error.code,
    });
    throw new Error(`Erro do Supabase: ${error.message}`);
  }

  console.log('[DB] Refueling deletado com sucesso do Supabase!');
}

// ==================== MAINTENANCES ====================

export async function fetchMaintenances(propertyId: string): Promise<Maintenance[]> {
  const { data, error } = await supabase
    .from('maintenances')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] Error fetching maintenances:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    machineId: row.machine_id,
    hourMeter: parseFloat(row.hour_meter),
    performedBy: row.performed_by || '',
    items: row.items,
    observation: row.observation,
    itemRevisions: row.item_revisions,
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
  }));
}

export async function createMaintenance(
  maintenance: Omit<Maintenance, 'id' | 'createdAt'>
): Promise<Maintenance> {
  const { data, error } = await supabase
    .from('maintenances')
    .insert({
      property_id: maintenance.propertyId,
      machine_id: maintenance.machineId,
      hour_meter: maintenance.hourMeter,
      performed_by: maintenance.performedBy,
      items: maintenance.items,
      observation: maintenance.observation,
      item_revisions: maintenance.itemRevisions,
      user_id: maintenance.userId,
      user_name: maintenance.userName,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating maintenance:', error);
    throw error;
  }

  return {
    id: data.id,
    propertyId: data.property_id,
    machineId: data.machine_id,
    hourMeter: parseFloat(data.hour_meter),
    performedBy: data.performed_by,
    items: data.items,
    observation: data.observation,
    itemRevisions: data.item_revisions,
    userId: data.user_id,
    userName: data.user_name,
    createdAt: data.created_at,
  };
}

export async function updateMaintenance(
  maintenanceId: string,
  updates: Partial<Omit<Maintenance, 'id' | 'propertyId' | 'machineId' | 'userId' | 'userName'>>
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.hourMeter !== undefined) updateData.hour_meter = updates.hourMeter;
  if (updates.items !== undefined) updateData.items = updates.items;
  if (updates.observation !== undefined) updateData.observation = updates.observation;
  if (updates.itemRevisions !== undefined) updateData.item_revisions = updates.itemRevisions;
  if (updates.createdAt !== undefined) updateData.created_at = updates.createdAt;

  const { error } = await supabase.from('maintenances').update(updateData).eq('id', maintenanceId);

  if (error) {
    console.error('[DB] Error updating maintenance:', error);
    throw error;
  }
}

export async function deleteMaintenance(maintenanceId: string): Promise<void> {
  const { error } = await supabase.from('maintenances').delete().eq('id', maintenanceId);

  if (error) {
    console.error('[DB] Error deleting maintenance:', error);
    throw error;
  }
}

// ==================== ALERTS ====================

export async function fetchAlerts(propertyId: string): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] Error fetching alerts:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    machineId: row.machine_id,
    maintenanceId: row.maintenance_id,
    maintenanceItem: row.maintenance_item,
    serviceHourMeter: parseFloat(row.service_hour_meter),
    intervalHours: row.interval_hours,
    nextRevisionHourMeter: parseFloat(row.next_revision_hour_meter),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function createAlert(alert: Alert): Promise<void> {
  const { error } = await supabase.from('alerts').insert({
    id: alert.id,
    property_id: alert.propertyId,
    machine_id: alert.machineId,
    maintenance_id: alert.maintenanceId,
    maintenance_item: alert.maintenanceItem,
    service_hour_meter: alert.serviceHourMeter,
    interval_hours: alert.intervalHours,
    next_revision_hour_meter: alert.nextRevisionHourMeter,
    status: alert.status,
    created_at: alert.createdAt,
  });

  if (error) {
    console.error('[DB] Error creating alert:', error);
    throw error;
  }
}

export async function updateAlert(
  alertId: string,
  updates: Partial<Pick<Alert, 'status' | 'serviceHourMeter' | 'intervalHours' | 'nextRevisionHourMeter'>>
): Promise<void> {
  const updateData: any = {};
  
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.serviceHourMeter !== undefined) {
    updateData.service_hour_meter = updates.serviceHourMeter;
  }
  if (updates.intervalHours !== undefined) {
    updateData.interval_hours = updates.intervalHours;
  }
  if (updates.nextRevisionHourMeter !== undefined) {
    updateData.next_revision_hour_meter = updates.nextRevisionHourMeter;
  }

  const { error } = await supabase
    .from('alerts')
    .update(updateData)
    .eq('id', alertId);

  if (error) {
    console.error('[DB] Error updating alert:', error);
    throw error;
  }
}

export async function deleteAlert(alertId: string): Promise<void> {
  const { error } = await supabase.from('alerts').delete().eq('id', alertId);

  if (error) {
    console.error('[DB] Error deleting alert:', error);
    throw error;
  }
}

export async function deleteAlertsByMaintenanceId(maintenanceId: string): Promise<void> {
  const { error } = await supabase.from('alerts').delete().eq('maintenance_id', maintenanceId);

  if (error) {
    console.error('[DB] Error deleting alerts by maintenance:', error);
    throw error;
  }
}

// ==================== FARM TANKS ====================

export async function fetchFarmTank(propertyId: string): Promise<FarmTank | null> {
  const { data, error } = await supabase
    .from('farm_tanks')
    .select('*')
    .eq('property_id', propertyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[DB] Error fetching farm tank:', error);
    throw error;
  }

  return {
    propertyId: data.property_id,
    capacityLiters: parseFloat(data.capacity_liters),
    currentLiters: parseFloat(data.current_liters),
    fuelType: data.fuel_type,
    alertLevelLiters: parseFloat(data.alert_level_liters),
  };
}

export async function upsertFarmTank(tank: FarmTank): Promise<void> {
  const { error } = await supabase
    .from('farm_tanks')
    .upsert({
      property_id: tank.propertyId,
      capacity_liters: tank.capacityLiters,
      current_liters: tank.currentLiters,
      fuel_type: tank.fuelType,
      alert_level_liters: tank.alertLevelLiters,
    }, {
      onConflict: 'property_id'
    });

  if (error) {
    console.error('[DB] Error upserting farm tank:', error);
    throw error;
  }
}

export async function fetchTankAdditions(propertyId: string): Promise<TankAddition[]> {
  const { data, error } = await supabase
    .from('farm_tank_additions')
    .select('*')
    .eq('property_id', propertyId)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[DB] Error fetching tank additions:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    litersAdded: parseFloat(row.liters_added),
    timestamp: row.timestamp,
    createdAt: row.created_at,
    reason: row.reason,
  }));
}

// ==================== USER PREFERENCES ====================

export async function fetchUserPreferences(userId: string): Promise<{
  serviceTypes: ServiceType[];
  maintenanceItems: MaintenanceItem[];
} | null> {
  console.log('[DB] fetchUserPreferences: buscando preferências para:', userId);
  
  const { data, error, status } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && status !== 406) {
    console.error('[DB] Error fetching user preferences:', error);
    throw error;
  }

  if (!data) {
    console.log('[DB] fetchUserPreferences: registro não existe, criando padrão...');
    const { data: created, error: insertError } = await supabase
      .from('user_preferences')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (insertError) {
      console.error('[DB] Error creating default user preferences:', insertError);
      throw insertError;
    }
    
    console.log('[DB] fetchUserPreferences: registro padrão criado:', created);
    return {
      serviceTypes: created.service_types || [],
      maintenanceItems: created.maintenance_items || [],
    };
  }

  console.log('[DB] fetchUserPreferences: registro encontrado');
  return {
    serviceTypes: data.service_types || [],
    maintenanceItems: data.maintenance_items || [],
  };
}

export async function upsertUserPreferences(
  userId: string,
  preferences: {
    serviceTypes?: ServiceType[];
    maintenanceItems?: MaintenanceItem[];
  }
): Promise<void> {
  const updateData: Record<string, any> = { user_id: userId };
  if (preferences.serviceTypes !== undefined) updateData.service_types = preferences.serviceTypes;
  if (preferences.maintenanceItems !== undefined) updateData.maintenance_items = preferences.maintenanceItems;

  const { error } = await supabase.from('user_preferences').upsert(updateData, {
    onConflict: 'user_id'
  });

  if (error) {
    console.error('[DB] Error upserting user preferences:', error);
    throw error;
  }
}

// ==================== TANK ADDITIONS ====================

export async function fetchTankAdditions(propertyId: string): Promise<TankAddition[]> {
  const { data, error } = await supabase
    .from('farm_tank_additions')
    .select('*')
    .eq('property_id', propertyId)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[DB] Error fetching tank additions:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    litersAdded: parseFloat(row.liters_added),
    timestamp: row.timestamp,
    createdAt: row.created_at,
    reason: row.reason,
  }));
}

export async function createTankAddition(addition: Omit<TankAddition, 'id' | 'createdAt'>): Promise<TankAddition> {
  const { data, error } = await supabase
    .from('farm_tank_additions')
    .insert({
      property_id: addition.propertyId,
      liters_added: addition.litersAdded,
      timestamp: addition.timestamp,
      reason: addition.reason,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating tank addition:', error);
    throw error;
  }

  return {
    id: data.id,
    propertyId: data.property_id,
    litersAdded: parseFloat(data.liters_added),
    timestamp: data.timestamp,
    createdAt: data.created_at,
    reason: data.reason,
  };
}

// ==================== MACHINE ARCHIVE ====================

export async function archiveMachine(machineId: string): Promise<void> {
  console.log('[DB] Arquivando máquina:', machineId);

  const { error } = await supabase
    .from('machines')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', machineId);

  if (error) {
    console.error('[DB] Error archiving machine:', error);
    throw error;
  }

  console.log('[DB] ✅ Máquina arquivada com sucesso');
}

export async function unarchiveMachine(machineId: string): Promise<void> {
  console.log('[DB] Desarquivando máquina:', machineId);

  const { error } = await supabase
    .from('machines')
    .update({
      archived: false,
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', machineId);

  if (error) {
    console.error('[DB] Error unarchiving machine:', error);
    throw error;
  }

  console.log('[DB] ✅ Máquina desarquivada com sucesso');
}

export async function checkMachineHasHistory(machineId: string): Promise<{
  hasRefuelings: boolean;
  hasMaintenances: boolean;
  refuelingCount: number;
  maintenanceCount: number;
}> {
  console.log('[DB] Verificando histórico da máquina:', machineId);

  const [refuelingsResult, maintenancesResult] = await Promise.all([
    supabase
      .from('refuelings')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', machineId),
    supabase
      .from('maintenances')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', machineId),
  ]);

  const refuelingCount = refuelingsResult.count || 0;
  const maintenanceCount = maintenancesResult.count || 0;

  return {
    hasRefuelings: refuelingCount > 0,
    hasMaintenances: maintenanceCount > 0,
    refuelingCount,
    maintenanceCount,
  };
}

// ==================== SUBSCRIPTIONS ====================

export async function fetchSubscription(userId: string): Promise<any | null> {
  console.log('[DB] Buscando subscription para userId:', userId);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error fetching subscription:', JSON.stringify(error, null, 2));
    console.error('[DB] Error details:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
    throw error;
  }

  if (!data) {
    console.log('[DB] Nenhuma subscription encontrada para userId:', userId);
    return null;
  }

  console.log('[DB] Subscription encontrada:', data);
  return {
    userId: data.user_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripeCustomerId: data.stripe_customer_id,
    planType: data.plan_type,
    billingCycle: data.billing_cycle,
    machineLimit: data.machine_limit,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    trialActive: data.trial_active,
  };
}
