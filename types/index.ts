export type UserRole = 'master' | 'employee';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
}

export type MachineType = 'Trator' | 'Caminhão' | 'Pá Carregadeira' | 'Vagão' | 'Outro';

export interface Machine {
  id: string;
  type: MachineType;
  model: string;
  currentHourMeter: number;
  createdAt: string;
  updatedAt: string;
}

export type ServiceType = string;

export interface Refueling {
  id: string;
  machineId: string;
  date: string;
  liters: number;
  hourMeter: number;
  serviceType?: ServiceType;
  averageConsumption?: number;
  userId: string;
  userName: string;
  createdAt: string;
}

export type MaintenanceItem = string;

export interface MaintenanceItemRevision {
  item: MaintenanceItem;
  nextRevisionHours: number;
}

export interface Maintenance {
  id: string;
  machineId: string;
  hourMeter: number;
  items: MaintenanceItem[];
  observation?: string;
  itemRevisions: MaintenanceItemRevision[];
  userId: string;
  userName: string;
  createdAt: string;
}

export type AlertStatus = 'green' | 'yellow' | 'red';

export interface Alert {
  id: string;
  machineId: string;
  maintenanceId: string;
  maintenanceItem: MaintenanceItem;
  serviceHourMeter: number;
  intervalHours: number;
  nextRevisionHourMeter: number;
  status: AlertStatus;
  createdAt: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'none';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isActive: boolean;
  daysRemainingInTrial?: number;
}

export type FuelType = 'Diesel comum' | 'Diesel S10';

export interface FarmTank {
  capacityLiters: number;
  currentLiters: number;
  fuelType: FuelType;
  alertLevelLiters: number;
}

export interface AppData {
  users: User[];
  machines: Machine[];
  refuelings: Refueling[];
  maintenances: Maintenance[];
  alerts: Alert[];
  farmTank?: FarmTank;
  lastSync?: string;
}
