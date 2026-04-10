// Role & Status Enums (type-safe string unions)
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const AssetStatus = {
  AVAILABLE: 'AVAILABLE',
  ASSIGNED: 'ASSIGNED',
  IN_MAINTENANCE: 'IN_MAINTENANCE',
  RETIRED: 'RETIRED',
  LOST: 'LOST',
} as const;
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const ReceivingStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ReceivingStatus = (typeof ReceivingStatus)[keyof typeof ReceivingStatus];

export const NotificationType = {
  ORDER_STATUS: 'ORDER_STATUS',
  LOW_STOCK: 'LOW_STOCK',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  ASSET_ASSIGNED: 'ASSET_ASSIGNED',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ConfigCategory = {
  AI: 'ai',
  EMAIL: 'email',
  INTEGRATIONS: 'integrations',
  PLATFORM: 'platform',
  CORS: 'cors',
} as const;
export type ConfigCategory = (typeof ConfigCategory)[keyof typeof ConfigCategory];

// Session & Context Types
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: UserRole;
}

// API Types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
