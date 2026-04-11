'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Package,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Factory,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface StockCounts {
  total: number;
  available: number;
  assigned: number;
  inMaintenance: number;
  retired: number;
  lost: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  manufacturerPartNumber: string | null;
  unitCost: number | null;
  reorderPoint: number;
  reorderQuantity: number;
  manufacturer: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  stock: StockCounts;
  isLowStock: boolean;
}

interface PaginatedResponse {
  data: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortField', sortField);
      params.set('sortDirection', sortDirection);
      if (searchQuery) params.set('search', searchQuery);
      if (lowStockOnly) params.set('lowStock', 'true');

      const res = await fetch(`/api/inventory/items?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load inventory');
      const json = await res.json();
      const result: PaginatedResponse = json.data;
      setItems(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, sortField, sortDirection, lowStockOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Boxes className="h-7 w-7 text-primary" />
          <h1 className="page-title">Inventory</h1>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {total} item{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/inventory/manufacturers')}
          >
            <Factory className="h-4 w-4 mr-1" />
            Manufacturers
          </Button>
          <Button
            size="sm"
            className="bg-brand-green hover:bg-brand-green/90"
            onClick={() => router.push('/inventory/new')}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Item
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by item, SKU, manufacturer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={lowStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setLowStockOnly((v) => !v);
              setPage(1);
            }}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Low Stock Only
          </Button>
        </div>
      </div>

      {/* Low stock warning banner */}
      {!loading && !lowStockOnly && lowStockCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-400">
            {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} on this page
            {lowStockCount !== 1 ? ' are' : ' is'} below the reorder point.
          </span>
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <EmptyState hasFilters={!!searchQuery || lowStockOnly} />
        ) : (
          <div className="card-base rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left">
                      <SortHeader field="name">Product</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader field="sku">SKU</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Manufacturer
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Vendor
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Total
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Available
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Assigned
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        In Maint.
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader field="reorderPoint">Reorder Pt</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/inventory/items/${item.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.category && (
                              <p className="text-xs text-muted-foreground">
                                {item.category.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.sku || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {item.manufacturer ? (
                          <div>
                            <p className="text-sm">{item.manufacturer.name}</p>
                            {item.manufacturerPartNumber && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {item.manufacturerPartNumber}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.vendor?.name ?? <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.stock.total}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={item.isLowStock ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                          {item.stock.available}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.stock.assigned}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.stock.inMaintenance}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.reorderPoint > 0 ? item.reorderPoint : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card-base rounded-xl overflow-hidden">
      <div className="p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="card-base rounded-xl flex flex-col items-center justify-center py-16">
      <Boxes className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">
        {hasFilters ? 'No matching items' : 'No inventory items yet'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
        {hasFilters
          ? 'Try adjusting your search or filters.'
          : 'Add catalog items to begin tracking stock levels.'}
      </p>
    </div>
  );
}
