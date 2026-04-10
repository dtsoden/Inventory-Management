import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { receivingService } from '@/lib/receiving';

class ReceivingHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const pagination = this.getPagination(req);
    const sort = this.getSort(req);
    const status = req.nextUrl.searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const result = await receivingService.list(ctx, {
      pagination,
      sort,
      where,
    });
    return this.success(result);
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const body = await req.json();
    const { purchaseOrderId } = body;

    if (!purchaseOrderId) {
      return NextResponse.json(
        { success: false, error: 'purchaseOrderId is required' },
        { status: 400 }
      );
    }

    const session = await receivingService.startSession(ctx, purchaseOrderId);
    return this.success(session, 201);
  }
}

const handler = new ReceivingHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
