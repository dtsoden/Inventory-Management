'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PlugZap,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DataSource {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    try {
      const res = await fetch('/api/settings/data-sources');
      const data = await res.json();
      if (data.success) {
        setSources(data.data || []);
      }
    } catch {
      toast.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/settings/data-sources/${id}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        const result = data.data;
        toast.success(
          `Sync complete: ${result.created} created, ${result.updated} updated` +
            (result.errors.length > 0 ? `, ${result.errors.length} errors` : '')
        );
        fetchSources();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete data source "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/data-sources/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Data source deleted');
        setSources((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusBadge(source: DataSource) {
    if (!source.lastSyncStatus || source.lastSyncStatus === 'NEVER') {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Never Synced
        </Badge>
      );
    }
    if (source.lastSyncStatus === 'SUCCESS') {
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }

  function truncateUrl(url: string, max = 50) {
    return url.length > max ? url.slice(0, max) + '...' : url;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">External Data Sources</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure API endpoints to import inventory data from external catalogs.
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="card-base rounded-xl p-6 animate-pulse">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-4 w-72 bg-muted rounded mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            External Data Sources
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure API endpoints to import inventory data from external catalogs.
          </p>
        </div>
        <Link href="/settings/data-sources/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Data Source
          </Button>
        </Link>
      </div>

      {sources.length === 0 ? (
        <div className="card-base rounded-xl p-12 text-center">
          <PlugZap className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No data sources configured</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Add an external API endpoint to start importing inventory items.
          </p>
          <Link href="/settings/data-sources/new">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Data Source
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sources.map((source) => (
            <div
              key={source.id}
              className="card-base rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-base">{source.name}</h3>
                  {source.isActive ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {getStatusBadge(source)}
                </div>

                <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono text-xs truncate">
                    {truncateUrl(source.apiUrl)}
                  </span>
                </p>

                {source.lastSyncAt && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    Last synced: {new Date(source.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/settings/data-sources/new?edit=${source.id}`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={syncingId === source.id}
                  onClick={() => handleSync(source.id)}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncingId === source.id ? 'animate-spin' : ''}`}
                  />
                  {syncingId === source.id ? 'Syncing...' : 'Sync'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deletingId === source.id}
                  onClick={() => handleDelete(source.id, source.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
