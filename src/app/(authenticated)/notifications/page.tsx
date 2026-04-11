'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

type FilterMode = 'all' | 'unread' | 'read';

// Tiny inline relative time formatter using Intl.RelativeTimeFormat.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
  const diffWk = Math.round(diffDay / 7);
  if (Math.abs(diffWk) < 5) return rtf.format(diffWk, 'week');
  const diffMo = Math.round(diffDay / 30);
  if (Math.abs(diffMo) < 12) return rtf.format(diffMo, 'month');
  const diffYr = Math.round(diffDay / 365);
  return rtf.format(diffYr, 'year');
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications?pageSize=50');
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications);
      } else {
        toast.error(json.error ?? 'Failed to load notifications');
      }
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'read') return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );
  const readCount = notifications.length - unreadCount;

  const markAsRead = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
      } else {
        toast.error(json.error ?? 'Failed to mark as read');
      }
    } catch {
      toast.error('Failed to mark as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      } else {
        toast.error(json.error ?? 'Failed to mark all as read');
      }
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setBusy(false);
    }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error(json.error ?? 'Failed to delete notification');
      }
    } catch {
      toast.error('Failed to delete notification');
    }
  }, []);

  const clearRead = useCallback(async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/notifications/clear-read', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        toast.success(`Cleared ${json.data?.deleted ?? 0} read notifications`);
      } else {
        toast.error(json.error ?? 'Failed to clear read notifications');
      }
    } catch {
      toast.error('Failed to clear read notifications');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (notif: NotificationItem) => {
      if (!notif.isRead) {
        // Fire and forget; state flips immediately inside markAsRead.
        markAsRead(notif.id);
      }
      if (notif.link) {
        router.push(notif.link);
      }
    },
    [markAsRead, router],
  );

  const filterChip = (value: FilterMode, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
        (filter === value
          ? 'border-brand-green bg-brand-green/10 text-brand-green'
          : 'border-border bg-background text-muted-foreground hover:bg-accent')
      }
    >
      {label}
      <span className="ml-1.5 opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Bell className="h-6 w-6" />
            Notification Center
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage all of your notifications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={busy}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          )}
          {readCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearRead}
              disabled={busy}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterChip('all', 'All', notifications.length)}
        {filterChip('unread', 'Unread', unreadCount)}
        {filterChip('read', 'Read', readCount)}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filter === 'all'
              ? 'All notifications'
              : filter === 'unread'
                ? 'Unread notifications'
                : 'Read notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              You&apos;re all caught up. New notifications will appear here.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((notif) => (
                <li
                  key={notif.id}
                  className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <button
                    type="button"
                    onClick={() => handleRowClick(notif)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full ' +
                        (notif.isRead ? 'bg-transparent' : 'bg-brand-green')
                      }
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            'truncate text-sm ' +
                            (notif.isRead ? 'font-normal' : 'font-semibold')
                          }
                        >
                          {notif.title}
                        </span>
                        {notif.type && notif.type !== 'INFO' && (
                          <Badge variant="outline" className="text-[10px]">
                            {notif.type}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {notif.message}
                      </p>
                      <p
                        className="mt-1 text-[11px] text-muted-foreground"
                        title={formatAbsolute(notif.createdAt)}
                      >
                        {formatRelative(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notif.id)}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOne(notif.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
