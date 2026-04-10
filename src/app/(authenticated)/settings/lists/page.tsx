'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  List,
  Tag,
  ShoppingCart,
  Users,
  FolderOpen,
  Bell,
  ExternalLink,
  Info,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Static list definitions                                            */
/* ------------------------------------------------------------------ */

const ASSET_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', description: 'Asset is in stock and ready to be assigned' },
  { value: 'ASSIGNED', label: 'Assigned', description: 'Asset is currently assigned to a person' },
  { value: 'IN_MAINTENANCE', label: 'In Maintenance', description: 'Asset is being repaired or serviced' },
  { value: 'RETIRED', label: 'Retired', description: 'Asset has been decommissioned and is no longer in use' },
  { value: 'LOST', label: 'Lost', description: 'Asset cannot be located or accounted for' },
];

const ORDER_STATUSES = [
  { value: 'DRAFT', label: 'Draft', description: 'Order is being prepared, not yet submitted' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', description: 'Order has been submitted and awaits manager approval' },
  { value: 'APPROVED', label: 'Approved', description: 'Order has been approved, ready to submit to vendor' },
  { value: 'SUBMITTED', label: 'Submitted', description: 'Order has been sent to the vendor' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received', description: 'Some items from the order have been received' },
  { value: 'RECEIVED', label: 'Received', description: 'All items from the order have been received' },
  { value: 'CANCELLED', label: 'Cancelled', description: 'Order has been cancelled' },
];

const USER_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full platform access including tenant management' },
  { value: 'ORG_ADMIN', label: 'Org Admin', description: 'Full organization access including settings and users' },
  { value: 'MANAGER', label: 'Manager', description: 'Can manage vendors, create and approve orders, view reports' },
  { value: 'WAREHOUSE_STAFF', label: 'Warehouse Staff', description: 'Can receive shipments, scan assets, and view inventory' },
];

const NOTIFICATION_TYPES = [
  { value: 'ORDER_STATUS', label: 'Order Status', description: 'Notifications about purchase order status changes' },
  { value: 'LOW_STOCK', label: 'Low Stock', description: 'Alerts when item quantities fall below reorder thresholds' },
  { value: 'APPROVAL_REQUIRED', label: 'Approval Required', description: 'Notifications when an order needs approval' },
  { value: 'ASSET_ASSIGNED', label: 'Asset Assigned', description: 'Notifications when an asset is assigned to someone' },
  { value: 'SYSTEM', label: 'System', description: 'General platform announcements and system messages' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export default function ManageListsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Custom statuses state
  const [customAssetStatuses, setCustomAssetStatuses] = useState<string[]>([]);
  const [customOrderStatuses, setCustomOrderStatuses] = useState<string[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [newAssetStatus, setNewAssetStatus] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [savingAsset, setSavingAsset] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setCategories(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));

    fetch('/api/settings/lists')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setCustomAssetStatuses(res.data.assetStatuses.custom || []);
          setCustomOrderStatuses(res.data.orderStatuses.custom || []);
        }
      })
      .catch(() => {})
      .finally(() => setListsLoading(false));
  }, []);

  async function saveCustomStatuses(listType: 'asset' | 'order', values: string[]) {
    const setLoading = listType === 'asset' ? setSavingAsset : setSavingOrder;
    setLoading(true);
    try {
      const res = await fetch('/api/settings/lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listType, customValues: values }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Custom ${listType} statuses updated`);
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  }

  function addAssetStatus() {
    const val = newAssetStatus.toUpperCase().trim().replace(/\s+/g, '_');
    if (!val) return;
    const allExisting = [
      ...ASSET_STATUSES.map((s) => s.value),
      ...customAssetStatuses,
    ];
    if (allExisting.includes(val)) {
      toast.error(`"${val}" already exists`);
      return;
    }
    const updated = [...customAssetStatuses, val];
    setCustomAssetStatuses(updated);
    setNewAssetStatus('');
    saveCustomStatuses('asset', updated);
  }

  function removeAssetStatus(val: string) {
    const updated = customAssetStatuses.filter((s) => s !== val);
    setCustomAssetStatuses(updated);
    saveCustomStatuses('asset', updated);
  }

  function addOrderStatus() {
    const val = newOrderStatus.toUpperCase().trim().replace(/\s+/g, '_');
    if (!val) return;
    const allExisting = [
      ...ORDER_STATUSES.map((s) => s.value),
      ...customOrderStatuses,
    ];
    if (allExisting.includes(val)) {
      toast.error(`"${val}" already exists`);
      return;
    }
    const updated = [...customOrderStatuses, val];
    setCustomOrderStatuses(updated);
    setNewOrderStatus('');
    saveCustomStatuses('order', updated);
  }

  function removeOrderStatus(val: string) {
    const updated = customOrderStatuses.filter((s) => s !== val);
    setCustomOrderStatuses(updated);
    saveCustomStatuses('order', updated);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title flex items-center gap-2">
          <List className="h-5 w-5" />
          Manage Lists
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage the configurable dropdown values used throughout the
          platform. Built-in statuses are read-only; you can add custom statuses
          below each list.
        </p>
      </div>

      {/* Asset Statuses */}
      <EditableStatusSection
        icon={<Tag className="h-4 w-4" />}
        title="Asset Statuses"
        description="Status values for inventory assets"
        defaultItems={ASSET_STATUSES}
        customItems={customAssetStatuses}
        loading={listsLoading}
        saving={savingAsset}
        newValue={newAssetStatus}
        onNewValueChange={setNewAssetStatus}
        onAdd={addAssetStatus}
        onRemove={removeAssetStatus}
      />

      {/* Order Statuses */}
      <EditableStatusSection
        icon={<ShoppingCart className="h-4 w-4" />}
        title="Order Statuses"
        description="Status values for purchase orders"
        defaultItems={ORDER_STATUSES}
        customItems={customOrderStatuses}
        loading={listsLoading}
        saving={savingOrder}
        newValue={newOrderStatus}
        onNewValueChange={setNewOrderStatus}
        onAdd={addOrderStatus}
        onRemove={removeOrderStatus}
      />

      {/* User Roles */}
      <ListSection
        icon={<Users className="h-4 w-4" />}
        title="User Roles"
        description="Roles that determine user permissions"
        readOnly
        items={USER_ROLES}
      />

      {/* Notification Types */}
      <ListSection
        icon={<Bell className="h-4 w-4" />}
        title="Notification Types"
        description="Types of notifications the system can generate"
        readOnly
        items={NOTIFICATION_TYPES}
      />

      {/* Item Categories (editable, from database) */}
      <div className="card-base rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Item Categories</h3>
            <Badge variant="secondary" className="text-xs">
              Database
            </Badge>
          </div>
          <Link href="/inventory/categories">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Manage Categories
            </Button>
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Categories used to organize catalog items. These are stored in the
          database and can be added or removed.
        </p>
        <div className="mt-4">
          {categoriesLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-muted" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No categories found.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div>
                    <span className="text-sm font-medium">{cat.name}</span>
                    {cat.description && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {cat.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable status section with add/remove for custom values          */
/* ------------------------------------------------------------------ */

function EditableStatusSection({
  icon,
  title,
  description,
  defaultItems,
  customItems,
  loading,
  saving,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  defaultItems: { value: string; label: string; description: string }[];
  customItems: string[];
  loading: boolean;
  saving: boolean;
  newValue: string;
  onNewValueChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div className="card-base rounded-xl p-6">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4 divide-y rounded-lg border">
        {/* Default (built-in) statuses */}
        {defaultItems.map((item) => (
          <div
            key={item.value}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {item.value}
            </code>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium">{item.label}</span>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Badge variant="outline" className="text-xs gap-1 shrink-0">
              <Info className="h-3 w-3" />
              Built-in
            </Badge>
          </div>
        ))}

        {/* Custom statuses */}
        {loading ? (
          <div className="px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          customItems.map((val) => (
            <div
              key={val}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                {val}
              </code>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">
                  {val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w+/g, (w) => w.toLowerCase())}
                </span>
                <p className="text-xs text-muted-foreground">Custom status</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                Custom
              </Badge>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(val)}
                className="text-destructive hover:text-destructive shrink-0"
                title="Remove custom status"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add new custom status */}
      <div className="mt-3 flex items-center gap-2 max-w-md">
        <Input
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          placeholder="New custom status (e.g., QUARANTINE)"
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={!newValue.trim() || saving}
          className="gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable read-only list section                                    */
/* ------------------------------------------------------------------ */

function ListSection({
  icon,
  title,
  description,
  readOnly,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  readOnly?: boolean;
  items: { value: string; label: string; description: string }[];
}) {
  return (
    <div className="card-base rounded-xl p-6">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        {readOnly && (
          <Badge variant="outline" className="text-xs gap-1">
            <Info className="h-3 w-3" />
            Read-Only
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4 divide-y rounded-lg border">
        {items.map((item) => (
          <div
            key={item.value}
            className="flex items-start gap-3 px-4 py-2.5"
          >
            <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {item.value}
            </code>
            <div className="min-w-0">
              <span className="text-sm font-medium">{item.label}</span>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
