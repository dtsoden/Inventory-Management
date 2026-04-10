import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_DATA_CONFIG_KEY = 'sample_data_ids';

interface SampleDataIds {
  vendors: string[];
  categories: string[];
  items: string[];
  purchaseOrders: string[];
  purchaseOrderLines: string[];
  assets: string[];
}

interface SampleDataCounts {
  vendors: number;
  items: number;
  categories: number;
  orders: number;
  assets: number;
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
    categories: [],
    items: [],
    purchaseOrders: [],
    purchaseOrderLines: [],
    assets: [],
  };

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
    const vendor = await prisma.vendor.create({
      data: { id, tenantId, ...v },
    });
    vendors.push(vendor);
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
    const cat = await prisma.itemCategory.create({
      data: { id, tenantId, ...c },
    });
    categories.push(cat);
  }

  // --- Catalog Items (30 items) ---
  const itemsData = [
    // Laptops (Dell=0, Lenovo=3, Apple=4, HP=2)
    { name: 'Dell Latitude 5540', sku: 'SAMPLE-DEL-LAT-5540', vendorIdx: 0, catIdx: 0, unitCost: 1249.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Dell Latitude 7440', sku: 'SAMPLE-DEL-LAT-7440', vendorIdx: 0, catIdx: 0, unitCost: 1649.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Dell Precision 5680', sku: 'SAMPLE-DEL-PRE-5680', vendorIdx: 0, catIdx: 0, unitCost: 2399.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Lenovo ThinkPad T14s Gen 5', sku: 'SAMPLE-LEN-TP-T14S', vendorIdx: 3, catIdx: 0, unitCost: 1399.99, reorderPoint: 4, reorderQuantity: 8 },
    { name: 'Lenovo ThinkPad X1 Carbon Gen 12', sku: 'SAMPLE-LEN-TP-X1C12', vendorIdx: 3, catIdx: 0, unitCost: 1899.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple MacBook Pro 14" M4', sku: 'SAMPLE-APL-MBP-14M4', vendorIdx: 4, catIdx: 0, unitCost: 1999.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple MacBook Air 15" M3', sku: 'SAMPLE-APL-MBA-15M3', vendorIdx: 4, catIdx: 0, unitCost: 1299.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'HP EliteBook 860 G11', sku: 'SAMPLE-HP-EB-860G11', vendorIdx: 2, catIdx: 0, unitCost: 1549.99, reorderPoint: 3, reorderQuantity: 5 },

    // Networking (Cisco=1)
    { name: 'Cisco Catalyst 9200L-24P Switch', sku: 'SAMPLE-CIS-C9200L-24P', vendorIdx: 1, catIdx: 1, unitCost: 3299.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Cisco Catalyst 9300-48T Switch', sku: 'SAMPLE-CIS-C9300-48T', vendorIdx: 1, catIdx: 1, unitCost: 5899.99, reorderPoint: 1, reorderQuantity: 2 },
    { name: 'Cisco Meraki MR46 Access Point', sku: 'SAMPLE-CIS-MR46', vendorIdx: 1, catIdx: 1, unitCost: 899.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Cisco ISR 4331 Router', sku: 'SAMPLE-CIS-ISR4331', vendorIdx: 1, catIdx: 1, unitCost: 2999.99, reorderPoint: 1, reorderQuantity: 2 },
    { name: 'Cisco SFP-10G-SR Transceiver', sku: 'SAMPLE-CIS-SFP10GSR', vendorIdx: 1, catIdx: 1, unitCost: 149.99, reorderPoint: 10, reorderQuantity: 20 },

    // Peripherals (Logitech=5, Dell=0, HP=2)
    { name: 'Logitech MX Master 3S Mouse', sku: 'SAMPLE-LOG-MXM3S', vendorIdx: 5, catIdx: 2, unitCost: 99.99, reorderPoint: 10, reorderQuantity: 20 },
    { name: 'Logitech MX Keys S Keyboard', sku: 'SAMPLE-LOG-MXKS', vendorIdx: 5, catIdx: 2, unitCost: 109.99, reorderPoint: 10, reorderQuantity: 20 },
    { name: 'Logitech Brio 4K Webcam', sku: 'SAMPLE-LOG-BRIO4K', vendorIdx: 5, catIdx: 2, unitCost: 199.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Dell UltraSharp U2723QE 27" 4K Monitor', sku: 'SAMPLE-DEL-U2723QE', vendorIdx: 0, catIdx: 2, unitCost: 519.99, reorderPoint: 5, reorderQuantity: 8 },
    { name: 'Dell WD22TB4 Thunderbolt Dock', sku: 'SAMPLE-DEL-WD22TB4', vendorIdx: 0, catIdx: 2, unitCost: 319.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'HP E27m G4 QHD USB-C Monitor', sku: 'SAMPLE-HP-E27M-G4', vendorIdx: 2, catIdx: 2, unitCost: 449.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Logitech Zone Wireless 2 Headset', sku: 'SAMPLE-LOG-ZW2', vendorIdx: 5, catIdx: 2, unitCost: 249.99, reorderPoint: 6, reorderQuantity: 12 },
    { name: 'Logitech C920s HD Pro Webcam', sku: 'SAMPLE-LOG-C920S', vendorIdx: 5, catIdx: 2, unitCost: 69.99, reorderPoint: 8, reorderQuantity: 15 },
    { name: 'Dell P2422H 24" FHD Monitor', sku: 'SAMPLE-DEL-P2422H', vendorIdx: 0, catIdx: 2, unitCost: 239.99, reorderPoint: 8, reorderQuantity: 15 },

    // Mobile Devices (Apple=4)
    { name: 'Apple iPad Pro 11" M4', sku: 'SAMPLE-APL-IPDP-11M4', vendorIdx: 4, catIdx: 3, unitCost: 999.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Apple iPad Air 13" M2', sku: 'SAMPLE-APL-IPDA-13M2', vendorIdx: 4, catIdx: 3, unitCost: 799.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Apple iPhone 16 Pro', sku: 'SAMPLE-APL-IP16P', vendorIdx: 4, catIdx: 3, unitCost: 999.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple Pencil Pro', sku: 'SAMPLE-APL-PENCILP', vendorIdx: 4, catIdx: 3, unitCost: 129.99, reorderPoint: 5, reorderQuantity: 10 },

    // Printers (HP=2)
    { name: 'HP LaserJet Enterprise M611dn', sku: 'SAMPLE-HP-LJE-M611', vendorIdx: 2, catIdx: 4, unitCost: 649.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'HP Color LaserJet Pro MFP M479fdw', sku: 'SAMPLE-HP-CLJ-M479', vendorIdx: 2, catIdx: 4, unitCost: 549.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'HP OfficeJet Pro 9130e', sku: 'SAMPLE-HP-OJP-9130', vendorIdx: 2, catIdx: 4, unitCost: 329.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'HP ScanJet Enterprise Flow 7500', sku: 'SAMPLE-HP-SJ-7500', vendorIdx: 2, catIdx: 4, unitCost: 1199.99, reorderPoint: 1, reorderQuantity: 2 },
  ];

  const items = [];
  for (const item of itemsData) {
    const id = uuidv4();
    ids.items.push(id);
    const created = await prisma.item.create({
      data: {
        id,
        tenantId,
        name: item.name,
        sku: item.sku,
        vendorId: vendors[item.vendorIdx].id,
        categoryId: categories[item.catIdx].id,
        unitCost: item.unitCost,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
      },
    });
    items.push(created);
  }

  // --- Purchase Orders (8 in various statuses) ---
  const poStatuses = [
    'DRAFT', 'DRAFT',
    'PENDING_APPROVAL',
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

    await prisma.asset.create({
      data: {
        id: assetId,
        tenantId,
        itemId: item.id,
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

  // 4. Items (references vendors and categories)
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

  // 6. Vendors
  if (ids.vendors.length > 0) {
    await prisma.vendor.deleteMany({
      where: { id: { in: ids.vendors } },
    });
  }

  // 7. Remove the config entry
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
      counts: { vendors: 0, items: 0, categories: 0, orders: 0, assets: 0 },
    };
  }

  const ids: SampleDataIds = JSON.parse(config.value);

  return {
    isLoaded: true,
    counts: {
      vendors: ids.vendors.length,
      items: ids.items.length,
      categories: ids.categories.length,
      orders: ids.purchaseOrders.length,
      assets: ids.assets.length,
    },
  };
}
