'use client';

import { useEffect, useState } from 'react';
import { Building2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface OrgSettings {
  tenantName: string;
  tenantSlug: string;
  platformName: string;
}

export default function OrganizationSettingsPage() {
  const [settings, setSettings] = useState<OrgSettings>({
    tenantName: '',
    tenantSlug: '',
    platformName: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/integrations?category=org')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings({
            tenantName: res.data.tenantName || '',
            tenantSlug: res.data.tenantSlug || '',
            platformName: res.data.platformName || 'Shane Inventory',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'org',
          settings: {
            tenantName: settings.tenantName,
            tenantSlug: settings.tenantSlug,
            platformName: settings.platformName,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Organization settings saved');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization profile and branding.
        </p>

        <div className="mt-6 space-y-4 max-w-lg">
          <div>
            <Label htmlFor="tenantName">Organization Name</Label>
            <Input
              id="tenantName"
              className="mt-1.5"
              value={settings.tenantName}
              onChange={(e) =>
                setSettings((s) => ({ ...s, tenantName: e.target.value }))
              }
              placeholder="Acme Corporation"
            />
          </div>

          <div>
            <Label htmlFor="tenantSlug">URL Slug</Label>
            <Input
              id="tenantSlug"
              className="mt-1.5"
              value={settings.tenantSlug}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  tenantSlug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-'),
                }))
              }
              placeholder="acme-corp"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Used in URLs and API references. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div>
            <Label htmlFor="platformName">Platform Name</Label>
            <Input
              id="platformName"
              className="mt-1.5"
              value={settings.platformName}
              onChange={(e) =>
                setSettings((s) => ({ ...s, platformName: e.target.value }))
              }
              placeholder="Shane Inventory"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Displayed in the header and browser title.
            </p>
          </div>
        </div>
      </div>

      {/* Logo upload placeholder */}
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title">Logo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your organization logo for branding.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25">
            <Upload className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <Button variant="outline" size="sm" disabled>
              Upload Logo
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, or SVG. Max 2MB. (Coming soon)
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
