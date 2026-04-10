import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { PrismaClient } from '@prisma/client';
import { ChatRepository } from './ChatRepository';
import type { TenantContext } from '@/lib/types';

// OpenAI function definitions for the inventory assistant
const functionDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchInventory',
      description:
        'Search inventory assets by status, category, or free-text query. Returns matching assets with their details.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description:
              'Filter by asset status: AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, or LOST',
          },
          category: {
            type: 'string',
            description: 'Filter by category name (partial match)',
          },
          query: {
            type: 'string',
            description:
              'Free-text search across asset tags, serial numbers, item names, and locations',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getOrderStatus',
      description:
        'Look up a purchase order by its order number and return its current status and line items.',
      parameters: {
        type: 'object',
        properties: {
          orderNumber: {
            type: 'string',
            description: 'The purchase order number to look up',
          },
        },
        required: ['orderNumber'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getVendorInfo',
      description:
        'Look up vendor details by name (partial match). Returns contact info and associated items.',
      parameters: {
        type: 'object',
        properties: {
          vendorName: {
            type: 'string',
            description: 'The vendor name to search for (partial match)',
          },
        },
        required: ['vendorName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getStats',
      description:
        'Get dashboard-level statistics: total assets, assets by status, pending orders, active vendors, and low stock alerts.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assignAsset',
      description:
        'Assign an available asset to a user by asset tag and user email. The asset must be in AVAILABLE status.',
      parameters: {
        type: 'object',
        properties: {
          assetTag: {
            type: 'string',
            description: 'The asset tag of the asset to assign',
          },
          userEmail: {
            type: 'string',
            description: 'The email address of the user to assign the asset to',
          },
        },
        required: ['assetTag', 'userEmail'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI assistant for an inventory management platform. You help users search inventory, check order statuses, look up vendor information, view dashboard statistics, and assign assets.

Guidelines:
- Be concise and professional.
- When presenting data, use clear formatting with bullet points or short tables.
- If a search returns no results, suggest alternative queries.
- For asset assignment, confirm the action was completed successfully or explain any errors.
- Always scope your answers to the user's tenant data; never reference other tenants.
- If asked about something outside inventory management, politely redirect the conversation.
- Use markdown formatting for readability (bold, lists, code blocks for IDs/tags).`;

export class AssistantService {
  private repo: ChatRepository;
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
    this.repo = new ChatRepository(db);
  }

  async chat(ctx: TenantContext, conversationId: string, userMessage: string) {
    // 1. Save user message
    await this.repo.addMessage(conversationId, 'USER', userMessage);

    // 2. Build message history
    const conversation = await this.repo.getConversation(
      ctx.tenantId,
      conversationId
    );
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation.messages.map((m) => ({
        role: (m.role === 'USER'
          ? 'user'
          : m.role === 'SYSTEM'
            ? 'system'
            : 'assistant') as 'user' | 'system' | 'assistant',
        content: m.content,
      })),
    ];

    // 3. Call OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: functionDefinitions,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0]?.message;

    // 4. Handle function calls (loop for multiple tool calls)
    while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add the assistant's message with tool_calls to history
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each function call and add results
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments);
        const result = await this.executeFunction(ctx, fnName, fnArgs);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Call OpenAI again with function results
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: functionDefinitions,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0]?.message;
    }

    const responseContent =
      assistantMessage?.content || 'I was unable to generate a response.';

    // 5. Save assistant response
    await this.repo.addMessage(conversationId, 'ASSISTANT', responseContent);

    // Auto-title the conversation if it is still the default
    if (conversation.title === 'New Conversation') {
      const shortTitle = userMessage.slice(0, 60);
      await this.repo.updateTitle(
        conversationId,
        shortTitle + (userMessage.length > 60 ? '...' : '')
      );
    }

    return { role: 'ASSISTANT', content: responseContent };
  }

  private async executeFunction(
    ctx: TenantContext,
    fnName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    switch (fnName) {
      case 'searchInventory':
        return this.searchInventory(ctx, args);
      case 'getOrderStatus':
        return this.getOrderStatus(ctx, args);
      case 'getVendorInfo':
        return this.getVendorInfo(ctx, args);
      case 'getStats':
        return this.getStats(ctx);
      case 'assignAsset':
        return this.assignAsset(ctx, args);
      default:
        return { error: `Unknown function: ${fnName}` };
    }
  }

  private async searchInventory(
    ctx: TenantContext,
    args: Record<string, unknown>
  ) {
    const { status, category, query } = args as {
      status?: string;
      category?: string;
      query?: string;
    };

    const where: Record<string, unknown> = { tenantId: ctx.tenantId };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (category) {
      where.item = {
        category: {
          name: { contains: category },
        },
      };
    }

    if (query) {
      where.OR = [
        { assetTag: { contains: query } },
        { serialNumber: { contains: query } },
        { location: { contains: query } },
        { item: { name: { contains: query } } },
      ];
    }

    const assets = await this.db.asset.findMany({
      where,
      include: {
        item: {
          select: { name: true, sku: true, category: { select: { name: true } } },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      count: assets.length,
      assets: assets.map((a) => ({
        assetTag: a.assetTag,
        serialNumber: a.serialNumber,
        itemName: a.item.name,
        sku: a.item.sku,
        category: a.item.category?.name || 'Uncategorized',
        status: a.status,
        location: a.location,
        assignedTo: a.assignedTo,
        condition: a.condition,
      })),
    };
  }

  private async getOrderStatus(
    ctx: TenantContext,
    args: Record<string, unknown>
  ) {
    const { orderNumber } = args as { orderNumber: string };

    const order = await this.db.purchaseOrder.findFirst({
      where: {
        tenantId: ctx.tenantId,
        orderNumber: { contains: orderNumber },
      },
      include: {
        lines: {
          include: {
            item: { select: { name: true, sku: true } },
          },
        },
      },
    });

    if (!order) {
      return { error: `No purchase order found matching "${orderNumber}"` };
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      vendorName: order.vendorName,
      totalAmount: order.totalAmount,
      orderedAt: order.orderedAt?.toISOString(),
      expectedDate: order.expectedDate?.toISOString(),
      notes: order.notes,
      lines: order.lines.map((l) => ({
        itemName: l.item.name,
        sku: l.item.sku,
        quantity: l.quantity,
        receivedQty: l.receivedQty,
        unitCost: l.unitCost,
      })),
    };
  }

  private async getVendorInfo(
    ctx: TenantContext,
    args: Record<string, unknown>
  ) {
    const { vendorName } = args as { vendorName: string };

    const vendors = await this.db.vendor.findMany({
      where: {
        tenantId: ctx.tenantId,
        name: { contains: vendorName },
      },
      include: {
        items: {
          select: { name: true, sku: true },
          take: 10,
        },
      },
      take: 5,
    });

    if (vendors.length === 0) {
      return { error: `No vendors found matching "${vendorName}"` };
    }

    return vendors.map((v) => ({
      name: v.name,
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      website: v.website,
      isActive: v.isActive,
      itemCount: v.items.length,
      items: v.items.map((i) => ({ name: i.name, sku: i.sku })),
    }));
  }

  private async getStats(ctx: TenantContext) {
    const [totalAssets, assetsByStatus, pendingOrders, activeVendors] =
      await Promise.all([
        this.db.asset.count({ where: { tenantId: ctx.tenantId } }),
        this.db.asset.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId },
          _count: { id: true },
        }),
        this.db.purchaseOrder.count({
          where: {
            tenantId: ctx.tenantId,
            status: {
              in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'],
            },
          },
        }),
        this.db.vendor.count({
          where: { tenantId: ctx.tenantId, isActive: true },
        }),
      ]);

    return {
      totalAssets,
      assetsByStatus: assetsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      pendingOrders,
      activeVendors,
    };
  }

  private async assignAsset(
    ctx: TenantContext,
    args: Record<string, unknown>
  ) {
    const { assetTag, userEmail } = args as {
      assetTag: string;
      userEmail: string;
    };

    // Find the asset
    const asset = await this.db.asset.findFirst({
      where: {
        tenantId: ctx.tenantId,
        assetTag,
      },
      include: { item: { select: { name: true } } },
    });

    if (!asset) {
      return { error: `No asset found with tag "${assetTag}"` };
    }

    if (asset.status !== 'AVAILABLE') {
      return {
        error: `Asset "${assetTag}" is currently ${asset.status} and cannot be assigned`,
      };
    }

    // Verify the target user exists in the same tenant
    const targetUser = await this.db.user.findFirst({
      where: {
        tenantId: ctx.tenantId,
        email: userEmail,
      },
    });

    if (!targetUser) {
      return { error: `No user found with email "${userEmail}" in your organization` };
    }

    // Perform the assignment
    await this.db.asset.update({
      where: { id: asset.id },
      data: {
        status: 'ASSIGNED',
        assignedTo: targetUser.name,
      },
    });

    return {
      success: true,
      message: `Asset "${assetTag}" (${asset.item.name}) has been assigned to ${targetUser.name} (${userEmail})`,
    };
  }
}
