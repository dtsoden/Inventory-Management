import { PrismaClient } from '@prisma/client';

/**
 * Pre-computes a strict, structured snapshot of procurement data for the
 * Insights page. Every field is calculated by SQL aggregations against
 * live tenant data, with zero AI involvement. The AI observation
 * pipeline downstream is given ONLY this object and is forbidden from
 * inventing values not present here. That is the architectural
 * hallucination guardrail.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface InsightsSnapshot {
  generatedAt: string;
  periodDays: number;
  currency: string;

  spend: {
    currentPeriodTotal: number;
    previousPeriodTotal: number;
    percentChange: number | null;
  };

  topVendors: Array<{
    name: string;
    spend: number;
    percentOfTotal: number;
    poCount: number;
  }>;

  vendorConcentration: {
    top3PercentOfSpend: number;
    riskLevel: RiskLevel;
    activeVendorCount: number;
  };

  approvalCycle: {
    avgHoursToApprove: number | null;
    medianHoursToApprove: number | null;
    approvedCount: number;
    rejectedCount: number;
    rejectionRatePercent: number | null;
  };

  openCommitments: {
    approvedCount: number;
    approvedValue: number;
    submittedCount: number;
    submittedValue: number;
    totalCount: number;
    totalValue: number;
  };

  leadTime: {
    ordersWithExpectedDate: number;
    ordersReceivedOnTime: number;
    ordersLate: number;
    avgDaysLate: number | null;
    onTimePercent: number | null;
  };

  singleSourceRisk: {
    itemCount: number;
    riskLevel: RiskLevel;
    topItemsByValue: Array<{
      itemName: string;
      vendorName: string | null;
      assetCount: number;
      stockValue: number;
    }>;
  };

  reorderAlerts: {
    itemsBelowReorderPoint: number;
    itemsWithPendingPo: number;
    itemsNeedingAction: number;
    items: Array<{
      itemName: string;
      currentStock: number;
      reorderPoint: number;
      hasOpenPo: boolean;
    }>;
  };

  spendByCategory: Array<{
    categoryName: string;
    spend: number;
    percentOfTotal: number;
  }>;
}

const VENDOR_CONCENTRATION_HIGH = 70;
const VENDOR_CONCENTRATION_MED = 50;
const SINGLE_SOURCE_HIGH = 5;
const SINGLE_SOURCE_MED = 2;

function classifyConcentration(top3Pct: number): RiskLevel {
  if (top3Pct >= VENDOR_CONCENTRATION_HIGH) return 'high';
  if (top3Pct >= VENDOR_CONCENTRATION_MED) return 'medium';
  return 'low';
}

function classifySingleSource(count: number): RiskLevel {
  if (count >= SINGLE_SOURCE_HIGH) return 'high';
  if (count >= SINGLE_SOURCE_MED) return 'medium';
  return 'low';
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export class InsightsService {
  constructor(private readonly prisma: PrismaClient) {}

  async snapshot(tenantId: string, periodDays = 30): Promise<InsightsSnapshot> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const previousPeriodStart = new Date(
      now.getTime() - 2 * periodDays * 86400000,
    );

    const [
      currentSpendRows,
      prevSpendRows,
      vendorRollup,
      activeVendorCount,
      approvalLogs,
      openApproved,
      openSubmitted,
      receivedOrders,
      allItemsWithVendor,
      reorderItems,
      categoryRollup,
    ] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
          createdAt: { gte: periodStart },
        },
        select: { id: true, totalAmount: true, vendorName: true, createdAt: true, status: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
          createdAt: { gte: previousPeriodStart, lt: periodStart },
        },
        select: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['vendorName'],
        where: {
          tenantId,
          status: { in: ['APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
          createdAt: { gte: periodStart },
          vendorName: { not: null },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.vendor.count({ where: { tenantId, isActive: true } }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          entity: 'PurchaseOrder',
          action: { in: ['SUBMIT', 'APPROVE', 'REJECT'] },
          createdAt: { gte: periodStart },
        },
        select: { entityId: true, action: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { tenantId, status: 'APPROVED' },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { tenantId, status: 'SUBMITTED' },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
          expectedDate: { not: null },
          createdAt: { gte: periodStart },
        },
        select: { expectedDate: true, updatedAt: true },
      }),
      this.prisma.item.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          unitCost: true,
          vendor: { select: { name: true } },
          assets: { select: { id: true } },
        },
      }),
      this.prisma.item.findMany({
        where: { tenantId, isActive: true, reorderPoint: { gt: 0 } },
        select: {
          id: true,
          name: true,
          reorderPoint: true,
          assets: {
            where: { status: 'AVAILABLE' },
            select: { id: true },
          },
          purchaseOrderLines: {
            where: {
              purchaseOrder: {
                tenantId,
                status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED'] },
              },
            },
            select: { id: true },
          },
        },
      }),
      this.prisma.item.findMany({
        where: { tenantId, isActive: true },
        select: {
          category: { select: { name: true } },
          purchaseOrderLines: {
            where: {
              purchaseOrder: {
                tenantId,
                status: { in: ['APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
                createdAt: { gte: periodStart },
              },
            },
            select: { quantity: true, unitCost: true },
          },
        },
      }),
    ]);

    // ---- Spend ----
    const currentTotal = currentSpendRows.reduce(
      (sum, r) => sum + (r.totalAmount ?? 0),
      0,
    );
    const previousTotal = prevSpendRows.reduce(
      (sum, r) => sum + (r.totalAmount ?? 0),
      0,
    );
    const percentChange =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : null;

    // ---- Top vendors ----
    const vendorEntries = vendorRollup
      .map((row) => ({
        name: row.vendorName ?? 'Unknown',
        spend: row._sum.totalAmount ?? 0,
        poCount: row._count.id ?? 0,
      }))
      .sort((a, b) => b.spend - a.spend);

    const topVendors = vendorEntries.slice(0, 5).map((v) => ({
      name: v.name,
      spend: round(v.spend),
      percentOfTotal: currentTotal > 0 ? round((v.spend / currentTotal) * 100) : 0,
      poCount: v.poCount,
    }));

    const top3Spend = vendorEntries.slice(0, 3).reduce((sum, v) => sum + v.spend, 0);
    const top3Pct = currentTotal > 0 ? round((top3Spend / currentTotal) * 100) : 0;

    // ---- Approval cycle ----
    const submitTimesByOrder = new Map<string, Date>();
    const approveDurations: number[] = [];
    let approvedCount = 0;
    let rejectedCount = 0;
    for (const row of approvalLogs) {
      if (!row.entityId) continue;
      if (row.action === 'SUBMIT') {
        submitTimesByOrder.set(row.entityId, row.createdAt);
      } else if (row.action === 'APPROVE') {
        approvedCount += 1;
        const submitted = submitTimesByOrder.get(row.entityId);
        if (submitted) {
          const hours = (row.createdAt.getTime() - submitted.getTime()) / 3600000;
          if (hours >= 0) approveDurations.push(hours);
        }
      } else if (row.action === 'REJECT') {
        rejectedCount += 1;
      }
    }
    const avgHours =
      approveDurations.length > 0
        ? round(approveDurations.reduce((s, h) => s + h, 0) / approveDurations.length, 1)
        : null;
    const medianHours =
      approveDurations.length > 0 ? round(median(approveDurations)!, 1) : null;
    const totalApprovalDecisions = approvedCount + rejectedCount;
    const rejectionRate =
      totalApprovalDecisions > 0
        ? round((rejectedCount / totalApprovalDecisions) * 100, 1)
        : null;

    // ---- Open commitments ----
    const approvedValue = openApproved._sum.totalAmount ?? 0;
    const submittedValue = openSubmitted._sum.totalAmount ?? 0;

    // ---- Lead time ----
    let onTime = 0;
    let late = 0;
    let lateDaysSum = 0;
    for (const row of receivedOrders) {
      if (!row.expectedDate) continue;
      const diffDays = Math.floor(
        (row.updatedAt.getTime() - row.expectedDate.getTime()) / 86400000,
      );
      if (diffDays <= 0) {
        onTime += 1;
      } else {
        late += 1;
        lateDaysSum += diffDays;
      }
    }
    const totalLeadTime = onTime + late;
    const onTimePercent = totalLeadTime > 0 ? round((onTime / totalLeadTime) * 100, 1) : null;
    const avgDaysLate = late > 0 ? round(lateDaysSum / late, 1) : null;

    // ---- Single source risk ----
    const itemsByVendorCount = allItemsWithVendor.map((i) => ({
      itemName: i.name,
      vendorName: i.vendor?.name ?? null,
      assetCount: i.assets.length,
      stockValue: round((i.unitCost ?? 0) * i.assets.length),
    }));
    const singleSource = itemsByVendorCount
      .filter((i) => i.vendorName !== null)
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 3);

    // ---- Reorder alerts ----
    const reorderRows = reorderItems.map((i) => ({
      itemName: i.name,
      currentStock: i.assets.length,
      reorderPoint: i.reorderPoint ?? 0,
      hasOpenPo: i.purchaseOrderLines.length > 0,
    }));
    const belowReorder = reorderRows.filter(
      (r) => r.currentStock < r.reorderPoint,
    );
    const needsAction = belowReorder.filter((r) => !r.hasOpenPo);

    // ---- Spend by category ----
    const categoryTotals = new Map<string, number>();
    for (const item of categoryRollup) {
      const cat = item.category?.name ?? 'Uncategorized';
      const lineTotal = item.purchaseOrderLines.reduce(
        (sum, l) => sum + l.quantity * l.unitCost,
        0,
      );
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + lineTotal);
    }
    const spendByCategory = Array.from(categoryTotals.entries())
      .map(([categoryName, spend]) => ({
        categoryName,
        spend: round(spend),
        percentOfTotal: currentTotal > 0 ? round((spend / currentTotal) * 100) : 0,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    return {
      generatedAt: now.toISOString(),
      periodDays,
      currency: 'USD',
      spend: {
        currentPeriodTotal: round(currentTotal),
        previousPeriodTotal: round(previousTotal),
        percentChange: percentChange === null ? null : round(percentChange, 1),
      },
      topVendors,
      vendorConcentration: {
        top3PercentOfSpend: top3Pct,
        riskLevel: classifyConcentration(top3Pct),
        activeVendorCount,
      },
      approvalCycle: {
        avgHoursToApprove: avgHours,
        medianHoursToApprove: medianHours,
        approvedCount,
        rejectedCount,
        rejectionRatePercent: rejectionRate,
      },
      openCommitments: {
        approvedCount: openApproved._count.id ?? 0,
        approvedValue: round(approvedValue),
        submittedCount: openSubmitted._count.id ?? 0,
        submittedValue: round(submittedValue),
        totalCount: (openApproved._count.id ?? 0) + (openSubmitted._count.id ?? 0),
        totalValue: round(approvedValue + submittedValue),
      },
      leadTime: {
        ordersWithExpectedDate: totalLeadTime,
        ordersReceivedOnTime: onTime,
        ordersLate: late,
        avgDaysLate,
        onTimePercent,
      },
      singleSourceRisk: {
        itemCount: itemsByVendorCount.filter((i) => i.vendorName !== null).length,
        riskLevel: classifySingleSource(
          itemsByVendorCount.filter((i) => i.vendorName !== null && i.assetCount > 0).length,
        ),
        topItemsByValue: singleSource,
      },
      reorderAlerts: {
        itemsBelowReorderPoint: belowReorder.length,
        itemsWithPendingPo: belowReorder.filter((r) => r.hasOpenPo).length,
        itemsNeedingAction: needsAction.length,
        items: belowReorder.slice(0, 10),
      },
      spendByCategory,
    };
  }
}

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export const insightsService = (prisma: PrismaClient) =>
  new InsightsService(prisma);
