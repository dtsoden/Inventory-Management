'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SetupData } from './SetupWizard';

interface OrgStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function OrgStep({ data, onChange }: OrgStepProps) {
  function handleNameChange(name: string) {
    onChange({
      orgName: name,
      orgSlug: generateSlug(name),
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Set up the default organization (tenant) for the platform.
      </p>

      <div className="space-y-2">
        <Label htmlFor="orgName">Organization Name</Label>
        <Input
          id="orgName"
          placeholder="e.g. Acme Corporation"
          value={data.orgName}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgSlug">URL Slug</Label>
        <Input
          id="orgSlug"
          placeholder="auto-generated-from-name"
          value={data.orgSlug}
          onChange={(e) => onChange({ orgSlug: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Auto-generated from the organization name. You can edit it manually if
          needed. Only lowercase letters, numbers, and hyphens are allowed.
        </p>
      </div>
    </div>
  );
}
