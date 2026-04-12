import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { actionItemService } from '@/lib/tasks';

class TasksHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const items = await actionItemService.getActionItems(ctx);
    return this.success({ items, total: items.length });
  }
}

const handler = new TasksHandler();
export const GET = handler.handle('GET');
