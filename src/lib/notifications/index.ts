import { prisma } from '@/lib/db';
import { NotificationRepository } from './NotificationRepository';
import { NotificationService } from './NotificationService';
import { NotificationPreferenceService } from './NotificationPreferenceService';

export * from './NotificationRepository';
export * from './NotificationService';
export * from './NotificationPreferenceService';

export const notificationRepository = new NotificationRepository(prisma);
export const notificationService = new NotificationService(prisma);
export const notificationPreferenceService = new NotificationPreferenceService(prisma);
