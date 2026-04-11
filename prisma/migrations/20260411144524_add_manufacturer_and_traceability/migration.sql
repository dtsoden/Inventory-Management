-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "supportUrl" TEXT,
    "supportPhone" TEXT,
    "supportEmail" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Manufacturer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT,
    "assetTag" TEXT,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT,
    "location" TEXT,
    "assignedTo" TEXT,
    "notes" TEXT,
    "purchasedAt" DATETIME,
    "warrantyUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("assetTag", "assignedTo", "condition", "createdAt", "id", "itemId", "location", "notes", "purchasedAt", "serialNumber", "status", "tenantId", "updatedAt", "warrantyUntil") SELECT "assetTag", "assignedTo", "condition", "createdAt", "id", "itemId", "location", "notes", "purchasedAt", "serialNumber", "status", "tenantId", "updatedAt", "warrantyUntil" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE INDEX "Asset_tenantId_idx" ON "Asset"("tenantId");
CREATE INDEX "Asset_itemId_idx" ON "Asset"("itemId");
CREATE INDEX "Asset_purchaseOrderLineId_idx" ON "Asset"("purchaseOrderLineId");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_assetTag_idx" ON "Asset"("assetTag");
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "vendorId" TEXT,
    "manufacturerId" TEXT,
    "manufacturerPartNumber" TEXT,
    "categoryId" TEXT,
    "unitCost" REAL,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Item_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("categoryId", "createdAt", "description", "id", "imageUrl", "isActive", "name", "reorderPoint", "reorderQuantity", "sku", "tenantId", "unitCost", "updatedAt", "vendorId") SELECT "categoryId", "createdAt", "description", "id", "imageUrl", "isActive", "name", "reorderPoint", "reorderQuantity", "sku", "tenantId", "unitCost", "updatedAt", "vendorId" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_tenantId_idx" ON "Item"("tenantId");
CREATE INDEX "Item_vendorId_idx" ON "Item"("vendorId");
CREATE INDEX "Item_manufacturerId_idx" ON "Item"("manufacturerId");
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
CREATE INDEX "Item_sku_idx" ON "Item"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Manufacturer_tenantId_idx" ON "Manufacturer"("tenantId");
