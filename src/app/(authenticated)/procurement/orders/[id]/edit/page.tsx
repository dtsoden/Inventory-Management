'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface Vendor {
  id: string;
  name: string;
}

interface CatalogItem {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number | null;
  vendorId: string | null;
}

interface OrderLine {
  id: string | null; // null = newly added, not yet persisted
  itemId: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  vendorName: string | null;
  notes: string | null;
  expectedDate: string | null;
  totalAmount: number;
  lines: Array<{
    id: string;
    itemId: string;
    quantity: number;
    unitCost: number;
    item?: { id: string; name: string; sku: string | null };
  }>;
}

function genKey(): string {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  // Track which existing line ids the user removed so we can DELETE them on save.
  const [removedLineIds, setRemovedLineIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const [orderRes, vendorsRes, itemsRes] = await Promise.all([
        apiFetch(`/api/procurement/orders/${orderId}`),
        apiFetch('/api/vendors'),
        apiFetch('/api/procurement/items'),
      ]);
      const orderJson = await orderRes.json();
      const vendorsJson = await vendorsRes.json();
      const itemsJson = await itemsRes.json();

      if (!orderJson.success || !orderJson.data) {
        setError('Order not found.');
        return;
      }
      const o: PurchaseOrder = orderJson.data;
      if (o.status !== 'DRAFT') {
        setError(
          `This order is in ${o.status} status and cannot be edited. Use Revoke & Amend on the detail page to send it back to DRAFT.`,
        );
        setOrder(o);
        return;
      }
      setOrder(o);
      setVendorName(o.vendorName ?? '');
      setNotes(o.notes ?? '');
      setExpectedDate(o.expectedDate ? o.expectedDate.slice(0, 10) : '');
      setLines(
        (o.lines ?? []).map((l) => ({
          id: l.id,
          itemId: l.itemId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      );
      if (vendorsJson.success && vendorsJson.data) {
        setVendors(vendorsJson.data.data ?? vendorsJson.data ?? []);
      }
      if (itemsJson.success && itemsJson.data) {
        setCatalogItems(itemsJson.data.data ?? itemsJson.data ?? []);
      }
    } catch {
      setError('Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  function updateLine(index: number, field: keyof OrderLine, value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      const target = { ...next[index] };
      if (field === 'itemId') {
        target.itemId = value as string;
        // Auto-fill unit cost from the catalog item
        const item = catalogItems.find((i) => i.id === value);
        if (item && item.unitCost != null) {
          target.unitCost = item.unitCost;
        }
      } else if (field === 'quantity') {
        target.quantity = Math.max(1, Number(value) || 1);
      } else if (field === 'unitCost') {
        target.unitCost = Math.max(0, Number(value) || 0);
      }
      next[index] = target;
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: null, itemId: '', quantity: 1, unitCost: 0 },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => {
      const target = prev[index];
      if (target?.id) setRemovedLineIds((r) => [...r, target.id!]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSave() {
    if (!order) return;
    if (lines.length === 0) {
      alert('A purchase order needs at least one line item.');
      return;
    }
    if (lines.some((l) => !l.itemId)) {
      alert('Every line needs an item selected.');
      return;
    }
    setSaving(true);
    try {
      // 1. Update order header
      const headerRes = await apiFetch(`/api/procurement/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName,
          notes: notes || null,
          expectedDate: expectedDate || null,
        }),
      });
      const headerJson = await headerRes.json();
      if (!headerJson.success) {
        alert(headerJson.error ?? 'Failed to update order');
        return;
      }

      // 2. Delete removed lines
      for (const lineId of removedLineIds) {
        await apiFetch(
          `/api/procurement/orders/${orderId}/lines/${lineId}`,
          { method: 'DELETE' },
        );
      }

      // 3. Update existing lines and create new ones
      for (const line of lines) {
        const payload = {
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost,
        };
        if (line.id) {
          await apiFetch(
            `/api/procurement/orders/${orderId}/lines/${line.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          );
        } else {
          await apiFetch(`/api/procurement/orders/${orderId}/lines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      router.push(`/procurement/orders/${orderId}`);
    } catch {
      alert('An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="size-12 text-muted-foreground/40" />
        <p className="mt-4 max-w-xl text-center text-base text-muted-foreground">
          {error}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/procurement/orders/${orderId}`)}
        >
          Back to Order
        </Button>
      </div>
    );
  }

  if (!order) return null;

  // Filter catalog by selected vendor
  const filteredItems = vendorName
    ? catalogItems.filter((i) => {
        const vendor = vendors.find((v) => v.name === vendorName);
        return !i.vendorId || (vendor && i.vendorId === vendor.id);
      })
    : catalogItems;

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push(`/procurement/orders/${orderId}`)}
        >
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Order
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Edit {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Make changes to the draft and save when ready. Submit for approval
              from the order detail page.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" data-icon="inline-start" />
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={vendorName || undefined}
                onValueChange={(value) => setVendorName(value ?? '')}
              >
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDate">Expected delivery</Label>
              <Input
                id="expectedDate"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for this order..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-4" data-icon="inline-start" />
              Add line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No line items yet. Click <strong>Add line</strong> to start.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Unit cost</th>
                    <th className="px-3 py-2 text-right font-medium">Line total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id ?? `new-${index}`} className="border-b">
                      <td className="px-3 py-2">
                        <Select
                          value={line.itemId || undefined}
                          onValueChange={(value) =>
                            updateLine(index, 'itemId', value ?? '')
                          }
                        >
                          <SelectTrigger className="h-8 w-full min-w-0 text-sm">
                            <SelectValue placeholder="Select item..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(filteredItems.length > 0
                              ? filteredItems
                              : catalogItems
                            ).map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                                {item.sku ? ` (${item.sku})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(index, 'quantity', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          className="h-8 w-28"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(index, 'unitCost', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        ${(line.quantity * line.unitCost).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => removeLine(index)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold">
                      Subtotal
                    </td>
                    <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/procurement/orders/${orderId}`)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4" data-icon="inline-start" />
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
