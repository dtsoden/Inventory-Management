import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { ChatRepository } from '@/lib/assistant/ChatRepository';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';
import { NotFoundError } from '@/lib/errors';

class ConversationDetailHandler extends BaseApiHandler {
  private repo = new ChatRepository(prisma);

  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').pop()!;
    const conversation = await this.repo.getConversation(ctx.tenantId, id);
    if (!conversation) {
      throw new NotFoundError('Conversation', id);
    }
    return this.success(conversation);
  }

  protected async onDelete(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').pop()!;
    const deleted = await this.repo.deleteConversation(ctx.tenantId, id);
    if (!deleted) {
      throw new NotFoundError('Conversation', id);
    }
    return this.successMessage('Conversation deleted');
  }
}

const handler = new ConversationDetailHandler();

export const GET = handler.handle('GET');
export const DELETE = handler.handle('DELETE');
