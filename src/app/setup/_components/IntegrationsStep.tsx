'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SetupData } from './SetupWizard';

interface IntegrationsStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

const FALLBACK_MODELS = [
  'gpt-5.4-nano',
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
];

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export function IntegrationsStep({ data, onChange }: IntegrationsStepProps) {
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-validate the API key (debounced) and fetch available models when it changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const key = data.openaiApiKey.trim();
    if (!key) {
      setValidationStatus('idle');
      setValidationError(null);
      setAvailableModels(FALLBACK_MODELS);
      return;
    }

    if (key.length < 20) {
      setValidationStatus('idle');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setValidationStatus('validating');
      setValidationError(null);
      try {
        const res = await fetch('/api/setup/validate-openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: key }),
        });
        const json = await res.json();
        if (json.success && json.data?.models) {
          const ids = (json.data.models as Array<{ id: string }>).map((m) => m.id);
          // Always include the fallback default so it's selectable even if the
          // account does not have access to the bleeding-edge models yet
          const merged = Array.from(new Set([...ids, ...FALLBACK_MODELS])).sort();
          setAvailableModels(merged);
          setValidationStatus('valid');

          // If currently selected model is not in the list, default to the first
          // available one (preferring gpt-5.4-nano if present)
          if (!ids.includes(data.openaiModel)) {
            const preferred = ids.find((id) => id === 'gpt-5.4-nano') || ids[0];
            if (preferred) onChange({ openaiModel: preferred });
          }
        } else {
          setValidationStatus('invalid');
          setValidationError(json.error || 'Invalid API key');
        }
      } catch {
        setValidationStatus('invalid');
        setValidationError('Failed to reach OpenAI');
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.openaiApiKey]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
        <div className="relative">
          <Input
            id="openaiApiKey"
            type="password"
            placeholder="sk-..."
            value={data.openaiApiKey}
            onChange={(e) => onChange({ openaiApiKey: e.target.value })}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validationStatus === 'validating' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {validationStatus === 'valid' && (
              <CheckCircle2 className="h-4 w-4 text-brand-green" />
            )}
            {validationStatus === 'invalid' && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>
        {validationStatus === 'invalid' && validationError && (
          <p className="text-xs text-destructive">{validationError}</p>
        )}
        {validationStatus === 'valid' && (
          <p className="text-xs text-brand-green">
            API key validated. {availableModels.length} models available.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Required. Used for AI-powered features such as smart search and
          catalog enrichment.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="openaiModel">Default Model</Label>
        <Select
          value={data.openaiModel}
          onValueChange={(v) => onChange({ openaiModel: v ?? 'gpt-5.4-nano' })}
          disabled={validationStatus === 'validating'}
        >
          <SelectTrigger id="openaiModel" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The model used for the AI assistant and packing slip extraction. The
          list updates automatically once the API key is validated.
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
