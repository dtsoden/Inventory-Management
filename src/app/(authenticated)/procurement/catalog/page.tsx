'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Pencil,
  Archive,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unitCost: number | null;
  vendorId: string | null;
  categoryId: string | null;
  isActive: boolean;
  vendor?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUnitCost, setFormUnitCost] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '200' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/procurement/items?${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.data ?? []);
      }
    } catch {
      console.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormDescription('');
    setFormUnitCost('');
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: CatalogItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormSku(item.sku ?? '');
    setFormDescription(item.description ?? '');
    setFormUnitCost(item.unitCost?.toString() ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        sku: formSku.trim() || null,
        description: formDescription.trim() || null,
        unitCost: formUnitCost ? parseFloat(formUnitCost) : null,
      };

      const url = editingItem
        ? `/api/procurement/items/${editingItem.id}`
        : '/api/procurement/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        setDialogOpen(false);
        resetForm();
        fetchItems();
      } else {
        alert(json.error ?? 'Failed to save item');
      }
    } catch {
      alert('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item: CatalogItem) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/procurement/items/${item.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      } else {
        alert(json.error ?? 'Failed to deactivate item');
      }
    } catch {
      alert('An unexpected error occurred');
    }
  };

  // Group items by vendor
  const groupedItems = items.reduce<Record<string, CatalogItem[]>>(
    (acc, item) => {
      const group = item.vendor?.name ?? item.category?.name ?? 'Uncategorized';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="size-6" />
            Item Catalog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage catalog items for procurement
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" data-icon="inline-start" />
          Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="mt-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Package className="size-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No items found
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Add items to your catalog to use in purchase orders.
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="size-4" data-icon="inline-start" />
              Add Item
            </Button>
          </div>
        ) : (
          Object.entries(groupedItems).map(([group, groupItems]) => (
            <div key={group} className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupItems.map((item) => (
                  <Card key={item.id} size="sm" className="group relative">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium">
                            {item.name}
                          </h3>
                          {item.sku && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="ml-2 shrink-0 font-mono"
                        >
                          {formatCurrency(item.unitCost)}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-1">
                        {item.vendor && (
                          <Badge variant="outline" className="text-xs">
                            {item.vendor.name}
                          </Badge>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="size-3" data-icon="inline-start" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeactivate(item)}
                        >
                          <Archive
                            className="size-3"
                            data-icon="inline-start"
                          />
                          Deactivate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add Catalog Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="itemName">Name *</Label>
              <Input
                id="itemName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Item name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="itemSku">SKU</Label>
              <Input
                id="itemSku"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. WIDGET-001"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="itemCost">Unit Cost ($)</Label>
              <Input
                id="itemCost"
                type="number"
                step="0.01"
                min={0}
                value={formUnitCost}
                onChange={(e) => setFormUnitCost(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="itemDesc">Description</Label>
              <Textarea
                id="itemDesc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving
                ? 'Saving...'
                : editingItem
                  ? 'Update Item'
                  : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
