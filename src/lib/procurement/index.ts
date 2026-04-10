import { prisma } from '@/lib/db';
import { PurchaseOrderRepository } from './PurchaseOrderRepository';
import { PurchaseOrderService } from './PurchaseOrderService';
import { ItemRepository } from './ItemRepository';
import { ItemService } from './ItemService';

export const purchaseOrderRepository = new PurchaseOrderRepository(prisma);
export const purchaseOrderService = new PurchaseOrderService(
  purchaseOrderRepository,
  prisma
);

export const itemRepository = new ItemRepository(prisma);
export const itemService = new ItemService(itemRepository, prisma);

export { PurchaseOrderRepository } from './PurchaseOrderRepository';
export { PurchaseOrderService } from './PurchaseOrderService';
export { ItemRepository } from './ItemRepository';
export { ItemService } from './ItemService';
export type { PurchaseOrderWithLines, PurchaseOrderLineRecord } from './PurchaseOrderRepository';
export type { ItemRecord } from './ItemRepository';
