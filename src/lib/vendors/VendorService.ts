import { PrismaClient } from '@prisma/client';
import { BaseService } from '../base/BaseService';
import { TenantContext, PaginatedResult } from '../types';
import { ValidationError } from '../errors';
import { VendorRepository } from './VendorRepository';
import { FindAllOptions } from '../base/BaseRepository';

export class VendorService extends BaseService<any> {
  protected get entityName() {
    return 'Vendor';
  }

  constructor(prisma: PrismaClient) {
    const repository = new VendorRepository(prisma);
    super(repository, prisma);
  }

  async search(
    ctx: TenantContext,
    query: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<any>> {
    const where: Record<string, unknown> = {};
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { email: { contains: query } },
        { contactName: { contains: query } },
      ];
    }
    return this.list(ctx, { ...options, where });
  }

  async findByRating(
    ctx: TenantContext,
    minRating: number,
    options?: FindAllOptions
  ): Promise<PaginatedResult<any>> {
    return this.list(ctx, {
      ...options,
      where: { rating: { gte: minRating } },
    });
  }

  async updateRating(
    ctx: TenantContext,
    id: string,
    rating: number
  ): Promise<any> {
    if (rating < 0 || rating > 5) {
      throw new ValidationError('Rating must be between 0 and 5', {
        rating: 'Must be between 0 and 5',
      });
    }
    return this.update(ctx, id, { rating });
  }

  async validateVendorData(data: Record<string, unknown>): Promise<void> {
    const errors: Record<string, string> = {};

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email as string)) {
        errors.email = 'Invalid email format';
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }
}
