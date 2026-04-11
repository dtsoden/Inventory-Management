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

type ThemeMode = 'auto' | 'light' | 'dark';

interface BrandingSettings {
  appName: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
  faviconUrl: string | null;
  themeMode: ThemeMode;
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
    logoUrlLight: null,
    logoUrlDark: null,
    faviconUrl: null,
    themeMode: 'auto',
  });
  const [logoPreviewLight, setLogoPreviewLight] = useState<string | null>(null);
  const [logoPreviewDark, setLogoPreviewDark] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLightLogo, setUploadingLightLogo] = useState(false);
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [dragOverMode, setDragOverMode] = useState<'light' | 'dark' | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const lightFileInputRef = useRef<HTMLInputElement>(null);
  const darkFileInputRef = useRef<HTMLInputElement>(null);

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
          const d = brandingRes.data;
          // Backward compatibility: fall back to legacy single logoUrl
          const lightLogo = d.logoUrlLight ?? d.logoUrl ?? null;
          const darkLogo = d.logoUrlDark ?? d.logoUrl ?? null;
          setBrandingSettings({
            appName: d.appName || '',
            primaryColorLight: d.primaryColorLight || '#7ed321',
            primaryColorDark: d.primaryColorDark || '#7ed321',
            logoUrlLight: lightLogo,
            logoUrlDark: darkLogo,
            faviconUrl: d.faviconUrl || null,
            themeMode:
              d.themeMode === 'light' || d.themeMode === 'dark' || d.themeMode === 'auto'
                ? d.themeMode
                : 'auto',
          });
          if (lightLogo) setLogoPreviewLight(lightLogo);
          if (darkLogo) setLogoPreviewDark(darkLogo);
          if (d.faviconUrl) setFaviconPreview(d.faviconUrl);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFavicon = useCallback(async (file: File) => {
    const allowedExt = /\.(ico|png|jpe?g|svg|webp)$/i;
    if (!allowedExt.test(file.name)) {
      toast.error('Invalid file type. Allowed: ICO, PNG, JPG, SVG, WebP.');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error('File too large. Maximum favicon size is 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setFaviconPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/settings/branding/favicon', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setBrandingSettings((s) => ({ ...s, faviconUrl: json.data.url }));
        setFaviconPreview(json.data.url);
        toast.success('Favicon uploaded');
      } else {
        toast.error(json.error || 'Failed to upload favicon');
      }
    } catch {
      toast.error('Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File, mode: 'light' | 'dark') => {
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
    reader.onload = () => {
      if (mode === 'light') setLogoPreviewLight(reader.result as string);
      else setLogoPreviewDark(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    if (mode === 'light') setUploadingLightLogo(true);
    else setUploadingDarkLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/settings/branding/logo', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        if (mode === 'light') {
          setBrandingSettings((s) => ({ ...s, logoUrlLight: json.data.url }));
          setLogoPreviewLight(json.data.url);
        } else {
          setBrandingSettings((s) => ({ ...s, logoUrlDark: json.data.url }));
          setLogoPreviewDark(json.data.url);
        }
        toast.success(`${mode === 'light' ? 'Light' : 'Dark'} mode logo uploaded`);
      } else {
        toast.error(json.error || 'Failed to upload logo');
      }
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      if (mode === 'light') setUploadingLightLogo(false);
      else setUploadingDarkLogo(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, mode: 'light' | 'dark') => {
      e.preventDefault();
      setDragOverMode(null);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file, mode);
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
            // Platform name = organization name (single source of truth)
            platformName: settings.tenantName,
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
      // App name is always synced from the organization name (single source of truth)
      const payload = {
        ...brandingSettings,
        appName: settings.tenantName || brandingSettings.appName,
      };
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          <TabsTrigger value="details" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
            <Building2 className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="branding" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
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

        <div className="mt-6 space-y-6 max-w-2xl">
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

          {/* Theme Mode */}
          <div>
            <Label>Theme Mode</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['auto', 'light', 'dark'] as const).map((mode) => {
                const active = brandingSettings.themeMode === mode;
                const label =
                  mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light Only' : 'Dark Only';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBrandingSettings((s) => ({ ...s, themeMode: mode }))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-brand-green bg-brand-green/10 text-foreground'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto allows users to toggle between light and dark mode. Light Only or Dark Only
              locks the app to that mode.
            </p>
          </div>

          {/* Logo Uploads */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(['light', 'dark'] as const).map((mode) => {
              const isLight = mode === 'light';
              const preview = isLight ? logoPreviewLight : logoPreviewDark;
              const uploading = isLight ? uploadingLightLogo : uploadingDarkLogo;
              const inputRef = isLight ? lightFileInputRef : darkFileInputRef;
              const isDragOver = dragOverMode === mode;
              const bgClass = isLight ? 'bg-white' : 'bg-neutral-900';
              const fgMuted = isLight ? 'text-neutral-500' : 'text-neutral-400';
              return (
                <div key={mode}>
                  <Label>{isLight ? 'Light Mode Logo' : 'Dark Mode Logo'}</Label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverMode(mode);
                    }}
                    onDragLeave={() => setDragOverMode(null)}
                    onDrop={(e) => handleDrop(e, mode)}
                    onClick={() => inputRef.current?.click()}
                    className={`mt-1.5 relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${bgClass} ${
                      isDragOver
                        ? 'border-brand-green bg-brand-green/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  >
                    {preview ? (
                      <div className="relative">
                        <img
                          src={preview}
                          alt={`${mode} logo preview`}
                          className="max-h-20 max-w-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isLight) {
                              setLogoPreviewLight(null);
                              setBrandingSettings((s) => ({ ...s, logoUrlLight: null }));
                            } else {
                              setLogoPreviewDark(null);
                              setBrandingSettings((s) => ({ ...s, logoUrlDark: null }));
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className={`h-8 w-8 ${fgMuted}`} />
                        <p className={`mt-2 text-sm ${fgMuted}`}>
                          {uploading ? 'Uploading...' : 'Click or drag to upload'}
                        </p>
                        <p className={`text-xs ${fgMuted}`}>
                          PNG, JPG, SVG, or WebP. Max 2MB.
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file, mode);
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Favicon Upload */}
          <div>
            <Label>Favicon</Label>
            <p className="text-xs text-muted-foreground mt-1">
              The icon shown in browser tabs. ICO, PNG, JPG, SVG, or WebP. Max 1MB. Recommended: 32x32 or 64x64 pixels.
            </p>
            <div
              onClick={() => faviconInputRef.current?.click()}
              className="mt-1.5 relative flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50 max-w-md"
            >
              {faviconPreview ? (
                <>
                  <div className="relative shrink-0 rounded bg-white p-2 border">
                    <img
                      src={faviconPreview}
                      alt="favicon preview"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div className="flex-1 text-xs text-muted-foreground">
                    Favicon uploaded. Click to replace.
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFaviconPreview(null);
                      setBrandingSettings((s) => ({ ...s, faviconUrl: null }));
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {uploadingFavicon ? 'Uploading...' : 'Click to upload favicon'}
                  </span>
                </>
              )}
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept=".ico,image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFavicon(file);
              }}
            />
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
