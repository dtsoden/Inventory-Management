'use client';

import { useEffect, useState, useCallback } from 'react';
import { Database, Trash2, Check, Loader2, Package, ShoppingCart, Tag, Monitor, Building2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SampleDataCounts {
  vendors: number;
  items: number;
  categories: number;
  orders: number;
  assets: number;
}

interface SampleDataStatus {
  isLoaded: boolean;
  counts: SampleDataCounts;
}

const EXPECTED_COUNTS: SampleDataCounts = {
  vendors: 6,
  items: 30,
  categories: 5,
  orders: 8,
  assets: 40,
};

const countCards = [
  { key: 'vendors' as const, label: 'Vendors', icon: Building2 },
  { key: 'categories' as const, label: 'Categories', icon: Tag },
  { key: 'items' as const, label: 'Catalog Items', icon: Package },
  { key: 'orders' as const, label: 'Purchase Orders', icon: ShoppingCart },
  { key: 'assets' as const, label: 'Assets', icon: Monitor },
];

export default function SampleDataPage() {
  const [status, setStatus] = useState<SampleDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/sample-data');
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      }
    } catch {
      toast.error('Failed to load sample data status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleInsert() {
    setProcessing(true);
    try {
      const res = await fetch('/api/settings/sample-data', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        toast.success('Sample data loaded successfully.');
        await fetchStatus();
      } else {
        toast.error(json.error || 'Failed to insert sample data.');
      }
    } catch {
      toast.error('Failed to insert sample data.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemove() {
    setShowConfirmDialog(false);
    setProcessing(true);
    try {
      const res = await fetch('/api/settings/sample-data', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Sample data removed successfully.');
        await fetchStatus();
      } else {
        toast.error(json.error || 'Failed to remove sample data.');
      }
    } catch {
      toast.error('Failed to remove sample data.');
    } finally {
      setProcessing(false);
    }
  }

  function handleToggle(checked: boolean) {
    if (checked) {
      handleInsert();
    } else {
      setShowConfirmDialog(true);
    }
  }

  const isLoaded = status?.isLoaded ?? false;
  const counts = isLoaded ? status!.counts : EXPECTED_COUNTS;

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="card-base rounded-xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-lg bg-brand-green/10 p-3">
            <Database className="h-6 w-6" style={{ color: 'var(--brand-green)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Sample Data</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Load sample data to explore the platform with realistic demo content.
              Toggling off will remove all sample data.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-5 mb-8">
          <div className="space-y-1">
            <Label htmlFor="sample-data-toggle" className="text-base font-medium">
              {isLoaded ? 'Sample data is active' : 'Enable sample data'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isLoaded
                ? 'Demo content is currently loaded in your account.'
                : 'Insert demo vendors, items, purchase orders, and assets.'}
            </p>
          </div>
          {loading ? (
            <div className="h-6 w-11 animate-pulse rounded-full bg-muted" />
          ) : (
            <Switch
              id="sample-data-toggle"
              checked={isLoaded}
              onCheckedChange={handleToggle}
              disabled={processing}
            />
          )}
        </div>

        {/* Count Grid */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {isLoaded ? 'Currently loaded' : 'Will be created'}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {countCards.map((card) => (
              <div
                key={card.key}
                className="flex flex-col items-center gap-1.5 rounded-lg border p-4 text-center"
              >
                <card.icon className="h-5 w-5 text-muted-foreground" />
                {loading ? (
                  <div className="h-7 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  <span className="text-2xl font-bold">{counts[card.key]}</span>
                )}
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Processing overlay */}
        {processing && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-dashed p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isLoaded ? 'Removing sample data...' : 'Inserting sample data...'}
            </span>
          </div>
        )}

        {/* Status indicator */}
        {!loading && !processing && isLoaded && (
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Sample data is loaded and ready to explore.
            </span>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove Sample Data
            </DialogTitle>
            <DialogDescription>
              This will delete all sample data. Your real data will not be affected.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove All Sample Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
