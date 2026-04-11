import { prisma } from '@/lib/db';
import { AuditLogRepository } from './AuditLogRepository';
import { AuditLogService } from './AuditLogService';

export * from './AuditLogRepository';
export * from './AuditLogService';

export const auditLogRepository = new AuditLogRepository(prisma);
export const auditLogService = new AuditLogService(prisma);
