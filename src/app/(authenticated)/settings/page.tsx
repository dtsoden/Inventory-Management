'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Building2, Upload, Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useBranding } from '@/components/providers/BrandingProvider';

interface OrgSettings {
  tenantName: string;
  tenantSlug: string;
  platformName: string;
}

interface BrandingSettings {
  appName: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

export default function OrganizationSettingsPage() {
  const { branding, refresh: refreshBranding } = useBranding();

  const [settings, setSettings] = useState<OrgSettings>({
    tenantName: '',
    tenantSlug: '',
    platformName: '',
  });
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    appName: '',
    primaryColorLight: '#7ed321',
    primaryColorDark: '#7ed321',
    logoUrl: null,
    faviconUrl: null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function safeFetch(url: string) {
      const r = await fetch(url);
      if (r.status === 401 || r.redirected) {
        window.location.href = '/login';
        return { success: false };
      }
      return r.json();
    }

    Promise.all([
      safeFetch('/api/settings/integrations?category=org'),
      safeFetch('/api/settings/branding'),
    ])
      .then(([orgRes, brandingRes]) => {
        if (orgRes.success && orgRes.data) {
          setSettings({
            tenantName: orgRes.data.tenantName || '',
            tenantSlug: orgRes.data.tenantSlug || '',
            platformName: orgRes.data.platformName || 'Shane Inventory',
          });
        }
        if (brandingRes.success && brandingRes.data) {
          setBrandingSettings({
            appName: brandingRes.data.appName || '',
            primaryColorLight: brandingRes.data.primaryColorLight || '#7ed321',
            primaryColorDark: brandingRes.data.primaryColorDark || '#7ed321',
            logoUrl: brandingRes.data.logoUrl || null,
            faviconUrl: brandingRes.data.faviconUrl || null,
          });
          if (brandingRes.data.logoUrl) {
            setLogoPreview(brandingRes.data.logoUrl);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PNG, JPG, SVG, WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/settings/branding/logo', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setBrandingSettings((s) => ({ ...s, logoUrl: json.data.url }));
        setLogoPreview(json.data.url);
        toast.success('Logo uploaded');
      } else {
        toast.error(json.error || 'Failed to upload logo');
      }
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

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

  async function handleSaveBranding() {
    if (brandingSettings.primaryColorLight && !isValidHex(brandingSettings.primaryColorLight)) {
      toast.error('Invalid light mode color. Use hex format like #7ed321.');
      return;
    }
    if (brandingSettings.primaryColorDark && !isValidHex(brandingSettings.primaryColorDark)) {
      toast.error('Invalid dark mode color. Use hex format like #7ed321.');
      return;
    }

    setSavingBranding(true);
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingSettings),
      });
      if (res.status === 401 || res.redirected) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast.success('Branding settings saved');
        await refreshBranding();
      } else {
        toast.error(data.error || 'Failed to save branding');
      }
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSavingBranding(false);
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
    <div className="card-base rounded-xl p-6">
      <Tabs defaultValue="details">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 mb-6">
          <TabsTrigger value="details" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-[state=active]:bg-brand-green data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="branding" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-[state=active]:bg-brand-green data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <h2 className="section-title">Organization Details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization profile.
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

        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Organization'}
          </Button>
        </div>
        </TabsContent>

        <TabsContent value="branding">
          <h2 className="section-title">Branding</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize your platform appearance with custom colors and logo.
          </p>

        <div className="mt-6 space-y-6 max-w-lg">
          {/* App Name */}
          <div>
            <Label htmlFor="brandingAppName">Application Name</Label>
            <Input
              id="brandingAppName"
              className="mt-1.5"
              value={brandingSettings.appName}
              onChange={(e) =>
                setBrandingSettings((s) => ({ ...s, appName: e.target.value }))
              }
              placeholder="Inventory Management Platform"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Displayed in the browser tab. The sidebar logo area is reserved for your logo image only.
            </p>
          </div>

          {/* Primary Color Light */}
          <div>
            <Label htmlFor="brandingColorLight">Primary Color (Light Mode)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="color"
                value={isValidHex(brandingSettings.primaryColorLight) ? brandingSettings.primaryColorLight : '#7ed321'}
                onChange={(e) =>
                  setBrandingSettings((s) => ({ ...s, primaryColorLight: e.target.value }))
                }
                className="h-10 w-12 cursor-pointer rounded border p-0.5"
              />
              <Input
                id="brandingColorLight"
                placeholder="#7ed321"
                value={brandingSettings.primaryColorLight}
                onChange={(e) =>
                  setBrandingSettings((s) => ({ ...s, primaryColorLight: e.target.value }))
                }
                className="flex-1"
              />
              {isValidHex(brandingSettings.primaryColorLight) && (
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border"
                  style={{ backgroundColor: brandingSettings.primaryColorLight }}
                />
              )}
            </div>
            {brandingSettings.primaryColorLight && !isValidHex(brandingSettings.primaryColorLight) && (
              <p className="mt-1 text-xs text-destructive">
                Enter a valid hex color (e.g. #7ed321)
              </p>
            )}
          </div>

          {/* Primary Color Dark */}
          <div>
            <Label htmlFor="brandingColorDark">Primary Color (Dark Mode)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="color"
                value={isValidHex(brandingSettings.primaryColorDark) ? brandingSettings.primaryColorDark : '#7ed321'}
                onChange={(e) =>
                  setBrandingSettings((s) => ({ ...s, primaryColorDark: e.target.value }))
                }
                className="h-10 w-12 cursor-pointer rounded border p-0.5"
              />
              <Input
                id="brandingColorDark"
                placeholder="#7ed321"
                value={brandingSettings.primaryColorDark}
                onChange={(e) =>
                  setBrandingSettings((s) => ({ ...s, primaryColorDark: e.target.value }))
                }
                className="flex-1"
              />
              {isValidHex(brandingSettings.primaryColorDark) && (
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border"
                  style={{ backgroundColor: brandingSettings.primaryColorDark }}
                />
              )}
            </div>
            {brandingSettings.primaryColorDark && !isValidHex(brandingSettings.primaryColorDark) && (
              <p className="mt-1 text-xs text-destructive">
                Enter a valid hex color (e.g. #7ed321)
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div>
            <Label>Logo</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1.5 relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
                dragOver
                  ? 'border-brand-green bg-brand-green/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-20 max-w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoPreview(null);
                      setBrandingSettings((s) => ({ ...s, logoUrl: null }));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {uploadingLogo ? 'Uploading...' : 'Click or drag to upload a logo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, SVG, or WebP. Max 2MB.
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Live Preview */}
          <div className="rounded-xl border p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Live Preview</p>
            <div className="flex items-center gap-3 rounded-lg bg-card p-3 border">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Preview"
                  className="h-9 max-w-[120px] object-contain"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: brandingSettings.primaryColorLight }}
                >
                  {(brandingSettings.appName || 'I')[0].toUpperCase()}
                </div>
              )}
              <span className="text-lg font-bold tracking-tight">
                {brandingSettings.appName || 'Inventory'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveBranding} disabled={savingBranding}>
            {savingBranding ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
