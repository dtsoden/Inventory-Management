import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { AssistantService } from '@/lib/assistant/AssistantService';
import { ChatRepository } from '@/lib/assistant/ChatRepository';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';
import { NotFoundError, ValidationError } from '@/lib/errors';

class MessagesHandler extends BaseApiHandler {
  private assistant = new AssistantService(prisma);
  private repo = new ChatRepository(prisma);

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    // Extract conversation ID from the URL path
    const segments = req.nextUrl.pathname.split('/');
    const messagesIdx = segments.indexOf('messages');
    const conversationId = segments[messagesIdx - 1];

    // Verify the conversation exists and belongs to this tenant
    const conversation = await this.repo.getConversation(
      ctx.tenantId,
      conversationId
    );
    if (!conversation) {
      throw new NotFoundError('Conversation', conversationId);
    }

    const body = await req.json();
    const message = body.message?.trim();
    if (!message) {
      throw new ValidationError('Message is required', {
        message: 'Message cannot be empty',
      });
    }

    const response = await this.assistant.chat(ctx, conversationId, message);
    return this.success(response);
  }
}

const handler = new MessagesHandler();

export const POST = handler.handle('POST');
