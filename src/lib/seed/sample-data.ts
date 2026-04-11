import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_DATA_CONFIG_KEY = 'sample_data_ids';

interface SampleDataIds {
  vendors: string[];
  manufacturers: string[];
  categories: string[];
  items: string[];
  purchaseOrders: string[];
  purchaseOrderLines: string[];
  assets: string[];
  auditLogs: string[];
  notifications: string[];
}

interface SampleDataCounts {
  vendors: number;
  manufacturers: number;
  items: number;
  categories: number;
  orders: number;
  assets: number;
  auditLogs: number;
  notifications: number;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

export async function insertSampleData(
  prisma: PrismaClient,
  tenantId: string,
  userId: string
): Promise<SampleDataIds> {
  // Check if sample data is already loaded
  const existing = await prisma.systemConfig.findUnique({
    where: { key: `${SAMPLE_DATA_CONFIG_KEY}_${tenantId}` },
  });
  if (existing) {
    throw new Error('Sample data is already loaded for this tenant.');
  }

  const ids: SampleDataIds = {
    vendors: [],
    manufacturers: [],
    categories: [],
    items: [],
    purchaseOrders: [],
    purchaseOrderLines: [],
    assets: [],
    auditLogs: [],
    notifications: [],
  };

  // Audit log entries we collect as we go so the dashboard "recent activity"
  // widget has believable history the moment a fresh tenant lands.
  const auditEntries: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: string;
    createdAt: Date;
  }> = [];

  function recordAudit(
    action: string,
    entity: string,
    entityId: string,
    details: Record<string, unknown>,
    createdAt: Date,
  ) {
    const id = uuidv4();
    ids.auditLogs.push(id);
    auditEntries.push({
      id,
      action,
      entity,
      entityId,
      details: JSON.stringify(details),
      createdAt,
    });
  }

  // --- Vendors ---
  const vendorData = [
    { name: 'Dell Technologies', contactName: 'Michael Dell', email: 'sales@dell.com', phone: '1-800-999-3355', website: 'https://www.dell.com' },
    { name: 'Cisco Systems', contactName: 'Chuck Robbins', email: 'orders@cisco.com', phone: '1-800-553-6387', website: 'https://www.cisco.com' },
    { name: 'HP Inc.', contactName: 'Enrique Lores', email: 'hpsales@hp.com', phone: '1-800-474-6836', website: 'https://www.hp.com' },
    { name: 'Lenovo', contactName: 'Yang Yuanqing', email: 'sales@lenovo.com', phone: '1-855-253-6686', website: 'https://www.lenovo.com' },
    { name: 'Apple Inc.', contactName: 'Tim Cook', email: 'enterprise@apple.com', phone: '1-800-275-2273', website: 'https://www.apple.com' },
    { name: 'Logitech', contactName: 'Bracken Darrell', email: 'business@logitech.com', phone: '1-800-231-7717', website: 'https://www.logitech.com' },
  ];

  const vendors = [];
  for (const v of vendorData) {
    const id = uuidv4();
    ids.vendors.push(id);
    const createdAt = randomDate(new Date('2025-11-01'), new Date('2025-12-15'));
    const vendor = await prisma.vendor.create({
      data: { id, tenantId, ...v, createdAt },
    });
    vendors.push(vendor);
    recordAudit('CREATE', 'Vendor', id, { name: v.name }, createdAt);
  }

  // --- Manufacturers ---
  const manufacturerData = [
    { name: 'Dell', website: 'https://www.dell.com', supportUrl: 'https://www.dell.com/support', supportPhone: '1-800-624-9897', supportEmail: 'support@dell.com' },
    { name: 'HP', website: 'https://www.hp.com', supportUrl: 'https://support.hp.com', supportPhone: '1-800-474-6836', supportEmail: 'support@hp.com' },
    { name: 'Cisco', website: 'https://www.cisco.com', supportUrl: 'https://www.cisco.com/c/en/us/support/', supportPhone: '1-800-553-2447', supportEmail: 'tac@cisco.com' },
    { name: 'Apple', website: 'https://www.apple.com', supportUrl: 'https://support.apple.com', supportPhone: '1-800-275-2273', supportEmail: 'enterprise@apple.com' },
    { name: 'Lenovo', website: 'https://www.lenovo.com', supportUrl: 'https://support.lenovo.com', supportPhone: '1-855-253-6686', supportEmail: 'support@lenovo.com' },
    { name: 'Logitech', website: 'https://www.logitech.com', supportUrl: 'https://support.logitech.com', supportPhone: '1-646-454-3200', supportEmail: 'support@logitech.com' },
  ];

  const manufacturers = [];
  for (const m of manufacturerData) {
    const id = uuidv4();
    ids.manufacturers.push(id);
    const createdAt = randomDate(new Date('2025-11-01'), new Date('2025-12-15'));
    const created = await prisma.manufacturer.create({
      data: { id, tenantId, ...m, createdAt },
    });
    manufacturers.push(created);
    recordAudit('CREATE', 'Manufacturer', id, { name: m.name }, createdAt);
  }

  // --- Item Categories ---
  const categoryData = [
    { name: 'Laptops', description: 'Portable computing devices' },
    { name: 'Networking', description: 'Switches, routers, access points, and cabling' },
    { name: 'Peripherals', description: 'Keyboards, mice, monitors, and docking stations' },
    { name: 'Mobile Devices', description: 'Tablets, phones, and mobile accessories' },
    { name: 'Printers', description: 'Printers, scanners, and multifunction devices' },
  ];

  const categories = [];
  for (const c of categoryData) {
    const id = uuidv4();
    ids.categories.push(id);
    const createdAt = randomDate(new Date('2025-11-01'), new Date('2025-12-01'));
    const cat = await prisma.itemCategory.create({
      data: { id, tenantId, ...c, createdAt },
    });
    categories.push(cat);
    recordAudit('CREATE', 'ItemCategory', id, { name: c.name }, createdAt);
  }

  // --- Catalog Items (30 items) ---
  // Manufacturer indices: Dell=0, HP=1, Cisco=2, Apple=3, Lenovo=4, Logitech=5
  const itemsData = [
    // Laptops
    { name: 'Dell Latitude 5540', sku: 'SAMPLE-DEL-LAT-5540', vendorIdx: 0, mfgIdx: 0, mfgPN: 'LAT-5540-I7', catIdx: 0, unitCost: 1249.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Dell Latitude 7440', sku: 'SAMPLE-DEL-LAT-7440', vendorIdx: 0, mfgIdx: 0, mfgPN: 'LAT-7440-I7', catIdx: 0, unitCost: 1649.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Dell Precision 5680', sku: 'SAMPLE-DEL-PRE-5680', vendorIdx: 0, mfgIdx: 0, mfgPN: 'PRE-5680-XE', catIdx: 0, unitCost: 2399.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Lenovo ThinkPad T14s Gen 5', sku: 'SAMPLE-LEN-TP-T14S', vendorIdx: 3, mfgIdx: 4, mfgPN: '21LS0000US', catIdx: 0, unitCost: 1399.99, reorderPoint: 4, reorderQuantity: 8 },
    { name: 'Lenovo ThinkPad X1 Carbon Gen 12', sku: 'SAMPLE-LEN-TP-X1C12', vendorIdx: 3, mfgIdx: 4, mfgPN: '21KC0000US', catIdx: 0, unitCost: 1899.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple MacBook Pro 14" M4', sku: 'SAMPLE-APL-MBP-14M4', vendorIdx: 4, mfgIdx: 3, mfgPN: 'MX2E3LL/A', catIdx: 0, unitCost: 1999.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple MacBook Air 15" M3', sku: 'SAMPLE-APL-MBA-15M3', vendorIdx: 4, mfgIdx: 3, mfgPN: 'MRYM3LL/A', catIdx: 0, unitCost: 1299.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'HP EliteBook 860 G11', sku: 'SAMPLE-HP-EB-860G11', vendorIdx: 2, mfgIdx: 1, mfgPN: 'A26S5UT#ABA', catIdx: 0, unitCost: 1549.99, reorderPoint: 3, reorderQuantity: 5 },

    // Networking
    { name: 'Cisco Catalyst 9200L-24P Switch', sku: 'SAMPLE-CIS-C9200L-24P', vendorIdx: 1, mfgIdx: 2, mfgPN: 'C9200L-24P-4G-E', catIdx: 1, unitCost: 3299.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Cisco Catalyst 9300-48T Switch', sku: 'SAMPLE-CIS-C9300-48T', vendorIdx: 1, mfgIdx: 2, mfgPN: 'C9300-48T-E', catIdx: 1, unitCost: 5899.99, reorderPoint: 1, reorderQuantity: 2 },
    { name: 'Cisco Meraki MR46 Access Point', sku: 'SAMPLE-CIS-MR46', vendorIdx: 1, mfgIdx: 2, mfgPN: 'MR46-HW', catIdx: 1, unitCost: 899.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Cisco ISR 4331 Router', sku: 'SAMPLE-CIS-ISR4331', vendorIdx: 1, mfgIdx: 2, mfgPN: 'ISR4331/K9', catIdx: 1, unitCost: 2999.99, reorderPoint: 1, reorderQuantity: 2 },
    { name: 'Cisco SFP-10G-SR Transceiver', sku: 'SAMPLE-CIS-SFP10GSR', vendorIdx: 1, mfgIdx: 2, mfgPN: 'SFP-10G-SR', catIdx: 1, unitCost: 149.99, reorderPoint: 10, reorderQuantity: 20 },

    // Peripherals
    { name: 'Logitech MX Master 3S Mouse', sku: 'SAMPLE-LOG-MXM3S', vendorIdx: 5, mfgIdx: 5, mfgPN: '910-006556', catIdx: 2, unitCost: 99.99, reorderPoint: 10, reorderQuantity: 20 },
    { name: 'Logitech MX Keys S Keyboard', sku: 'SAMPLE-LOG-MXKS', vendorIdx: 5, mfgIdx: 5, mfgPN: '920-011406', catIdx: 2, unitCost: 109.99, reorderPoint: 10, reorderQuantity: 20 },
    { name: 'Logitech Brio 4K Webcam', sku: 'SAMPLE-LOG-BRIO4K', vendorIdx: 5, mfgIdx: 5, mfgPN: '960-001105', catIdx: 2, unitCost: 199.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Dell UltraSharp U2723QE 27" 4K Monitor', sku: 'SAMPLE-DEL-U2723QE', vendorIdx: 0, mfgIdx: 0, mfgPN: 'U2723QE', catIdx: 2, unitCost: 519.99, reorderPoint: 5, reorderQuantity: 8 },
    { name: 'Dell WD22TB4 Thunderbolt Dock', sku: 'SAMPLE-DEL-WD22TB4', vendorIdx: 0, mfgIdx: 0, mfgPN: 'WD22TB4', catIdx: 2, unitCost: 319.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'HP E27m G4 QHD USB-C Monitor', sku: 'SAMPLE-HP-E27M-G4', vendorIdx: 2, mfgIdx: 1, mfgPN: '40Z29AA#ABA', catIdx: 2, unitCost: 449.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Logitech Zone Wireless 2 Headset', sku: 'SAMPLE-LOG-ZW2', vendorIdx: 5, mfgIdx: 5, mfgPN: '981-001158', catIdx: 2, unitCost: 249.99, reorderPoint: 6, reorderQuantity: 12 },
    { name: 'Logitech C920s HD Pro Webcam', sku: 'SAMPLE-LOG-C920S', vendorIdx: 5, mfgIdx: 5, mfgPN: '960-001257', catIdx: 2, unitCost: 69.99, reorderPoint: 8, reorderQuantity: 15 },
    { name: 'Dell P2422H 24" FHD Monitor', sku: 'SAMPLE-DEL-P2422H', vendorIdx: 0, mfgIdx: 0, mfgPN: 'P2422H', catIdx: 2, unitCost: 239.99, reorderPoint: 8, reorderQuantity: 15 },

    // Mobile Devices
    { name: 'Apple iPad Pro 11" M4', sku: 'SAMPLE-APL-IPDP-11M4', vendorIdx: 4, mfgIdx: 3, mfgPN: 'MVV83LL/A', catIdx: 3, unitCost: 999.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Apple iPad Air 13" M2', sku: 'SAMPLE-APL-IPDA-13M2', vendorIdx: 4, mfgIdx: 3, mfgPN: 'MV2D3LL/A', catIdx: 3, unitCost: 799.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Apple iPhone 16 Pro', sku: 'SAMPLE-APL-IP16P', vendorIdx: 4, mfgIdx: 3, mfgPN: 'MYMN3LL/A', catIdx: 3, unitCost: 999.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple Pencil Pro', sku: 'SAMPLE-APL-PENCILP', vendorIdx: 4, mfgIdx: 3, mfgPN: 'MX2D3AM/A', catIdx: 3, unitCost: 129.99, reorderPoint: 5, reorderQuantity: 10 },

    // Printers
    { name: 'HP LaserJet Enterprise M611dn', sku: 'SAMPLE-HP-LJE-M611', vendorIdx: 2, mfgIdx: 1, mfgPN: '7PS84A', catIdx: 4, unitCost: 649.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'HP Color LaserJet Pro MFP M479fdw', sku: 'SAMPLE-HP-CLJ-M479', vendorIdx: 2, mfgIdx: 1, mfgPN: 'W1A80A', catIdx: 4, unitCost: 549.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'HP OfficeJet Pro 9130e', sku: 'SAMPLE-HP-OJP-9130', vendorIdx: 2, mfgIdx: 1, mfgPN: '4W2K0A', catIdx: 4, unitCost: 329.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'HP ScanJet Enterprise Flow 7500', sku: 'SAMPLE-HP-SJ-7500', vendorIdx: 2, mfgIdx: 1, mfgPN: 'L2725B', catIdx: 4, unitCost: 1199.99, reorderPoint: 1, reorderQuantity: 2 },
  ];

  const items = [];
  for (const item of itemsData) {
    const id = uuidv4();
    ids.items.push(id);
    const createdAt = randomDate(new Date('2025-12-01'), new Date('2026-01-15'));
    const created = await prisma.item.create({
      data: {
        id,
        tenantId,
        name: item.name,
        sku: item.sku,
        vendorId: vendors[item.vendorIdx].id,
        manufacturerId: manufacturers[item.mfgIdx].id,
        manufacturerPartNumber: item.mfgPN,
        categoryId: categories[item.catIdx].id,
        unitCost: item.unitCost,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        createdAt,
      },
    });
    items.push(created);
    recordAudit(
      'CREATE',
      'Item',
      id,
      { name: item.name, sku: item.sku },
      createdAt,
    );
  }

  // --- Purchase Orders (12 in various statuses) ---
  const poStatuses = [
    'DRAFT', 'DRAFT',
    'PENDING_APPROVAL', 'PENDING_APPROVAL', 'PENDING_APPROVAL', 'PENDING_APPROVAL', 'PENDING_APPROVAL',
    'APPROVED',
    'SUBMITTED',
    'PARTIALLY_RECEIVED',
    'RECEIVED', 'RECEIVED',
  ];

  for (let i = 0; i < poStatuses.length; i++) {
    const status = poStatuses[i];
    const vendor = vendors[i % vendors.length];
    const orderDate = randomDate(new Date('2025-11-01'), new Date('2026-04-09'));
    const lineCount = randomInt(2, 5);
    let totalAmount = 0;
    const lineData: Array<{ id: string; itemId: string; quantity: number; unitCost: number; receivedQty: number }> = [];

    for (let j = 0; j < lineCount; j++) {
      const item = items[(i * 4 + j) % items.length];
      const qty = randomInt(1, 8);
      const cost = item.unitCost || 500;
      totalAmount += qty * cost;
      const lineId = uuidv4();
      ids.purchaseOrderLines.push(lineId);
      lineData.push({
        id: lineId,
        itemId: item.id,
        quantity: qty,
        unitCost: cost,
        receivedQty: status === 'RECEIVED' ? qty : status === 'PARTIALLY_RECEIVED' ? Math.floor(qty / 2) : 0,
      });
    }

    const poId = uuidv4();
    ids.purchaseOrders.push(poId);

    await prisma.purchaseOrder.create({
      data: {
        id: poId,
        tenantId,
        orderNumber: `SAMPLE-PO-${String(9000 + i + 1)}`,
        status,
        vendorName: vendor.name,
        orderedById: userId,
        orderedAt: orderDate,
        expectedDate: new Date(orderDate.getTime() + randomInt(7, 30) * 86400000),
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes: '[SAMPLE] Demo purchase order',
        createdAt: orderDate,
      },
    });
    recordAudit(
      'CREATE',
      'PurchaseOrder',
      poId,
      { orderNumber: `SAMPLE-PO-${String(9000 + i + 1)}`, status, vendor: vendor.name, totalAmount },
      orderDate,
    );

    for (const line of lineData) {
      await prisma.purchaseOrderLine.create({
        data: {
          id: line.id,
          purchaseOrderId: poId,
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          receivedQty: line.receivedQty,
        },
      });
    }

    // Status transitions get their own audit rows so the activity feed
    // shows realistic workflow history (drafts moving through approval).
    if (status !== 'DRAFT') {
      const submittedAt = new Date(orderDate.getTime() + randomInt(1, 4) * 3600000);
      recordAudit('UPDATE', 'PurchaseOrder', poId, { status: 'PENDING_APPROVAL' }, submittedAt);
    }
    if (status === 'APPROVED' || status === 'SUBMITTED' || status === 'PARTIALLY_RECEIVED' || status === 'RECEIVED') {
      const approvedAt = new Date(orderDate.getTime() + randomInt(4, 24) * 3600000);
      recordAudit('UPDATE', 'PurchaseOrder', poId, { status: 'APPROVED' }, approvedAt);
    }
    if (status === 'PARTIALLY_RECEIVED' || status === 'RECEIVED') {
      const receivedAt = new Date(orderDate.getTime() + randomInt(5, 20) * 86400000);
      recordAudit('UPDATE', 'PurchaseOrder', poId, { status }, receivedAt);
    }
  }

  // Build map from itemId to all PO line IDs for traceability linking
  const poLinesByItem: Record<string, string[]> = {};
  const allPOLines = await prisma.purchaseOrderLine.findMany({
    where: { id: { in: ids.purchaseOrderLines } },
    select: { id: true, itemId: true },
  });
  for (const line of allPOLines) {
    if (!poLinesByItem[line.itemId]) poLinesByItem[line.itemId] = [];
    poLinesByItem[line.itemId].push(line.id);
  }

  // --- Assets (40 with mixed statuses) ---
  const assetStatuses = ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'];
  const locations = [
    'Warehouse A', 'Warehouse B', 'Office - Floor 1', 'Office - Floor 2',
    'Server Room', 'Conference Room A', 'IT Closet', 'Reception',
  ];
  const assignees = [
    'John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams',
    'Charlie Brown', 'Diana Prince', 'Eve Adams', 'Frank Castle',
  ];
  const conditions = ['New', 'Good', 'Fair', 'Needs Repair'];

  for (let i = 0; i < 40; i++) {
    const item = items[i % items.length];
    const status = i < 18
      ? 'AVAILABLE'
      : i < 28
        ? 'ASSIGNED'
        : i < 34
          ? 'IN_MAINTENANCE'
          : i < 38
            ? 'RETIRED'
            : 'LOST';
    const assignedTo = status === 'ASSIGNED' ? randomChoice(assignees) : null;
    const purchasedAt = randomDate(new Date('2024-01-01'), new Date('2026-03-01'));
    const assetId = uuidv4();
    ids.assets.push(assetId);

    // Link asset to a PO line for this item (provenance chain)
    const candidateLines = poLinesByItem[item.id];
    const poLineId = candidateLines && candidateLines.length > 0
      ? candidateLines[i % candidateLines.length]
      : null;

    await prisma.asset.create({
      data: {
        id: assetId,
        tenantId,
        itemId: item.id,
        purchaseOrderLineId: poLineId,
        assetTag: `SAMPLE-${String(10000 + i)}`,
        serialNumber: `SAMPLE-SN${uuidv4().slice(0, 8).toUpperCase()}`,
        status,
        condition: randomChoice(conditions),
        location: randomChoice(locations),
        assignedTo,
        notes: '[SAMPLE] Demo asset',
        purchasedAt,
        warrantyUntil: new Date(purchasedAt.getTime() + 3 * 365 * 86400000),
        createdAt: purchasedAt,
      },
    });
    recordAudit(
      'CREATE',
      'Asset',
      assetId,
      { assetTag: `SAMPLE-${String(10000 + i)}`, item: item.name, status },
      purchasedAt,
    );
    if (status === 'ASSIGNED' && assignedTo) {
      const assignedAt = new Date(purchasedAt.getTime() + randomInt(1, 30) * 86400000);
      recordAudit(
        'UPDATE',
        'Asset',
        assetId,
        { status: 'ASSIGNED', assignedTo },
        assignedAt,
      );
    }
  }

  // ---- Audit log batch insert ----
  if (auditEntries.length > 0) {
    await prisma.auditLog.createMany({
      data: auditEntries.map((e) => ({
        id: e.id,
        tenantId,
        userId,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        details: e.details,
        ipAddress: '127.0.0.1',
        createdAt: e.createdAt,
      })),
    });
  }

  // ---- Sample notifications ----
  const notificationTemplates = [
    { type: 'LOW_STOCK', title: 'Low stock: Cisco Meraki MR46 Access Point', message: '2 units remaining, reorder point is 5.', isRead: false },
    { type: 'LOW_STOCK', title: 'Low stock: Dell UltraSharp U2723QE', message: '3 units remaining, reorder point is 5.', isRead: false },
    { type: 'PO_APPROVED', title: 'Purchase order SAMPLE-PO-9008 approved', message: 'Your order has been approved and submitted to the vendor.', isRead: false },
    { type: 'PO_RECEIVED', title: 'Purchase order SAMPLE-PO-9011 fully received', message: 'All line items have been received and tagged into inventory.', isRead: true },
    { type: 'ASSET_ASSIGNED', title: 'Asset SAMPLE-10018 assigned to John Smith', message: 'Asset moved from AVAILABLE to ASSIGNED.', isRead: true },
    { type: 'SYSTEM', title: 'Welcome to your inventory platform', message: 'Sample data has been loaded. Explore the dashboard, vendors, inventory, and procurement to see the full workflow.', isRead: false },
  ];

  for (const n of notificationTemplates) {
    const id = uuidv4();
    ids.notifications.push(id);
    const createdAt = randomDate(new Date('2026-03-01'), new Date());
    await prisma.notification.create({
      data: {
        id,
        tenantId,
        userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt,
      },
    });
  }

  // Store the IDs in SystemConfig so we can remove them later
  await prisma.systemConfig.create({
    data: {
      id: uuidv4(),
      key: `${SAMPLE_DATA_CONFIG_KEY}_${tenantId}`,
      value: JSON.stringify(ids),
      category: 'sample_data',
      description: 'IDs of all sample data records for this tenant',
    },
  });

  return ids;
}

export async function removeSampleData(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  const configKey = `${SAMPLE_DATA_CONFIG_KEY}_${tenantId}`;
  const config = await prisma.systemConfig.findUnique({
    where: { key: configKey },
  });

  if (!config) {
    throw new Error('No sample data found for this tenant.');
  }

  const ids: SampleDataIds = JSON.parse(config.value);

  // Delete in correct order to respect foreign keys:
  // 0. Audit log entries (no FK constraints, but tracked so removal stays clean)
  if (ids.auditLogs && ids.auditLogs.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { id: { in: ids.auditLogs } },
    });
  }

  // 0b. Notifications
  if (ids.notifications && ids.notifications.length > 0) {
    await prisma.notification.deleteMany({
      where: { id: { in: ids.notifications } },
    });
  }

  // 1. Assets (references items)
  if (ids.assets.length > 0) {
    await prisma.asset.deleteMany({
      where: { id: { in: ids.assets } },
    });
  }

  // 2. Purchase order lines (references POs and items)
  if (ids.purchaseOrderLines.length > 0) {
    await prisma.purchaseOrderLine.deleteMany({
      where: { id: { in: ids.purchaseOrderLines } },
    });
  }

  // 3. Purchase orders
  if (ids.purchaseOrders.length > 0) {
    await prisma.purchaseOrder.deleteMany({
      where: { id: { in: ids.purchaseOrders } },
    });
  }

  // 4. Items (references vendors, manufacturers, and categories)
  if (ids.items.length > 0) {
    await prisma.item.deleteMany({
      where: { id: { in: ids.items } },
    });
  }

  // 5. Item categories
  if (ids.categories.length > 0) {
    await prisma.itemCategory.deleteMany({
      where: { id: { in: ids.categories } },
    });
  }

  // 6. Manufacturers
  if (ids.manufacturers && ids.manufacturers.length > 0) {
    await prisma.manufacturer.deleteMany({
      where: { id: { in: ids.manufacturers } },
    });
  }

  // 7. Vendors
  if (ids.vendors.length > 0) {
    await prisma.vendor.deleteMany({
      where: { id: { in: ids.vendors } },
    });
  }

  // 8. Remove the config entry
  await prisma.systemConfig.delete({
    where: { key: configKey },
  });
}

export async function getSampleDataStatus(
  prisma: PrismaClient,
  tenantId: string
): Promise<{ isLoaded: boolean; counts: SampleDataCounts }> {
  const configKey = `${SAMPLE_DATA_CONFIG_KEY}_${tenantId}`;
  const config = await prisma.systemConfig.findUnique({
    where: { key: configKey },
  });

  if (!config) {
    return {
      isLoaded: false,
      counts: {
        vendors: 0,
        manufacturers: 0,
        items: 0,
        categories: 0,
        orders: 0,
        assets: 0,
        auditLogs: 0,
        notifications: 0,
      },
    };
  }

  const ids: SampleDataIds = JSON.parse(config.value);

  return {
    isLoaded: true,
    counts: {
      vendors: ids.vendors.length,
      manufacturers: ids.manufacturers?.length ?? 0,
      items: ids.items.length,
      categories: ids.categories.length,
      orders: ids.purchaseOrders.length,
      assets: ids.assets.length,
      auditLogs: ids.auditLogs?.length ?? 0,
      notifications: ids.notifications?.length ?? 0,
    },
  };
}
