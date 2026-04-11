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
  {
    type: 'function',
    function: {
      name: 'listCategories',
      description:
        'List all item categories with the count of items in each category.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queryDatabase',
      description:
        'Execute a read-only database query. Use this for any question that the other functions cannot answer. Provide the model name and query parameters. Available models: asset, item, vendor, purchaseOrder, purchaseOrderLine, itemCategory, user, notification, auditLog. Queries are automatically scoped to the current tenant.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'The database model to query (e.g., asset, item, vendor, purchaseOrder, itemCategory)',
          },
          operation: {
            type: 'string',
            enum: ['findMany', 'count', 'groupBy'],
            description: 'The query operation to perform',
          },
          where: {
            type: 'object',
            description: 'Filter conditions as a JSON object matching Prisma where syntax',
          },
          select: {
            type: 'object',
            description: 'Fields to select (optional)',
          },
          include: {
            type: 'object',
            description: 'Relations to include (optional)',
          },
          orderBy: {
            type: 'object',
            description: 'Sort order (optional)',
          },
          take: {
            type: 'number',
            description: 'Limit number of results (default 20, max 50)',
          },
          groupByFields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Fields to group by (only for groupBy operation)',
          },
        },
        required: ['model', 'operation'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI assistant for an inventory management platform with FULL access to the database through function calls. You MUST use your available tools to answer every question. NEVER say you don't have access to data. You have these capabilities:

- searchInventory: Search assets by status, category name, or free-text. USE THIS for any question about inventory, assets, laptops, equipment, categories, etc.
- getOrderStatus: Look up purchase orders by number.
- getVendorInfo: Look up vendor details by name.
- getStats: Get dashboard statistics (total assets, counts by status, pending orders, active vendors).
- listCategories: Get all item categories with counts.
- assignAsset: Assign an asset to a user.
- queryDatabase: Run a custom Prisma query against any allowed model (asset, item, vendor, manufacturer, purchaseOrder, purchaseOrderLine, itemCategory, user, notification, auditLog).

DATABASE SCHEMA:
- asset: id, tenantId, itemId, purchaseOrderLineId, assetTag, serialNumber, status (AVAILABLE/ASSIGNED/IN_MAINTENANCE/RETIRED/LOST), condition, location, assignedTo, notes, purchasedAt, warrantyUntil. Relations: item (Item), purchaseOrderLine (PurchaseOrderLine)
- item: id, tenantId, name, sku, description, vendorId, manufacturerId, manufacturerPartNumber, categoryId, unitCost, reorderPoint, reorderQuantity, imageUrl, isActive. Relations: vendor (Vendor), manufacturer (Manufacturer), category (ItemCategory), assets (Asset[]), purchaseOrderLines (PurchaseOrderLine[])
- vendor: id, tenantId, name, contactName, email, phone, address, city, state, zip, country, website, notes, isActive, rating. Relations: items (Item[]), purchaseOrders (PurchaseOrder[])
- manufacturer: id, tenantId, name, website, supportUrl, supportPhone, supportEmail, notes, isActive. Relations: items (Item[])
- purchaseOrder: id, tenantId, orderNumber, status (DRAFT/PENDING_APPROVAL/APPROVED/SUBMITTED/PARTIALLY_RECEIVED/RECEIVED/CANCELLED), vendorName, notes, orderedById, orderedAt, expectedDate, totalAmount. Relations: lines (PurchaseOrderLine[]), orderedBy (User)
- purchaseOrderLine: id, purchaseOrderId, itemId, quantity, unitCost, receivedQty. Relations: purchaseOrder (PurchaseOrder), item (Item), assets (Asset[])
- itemCategory: id, tenantId, name, description, parentId. Relations: items (Item[])
- user: id, tenantId, email, name, role (ADMIN/MANAGER/WAREHOUSE_STAFF), isActive

KEY CONCEPTS:
- An "Item" is a catalog product (e.g., "Dell Latitude 5540"). Items have a reorder point.
- An "Asset" is an individual physical instance of an Item with its own serial number and asset tag.
- "Stock level" for an item = count of assets with status=AVAILABLE.
- "Low stock" = stock level < reorder point.
- A manufacturer makes the product (Dell). A vendor is who you buy from (could be Dell direct or a reseller like CDW).
- Each asset can trace back through purchaseOrderLine -> purchaseOrder -> vendor for full provenance.

CRITICAL RULES:
- ALWAYS call a function before answering. Do NOT guess or say you lack access.
- Use queryDatabase for complex queries that other functions cannot handle.
- For laptops, networking, etc., call searchInventory with category="Laptops" or use queryDatabase on item/asset.
- Present data clearly with counts and key details.

OUTPUT FORMAT:
- Respond with HTML, NOT markdown. The frontend renders your response as HTML.
- Use these HTML tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <code>
- For tables: <table class="ai-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>
- For lists: <ul><li>item</li></ul>
- Bold key info: <strong>important</strong>
- Keep responses concise. Use tables for tabular data, lists for short enumerations, plain paragraphs for explanations.
- DO NOT use markdown syntax (no #, *, |, backticks for code blocks). Use HTML only.`;

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

    // Read configured model from SystemConfig, fall back to gpt-5.4-nano
    const modelConfig = await (this.db as any).systemConfig.findUnique({
      where: { key: 'openai_model' },
    });
    const modelId = (modelConfig as { value?: string } | null)?.value || 'gpt-5.4-nano';

    let response = await openai.chat.completions.create({
      model: modelId,
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
        model: modelId,
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
      case 'listCategories':
        return this.listCategories(ctx);
      case 'queryDatabase':
        return this.queryDatabase(ctx, args);
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

  private async listCategories(ctx: TenantContext) {
    const categories = await this.db.itemCategory.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      count: categories.length,
      categories: categories.map((c) => ({
        name: c.name,
        description: c.description,
        itemCount: c._count.items,
      })),
    };
  }

  private async queryDatabase(
    ctx: TenantContext,
    args: Record<string, unknown>
  ) {
    const { model, operation, where, select, include, orderBy, take, groupByFields } = args as {
      model: string;
      operation: string;
      where?: Record<string, unknown>;
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      groupByFields?: string[];
    };

    // Validate model name to prevent arbitrary access
    const allowedModels = [
      'asset', 'item', 'vendor', 'purchaseOrder', 'purchaseOrderLine',
      'itemCategory', 'user', 'notification', 'auditLog',
    ];
    if (!allowedModels.includes(model)) {
      return { error: `Model "${model}" is not queryable. Allowed: ${allowedModels.join(', ')}` };
    }

    const prismaModel = (this.db as any)[model];
    if (!prismaModel) {
      return { error: `Model "${model}" not found` };
    }

    // Always scope to tenant
    const scopedWhere = { tenantId: ctx.tenantId, ...where };
    const limitedTake = Math.min(take || 20, 50);

    try {
      if (operation === 'count') {
        const count = await prismaModel.count({ where: scopedWhere });
        return { count };
      }

      if (operation === 'groupBy' && groupByFields) {
        const result = await prismaModel.groupBy({
          by: groupByFields,
          where: scopedWhere,
          _count: { id: true },
        });
        return { groups: result };
      }

      // findMany
      const queryArgs: Record<string, unknown> = {
        where: scopedWhere,
        take: limitedTake,
      };
      if (select) queryArgs.select = select;
      if (include) queryArgs.include = include;
      if (orderBy) queryArgs.orderBy = orderBy;

      const results = await prismaModel.findMany(queryArgs);
      return { count: results.length, data: results };
    } catch (err: any) {
      return { error: `Query failed: ${err.message}` };
    }
  }
}
