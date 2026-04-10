import { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { ItemRepository, ItemRecord } from './ItemRepository';

export class ItemService extends BaseService<ItemRecord> {
  constructor(repository: ItemRepository, prisma: PrismaClient) {
    super(repository, prisma);
  }

  protected get entityName(): string {
    return 'Item';
  }
}
