'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  ArrowLeft,
  Pencil,
  Power,
  UserCircle,
  Package,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VendorFormSheet } from '../vendor-form-sheet';
import { apiFetch } from '@/lib/client/BaseApiClient';

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

function InteractiveStarRating({
  rating,
  onRate,
}: {
  rating: number | null;
  onRate: (value: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const filled = hovered ?? rating ?? 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onRate(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              star <= filled
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {rating !== null ? `${rating}/5` : 'Not rated'}
      </span>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#742873] hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchVendor = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/vendors/${id}`);
      const json = await res.json();
      if (json.success) {
        setVendor(json.data);
      } else {
        toast.error(json.error || 'Vendor not found');
        router.push('/vendors');
      }
    } catch {
      toast.error('Failed to load vendor');
      router.push('/vendors');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  const handleRate = async (rating: number) => {
    try {
      const res = await apiFetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vendor, rating }),
      });
      const json = await res.json();
      if (json.success) {
        setVendor(json.data);
        toast.success(`Rating updated to ${rating}/5`);
      } else {
        toast.error(json.error || 'Failed to update rating');
      }
    } catch {
      toast.error('Failed to update rating');
    }
  };

  const handleDeactivate = async () => {
    if (!vendor) return;
    try {
      const res = await apiFetch(`/api/vendors/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Vendor deactivated');
        router.push('/vendors');
      } else {
        toast.error(json.error || 'Failed to deactivate vendor');
      }
    } catch {
      toast.error('Failed to deactivate vendor');
    }
  };

  const handleSaved = () => {
    setSheetOpen(false);
    fetchVendor();
  };

  if (loading) {
    return (
      <div>
        <DetailSkeleton />
      </div>
    );
  }

  if (!vendor) return null;

  const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zip, vendor.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/vendors')}
            aria-label="Back to vendors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#742873]/10 text-[#742873]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title text-xl">{vendor.name}</h1>
            {vendor.contactName && (
              <p className="text-sm text-muted-foreground">
                Contact: {vendor.contactName}
              </p>
            )}
          </div>
          <Badge
            variant={vendor.isActive ? 'default' : 'secondary'}
            className="ml-2"
          >
            {vendor.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          {vendor.isActive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              className="gap-1.5"
            >
              <Power className="h-3.5 w-3.5" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content area */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="card-base rounded-xl p-6">
                <h3 className="section-title text-sm font-semibold mb-4">
                  Contact Information
                </h3>
                <div className="grid gap-1 sm:grid-cols-2">
                  <DetailRow
                    icon={Mail}
                    label="Email"
                    value={vendor.email}
                    href={`mailto:${vendor.email}`}
                  />
                  <DetailRow icon={Phone} label="Phone" value={vendor.phone} />
                  <DetailRow
                    icon={Globe}
                    label="Website"
                    value={vendor.website}
                    href={vendor.website ?? undefined}
                  />
                  <DetailRow
                    icon={UserCircle}
                    label="Contact Person"
                    value={vendor.contactName}
                  />
                </div>

                {fullAddress && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="section-title text-sm font-semibold mb-4">
                      Address
                    </h3>
                    <DetailRow icon={MapPin} label="Full Address" value={fullAddress} />
                  </>
                )}

                {vendor.notes && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="section-title text-sm font-semibold mb-3">
                      Notes
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {vendor.notes}
                    </p>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="items" className="mt-4">
              <div className="card-base flex flex-col items-center justify-center rounded-xl py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">No items yet</h3>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Items supplied by this vendor will appear here once
                  inventory items are linked.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              <div className="card-base flex flex-col items-center justify-center rounded-xl py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">No orders yet</h3>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Purchase orders placed with this vendor will appear here
                  once orders are created.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Rating Card */}
          <div className="card-base rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Vendor Rating</h3>
            <InteractiveStarRating
              rating={vendor.rating}
              onRate={handleRate}
            />
          </div>

          {/* Quick Info Card */}
          <div className="card-base rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(vendor.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">
                  {new Date(vendor.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {(vendor.city || vendor.state || vendor.country) && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-right">
                      {[vendor.city, vendor.state, vendor.country]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      <VendorFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendor={vendor}
        onSaved={handleSaved}
      />
    </div>
  );
}
