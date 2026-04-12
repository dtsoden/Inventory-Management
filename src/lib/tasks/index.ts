import { prisma } from '@/lib/db';
import { ActionItemService } from './ActionItemService';

export const actionItemService = new ActionItemService(prisma);

export { ActionItemService } from './ActionItemService';
export type { ActionItem, ActionItemType } from './types';
