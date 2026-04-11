'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingCart,
  Plus,
  Clock,
  Check,
  Send,
  X,
  Package,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  vendorName: string | null;
  totalAmount: number;
  createdAt: string;
  orderedBy?: { firstName: string; lastName: string } | null;
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'RECEIVED', label: 'Received' },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; icon: React.ElementType }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: FileText,
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    variant: 'outline',
    className: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    icon: Check,
  },
  SUBMITTED: {
    label: 'Submitted',
    variant: 'default',
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    icon: Send,
  },
  PARTIALLY_RECEIVED: {
    label: 'Partial',
    variant: 'outline',
    className: 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    icon: Package,
  },
  RECEIVED: {
    label: 'Received',
    variant: 'default',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    icon: Check,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    className: '',
    icon: X,
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'secondary' as const,
    className: '',
    icon: FileText,
  };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 size-3" />
      {config.label}
    </Badge>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialStatus);

  const fetchOrders = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (status !== 'ALL') params.set('status', status);
      const res = await apiFetch(`/api/procurement/orders?${params}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.data ?? []);
      }
    } catch {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShoppingCart className="size-6" />
            Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage procurement orders and track approvals
          </p>
        </div>
        <Button onClick={() => router.push('/procurement/create')}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Order
        </Button>
      </div>

      <div className="mt-6">
        <Tabs
          defaultValue={initialStatus}
          onValueChange={(val) => setActiveTab(val as string)}
        >
          <TabsList variant="line">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <div className="mt-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                    <ShoppingCart className="size-12 text-muted-foreground/40" />
                    <p className="mt-4 text-lg font-medium text-muted-foreground">
                      No orders found
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground/70">
                      Create your first purchase order to get started.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push('/procurement/create')}
                    >
                      <Plus className="size-4" data-icon="inline-start" />
                      Create Order
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Vendor
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Created By
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Date
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            {' '}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                            onClick={() =>
                              router.push(
                                `/procurement/orders/${order.id}`
                              )
                            }
                          >
                            <td className="px-4 py-3 font-medium">
                              {order.orderNumber}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {order.vendorName ?? 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {order.orderedBy
                                ? `${order.orderedBy.firstName} ${order.orderedBy.lastName}`
                                : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
