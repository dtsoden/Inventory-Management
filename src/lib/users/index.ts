import { prisma } from '@/lib/db';
import { UserRepository } from './UserRepository';
import { UserService } from './UserService';

export * from './UserRepository';
export * from './UserService';

export const userRepository = new UserRepository(prisma);
export const userService = new UserService(prisma);
