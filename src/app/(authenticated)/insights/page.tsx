'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Snapshot {
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
    riskLevel: 'low' | 'medium' | 'high';
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
    riskLevel: 'low' | 'medium' | 'high';
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

interface Observation {
  title: string;
  body: string;
  references: string[];
  speculative: boolean;
}

type InsightMode = 'strict' | 'balanced' | 'speculative';

const MODE_LABEL: Record<InsightMode, string> = {
  strict: 'Just the numbers',
  balanced: 'With context',
  speculative: 'Speculative',
};

const MODE_DESCRIPTION: Record<InsightMode, string> = {
  strict:
    'Pure restatement of what your data shows. No interpretation. Zero AI invention.',
  balanced:
    'Adds brief framing using only the risk levels already in your data. Low risk of speculation.',
  speculative:
    'AI may propose causes and recommended actions. Always verify against the source numbers before acting.',
};

const EXPORTS = [
  { type: 'vendor-spend', label: 'Vendor Spend' },
  { type: 'open-commitments', label: 'Open Commitments' },
  { type: 'po-aging', label: 'PO Aging' },
  { type: 'asset-register', label: 'Asset Register' },
  { type: 'reorder-candidates', label: 'Reorder Candidates' },
];

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function riskColor(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900';
  if (level === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900';
}

export default function InsightsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [period, setPeriod] = useState(30);
  const [mode, setMode] = useState<InsightMode>('strict');
  const [loading, setLoading] = useState(true);
  const [observing, setObserving] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/insights/snapshot?period=${period}`);
      const json = await res.json();
      if (json.success) setSnapshot(json.data);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const generateObservations = useCallback(async () => {
    setObserving(true);
    try {
      const res = await fetch('/api/insights/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, mode }),
      });
      const json = await res.json();
      if (json.success) {
        setSnapshot(json.data.snapshot);
        setObservations(json.data.observations ?? []);
      }
    } finally {
      setObserving(false);
    }
  }, [period, mode]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const downloadCsv = (type: string) => {
    window.open(`/api/insights/exports/${type}?period=${period}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Sparkles className="size-6 text-brand-green" />
              Insights
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Procurement and supply chain intelligence drawn from your live
              data. The KPIs below are computed by SQL; the AI observations
              are constrained to those exact numbers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(period)}
              onValueChange={(v) => setPeriod(Number(v ?? '30'))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={fetchSnapshot}
              disabled={loading}
            >
              <RefreshCw className="size-4" data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : snapshot ? (
          <>
            <KpiTile
              title={`Spend (last ${snapshot.periodDays}d)`}
              value={fmtCurrency(snapshot.spend.currentPeriodTotal)}
              icon={<DollarSign className="size-4" />}
              change={snapshot.spend.percentChange}
            />
            <KpiTile
              title="Open commitments"
              value={fmtCurrency(snapshot.openCommitments.totalValue)}
              icon={<Package className="size-4" />}
              subtitle={`${snapshot.openCommitments.totalCount} POs`}
            />
            <KpiTile
              title="Avg approval time"
              value={
                snapshot.approvalCycle.avgHoursToApprove !== null
                  ? `${snapshot.approvalCycle.avgHoursToApprove}h`
                  : 'N/A'
              }
              icon={<Clock className="size-4" />}
              subtitle={`${snapshot.approvalCycle.approvedCount} approved`}
            />
            <KpiTile
              title="Vendor concentration"
              value={`${snapshot.vendorConcentration.top3PercentOfSpend}%`}
              icon={<AlertTriangle className="size-4" />}
              subtitle="top 3 vendors"
              riskLevel={snapshot.vendorConcentration.riskLevel}
            />
            <KpiTile
              title="On-time delivery"
              value={
                snapshot.leadTime.onTimePercent !== null
                  ? `${snapshot.leadTime.onTimePercent}%`
                  : 'N/A'
              }
              icon={<Clock className="size-4" />}
              subtitle={`${snapshot.leadTime.ordersWithExpectedDate} POs`}
            />
            <KpiTile
              title="Reorder action needed"
              value={String(snapshot.reorderAlerts.itemsNeedingAction)}
              icon={<AlertTriangle className="size-4" />}
              subtitle={`${snapshot.reorderAlerts.itemsBelowReorderPoint} below reorder point`}
              riskLevel={snapshot.reorderAlerts.itemsNeedingAction > 0 ? 'medium' : 'low'}
            />
          </>
        ) : null}
      </div>

      {/* AI Observations */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-brand-green">
                <Sparkles className="size-5" />
                AI Observations
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {MODE_DESCRIPTION[mode]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={mode}
                onValueChange={(v) => setMode((v as InsightMode) ?? 'strict')}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">{MODE_LABEL.strict}</SelectItem>
                  <SelectItem value="balanced">{MODE_LABEL.balanced}</SelectItem>
                  <SelectItem value="speculative">{MODE_LABEL.speculative}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={generateObservations}
                disabled={observing || !snapshot}
              >
                <Sparkles className="size-4" data-icon="inline-start" />
                {observing ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
          {mode === 'speculative' && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p>
                <strong>Speculative mode is on.</strong> The AI is allowed to
                propose causes and next actions that the data alone cannot
                prove. Always verify these against the source numbers before
                acting.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {observations.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              <Info className="mx-auto mb-2 size-6 text-muted-foreground/50" />
              Click <strong>Generate</strong> to produce observations from
              your current data using the selected style.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {observations.map((obs, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-snug">
                      {obs.title}
                    </h3>
                    {obs.speculative && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      >
                        Speculative
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {obs.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Vendors + Risk + Single Source */}
      {snapshot && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-brand-green">
                Top vendors by spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.topVendors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendor spend in this period.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.topVendors.map((v) => (
                    <li
                      key={v.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate font-medium">{v.name}</span>
                      <span className="ml-3 shrink-0 tabular-nums text-muted-foreground">
                        {fmtCurrency(v.spend)} ({v.percentOfTotal}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-brand-green">
                Single-source risk
                <Badge
                  className={`border ${riskColor(snapshot.singleSourceRisk.riskLevel)}`}
                  variant="outline"
                >
                  {snapshot.singleSourceRisk.riskLevel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.singleSourceRisk.topItemsByValue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No single-source items.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.singleSourceRisk.topItemsByValue.map((i) => (
                    <li
                      key={i.itemName}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.vendorName ?? '—'}
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 tabular-nums text-muted-foreground">
                        {fmtCurrency(i.stockValue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-brand-green">
                Spend by category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.spendByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spend in this period.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.spendByCategory.map((c) => (
                    <li
                      key={c.categoryName}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate font-medium">{c.categoryName}</span>
                      <span className="ml-3 shrink-0 tabular-nums text-muted-foreground">
                        {fmtCurrency(c.spend)} ({c.percentOfTotal}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-brand-green">
                Reorder candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.reorderAlerts.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing below reorder point.
                </p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.reorderAlerts.items.slice(0, 6).map((i) => (
                    <li
                      key={i.itemName}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.currentStock} of {i.reorderPoint} reorder point
                        </p>
                      </div>
                      {i.hasOpenPo ? (
                        <Badge variant="secondary">PO open</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        >
                          Action
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSV Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-brand-green">
            <Download className="size-5" />
            Reports
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            One-click CSV exports for accounting, reconciliation, and external
            reporting. Pure SQL, no AI involvement.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORTS.map((e) => (
              <Button
                key={e.type}
                variant="outline"
                className="justify-start"
                onClick={() => downloadCsv(e.type)}
              >
                <Download className="size-4" data-icon="inline-start" />
                {e.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({
  title,
  value,
  icon,
  change,
  subtitle,
  riskLevel,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number | null;
  subtitle?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {icon}
            {title}
          </span>
          {riskLevel && (
            <Badge
              variant="outline"
              className={`border ${riskColor(riskLevel)} text-[10px] uppercase`}
            >
              {riskLevel}
            </Badge>
          )}
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
        {change !== undefined && change !== null && (
          <div
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {change >= 0 ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {change >= 0 ? '+' : ''}
            {change}% vs prior period
          </div>
        )}
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
