'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Plus,
  Package,
  Check,
  Clock,
  ChevronRight,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface ReceivingSession {
  id: string;
  purchaseOrderId: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendorName: string | null;
  status: string;
  lines: { id: string; quantity: number }[];
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
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'outline',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'default',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    icon: Check,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    className: '',
    icon: Package,
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'secondary' as const,
    className: '',
    icon: Package,
  };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 size-3" />
      {config.label}
    </Badge>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReceivingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ReceivingSession[]>([]);
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPOSelect, setShowPOSelect] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/receiving?pageSize=50&sortDirection=desc');
      const json = await res.json();
      if (json.success) {
        setSessions(json.data.data ?? []);
      }
    } catch {
      console.error('Failed to fetch receiving sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailablePOs = useCallback(async () => {
    try {
      const res = await apiFetch(
        '/api/procurement/orders?pageSize=100&status=SUBMITTED',
      );
      const json = await res.json();
      if (json.success) {
        const submitted = json.data.data ?? [];
        const res2 = await apiFetch(
          '/api/procurement/orders?pageSize=100&status=PARTIALLY_RECEIVED',
        );
        const json2 = await res2.json();
        const partial = json2.success ? json2.data.data ?? [] : [];
        setAvailablePOs([...submitted, ...partial]);
      }
    } catch {
      console.error('Failed to fetch purchase orders');
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStartReceiving = () => {
    setShowPOSelect(true);
    fetchAvailablePOs();
  };

  const handleSelectPO = async (poId: string) => {
    setStarting(true);
    try {
      const res = await apiFetch('/api/receiving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrderId: poId }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/receiving/${json.data.id}`);
      } else {
        alert(json.error ?? 'Failed to start session');
      }
    } catch {
      alert('Failed to start receiving session');
    } finally {
      setStarting(false);
    }
  };

  if (showPOSelect) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setShowPOSelect(false)}
            className="mb-4"
          >
            &larr; Back
          </Button>
          <h1 className="text-2xl font-bold">Select Purchase Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a submitted order to receive
          </p>
        </div>

        {availablePOs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Package className="size-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No orders ready to receive
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Submit a purchase order first.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availablePOs.map((po) => (
              <button
                key={po.id}
                onClick={() => handleSelectPO(po.id)}
                disabled={starting}
                className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold">{po.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {po.vendorName ?? 'Unknown vendor'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {po.lines?.length ?? 0} line items
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const inProgressSessions = sessions.filter((s) => s.status === 'IN_PROGRESS');
  const completedSessions = sessions.filter((s) => s.status !== 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck className="size-7" />
            Receiving
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive shipments and tag assets
          </p>
        </div>
      </div>

      <Tabs defaultValue="receive">
        <TabsList className="mb-6 w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="receive"
            className="min-w-[120px] gap-2 rounded-b-none rounded-t-lg border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white"
          >
            <Plus className="size-4" />
            New Receiving
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="min-w-[120px] gap-2 rounded-b-none rounded-t-lg border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white"
          >
            <History className="size-4" />
            History
            {completedSessions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {completedSessions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* New Receiving Tab */}
        <TabsContent value="receive">
          <div className="mx-auto max-w-lg space-y-6">
            <Button
              size="lg"
              onClick={handleStartReceiving}
              className="h-16 w-full text-lg font-semibold"
            >
              <Plus className="mr-2 size-6" />
              Start Receiving
            </Button>

            {/* In-progress sessions */}
            {inProgressSessions.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                  In Progress
                </h3>
                <div className="space-y-3">
                  {inProgressSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => router.push(`/receiving/${session.id}`)}
                      className="flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-left transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={session.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Started {formatDate(session.createdAt)}
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : completedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <Package className="size-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                No completed sessions yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/receiving/${session.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={session.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.completedAt
                        ? `Completed ${formatDate(session.completedAt)}`
                        : `Started ${formatDate(session.createdAt)}`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
