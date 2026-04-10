import { PrismaClient } from '@prisma/client';

export class ChatRepository {
  constructor(private db: PrismaClient) {}

  async listConversations(tenantId: string, userId: string) {
    return this.db.chatConversation.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
    });
  }

  async getConversation(tenantId: string, conversationId: string) {
    return this.db.chatConversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createConversation(tenantId: string, userId: string, title?: string) {
    return this.db.chatConversation.create({
      data: {
        tenantId,
        userId,
        title: title || 'New Conversation',
      },
    });
  }

  async addMessage(
    conversationId: string,
    role: string,
    content: string,
    metadata?: string
  ) {
    const message = await this.db.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata || null,
      },
    });

    // Touch the conversation's updatedAt
    await this.db.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async deleteConversation(tenantId: string, conversationId: string) {
    // Verify ownership before deleting
    const convo = await this.db.chatConversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!convo) return null;

    await this.db.chatConversation.delete({
      where: { id: conversationId },
    });
    return convo;
  }

  async updateTitle(conversationId: string, title: string) {
    return this.db.chatConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }
}
