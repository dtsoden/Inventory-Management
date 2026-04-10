'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Save,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

interface LineItem {
  key: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

const WORKFLOW_STEPS = [
  { label: 'Select Vendor', step: 1 },
  { label: 'Order Details', step: 2 },
  { label: 'Line Items', step: 3 },
];

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: typeof WORKFLOW_STEPS;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.step} className="flex items-center gap-2">
          <div
            className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              currentStep >= s.step
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.step}
          </div>
          <span
            className={`text-sm font-medium ${
              currentStep >= s.step
                ? 'text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}

function generateKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Vendor
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Step 2: Details
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  // Step 3: Lines
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [lines, setLines] = useState<LineItem[]>([
    { key: generateKey(), itemId: '', itemName: '', quantity: 1, unitCost: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0);

  // Fetch vendors
  useEffect(() => {
    fetch('/api/procurement/items?pageSize=1')
      .then((r) => r.json())
      .catch(() => null);
    // Fetch actual vendors from a generic endpoint
    // For now, derive vendors from items
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/procurement/items?pageSize=200');
      const json = await res.json();
      if (json.success) {
        const items: CatalogItem[] = json.data.data ?? [];
        // Derive unique vendor names as a fallback
        const vendorMap = new Map<string, Vendor>();
        items.forEach((item) => {
          if (item.vendorId) {
            vendorMap.set(item.vendorId, {
              id: item.vendorId,
              name: item.vendorId,
            });
          }
        });
        setVendors(Array.from(vendorMap.values()));
        setCatalogItems(items);
      }
    } catch {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Filtered items for the selected vendor
  const filteredItems = selectedVendor
    ? catalogItems.filter((i) => i.vendorId === selectedVendor.id)
    : catalogItems;

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const subtotal = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitCost,
    0
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addLine = () => {
    setLines([
      ...lines,
      { key: generateKey(), itemId: '', itemName: '', quantity: 1, unitCost: 0 },
    ]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, field: keyof LineItem, value: string | number) => {
    setLines(
      lines.map((l) => {
        if (l.key !== key) return l;
        if (field === 'itemId') {
          const item = catalogItems.find((ci) => ci.id === value);
          return {
            ...l,
            itemId: value as string,
            itemName: item?.name ?? '',
            unitCost: item?.unitCost ?? 0,
          };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitting(true);
    try {
      const validLines = lines.filter((l) => l.itemId);
      const body = {
        vendorName: selectedVendor?.name ?? vendorSearch || 'Unknown Vendor',
        notes: notes || undefined,
        expectedDate: expectedDate || undefined,
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      };

      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        alert(json.error ?? 'Failed to create order');
        return;
      }

      const orderId = json.data.id;

      if (!asDraft) {
        // Submit for approval
        await fetch(`/api/procurement/orders/${orderId}/submit`, {
          method: 'POST',
        });
      }

      router.push(`/procurement/orders/${orderId}`);
    } catch {
      alert('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  return (
    <div>
      <div className="page-header">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push('/procurement')}
        >
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Orders
        </Button>
        <h1 className="page-title flex items-center gap-2">
          <ShoppingCart className="size-6" />
          Create Purchase Order
        </h1>
      </div>

      <div className="mt-6">
        <StepIndicator currentStep={step} steps={WORKFLOW_STEPS} />
      </div>

      <div className="mt-6 space-y-6">
        {/* Step 1: Select Vendor */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Vendor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vendorSearch">Vendor Name</Label>
                <Input
                  id="vendorSearch"
                  placeholder="Search or type vendor name..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {filteredVendors.length > 0 && (
                <div className="space-y-1">
                  {filteredVendors.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                        selectedVendor?.id === v.id
                          ? 'bg-primary/10 font-medium text-primary'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedVendor(v);
                        setVendorSearch(v.name);
                      }}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!vendorSearch.trim()}
                >
                  Next
                  <ChevronRight className="size-4" data-icon="inline-end" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Reason / Notes */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Reason / Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the purpose of this order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="expectedDate">Expected Delivery Date</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="mt-1.5 w-48"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next
                  <ChevronRight className="size-4" data-icon="inline-end" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Line Items */}
        {step === 3 && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="size-4" data-icon="inline-start" />
                  Add Row
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Item
                        </th>
                        <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">
                          Qty
                        </th>
                        <th className="w-36 px-3 py-2 text-left font-medium text-muted-foreground">
                          Unit Price
                        </th>
                        <th className="w-36 px-3 py-2 text-right font-medium text-muted-foreground">
                          Line Total
                        </th>
                        <th className="w-12 px-3 py-2">{' '}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.key} className="border-b">
                          <td className="px-3 py-2">
                            <select
                              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                              value={line.itemId}
                              onChange={(e) =>
                                updateLine(line.key, 'itemId', e.target.value)
                              }
                            >
                              <option value="">Select item...</option>
                              {(filteredItems.length > 0
                                ? filteredItems
                                : catalogItems
                              ).map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                  {item.sku ? ` (${item.sku})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(
                                  line.key,
                                  'quantity',
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={line.unitCost}
                              onChange={(e) =>
                                updateLine(
                                  line.key,
                                  'unitCost',
                                  Math.max(
                                    0,
                                    parseFloat(e.target.value) || 0
                                  )
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(line.quantity * line.unitCost)}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeLine(line.key)}
                              disabled={lines.length <= 1}
                            >
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="ml-auto max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tax</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={taxRate}
                        onChange={(e) =>
                          setTaxRate(parseFloat(e.target.value) || 0)
                        }
                        className="h-6 w-16 px-1 text-center text-xs"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <span className="font-mono">{formatCurrency(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                >
                  <Save className="size-4" data-icon="inline-start" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  <Send className="size-4" data-icon="inline-start" />
                  Submit for Approval
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
