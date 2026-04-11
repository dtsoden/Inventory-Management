import { prisma } from '@/lib/db';
import { ItemCategoryRepository } from './ItemCategoryRepository';
import { ItemCategoryService } from './ItemCategoryService';

export * from './ItemCategoryRepository';
export * from './ItemCategoryService';

export const itemCategoryRepository = new ItemCategoryRepository(prisma);
export const itemCategoryService = new ItemCategoryService(prisma);
