'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setPrefs(res.data);
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

        <div className="mt-6 space-y-4">
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const isEnabled = prefs[cat.key] ?? false;
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
                    disabled={isSaving}
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
