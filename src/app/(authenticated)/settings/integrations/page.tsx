'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plug,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function IntegrationsSettingsPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [catalogUrl, setCatalogUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Data sources state
  const [sources, setSources] = useState<DataSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/integrations?category=integrations')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setOpenaiKeyMasked(res.data.openaiKeyMasked || '');
          setCatalogUrl(res.data.catalogApiUrl || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

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
      setSourcesLoading(false);
    }
  }

  async function saveOpenAIKey() {
    if (!openaiKey) {
      toast.error('Please enter an API key');
      return;
    }
    setSaving('openai');
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'integrations',
          settings: { openaiApiKey: openaiKey },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('OpenAI API key updated');
        setOpenaiKey('');
        setOpenaiKeyMasked(
          openaiKey.slice(0, 7) + '...' + openaiKey.slice(-4)
        );
      } else {
        toast.error(data.error || 'Failed to save key');
      }
    } catch {
      toast.error('Failed to save key');
    } finally {
      setSaving(null);
    }
  }

  async function saveCatalogUrl() {
    setSaving('catalog');
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'integrations',
          settings: { catalogApiUrl: catalogUrl },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Catalog API URL saved');
      } else {
        toast.error(data.error || 'Failed to save URL');
      }
    } catch {
      toast.error('Failed to save URL');
    } finally {
      setSaving(null);
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
      <div className="card-base rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="ai" className="space-y-6">
      <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0">
        <TabsTrigger value="ai" className="min-w-[120px] rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-brand-green">AI Integration</TabsTrigger>
        <TabsTrigger value="catalog-api" className="min-w-[120px] rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-brand-green">Catalog API</TabsTrigger>
      </TabsList>

      {/* AI Tab */}
      <TabsContent value="ai">
        <div className="card-base rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <Plug className="h-5 w-5" />
                OpenAI Integration
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure your OpenAI API key for the AI assistant feature.
              </p>
            </div>
            <Badge variant={openaiKeyMasked ? 'default' : 'secondary'}>
              {openaiKeyMasked ? 'Configured' : 'Not Set'}
            </Badge>
          </div>

          <div className="mt-6 max-w-lg space-y-4">
            {openaiKeyMasked && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Current key:</span>
                <code className="font-mono">
                  {showKey ? openaiKeyMasked : '••••••••••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="openai-key">
                {openaiKeyMasked ? 'Update API Key' : 'API Key'}
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="openai-key"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1"
                />
                <Button
                  onClick={saveOpenAIKey}
                  disabled={saving === 'openai'}
                  size="sm"
                >
                  {saving === 'openai' ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Catalog API Tab */}
      <TabsContent value="catalog-api">
        <div className="space-y-6">
          {/* Catalog URL Config */}
          <div className="card-base rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Catalog API
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect to an external catalog system for item synchronization.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!catalogUrl && (
                  <button
                    onClick={() => {
                      setCatalogUrl('https://dummyjson.com/products?limit=20&select=title,price,description,category,sku,thumbnail');
                      toast.success('Sample API URL loaded. Hit Save to apply.');
                    }}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'var(--brand-green, #7ed321)', color: '#fff' }}
                  >
                    Try Sample
                  </button>
                )}
                <Badge variant={catalogUrl ? 'default' : 'secondary'}>
                  {catalogUrl ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
            </div>

            <div className="mt-6 max-w-lg space-y-4">
              <div>
                <Label htmlFor="catalog-url">API Base URL</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="catalog-url"
                    value={catalogUrl}
                    onChange={(e) => setCatalogUrl(e.target.value)}
                    placeholder="https://api.example.com/catalog"
                    className="flex-1"
                  />
                  <Button
                    onClick={saveCatalogUrl}
                    disabled={saving === 'catalog'}
                    size="sm"
                  >
                    {saving === 'catalog' ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Any REST API that returns a JSON array of products. This sample uses DummyJSON, a free test API. In production, replace with your vendor&apos;s catalog endpoint.
                </p>
              </div>
            </div>
          </div>

          {/* Data Sources / Field Mappings */}
          <div className="card-base rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Field Mappings
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure API endpoints and map external fields to your inventory schema.
                </p>
              </div>
              <Link href="/settings/data-sources/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Mapping
                </Button>
              </Link>
            </div>

            <div className="mt-6">
              {sourcesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg border p-4">
                      <div className="h-5 w-48 bg-muted rounded" />
                      <div className="h-4 w-72 bg-muted rounded mt-3" />
                    </div>
                  ))}
                </div>
              ) : sources.length === 0 ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
                  <ExternalLink className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <h3 className="mt-3 text-sm font-medium">No field mappings configured</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Add an external API endpoint to start importing inventory items.
                  </p>
                  <Link href="/settings/data-sources/new">
                    <Button className="mt-4 gap-2" variant="outline">
                      <Plus className="h-4 w-4" />
                      Add New Mapping
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-lg border p-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-sm">{source.name}</h3>
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
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
