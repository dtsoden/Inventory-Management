import { prisma } from '@/lib/db';
import { SearchService } from './SearchService';

export * from './SearchService';

export const searchService = new SearchService(prisma);
