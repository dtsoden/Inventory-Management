import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { receivingService } from '@/lib/receiving';
import { prisma } from '@/lib/db';

class TagHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const idIndex = segments.indexOf('receiving') + 1;
    const sessionId = segments[idIndex];

    const body = await req.json();
    const { itemId, itemName, assetTag, serialNumber } = body;

    if (!assetTag) {
      return NextResponse.json(
        { success: false, error: 'assetTag is required' },
        { status: 400 }
      );
    }

    let resolvedItemId = itemId;

    // If no itemId was provided, resolve from itemName
    if (!resolvedItemId && itemName) {
      // Try a case-insensitive name match
      const matched = await prisma.item.findFirst({
        where: {
          tenantId: ctx.tenantId,
          name: { contains: itemName },
          isActive: true,
        },
        select: { id: true },
      });

      if (matched) {
        resolvedItemId = matched.id;
      } else {
        // Fallback: use the first active item in the tenant catalog
        const fallback = await prisma.item.findFirst({
          where: { tenantId: ctx.tenantId, isActive: true },
          select: { id: true },
        });

        if (fallback) {
          resolvedItemId = fallback.id;
        } else {
          // Last resort: create a new item from the extracted name
          const newItem = await prisma.item.create({
            data: {
              tenantId: ctx.tenantId,
              name: itemName,
            },
          });
          resolvedItemId = newItem.id;
        }
      }
    }

    if (!resolvedItemId) {
      return NextResponse.json(
        { success: false, error: 'itemId or itemName is required' },
        { status: 400 }
      );
    }

    const asset = await receivingService.tagAsset(ctx, sessionId, {
      itemId: resolvedItemId,
      assetTag,
      serialNumber,
    });

    return this.success(asset, 201);
  }
}

const handler = new TagHandler();
export const POST = handler.handle('POST');
