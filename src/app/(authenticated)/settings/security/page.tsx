'use client';

import { useEffect, useState } from 'react';
import { Shield, Globe, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface SecuritySettings {
  corsOrigins: string;
  sessionTimeout: string;
}

interface PasswordPolicy {
  minLength: string;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>({
    corsOrigins: '',
    sessionTimeout: '480',
  });
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    minLength: '8',
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/settings/integrations?category=security').then((r) => r.json()),
      apiFetch('/api/settings/integrations?category=password_policy').then((r) => r.json()),
    ])
      .then(([secRes, pwRes]) => {
        if (secRes.success && secRes.data) {
          setSettings({
            corsOrigins: secRes.data.corsOrigins || '',
            sessionTimeout: secRes.data.sessionTimeout || '480',
          });
        }
        if (pwRes.success && pwRes.data) {
          setPasswordPolicy({
            minLength: pwRes.data.minLength || '8',
            requireUppercase: pwRes.data.requireUppercase !== 'false',
            requireLowercase: pwRes.data.requireLowercase !== 'false',
            requireNumbers: pwRes.data.requireNumbers !== 'false',
            requireSpecialChars: pwRes.data.requireSpecialChars === 'true',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function saveCors() {
    setSaving('cors');
    try {
      const res = await apiFetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'security',
          settings: { corsOrigins: settings.corsOrigins },
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('CORS settings saved');
      else toast.error(data.error || 'Failed to save');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  }

  async function saveSession() {
    setSaving('session');
    try {
      const res = await apiFetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'security',
          settings: { sessionTimeout: settings.sessionTimeout },
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('Session settings saved');
      else toast.error(data.error || 'Failed to save');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  }

  async function savePasswordPolicy() {
    setSaving('password');
    try {
      const res = await apiFetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'password_policy',
          settings: {
            minLength: passwordPolicy.minLength,
            requireUppercase: String(passwordPolicy.requireUppercase),
            requireLowercase: String(passwordPolicy.requireLowercase),
            requireNumbers: String(passwordPolicy.requireNumbers),
            requireSpecialChars: String(passwordPolicy.requireSpecialChars),
          },
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('Password policy saved');
      else toast.error(data.error || 'Failed to save');
    } catch {
      toast.error('Failed to save');
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
        </div>
      </div>
    );
  }

  return (
    <div className="card-base rounded-xl p-6">
      <h2 className="section-title flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" />
        Security
      </h2>

      <Tabs defaultValue="cors">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 mb-6">
          <TabsTrigger value="cors" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
            <Globe className="h-4 w-4" />
            CORS
          </TabsTrigger>
          <TabsTrigger value="sessions" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
            <Clock className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="password" className="min-w-[140px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
            <Lock className="h-4 w-4" />
            Password Policy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cors">
          <p className="text-sm text-muted-foreground mb-4">
            Configure which domains are allowed to make cross-origin requests to this application.
          </p>
          <div className="max-w-lg space-y-4">
            <div>
              <Label htmlFor="cors-origins">Allowed Origins</Label>
              <Input
                id="cors-origins"
                className="mt-1.5"
                value={settings.corsOrigins}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, corsOrigins: e.target.value }))
                }
                placeholder="* or https://example.com, https://app.example.com"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use * to allow all origins (development). In production, list specific domains separated by commas.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveCors} disabled={saving === 'cors'}>
                {saving === 'cors' ? 'Saving...' : 'Save CORS Settings'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <p className="text-sm text-muted-foreground mb-4">
            Configure session duration and automatic timeout behavior.
          </p>
          <div className="max-w-lg space-y-4">
            <div>
              <Label htmlFor="session-timeout">Idle Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                className="mt-1.5"
                value={settings.sessionTimeout}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, sessionTimeout: e.target.value }))
                }
                min="15"
                max="1440"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Users will be automatically signed out after this period of inactivity. Range: 15 to 1440 minutes (24 hours). Default: 480 minutes (8 hours).
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveSession} disabled={saving === 'session'}>
                {saving === 'session' ? 'Saving...' : 'Save Session Settings'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="password">
          <p className="text-sm text-muted-foreground mb-4">
            Define the password requirements for all user accounts. Changes apply to new passwords only.
          </p>
          <div className="max-w-lg space-y-6">
            <div>
              <Label htmlFor="min-length">Minimum Length</Label>
              <Input
                id="min-length"
                type="number"
                className="mt-1.5 w-32"
                value={passwordPolicy.minLength}
                onChange={(e) =>
                  setPasswordPolicy((p) => ({ ...p, minLength: e.target.value }))
                }
                min="6"
                max="128"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum number of characters required. Recommended: 8 or more.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Require Uppercase Letters</p>
                  <p className="text-xs text-muted-foreground">At least one uppercase letter (A-Z)</p>
                </div>
                <Switch
                  checked={passwordPolicy.requireUppercase}
                  onCheckedChange={(checked) =>
                    setPasswordPolicy((p) => ({ ...p, requireUppercase: !!checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Require Lowercase Letters</p>
                  <p className="text-xs text-muted-foreground">At least one lowercase letter (a-z)</p>
                </div>
                <Switch
                  checked={passwordPolicy.requireLowercase}
                  onCheckedChange={(checked) =>
                    setPasswordPolicy((p) => ({ ...p, requireLowercase: !!checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Require Numbers</p>
                  <p className="text-xs text-muted-foreground">At least one numeric digit (0-9)</p>
                </div>
                <Switch
                  checked={passwordPolicy.requireNumbers}
                  onCheckedChange={(checked) =>
                    setPasswordPolicy((p) => ({ ...p, requireNumbers: !!checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Require Special Characters</p>
                  <p className="text-xs text-muted-foreground">At least one special character (!@#$%^&amp;*)</p>
                </div>
                <Switch
                  checked={passwordPolicy.requireSpecialChars}
                  onCheckedChange={(checked) =>
                    setPasswordPolicy((p) => ({ ...p, requireSpecialChars: !!checked }))
                  }
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Encryption Info (read-only)</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Hashing:</span>
                <span>bcrypt (12 rounds)</span>
                <span className="text-muted-foreground">Encryption:</span>
                <span>AES-256-GCM</span>
                <span className="text-muted-foreground">Key derivation:</span>
                <span>PBKDF2 (600k iterations)</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={savePasswordPolicy} disabled={saving === 'password'}>
                {saving === 'password' ? 'Saving...' : 'Save Password Policy'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
