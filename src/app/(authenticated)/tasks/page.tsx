'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  ShoppingCart,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Inbox,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface ActionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  href: string;
  createdAt: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  PO_PENDING_APPROVAL: ShoppingCart,
  PO_AWAITING_APPROVAL: ShoppingCart,
  RECEIVING_IN_PROGRESS: PackageCheck,
  LOW_STOCK: AlertTriangle,
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-amber-500',
  low: 'border-l-4 border-l-blue-400',
};

const PRIORITY_BADGE: Record<string, { variant: 'destructive' | 'secondary' | 'outline'; label: string }> = {
  high: { variant: 'destructive', label: 'Urgent' },
  medium: { variant: 'secondary', label: 'Action needed' },
  low: { variant: 'outline', label: 'Info' },
};

const TYPE_LABELS: Record<string, string> = {
  PO_PENDING_APPROVAL: 'Approval',
  PO_AWAITING_APPROVAL: 'Pending',
  RECEIVING_IN_PROGRESS: 'Receiving',
  LOW_STOCK: 'Inventory',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function TasksPage() {
  const router = useRouter();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/tasks');
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items);
      }
    } catch {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">My Tasks</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const highCount = items.filter((i) => i.priority === 'high').length;
  const mediumCount = items.filter((i) => i.priority === 'medium').length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="size-7" />
            My Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Items that need your attention
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <Badge variant="destructive">{highCount} urgent</Badge>
            )}
            {mediumCount > 0 && (
              <Badge variant="secondary">{mediumCount} pending</Badge>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center rounded-xl py-16">
          <Inbox className="size-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No action items right now. Nice work.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = ICON_MAP[item.type] || ClipboardCheck;
            const priorityStyle = PRIORITY_STYLES[item.priority] || '';
            const badge = PRIORITY_BADGE[item.priority];
            const typeLabel = TYPE_LABELS[item.type] || item.type;

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`card-base flex w-full min-w-0 items-center gap-4 rounded-xl p-4 text-left transition-all hover:scale-[1.01] hover:shadow-md ${priorityStyle}`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {typeLabel}
                    </Badge>
                    <Badge variant={badge.variant} className="text-[10px]">
                      {badge.label}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
