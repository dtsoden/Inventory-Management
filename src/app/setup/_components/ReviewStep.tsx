'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { SetupData } from './SetupWizard';

interface ReviewStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function maskValue(value: string): string {
  if (!value || value.length < 6) return '****';
  return value.slice(0, 4) + '****' + value.slice(-2);
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );
}

export function ReviewStep({ data, onChange, onSubmit, isSubmitting }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm text-center">
        Review your configuration before launching the platform.
      </p>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--brand-green)' }} />
          Platform
        </h3>
        <ReviewRow label="Platform Name" value={data.platformName} />
        <ReviewRow label="Passphrase" value={maskValue(data.passphrase)} />
      </div>

      <Separator />

      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--brand-green)' }} />
          Admin Account
        </h3>
        <ReviewRow label="Name" value={`${data.adminFirstName} ${data.adminLastName}`} />
        <ReviewRow label="Email" value={data.adminEmail} />
        <ReviewRow label="Password" value={maskValue(data.adminPassword)} />
      </div>

      <Separator />

      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--brand-green)' }} />
          Organization
        </h3>
        <ReviewRow label="Name" value={data.orgName} />
        <ReviewRow label="Slug" value={data.orgSlug} />
      </div>

      <Separator />

      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--brand-green)' }} />
          Integrations
        </h3>
        <ReviewRow label="OpenAI API Key" value={maskValue(data.openaiApiKey)} />
        <ReviewRow label="Catalog API URL" value={data.catalogApiUrl || 'Not configured'} />
        <ReviewRow label="SMTP Host" value={data.smtpHost || 'Not configured'} />
      </div>

      <Separator />

      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--brand-green)' }} />
          Security
        </h3>
        <ReviewRow label="CORS Origins" value={data.corsOrigins || 'None'} />
      </div>

      <Separator />

      <div className="flex items-center justify-between rounded-md border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="seed-toggle">Seed demo data</Label>
          <p className="text-xs text-muted-foreground">
            Populate the platform with sample products, categories, and
            inventory records for testing.
          </p>
        </div>
        <Switch
          id="seed-toggle"
          checked={data.seedDemoData}
          onCheckedChange={(checked) => onChange({ seedDemoData: checked })}
        />
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="btn-pill w-full"
        style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up platform...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Launch Platform
          </>
        )}
      </Button>
    </div>
  );
}
