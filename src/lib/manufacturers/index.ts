import { prisma } from '@/lib/db';
import { ManufacturerRepository } from './ManufacturerRepository';
import { ManufacturerService } from './ManufacturerService';

export * from './ManufacturerRepository';
export * from './ManufacturerService';

export const manufacturerRepository = new ManufacturerRepository(prisma);
export const manufacturerService = new ManufacturerService(prisma);
