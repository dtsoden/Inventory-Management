'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  Tag,
  User,
  MapPin,
  Calendar,
  History,
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  ShieldCheck,
  FileText,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface AssetDetail {
  id: string;
  assetTag: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  location: string | null;
  assignedTo: string | null;
  notes: string | null;
  purchasedAt: string | null;
  warrantyUntil: string | null;
  createdAt: string;
  updatedAt: string;
  item?: {
    id: string;
    name: string;
    sku: string | null;
    categoryId: string | null;
    category?: { id: string; name: string } | null;
    vendor?: { id: string; name: string } | null;
  };
}

interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'status-badge status-available' },
  ASSIGNED: { label: 'Assigned', className: 'status-badge status-info' },
  IN_MAINTENANCE: { label: 'Maintenance', className: 'status-badge status-warning' },
  RETIRED: {
    label: 'Retired',
    className:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-medium',
  },
  LOST: {
    label: 'Lost',
    className:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-medium',
  },
};

const ALL_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_MAINTENANCE', label: 'In Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'LOST', label: 'Lost' },
];

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  ASSIGN: 'Assigned',
  UNASSIGN: 'Unassigned',
  STATUS_CHANGE: 'Status Changed',
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'status-badge',
  };
  return <span className={config.className}>{config.label}</span>;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/${id}`);
      if (!res.ok) throw new Error('Failed to load asset');
      const json = await res.json();
      setAsset(json.data);
    } catch {
      toast.error('Failed to load asset details');
      router.push('/inventory');
    }
  }, [id, router]);

  const fetchAuditLog = useCallback(async () => {
    try {
      // Fetch audit logs via a general query; the API can be extended later
      // For now we rely on the asset detail endpoint data
    } catch {
      // Non-critical, silently fail
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAsset(), fetchAuditLog()]).finally(() =>
      setLoading(false)
    );
  }, [fetchAsset, fetchAuditLog]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to change status');
      }
      toast.success(`Status changed to ${newStatus}`);
      fetchAsset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change status');
    }
  };

  const handleAssign = async () => {
    if (!assignUserId.trim()) {
      toast.error('Please enter a user identifier');
      return;
    }
    try {
      const res = await fetch(`/api/inventory/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assignUserId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign');
      }
      toast.success('Asset assigned successfully');
      setAssignOpen(false);
      setAssignUserId('');
      fetchAsset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign asset');
    }
  };

  const handleUnassign = async () => {
    try {
      const res = await fetch(`/api/inventory/${id}/assign`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to unassign');
      }
      toast.success('Asset unassigned');
      fetchAsset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unassign asset');
    }
  };

  const handleEdit = () => {
    if (!asset) return;
    setEditForm({
      assetTag: asset.assetTag ?? '',
      serialNumber: asset.serialNumber ?? '',
      location: asset.location ?? '',
      condition: asset.condition ?? '',
      notes: asset.notes ?? '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Asset updated');
      setEditing(false);
      fetchAsset();
    } catch {
      toast.error('Failed to update asset');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Asset deleted');
      router.push('/inventory');
    } catch {
      toast.error('Failed to delete asset');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-base rounded-xl p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card-base rounded-xl p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/inventory')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h1 className="page-title">
              {asset.assetTag || 'Untagged Asset'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {asset.item?.name ?? 'Unknown Item'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={asset.status} />
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Information */}
          <div className="card-base rounded-xl p-6">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Asset Information
            </h2>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Asset Tag</Label>
                  <Input
                    value={editForm.assetTag}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, assetTag: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={editForm.serialNumber}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        serialNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Condition</Label>
                  <Input
                    value={editForm.condition}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, condition: e.target.value }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  icon={<Tag className="h-4 w-4" />}
                  label="Asset Tag"
                  value={asset.assetTag}
                />
                <InfoRow
                  icon={<Tag className="h-4 w-4" />}
                  label="Serial Number"
                  value={asset.serialNumber}
                  mono
                />
                <InfoRow
                  icon={<Package className="h-4 w-4" />}
                  label="Item"
                  value={asset.item?.name}
                />
                <InfoRow
                  icon={<Tag className="h-4 w-4" />}
                  label="SKU"
                  value={asset.item?.sku}
                  mono
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={asset.location}
                />
                <InfoRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Condition"
                  value={asset.condition}
                />
                {asset.item?.category && (
                  <InfoRow
                    icon={<Package className="h-4 w-4" />}
                    label="Category"
                    value={asset.item.category.name}
                  />
                )}
                {asset.item?.vendor && (
                  <InfoRow
                    icon={<Package className="h-4 w-4" />}
                    label="Vendor"
                    value={asset.item.vendor.name}
                  />
                )}
                {asset.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Notes
                    </p>
                    <p className="text-sm">{asset.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dates / Origin */}
          <div className="card-base rounded-xl p-6">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Dates and Origin
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Created"
                value={formatDate(asset.createdAt)}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Last Updated"
                value={formatDate(asset.updatedAt)}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Purchased"
                value={formatDate(asset.purchasedAt)}
              />
              <InfoRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Warranty Until"
                value={formatDate(asset.warrantyUntil)}
              />
            </div>
          </div>

          {/* Audit History */}
          <div className="card-base rounded-xl p-6">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-muted-foreground" />
              Activity History
            </h2>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No activity recorded yet. Actions on this asset will appear
                here.
              </p>
            ) : (
              <div className="space-y-4">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 w-px bg-border" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      {entry.user && (
                        <p className="text-xs text-muted-foreground">
                          by {entry.user.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="card-base rounded-xl p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Status
            </h3>
            <div className="mb-4">
              <StatusBadge status={asset.status} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="w-full">
                    Change Status
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start">
                {ALL_STATUSES.filter((s) => s.value !== asset.status).map(
                  (s) => (
                    <DropdownMenuItem
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                    >
                      {s.label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Assignment */}
          <div className="card-base rounded-xl p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Assignment
            </h3>
            {asset.assignedTo ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{asset.assignedTo}</p>
                    <p className="text-xs text-muted-foreground">
                      Currently assigned
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleUnassign}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Unassign
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Not currently assigned to anyone
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAssignOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>
              Enter the name or identifier of the person to assign this asset
              to.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Assign To</Label>
            <Input
              placeholder="Name or user ID"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}
