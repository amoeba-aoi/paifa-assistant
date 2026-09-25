export type Role = "shipper" | "receiver";

export type RequestStatus = "pending" | "cleared";

export interface ReceiverUser {
  id: string;
  username: string;
  cn: string;
  passwordHash: string;
  createdAt: string;
}

export interface Module {
  id: string;
  name: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  moduleId: string;
  itemName: string;
  quantity: number;
}

export interface DistributionRequest {
  id: string;
  userId: string;
  moduleId: string;
  itemName: string;
  quantity: number;
  /** Smaller number = higher priority */
  order: number;
  status: RequestStatus;
  createdAt: string;
  clearedAt?: string;
}

export interface StoreData {
  receivers: ReceiverUser[];
  modules: Module[];
  inventory: InventoryItem[];
  requests: DistributionRequest[];
}

export interface SessionUser {
  id: string;
  role: Role;
  username: string;
  cn: string;
}
