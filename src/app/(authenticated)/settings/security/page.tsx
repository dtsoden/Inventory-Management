'use client';

import { useEffect, useState } from 'react';
import { Shield, Globe, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SecuritySettings {
  corsOrigins: string;
  sessionTimeout: string;
}

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>({
    corsOrigins: '',
    sessionTimeout: '480',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/integrations?category=security')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings({
            corsOrigins: res.data.corsOrigins || '',
            sessionTimeout: res.data.sessionTimeout || '480',
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
          category: 'security',
          settings: {
            corsOrigins: settings.corsOrigins,
            sessionTimeout: settings.sessionTimeout,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Security settings saved');
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CORS Origins */}
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title flex items-center gap-2">
          <Globe className="h-5 w-5" />
          CORS Origins
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure which domains are allowed to make cross-origin requests.
        </p>

        <div className="mt-6 max-w-lg">
          <Label htmlFor="cors-origins">Allowed Origins</Label>
          <Input
            id="cors-origins"
            className="mt-1.5"
            value={settings.corsOrigins}
            onChange={(e) =>
              setSettings((s) => ({ ...s, corsOrigins: e.target.value }))
            }
            placeholder="https://example.com, https://app.example.com"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Comma-separated list of allowed origins. Leave empty to allow all.
          </p>
        </div>
      </div>

      {/* Session Timeout */}
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Session Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure session duration and timeout behavior.
        </p>

        <div className="mt-6 max-w-lg">
          <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
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
            placeholder="480"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Users will be signed out after this period of inactivity. Default: 480 minutes (8 hours).
          </p>
        </div>
      </div>

      {/* Password Policy */}
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Password Policy
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current password requirements for all user accounts.
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm">Minimum length</span>
            <Badge variant="outline">8 characters</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm">Hashing algorithm</span>
            <Badge variant="outline">bcrypt (10 rounds)</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm">Encryption</span>
            <Badge variant="outline">AES-256-GCM</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm">Key derivation</span>
            <Badge variant="outline">PBKDF2 (600k iterations)</Badge>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Shield className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </div>
  );
}
