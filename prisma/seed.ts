import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const adapter = new PrismaLibSql({ url: 'file:./data/inventory.db' });
const prisma = new PrismaClient({ adapter });

const PASSWORD_HASH = bcrypt.hashSync('password123', 10);

// Helper to generate random dates within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.receivingSession.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.item.deleteMany();
  await prisma.itemCategory.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('Cleared existing data.');

  // --- Tenants ---
  const acme = await prisma.tenant.create({
    data: {
      id: uuidv4(),
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });

  const globex = await prisma.tenant.create({
    data: {
      id: uuidv4(),
      name: 'Globex Industries',
      slug: 'globex',
    },
  });

  console.log('Created tenants: Acme Corporation, Globex Industries');

  // --- Users ---
  const acmeUsers = await Promise.all([
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        name: 'Shane Admin',
        email: 'shane@acme.com',
        passwordHash: PASSWORD_HASH,
        role: 'ADMIN',
        lastLoginAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        name: 'Maria Garcia',
        email: 'maria@acme.com',
        passwordHash: PASSWORD_HASH,
        role: 'ADMIN',
        lastLoginAt: randomDate(new Date('2026-03-01'), new Date()),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        name: 'James Wilson',
        email: 'james@acme.com',
        passwordHash: PASSWORD_HASH,
        role: 'MANAGER',
        lastLoginAt: randomDate(new Date('2026-03-15'), new Date()),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        name: 'Priya Patel',
        email: 'priya@acme.com',
        passwordHash: PASSWORD_HASH,
        role: 'MANAGER',
        lastLoginAt: randomDate(new Date('2026-03-20'), new Date()),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        name: 'Tom Martinez',
        email: 'tom@acme.com',
        passwordHash: PASSWORD_HASH,
        role: 'WAREHOUSE_STAFF',
        lastLoginAt: randomDate(new Date('2026-04-01'), new Date()),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        name: 'Lisa Chen',
        email: 'lisa@acme.com',
        passwordHash: PASSWORD_HASH,
        role: 'WAREHOUSE_STAFF',
        lastLoginAt: randomDate(new Date('2026-04-01'), new Date()),
      },
    }),
  ]);

  const globexUsers = await Promise.all([
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: globex.id,
        name: 'Hank Scorpio',
        email: 'hank@globex.com',
        passwordHash: PASSWORD_HASH,
        role: 'ADMIN',
        lastLoginAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: globex.id,
        name: 'Frank Grimes',
        email: 'frank@globex.com',
        passwordHash: PASSWORD_HASH,
        role: 'ADMIN',
        lastLoginAt: randomDate(new Date('2026-03-01'), new Date()),
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        tenantId: globex.id,
        name: 'Mindy Simmons',
        email: 'mindy@globex.com',
        passwordHash: PASSWORD_HASH,
        role: 'WAREHOUSE_STAFF',
        lastLoginAt: randomDate(new Date('2026-03-15'), new Date()),
      },
    }),
  ]);

  console.log(`Created ${acmeUsers.length + globexUsers.length} users`);

  // --- Vendors (Acme) ---
  const vendorData = [
    { name: 'Dell Technologies', contactName: 'Michael Dell', email: 'sales@dell.com', phone: '1-800-999-3355', website: 'https://www.dell.com' },
    { name: 'Cisco Systems', contactName: 'Chuck Robbins', email: 'orders@cisco.com', phone: '1-800-553-6387', website: 'https://www.cisco.com' },
    { name: 'Ubiquiti Networks', contactName: 'Robert Pera', email: 'sales@ui.com', phone: '1-408-942-1450', website: 'https://www.ui.com' },
    { name: 'HP Inc.', contactName: 'Enrique Lores', email: 'hpsales@hp.com', phone: '1-800-474-6836', website: 'https://www.hp.com' },
    { name: 'Lenovo', contactName: 'Yang Yuanqing', email: 'sales@lenovo.com', phone: '1-855-253-6686', website: 'https://www.lenovo.com' },
    { name: 'Apple Inc.', contactName: 'Tim Cook', email: 'enterprise@apple.com', phone: '1-800-275-2273', website: 'https://www.apple.com' },
    { name: 'Logitech', contactName: 'Bracken Darrell', email: 'business@logitech.com', phone: '1-800-231-7717', website: 'https://www.logitech.com' },
    { name: 'APC by Schneider Electric', contactName: 'Jean-Pascal Tricoire', email: 'apc-orders@se.com', phone: '1-800-800-4272', website: 'https://www.apc.com' },
  ];

  const vendors = await Promise.all(
    vendorData.map((v) =>
      prisma.vendor.create({
        data: {
          id: uuidv4(),
          tenantId: acme.id,
          ...v,
        },
      })
    )
  );

  console.log(`Created ${vendors.length} vendors`);

  // --- Item Categories (Acme) ---
  const categoryData = [
    { name: 'Laptops', description: 'Portable computing devices' },
    { name: 'Networking', description: 'Switches, routers, access points, and cabling' },
    { name: 'Peripherals', description: 'Keyboards, mice, monitors, and docking stations' },
    { name: 'Mobile', description: 'Tablets, phones, and mobile accessories' },
    { name: 'Power/UPS', description: 'Uninterruptible power supplies and surge protectors' },
    { name: 'Printers', description: 'Printers, scanners, and multifunction devices' },
  ];

  const categories = await Promise.all(
    categoryData.map((c) =>
      prisma.itemCategory.create({
        data: {
          id: uuidv4(),
          tenantId: acme.id,
          ...c,
        },
      })
    )
  );

  console.log(`Created ${categories.length} item categories`);

  // --- Catalog Items (Acme) ---
  const itemsData = [
    // Laptops (Dell, Lenovo, Apple, HP)
    { name: 'Dell Latitude 5540', sku: 'DEL-LAT-5540', vendorIdx: 0, catIdx: 0, unitCost: 1249.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Dell Latitude 7440', sku: 'DEL-LAT-7440', vendorIdx: 0, catIdx: 0, unitCost: 1649.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Dell Precision 5680', sku: 'DEL-PRE-5680', vendorIdx: 0, catIdx: 0, unitCost: 2399.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Lenovo ThinkPad T14s Gen 5', sku: 'LEN-TP-T14S', vendorIdx: 4, catIdx: 0, unitCost: 1399.99, reorderPoint: 4, reorderQuantity: 8 },
    { name: 'Lenovo ThinkPad X1 Carbon Gen 12', sku: 'LEN-TP-X1C12', vendorIdx: 4, catIdx: 0, unitCost: 1899.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple MacBook Pro 14" M4', sku: 'APL-MBP-14M4', vendorIdx: 5, catIdx: 0, unitCost: 1999.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple MacBook Air 15" M3', sku: 'APL-MBA-15M3', vendorIdx: 5, catIdx: 0, unitCost: 1299.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'HP EliteBook 860 G11', sku: 'HP-EB-860G11', vendorIdx: 3, catIdx: 0, unitCost: 1549.99, reorderPoint: 3, reorderQuantity: 5 },

    // Networking (Cisco, Ubiquiti)
    { name: 'Cisco Catalyst 9200L-24P Switch', sku: 'CIS-C9200L-24P', vendorIdx: 1, catIdx: 1, unitCost: 3299.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Cisco Catalyst 9300-48T Switch', sku: 'CIS-C9300-48T', vendorIdx: 1, catIdx: 1, unitCost: 5899.99, reorderPoint: 1, reorderQuantity: 2 },
    { name: 'Cisco Meraki MR46 Access Point', sku: 'CIS-MR46', vendorIdx: 1, catIdx: 1, unitCost: 899.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Ubiquiti UniFi U7 Pro AP', sku: 'UBQ-U7PRO', vendorIdx: 2, catIdx: 1, unitCost: 189.99, reorderPoint: 8, reorderQuantity: 15 },
    { name: 'Ubiquiti UniFi Switch Pro 24 PoE', sku: 'UBQ-USW24POE', vendorIdx: 2, catIdx: 1, unitCost: 499.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Ubiquiti UniFi Dream Machine Pro', sku: 'UBQ-UDMPRO', vendorIdx: 2, catIdx: 1, unitCost: 379.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'Cisco ISR 4331 Router', sku: 'CIS-ISR4331', vendorIdx: 1, catIdx: 1, unitCost: 2999.99, reorderPoint: 1, reorderQuantity: 2 },

    // Peripherals (Logitech, Dell, HP)
    { name: 'Logitech MX Master 3S Mouse', sku: 'LOG-MXM3S', vendorIdx: 6, catIdx: 2, unitCost: 99.99, reorderPoint: 10, reorderQuantity: 20 },
    { name: 'Logitech MX Keys S Keyboard', sku: 'LOG-MXKS', vendorIdx: 6, catIdx: 2, unitCost: 109.99, reorderPoint: 10, reorderQuantity: 20 },
    { name: 'Logitech Brio 4K Webcam', sku: 'LOG-BRIO4K', vendorIdx: 6, catIdx: 2, unitCost: 199.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Dell UltraSharp U2723QE 27" 4K Monitor', sku: 'DEL-U2723QE', vendorIdx: 0, catIdx: 2, unitCost: 519.99, reorderPoint: 5, reorderQuantity: 8 },
    { name: 'Dell WD22TB4 Thunderbolt Dock', sku: 'DEL-WD22TB4', vendorIdx: 0, catIdx: 2, unitCost: 319.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'HP E27m G4 QHD USB-C Monitor', sku: 'HP-E27M-G4', vendorIdx: 3, catIdx: 2, unitCost: 449.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Logitech Zone Wireless 2 Headset', sku: 'LOG-ZW2', vendorIdx: 6, catIdx: 2, unitCost: 249.99, reorderPoint: 6, reorderQuantity: 12 },
    { name: 'Logitech Rally Bar Mini', sku: 'LOG-RBM', vendorIdx: 6, catIdx: 2, unitCost: 2999.99, reorderPoint: 1, reorderQuantity: 2 },

    // Mobile (Apple)
    { name: 'Apple iPad Pro 11" M4', sku: 'APL-IPDP-11M4', vendorIdx: 5, catIdx: 3, unitCost: 999.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Apple iPad Air 13" M2', sku: 'APL-IPDA-13M2', vendorIdx: 5, catIdx: 3, unitCost: 799.99, reorderPoint: 4, reorderQuantity: 6 },
    { name: 'Apple iPhone 16 Pro', sku: 'APL-IP16P', vendorIdx: 5, catIdx: 3, unitCost: 999.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'Apple Pencil Pro', sku: 'APL-PENCILP', vendorIdx: 5, catIdx: 3, unitCost: 129.99, reorderPoint: 5, reorderQuantity: 10 },

    // Power/UPS (APC)
    { name: 'APC Smart-UPS 1500VA LCD', sku: 'APC-SMT1500', vendorIdx: 7, catIdx: 4, unitCost: 699.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'APC Smart-UPS 3000VA 2U', sku: 'APC-SMT3000', vendorIdx: 7, catIdx: 4, unitCost: 1499.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'APC Back-UPS Pro 1500S', sku: 'APC-BR1500S', vendorIdx: 7, catIdx: 4, unitCost: 299.99, reorderPoint: 5, reorderQuantity: 8 },
    { name: 'APC SurgeArrest Performance 12-outlet', sku: 'APC-P12U2', vendorIdx: 7, catIdx: 4, unitCost: 39.99, reorderPoint: 15, reorderQuantity: 30 },
    { name: 'APC Rack PDU Metered 2G', sku: 'APC-AP8886', vendorIdx: 7, catIdx: 4, unitCost: 899.99, reorderPoint: 2, reorderQuantity: 4 },

    // Printers (HP)
    { name: 'HP LaserJet Enterprise M611dn', sku: 'HP-LJE-M611', vendorIdx: 3, catIdx: 5, unitCost: 649.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'HP Color LaserJet Pro MFP M479fdw', sku: 'HP-CLJ-M479', vendorIdx: 3, catIdx: 5, unitCost: 549.99, reorderPoint: 2, reorderQuantity: 3 },
    { name: 'HP OfficeJet Pro 9130e', sku: 'HP-OJP-9130', vendorIdx: 3, catIdx: 5, unitCost: 329.99, reorderPoint: 3, reorderQuantity: 5 },
    { name: 'HP ScanJet Enterprise Flow 7500', sku: 'HP-SJ-7500', vendorIdx: 3, catIdx: 5, unitCost: 1199.99, reorderPoint: 1, reorderQuantity: 2 },

    // More networking items
    { name: 'Ubiquiti UniFi Protect G5 Flex Camera', sku: 'UBQ-G5FLEX', vendorIdx: 2, catIdx: 1, unitCost: 89.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'Cisco SFP-10G-SR Transceiver', sku: 'CIS-SFP10GSR', vendorIdx: 1, catIdx: 1, unitCost: 149.99, reorderPoint: 10, reorderQuantity: 20 },

    // More peripherals
    { name: 'Dell P2422H 24" FHD Monitor', sku: 'DEL-P2422H', vendorIdx: 0, catIdx: 2, unitCost: 239.99, reorderPoint: 8, reorderQuantity: 15 },
    { name: 'Logitech C920s HD Pro Webcam', sku: 'LOG-C920S', vendorIdx: 6, catIdx: 2, unitCost: 69.99, reorderPoint: 8, reorderQuantity: 15 },

    // Extra laptops
    { name: 'Lenovo ThinkPad L14 Gen 5', sku: 'LEN-TP-L14G5', vendorIdx: 4, catIdx: 0, unitCost: 899.99, reorderPoint: 5, reorderQuantity: 10 },
    { name: 'HP ProBook 450 G11', sku: 'HP-PB-450G11', vendorIdx: 3, catIdx: 0, unitCost: 949.99, reorderPoint: 5, reorderQuantity: 10 },

    // Extra mobile
    { name: 'Apple Magic Keyboard for iPad Pro', sku: 'APL-MKIPDP', vendorIdx: 5, catIdx: 3, unitCost: 299.99, reorderPoint: 3, reorderQuantity: 5 },

    // Extra power
    { name: 'APC NetShelter SX 42U Rack', sku: 'APC-AR3150', vendorIdx: 7, catIdx: 4, unitCost: 2499.99, reorderPoint: 1, reorderQuantity: 1 },
  ];

  const items = await Promise.all(
    itemsData.map((item) =>
      prisma.item.create({
        data: {
          id: uuidv4(),
          tenantId: acme.id,
          name: item.name,
          sku: item.sku,
          vendorId: vendors[item.vendorIdx].id,
          categoryId: categories[item.catIdx].id,
          unitCost: item.unitCost,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
        },
      })
    )
  );

  console.log(`Created ${items.length} catalog items`);

  // --- Purchase Orders (Acme) ---
  const poStatuses = [
    'DRAFT', 'DRAFT',
    'PENDING_APPROVAL', 'PENDING_APPROVAL',
    'APPROVED', 'APPROVED',
    'SUBMITTED', 'SUBMITTED',
    'PARTIALLY_RECEIVED',
    'RECEIVED', 'RECEIVED', 'RECEIVED',
    'CANCELLED',
    'RECEIVED', 'RECEIVED',
  ];

  const purchaseOrders = [];
  for (let i = 0; i < poStatuses.length; i++) {
    const status = poStatuses[i];
    const orderedBy = randomChoice(acmeUsers.slice(0, 4)); // admins and managers
    const vendor = randomChoice(vendors);
    const orderDate = randomDate(new Date('2025-10-01'), new Date('2026-04-09'));
    const lineCount = randomInt(1, 5);
    const lineItems = [];
    let totalAmount = 0;

    for (let j = 0; j < lineCount; j++) {
      const item = randomChoice(items);
      const qty = randomInt(1, 10);
      const cost = item.unitCost || randomInt(100, 5000);
      totalAmount += qty * cost;
      lineItems.push({
        id: uuidv4(),
        itemId: item.id,
        quantity: qty,
        unitCost: cost,
        receivedQty: status === 'RECEIVED' ? qty : status === 'PARTIALLY_RECEIVED' ? Math.floor(qty / 2) : 0,
      });
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        orderNumber: `PO-${String(2025000 + i + 1)}`,
        status,
        vendorName: vendor.name,
        orderedById: orderedBy.id,
        orderedAt: orderDate,
        expectedDate: new Date(orderDate.getTime() + randomInt(7, 30) * 86400000),
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes: i % 3 === 0 ? 'Urgent order for Q1 refresh' : null,
        createdAt: orderDate,
      },
    });

    // Create line items
    for (const line of lineItems) {
      await prisma.purchaseOrderLine.create({
        data: {
          id: line.id,
          purchaseOrderId: po.id,
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          receivedQty: line.receivedQty,
        },
      });
    }

    purchaseOrders.push(po);
  }

  console.log(`Created ${purchaseOrders.length} purchase orders with line items`);

  // --- Assets (Acme) ---
  const assetStatuses = ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'];
  const locations = [
    'Warehouse A', 'Warehouse B', 'Office - Floor 1', 'Office - Floor 2',
    'Office - Floor 3', 'Server Room', 'Conference Room A', 'Conference Room B',
    'IT Closet', 'Reception',
  ];
  const assignees = [
    'John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams',
    'Charlie Brown', 'Diana Prince', 'Eve Adams', 'Frank Castle',
    'Grace Hopper', 'Henry Ford', null, null, null, null, null,
  ];
  const conditions = ['New', 'Good', 'Fair', 'Needs Repair'];

  const assetCount = 65;
  for (let i = 0; i < assetCount; i++) {
    const item = randomChoice(items);
    const status = i < 30
      ? 'AVAILABLE'
      : i < 48
        ? 'ASSIGNED'
        : i < 55
          ? 'IN_MAINTENANCE'
          : i < 60
            ? 'RETIRED'
            : 'LOST';
    const assignedTo = status === 'ASSIGNED' ? randomChoice(assignees.filter(Boolean)) : null;
    const purchasedAt = randomDate(new Date('2024-01-01'), new Date('2026-03-01'));

    await prisma.asset.create({
      data: {
        id: uuidv4(),
        tenantId: acme.id,
        itemId: item.id,
        assetTag: `ACME-${String(10000 + i)}`,
        serialNumber: `SN${uuidv4().slice(0, 8).toUpperCase()}`,
        status,
        condition: randomChoice(conditions),
        location: randomChoice(locations),
        assignedTo,
        notes: i % 7 === 0 ? 'Scheduled for replacement Q2 2026' : null,
        purchasedAt,
        warrantyUntil: new Date(purchasedAt.getTime() + 3 * 365 * 86400000),
        createdAt: purchasedAt,
      },
    });
  }

  console.log(`Created ${assetCount} assets`);

  // --- Audit Log Entries (Acme) ---
  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'SUBMIT', 'RECEIVE', 'VIEW'];
  const auditEntities = ['User', 'Vendor', 'PurchaseOrder', 'Asset', 'Item', 'Settings', 'ItemCategory'];
  const auditDetails = [
    'Created new purchase order PO-2025001',
    'Updated vendor contact information',
    'Approved purchase order for network equipment',
    'Received shipment of 10 laptops',
    'Added new catalog item: Dell Latitude 5540',
    'Changed user role from Staff to Manager',
    'Deactivated vendor account',
    'Submitted purchase order for approval',
    'Updated asset location to Warehouse B',
    'Created new item category: Networking',
    'Rejected purchase order due to budget constraints',
    'Logged in from 192.168.1.100',
    'Updated organization settings',
    'Changed password policy settings',
    'Exported inventory report',
    'Created bulk asset import',
    'Assigned asset ACME-10005 to John Smith',
    'Updated item reorder threshold',
    'Archived 5 retired assets',
    'Generated monthly procurement report',
  ];

  const auditEntries = [];
  for (let i = 0; i < 220; i++) {
    const user = randomChoice(acmeUsers);
    const action = randomChoice(auditActions);
    const entity = randomChoice(auditEntities);
    const createdAt = randomDate(new Date('2025-11-01'), new Date());

    auditEntries.push({
      id: uuidv4(),
      tenantId: acme.id,
      userId: user.id,
      action,
      entity,
      entityId: uuidv4(),
      details: randomChoice(auditDetails),
      ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
      createdAt,
    });
  }

  // Batch create audit logs
  await prisma.auditLog.createMany({ data: auditEntries });

  console.log(`Created ${auditEntries.length} audit log entries`);

  // --- Notifications (Acme) ---
  const notificationTemplates = [
    { title: 'New Purchase Order', message: 'PO-2025003 has been submitted for approval.', type: 'ORDER_STATUS', link: '/procurement' },
    { title: 'Low Stock Alert', message: 'Logitech MX Master 3S Mouse is below reorder threshold (3 remaining).', type: 'LOW_STOCK', link: '/inventory' },
    { title: 'Approval Required', message: 'Purchase order PO-2025005 requires your approval ($12,450.00).', type: 'APPROVAL_REQUIRED', link: '/procurement' },
    { title: 'Shipment Received', message: '15 items from Dell Technologies have been received at Warehouse A.', type: 'ORDER_STATUS', link: '/receiving' },
    { title: 'Asset Assigned', message: 'Dell Latitude 7440 (ACME-10015) assigned to Jane Doe.', type: 'ASSET_ASSIGNED', link: '/inventory' },
    { title: 'Order Approved', message: 'Your purchase order PO-2025002 has been approved by Maria Garcia.', type: 'ORDER_STATUS', link: '/procurement' },
    { title: 'System Update', message: 'Platform maintenance scheduled for April 15, 2026, 2:00 AM - 4:00 AM EST.', type: 'SYSTEM', link: null },
    { title: 'Low Stock Alert', message: 'Ubiquiti UniFi U7 Pro AP is below reorder threshold (5 remaining).', type: 'LOW_STOCK', link: '/inventory' },
    { title: 'New Vendor Added', message: 'APC by Schneider Electric has been added as a vendor.', type: 'SYSTEM', link: '/vendors' },
    { title: 'Order Cancelled', message: 'Purchase order PO-2025013 has been cancelled.', type: 'ORDER_STATUS', link: '/procurement' },
    { title: 'Asset Maintenance', message: '3 assets are scheduled for maintenance this week.', type: 'SYSTEM', link: '/inventory' },
    { title: 'Approval Required', message: 'Purchase order PO-2025008 requires your approval ($3,200.00).', type: 'APPROVAL_REQUIRED', link: '/procurement' },
    { title: 'Warranty Expiring', message: '5 assets have warranties expiring within 30 days.', type: 'SYSTEM', link: '/inventory' },
    { title: 'New User Added', message: 'Lisa Chen has been added to your organization.', type: 'SYSTEM', link: '/settings/users' },
    { title: 'Budget Alert', message: 'Q2 procurement budget is 85% utilized.', type: 'SYSTEM', link: '/procurement' },
  ];

  const notifEntries = [];
  for (let i = 0; i < 28; i++) {
    const template = notificationTemplates[i % notificationTemplates.length];
    const user = randomChoice(acmeUsers.slice(0, 4)); // admins and managers get notifications
    const createdAt = randomDate(new Date('2026-03-01'), new Date());

    notifEntries.push({
      id: uuidv4(),
      tenantId: acme.id,
      userId: user.id,
      title: template.title,
      message: template.message,
      type: template.type,
      isRead: i < 15, // older ones are read
      link: template.link,
      createdAt,
    });
  }

  await prisma.notification.createMany({ data: notifEntries });

  console.log(`Created ${notifEntries.length} notifications`);

  // --- System Config ---
  await prisma.systemConfig.createMany({
    data: [
      {
        id: uuidv4(),
        key: 'platform.name',
        value: 'Shane Inventory',
        category: 'platform',
        description: 'Platform display name',
      },
      {
        id: uuidv4(),
        key: 'platform.version',
        value: '1.0.0',
        category: 'platform',
        description: 'Platform version',
      },
      {
        id: uuidv4(),
        key: 'session.timeout',
        value: '480',
        category: 'platform',
        description: 'Session timeout in minutes',
      },
    ],
  });

  console.log('Created system configuration');

  console.log('\n--- Seed Complete ---');
  console.log('Login credentials for all users: password123');
  console.log('\nAcme Corporation users:');
  acmeUsers.forEach((u) => console.log(`  ${u.email} (${u.role})`));
  console.log('\nGlobex Industries users:');
  globexUsers.forEach((u) => console.log(`  ${u.email} (${u.role})`));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
