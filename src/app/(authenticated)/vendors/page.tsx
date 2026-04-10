'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Star,
  MapPin,
  Globe,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VendorFormSheet } from './vendor-form-sheet';

interface Vendor {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function StarRating({ rating }: { rating: number | null }) {
  const filled = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= filled
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

function VendorCardSkeleton() {
  return (
    <div className="card-base rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-32 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

function VendorTableSkeleton() {
  return (
    <div className="card-base rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '12',
        sortField: 'name',
        sortDirection: 'asc',
      });
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      const res = await fetch(`/api/vendors?${params}`);
      const json = await res.json();
      if (json.success) {
        const result = json.data as PaginatedResponse;
        setVendors(result.data);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        toast.error(json.error || 'Failed to load vendors');
      }
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleCreate = () => {
    setEditingVendor(null);
    setSheetOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setSheetOpen(true);
  };

  const handleSaved = () => {
    setSheetOpen(false);
    setEditingVendor(null);
    fetchVendors();
  };

  return (
    <div>
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your suppliers and vendor relationships
          </p>
        </div>
        <Button onClick={handleCreate} className="btn-pill gap-1.5">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <VendorCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <VendorTableSkeleton />
          )
        ) : vendors.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center rounded-xl py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No vendors found</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {debouncedSearch
                ? `No vendors match "${debouncedSearch}". Try adjusting your search.`
                : 'Get started by adding your first vendor to manage supplier relationships.'}
            </p>
            {!debouncedSearch && (
              <Button onClick={handleCreate} className="btn-pill mt-5 gap-1.5">
                <Plus className="h-4 w-4" />
                Add Your First Vendor
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => router.push(`/vendors/${vendor.id}`)}
                className="card-base group cursor-pointer rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#742873]/10 text-[#742873]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold group-hover:text-[#742873] transition-colors">
                        {vendor.name}
                      </h3>
                      {vendor.contactName && (
                        <p className="truncate text-xs text-muted-foreground">
                          {vendor.contactName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {(vendor.city || vendor.state) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {vendor.rating !== null && (
                  <div className="mt-3 pt-3 border-t">
                    <StarRating rating={vendor.rating} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card-base rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      onClick={() => router.push(`/vendors/${vendor.id}`)}
                      className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#742873]/10 text-[#742873]">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{vendor.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {vendor.contactName || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{vendor.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{vendor.phone || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[vendor.city, vendor.state].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StarRating rating={vendor.rating} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(vendor);
                          }}
                        >
                          Edit
                        </Button>
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
            Showing {(page - 1) * 12 + 1} to {Math.min(page * 12, total)} of{' '}
            {total} vendors
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Vendor Form Sheet */}
      <VendorFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendor={editingVendor}
        onSaved={handleSaved}
      />
    </div>
  );
}
