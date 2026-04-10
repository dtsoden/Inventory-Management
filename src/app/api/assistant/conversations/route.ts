import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { ChatRepository } from '@/lib/assistant/ChatRepository';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';

class ConversationsHandler extends BaseApiHandler {
  private repo = new ChatRepository(prisma);

  protected async onGet(
    _req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const conversations = await this.repo.listConversations(
      ctx.tenantId,
      ctx.userId
    );
    return this.success(conversations);
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const conversation = await this.repo.createConversation(
      ctx.tenantId,
      ctx.userId,
      body.title
    );
    return this.success(conversation, 201);
  }
}

const handler = new ConversationsHandler();

export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
