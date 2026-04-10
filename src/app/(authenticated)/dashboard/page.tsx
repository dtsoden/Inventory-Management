'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Truck,
  Clock,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardData {
  kpi: {
    totalAssets: number;
    pendingOrders: number;
    activeVendors: number;
    lowStockAlerts: number;
  };
  recentActivity: {
    id: string;
    user: string;
    userEmail: string;
    action: string;
    entity: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
  }[];
  assetsByStatus: {
    status: string;
    count: number;
    color: string;
  }[];
  ordersByMonth: {
    month: string;
    count: number;
    total: number;
  }[];
}

const kpiConfig = [
  {
    key: 'totalAssets' as const,
    title: 'Total Assets',
    icon: Package,
    href: '/inventory',
    description: 'Items in inventory',
    accent: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    trend: 'up' as const,
    trendLabel: '+12%',
  },
  {
    key: 'pendingOrders' as const,
    title: 'Pending Orders',
    icon: ShoppingCart,
    href: '/procurement',
    description: 'Awaiting fulfillment',
    accent: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-600 dark:text-blue-400',
    trend: 'up' as const,
    trendLabel: '+3',
  },
  {
    key: 'activeVendors' as const,
    title: 'Active Vendors',
    icon: Building2,
    href: '/vendors',
    description: 'Registered suppliers',
    accent: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-600 dark:text-purple-400',
    trend: 'up' as const,
    trendLabel: '+2',
  },
  {
    key: 'lowStockAlerts' as const,
    title: 'Low Stock Alerts',
    icon: AlertTriangle,
    href: '/inventory',
    description: 'Items below threshold',
    accent: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
    trend: 'down' as const,
    trendLabel: '-1',
  },
];

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-base rounded-xl p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 card-base rounded-xl p-6">
            <Skeleton className="h-5 w-32" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="mt-4 flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="card-base rounded-xl p-6">
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    );
  }

  const kpiValues = data?.kpi ?? {
    totalAssets: 0,
    pendingOrders: 0,
    activeVendors: 0,
    lowStockAlerts: 0,
  };

  const totalStatusAssets = data?.assetsByStatus.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Activity className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiConfig.map((card) => (
          <Link key={card.key} href={card.href}>
            <div className="card-base group relative cursor-pointer overflow-hidden rounded-xl p-6 transition-all hover:scale-[1.02]">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{kpiValues[card.key]}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      card.trend === 'up' && (card.key as string) !== 'lowStockAlerts'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : card.trend === 'down' && (card.key as string) === 'lowStockAlerts'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {card.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {card.trendLabel}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card-base rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Recent Activity</h2>
            <Link href="/audit-log">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {data?.recentActivity && data.recentActivity.length > 0 ? (
            <div className="mt-4 space-y-1">
              {data.recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="mt-0.5 h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(entry.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{entry.user}</span>{' '}
                      <span className="text-muted-foreground">
                        {entry.action.toLowerCase().replace(/_/g, ' ')}
                      </span>{' '}
                      <span className="font-medium">{entry.entity}</span>
                      {entry.entityId && (
                        <span className="text-muted-foreground">
                          {' '}#{entry.entityId.slice(0, 8)}
                        </span>
                      )}
                    </p>
                    {entry.details && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {entry.details}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {timeAgo(entry.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              No recent activity to display.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="card-base rounded-xl p-6">
            <h2 className="section-title">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link href="/procurement?action=create" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Plus className="h-4 w-4 text-emerald-500" />
                  Create Order
                </Button>
              </Link>
              <Link href="/vendors?action=create" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Add Vendor
                </Button>
              </Link>
              <Link href="/receiving" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Truck className="h-4 w-4 text-purple-500" />
                  Receive Shipment
                </Button>
              </Link>
            </div>
          </div>

          {/* Assets by Status */}
          <div className="card-base rounded-xl p-6">
            <h2 className="section-title">Assets by Status</h2>
            {data?.assetsByStatus && data.assetsByStatus.length > 0 ? (
              <div className="mt-4 space-y-3">
                {/* Stacked bar */}
                <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                  {data.assetsByStatus.map((s) => (
                    <div
                      key={s.status}
                      className="transition-all duration-500"
                      style={{
                        width: `${(s.count / totalStatusAssets) * 100}%`,
                        backgroundColor: s.color,
                      }}
                      title={`${s.status}: ${s.count}`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-1.5">
                  {data.assetsByStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-muted-foreground capitalize">
                          {s.status.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No asset data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Orders by Month */}
      <div className="mt-6 card-base rounded-xl p-6">
        <h2 className="section-title">Orders by Month</h2>
        {data?.ordersByMonth && data.ordersByMonth.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Month</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Orders</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.ordersByMonth.map((m) => (
                  <tr key={m.month} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5">{formatMonthLabel(m.month)}</td>
                    <td className="py-2.5 text-right">{m.count}</td>
                    <td className="py-2.5 text-right font-medium">
                      ${m.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No order data yet.</p>
        )}
      </div>
    </div>
  );
}
