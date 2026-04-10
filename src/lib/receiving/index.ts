import { prisma } from '@/lib/db';
import { ReceivingRepository } from './ReceivingRepository';
import { ReceivingService } from './ReceivingService';

export const receivingRepository = new ReceivingRepository(prisma);
export const receivingService = new ReceivingService(
  receivingRepository,
  prisma
);

export { ReceivingRepository } from './ReceivingRepository';
export { ReceivingService } from './ReceivingService';
export type { ReceivingSessionRecord } from './ReceivingRepository';
export type { PackingSlipExtraction, ExtractedLineItem } from './openai';
