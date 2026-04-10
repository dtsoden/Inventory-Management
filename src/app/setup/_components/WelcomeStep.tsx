'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SetupData } from './SetupWizard';

interface WelcomeStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

export function WelcomeStep({ data, onChange }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-center">
        Welcome to the platform setup. This wizard will walk you through the
        initial configuration in a few quick steps.
      </p>

      <div className="space-y-2">
        <Label htmlFor="platformName">Platform Name</Label>
        <Input
          id="platformName"
          placeholder="e.g. Shane Inventory"
          value={data.platformName}
          onChange={(e) => onChange({ platformName: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          This name will appear in the header and browser tab.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passphrase">Encryption Passphrase</Label>
        <Input
          id="passphrase"
          type="password"
          placeholder="Minimum 12 characters"
          value={data.passphrase}
          onChange={(e) => onChange({ passphrase: e.target.value })}
          minLength={12}
        />
        {data.passphrase.length > 0 && data.passphrase.length < 12 && (
          <p className="text-xs text-destructive">
            Passphrase must be at least 12 characters.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          The passphrase is used to derive an encryption key that protects all
          sensitive configuration values (API keys, SMTP credentials, etc.)
          stored in the database. It is never stored directly; only a derived
          hash is kept for verification. Choose something strong and keep it
          safe, as you will need it if the platform is ever re-initialized.
        </p>
      </div>
    </div>
  );
}
