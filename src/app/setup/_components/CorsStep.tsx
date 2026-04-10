'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SetupData } from './SetupWizard';

interface CorsStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

export function CorsStep({ data, onChange }: CorsStepProps) {
  const allowAll = data.corsOrigins === '*';

  function handleToggle(checked: boolean) {
    if (checked) {
      onChange({ corsOrigins: '*' });
    } else {
      onChange({ corsOrigins: '' });
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Configure Cross-Origin Resource Sharing (CORS) to control which domains
        can access the API.
      </p>

      <div className="flex items-center justify-between rounded-md border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="cors-toggle">Allow all origins</Label>
          <p className="text-xs text-muted-foreground">
            When enabled, any domain can make requests to the API. Suitable for
            development; restrict in production.
          </p>
        </div>
        <Switch
          id="cors-toggle"
          checked={allowAll}
          onCheckedChange={handleToggle}
        />
      </div>

      {!allowAll && (
        <div className="space-y-2">
          <Label htmlFor="corsOrigins">Allowed Origins</Label>
          <Input
            id="corsOrigins"
            placeholder="https://app.example.com, https://admin.example.com"
            value={data.corsOrigins}
            onChange={(e) => onChange({ corsOrigins: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of allowed domains (e.g.
            https://app.example.com, https://admin.example.com).
          </p>
        </div>
      )}
    </div>
  );
}
