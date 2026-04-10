-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReceivingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "receivedById" TEXT,
    "packingSlipImageUrl" TEXT,
    "aiExtractionData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReceivingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReceivingSession" ("completedAt", "createdAt", "id", "notes", "purchaseOrderId", "receivedById", "tenantId", "updatedAt") SELECT "completedAt", "createdAt", "id", "notes", "purchaseOrderId", "receivedById", "tenantId", "updatedAt" FROM "ReceivingSession";
DROP TABLE "ReceivingSession";
ALTER TABLE "new_ReceivingSession" RENAME TO "ReceivingSession";
CREATE INDEX "ReceivingSession_tenantId_idx" ON "ReceivingSession"("tenantId");
CREATE INDEX "ReceivingSession_status_idx" ON "ReceivingSession"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
