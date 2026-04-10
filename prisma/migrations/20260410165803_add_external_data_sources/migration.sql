-- CreateTable
CREATE TABLE "ExternalDataSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiHeaders" TEXT,
    "fieldMapping" TEXT NOT NULL,
    "dataTypeConversions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalDataSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExternalDataSource_tenantId_idx" ON "ExternalDataSource"("tenantId");
