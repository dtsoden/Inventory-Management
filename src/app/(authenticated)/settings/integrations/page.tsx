'use client';

import { useEffect, useState } from 'react';
import { Plug, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function IntegrationsSettingsPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [catalogUrl, setCatalogUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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
  }, []);

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
    <div className="space-y-6">
      {/* OpenAI Integration */}
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

      {/* Catalog API */}
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
          <Badge variant={catalogUrl ? 'default' : 'secondary'}>
            {catalogUrl ? 'Configured' : 'Not Set'}
          </Badge>
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
          </div>

          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Drag-and-drop field mapping will be available in a future release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
