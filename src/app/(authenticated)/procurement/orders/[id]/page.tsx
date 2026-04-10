'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingCart,
  FileText,
  Clock,
  Check,
  Send,
  X,
  Package,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderLine {
  id: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  receivedQty: number;
  item?: { id: string; name: string; sku: string | null };
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  vendorName: string | null;
  notes: string | null;
  totalAmount: number;
  orderedAt: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
  orderedBy?: { id: string; firstName: string; lastName: string } | null;
  lines: OrderLine[];
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: React.ElementType;
  }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'secondary',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: FileText,
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    variant: 'outline',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    variant: 'default',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    icon: Check,
  },
  SUBMITTED: {
    label: 'Submitted',
    variant: 'default',
    className:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    icon: Send,
  },
  PARTIALLY_RECEIVED: {
    label: 'Partially Received',
    variant: 'outline',
    className:
      'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    icon: Package,
  },
  RECEIVED: {
    label: 'Received',
    variant: 'default',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    icon: Check,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    className: '',
    icon: X,
  },
};

const WORKFLOW_ORDER = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SUBMITTED',
  'RECEIVED',
];

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

function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
  const currentIndex = WORKFLOW_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_ORDER.map((s, i) => {
        const config = STATUS_CONFIG[s];
        const isActive = i <= currentIndex && !isCancelled;
        const isCurrent = s === currentStatus;

        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {config?.label ?? s}
            </div>
            {i < WORKFLOW_ORDER.length - 1 && (
              <div
                className={`h-0.5 w-4 ${
                  i < currentIndex && !isCancelled
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <>
          <div className="h-0.5 w-4 bg-destructive/30" />
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            Cancelled
          </div>
        </>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Inline editing for draft orders
  const [editingLines, setEditingLines] = useState(false);
  const [editedLines, setEditedLines] = useState<OrderLine[]>([]);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/procurement/orders/${orderId}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setEditedLines(json.data.lines ?? []);
      }
    } catch {
      console.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const performAction = async (
    action: string,
    method = 'POST'
  ) => {
    setActionLoading(true);
    try {
      const url =
        action === 'delete'
          ? `/api/procurement/orders/${orderId}`
          : `/api/procurement/orders/${orderId}/${action}`;
      const res = await fetch(url, { method });
      const json = await res.json();
      if (!json.success) {
        alert(json.error ?? 'Action failed');
        return;
      }
      if (action === 'delete') {
        router.push('/procurement');
      } else {
        fetchOrder();
      }
    } catch {
      alert('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const addLineItem = async () => {
    // We would need a catalog item selector; for now, this is a placeholder
    // In a full implementation, this would open a dialog
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="size-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-medium text-muted-foreground">
          Order not found
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/procurement')}
        >
          Back to Orders
        </Button>
      </div>
    );
  }

  const isDraft = order.status === 'DRAFT';
  const isPending = order.status === 'PENDING_APPROVAL';
  const isApproved = order.status === 'APPROVED';
  const isSubmitted = order.status === 'SUBMITTED';
  const isCancelled = order.status === 'CANCELLED';
  const isReceived = order.status === 'RECEIVED';
  const canEdit = isDraft;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push('/procurement')}
        >
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Orders
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <ShoppingCart className="size-6" />
              {order.orderNumber}
              <StatusBadge status={order.status} />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.vendorName ?? 'No vendor'} · Created{' '}
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/procurement/orders/${order.id}`)
                  }
                  disabled={actionLoading}
                >
                  <Pencil className="size-4" data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  onClick={() => performAction('submit')}
                  disabled={actionLoading}
                >
                  <Send className="size-4" data-icon="inline-start" />
                  Submit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => performAction('delete', 'DELETE')}
                  disabled={actionLoading}
                >
                  <Trash2 className="size-4" data-icon="inline-start" />
                  Cancel
                </Button>
              </>
            )}
            {isPending && (
              <>
                <Button
                  onClick={() => performAction('approve')}
                  disabled={actionLoading}
                >
                  <Check className="size-4" data-icon="inline-start" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => performAction('delete', 'DELETE')}
                  disabled={actionLoading}
                >
                  <X className="size-4" data-icon="inline-start" />
                  Reject
                </Button>
              </>
            )}
            {isApproved && (
              <Button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const res = await fetch(
                      `/api/procurement/orders/${orderId}`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          status: 'SUBMITTED',
                          orderedAt: new Date().toISOString(),
                        }),
                      }
                    );
                    const json = await res.json();
                    if (json.success) fetchOrder();
                    else alert(json.error ?? 'Failed');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >
                <Send className="size-4" data-icon="inline-start" />
                Submit to Vendor
              </Button>
            )}
            {isSubmitted && (
              <Button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const res = await fetch(
                      `/api/procurement/orders/${orderId}`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'RECEIVED' }),
                      }
                    );
                    const json = await res.json();
                    if (json.success) fetchOrder();
                    else alert(json.error ?? 'Failed');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >
                <Package className="size-4" data-icon="inline-start" />
                Mark as Received
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="mt-6 overflow-x-auto">
        <WorkflowStepper currentStatus={order.status} />
      </div>

      {/* Order Info */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor</span>
              <span className="font-medium">
                {order.vendorName ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={order.status} />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ordered</span>
              <span>{formatDate(order.orderedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected</span>
              <span>{formatDate(order.expectedDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="text-lg font-bold font-mono">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Line Items</span>
              <span>{order.lines.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By</span>
              <span>
                {order.orderedBy
                  ? `${order.orderedBy.firstName} ${order.orderedBy.lastName}`
                  : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {order.notes && (
        <Card className="mt-6" size="sm">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {order.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="size-4" data-icon="inline-start" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    SKU
                  </th>
                  <th className="w-24 px-4 py-2 text-right font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="w-32 px-4 py-2 text-right font-medium text-muted-foreground">
                    Unit Cost
                  </th>
                  <th className="w-32 px-4 py-2 text-right font-medium text-muted-foreground">
                    Total
                  </th>
                  {!isDraft &&
                    (isSubmitted ||
                      order.status === 'PARTIALLY_RECEIVED' ||
                      isReceived) && (
                      <th className="w-24 px-4 py-2 text-right font-medium text-muted-foreground">
                        Received
                      </th>
                    )}
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="px-4 py-3 font-medium">
                      {line.item?.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.item?.sku ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">{line.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(line.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatCurrency(line.quantity * line.unitCost)}
                    </td>
                    {!isDraft &&
                      (isSubmitted ||
                        order.status === 'PARTIALLY_RECEIVED' ||
                        isReceived) && (
                        <td className="px-4 py-3 text-right">
                          {line.receivedQty} / {line.quantity}
                        </td>
                      )}
                  </tr>
                ))}
                {order.lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No line items yet.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right font-medium"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  {!isDraft &&
                    (isSubmitted ||
                      order.status === 'PARTIALLY_RECEIVED' ||
                      isReceived) && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail placeholder */}
      <Card className="mt-6" size="sm">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2 rounded-full bg-primary" />
              <div>
                <p className="font-medium">Order created</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(order.createdAt)}
                  {order.orderedBy
                    ? ` by ${order.orderedBy.firstName} ${order.orderedBy.lastName}`
                    : ''}
                </p>
              </div>
            </div>
            {order.orderedAt && (
              <div className="flex items-start gap-3">
                <div className="mt-1 size-2 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium">Order submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.orderedAt)}
                  </p>
                </div>
              </div>
            )}
            {isCancelled && (
              <div className="flex items-start gap-3">
                <div className="mt-1 size-2 rounded-full bg-destructive" />
                <div>
                  <p className="font-medium">Order cancelled</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            )}
            {isReceived && (
              <div className="flex items-start gap-3">
                <div className="mt-1 size-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="font-medium">Order received</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
