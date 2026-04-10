'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { SetupData } from './SetupWizard';

interface IntegrationsStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

export function IntegrationsStep({ data, onChange }: IntegrationsStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
        <Input
          id="openaiApiKey"
          type="password"
          placeholder="sk-..."
          value={data.openaiApiKey}
          onChange={(e) => onChange({ openaiApiKey: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Required. Used for AI-powered features such as smart search and
          catalog enrichment.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalogApiUrl">Catalog API URL</Label>
        <Input
          id="catalogApiUrl"
          type="url"
          placeholder="https://api.example.com/catalog (optional)"
          value={data.catalogApiUrl}
          onChange={(e) => onChange({ catalogApiUrl: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Optional. External catalog service endpoint for product data
          synchronization.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">SMTP Configuration (Optional)</h3>
        <p className="text-xs text-muted-foreground">
          Configure email delivery for notifications and password resets.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">SMTP Host</Label>
            <Input
              id="smtpHost"
              placeholder="smtp.example.com"
              value={data.smtpHost}
              onChange={(e) => onChange({ smtpHost: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">SMTP Port</Label>
            <Input
              id="smtpPort"
              placeholder="587"
              value={data.smtpPort}
              onChange={(e) => onChange({ smtpPort: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtpUser">SMTP User</Label>
            <Input
              id="smtpUser"
              placeholder="user@example.com"
              value={data.smtpUser}
              onChange={(e) => onChange({ smtpUser: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPassword">SMTP Password</Label>
            <Input
              id="smtpPassword"
              type="password"
              placeholder="SMTP password"
              value={data.smtpPassword}
              onChange={(e) => onChange({ smtpPassword: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
