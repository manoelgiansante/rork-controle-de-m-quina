export type UserRole = 'master' | 'employee';

export interface Property {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  acceptedTermsAt?: string;
}

export type MachineType = 'Trator' | 'Caminhão' | 'Pá Carregadeira' | 'Vagão' | 'Outro';

export interface Machine {
  id: string;
  propertyId: string;
  type: MachineType;
  model: string;
  currentHourMeter: number;
  createdAt: string;
  updatedAt: string;
}

export type ServiceType = string;

export interface Refueling {
  id: string;
  propertyId: string;
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
  propertyId: string;
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
export type AlertType = 'maintenance' | 'tank';

export interface MaintenanceAlert {
  id: string;
  type: 'maintenance';
  propertyId: string;
  machineId: string;
  maintenanceId: string;
  maintenanceItem: MaintenanceItem;
  serviceHourMeter: number;
  intervalHours: number;
  nextRevisionHourMeter: number;
  status: AlertStatus;
  createdAt: string;
}

export interface TankAlert {
  id: string;
  type: 'tank';
  propertyId: string;
  tankCurrentLiters: number;
  tankCapacityLiters: number;
  tankAlertLevelLiters: number;
  percentageFilled: number;
  status: AlertStatus;
  message: string;
  createdAt: string;
}

export type Alert = MaintenanceAlert | TankAlert;

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'none';
export type PlanType = 'basic' | 'premium';
export type BillingCycle = 'monthly' | 'annual';

export interface SubscriptionPlan {
  id: string;
  productId: string;
  name: string;
  planType: PlanType;
  billingCycle: BillingCycle;
  machineLimit: number;
  price: number;
  description: string;
  features: string[];
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  planType?: PlanType;
  billingCycle?: BillingCycle;
  machineLimit: number;
  isActive: boolean;
  trialActive: boolean;
  trialEndsAt?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  daysRemainingInTrial?: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  canceledAt?: string;
}

export type FuelType = 'Diesel comum' | 'Diesel S10';

export interface FarmTank {
  propertyId: string;
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
