'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import {
  Bell,
  Mail,
  AlertTriangle,
  ShoppingCart,
  Package,
  Monitor,
  Loader2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface NotificationCategory {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'orderStatusChanges',
    title: 'Order Status Changes',
    description: 'When an order changes status (submitted, approved, received).',
    icon: ShoppingCart,
  },
  {
    key: 'lowStockAlerts',
    title: 'Low Stock Alerts',
    description: 'When inventory falls below the reorder threshold.',
    icon: AlertTriangle,
  },
  {
    key: 'approvalRequests',
    title: 'Approval Requests',
    description: 'When a purchase order needs your approval.',
    icon: Mail,
  },
  {
    key: 'assetAssignments',
    title: 'Asset Assignments',
    description: 'When an asset is assigned to you.',
    icon: Package,
  },
  {
    key: 'systemNotifications',
    title: 'System Notifications',
    description: 'Platform updates and announcements.',
    icon: Monitor,
  },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/notifications').then((r) => r.json()),
      fetch('/api/settings/integrations?category=smtp_check').then((r) => r.json()),
    ])
      .then(([notifRes, smtpRes]) => {
        if (notifRes.success && notifRes.data) {
          setPrefs(notifRes.data);
        }
        if (smtpRes.success && smtpRes.data?.smtpConfigured) {
          setSmtpConfigured(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: string, checked: boolean) => {
    const updatedPrefs = { ...prefs, [key]: checked };
    setPrefs(updatedPrefs);
    setSaving(key);

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPrefs),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Notification preference saved');
      } else {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !checked }));
        toast.error(json.error || 'Failed to save preference');
      }
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !checked }));
      toast.error('Failed to save preference');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="card-base rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-16 w-full rounded bg-muted" />
          <div className="h-16 w-full rounded bg-muted" />
          <div className="h-16 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which notifications you want to receive.
        </p>

        {!smtpConfigured && (
          <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-50 p-4 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-400">
              <Mail className="h-4 w-4" />
              SMTP Not Configured
            </div>
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-500">
              Email notifications require SMTP settings to be configured.
            </p>
            <Link
              href="/settings/integrations"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-yellow-800 dark:text-yellow-400 border border-yellow-500/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configure SMTP Settings
            </Link>
          </div>
        )}

        <div className={`mt-6 space-y-4 ${!smtpConfigured ? 'opacity-50 pointer-events-none' : ''}`}>
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const isEnabled = smtpConfigured ? (prefs[cat.key] ?? false) : false;
            const isSaving = saving === cat.key;

            return (
              <div
                key={cat.key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <cat.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{cat.title}</Label>
                    <p className="text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSaving && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(cat.key, checked)}
                    disabled={isSaving || !smtpConfigured}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
