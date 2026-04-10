'use client';

import { Bell, Mail, AlertTriangle, ShoppingCart, Package } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const notificationCategories = [
  {
    title: 'Order Updates',
    description: 'Receive notifications when order status changes.',
    icon: ShoppingCart,
    enabled: true,
  },
  {
    title: 'Low Stock Alerts',
    description: 'Get notified when items fall below reorder thresholds.',
    icon: AlertTriangle,
    enabled: true,
  },
  {
    title: 'Approval Requests',
    description: 'Notifications for purchase orders requiring approval.',
    icon: Package,
    enabled: true,
  },
  {
    title: 'Email Notifications',
    description: 'Also send notifications via email.',
    icon: Mail,
    enabled: false,
  },
];

export default function NotificationSettingsPage() {
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
          {notificationCategories.map((cat) => (
            <div
              key={cat.title}
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
                {!cat.enabled && (
                  <Badge variant="outline" className="text-xs">
                    Coming soon
                  </Badge>
                )}
                <Switch defaultChecked={cat.enabled} disabled={!cat.enabled} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
