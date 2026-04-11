import { prisma } from '@/lib/db';
import { ExternalDataSourceRepository } from './ExternalDataSourceRepository';
import { ExternalDataSourceService } from './ExternalDataSourceService';

export * from './ExternalDataSourceRepository';
export * from './ExternalDataSourceService';

export const externalDataSourceRepository = new ExternalDataSourceRepository(prisma);
export const externalDataSourceService = new ExternalDataSourceService(prisma);
