import { prisma } from '@/lib/db';
import { NotificationRepository } from './NotificationRepository';
import { NotificationService } from './NotificationService';

export * from './NotificationRepository';
export * from './NotificationService';

export const notificationRepository = new NotificationRepository(prisma);
export const notificationService = new NotificationService(prisma);
