'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { FieldMapping, ApiSchemaField } from '@/lib/integrations/types';
import { TARGET_FIELDS } from '@/lib/integrations/types';

type WizardStep = 1 | 2 | 3;

interface HeaderRow {
  key: string;
  value: string;
}

function DataSourceWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Connection
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    sampleData: unknown;
    schema: ApiSchemaField[];
    error?: string;
    recordCount?: number;
  } | null>(null);

  // Step 2: Field Mapping
  const [schema, setSchema] = useState<ApiSchemaField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [sampleData, setSampleData] = useState<unknown[]>([]);

  // Step 3: Review
  const [isActive, setIsActive] = useState(true);

  // Load existing source when editing
  useEffect(() => {
    if (editId) {
      fetch(`/api/settings/data-sources/${editId}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            const source = res.data;
            setName(source.name);
            setApiUrl(source.apiUrl);
            setIsActive(source.isActive);
            if (source.apiHeaders && typeof source.apiHeaders === 'object') {
              const headerEntries = Object.entries(source.apiHeaders).map(
                ([key, value]) => ({ key, value: value as string })
              );
              setHeaders(headerEntries);
            }
            if (Array.isArray(source.fieldMapping) && source.fieldMapping.length > 0) {
              setMappings(source.fieldMapping);
            }
          }
        })
        .catch(() => toast.error('Failed to load data source'));
    }
  }, [editId]);

  const getHeadersObject = useCallback((): Record<string, string> | undefined => {
    const obj: Record<string, string> = {};
    let hasHeaders = false;
    for (const h of headers) {
      if (h.key.trim() && h.value.trim()) {
        obj[h.key.trim()] = h.value.trim();
        hasHeaders = true;
      }
    }
    return hasHeaders ? obj : undefined;
  }, [headers]);

  async function handleTestConnection() {
    if (!apiUrl.trim()) {
      toast.error('Please enter an API URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/data-sources/_/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: apiUrl.trim(),
          apiHeaders: getHeadersObject(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTestResult(data.data);
        if (data.data.success) {
          setSchema(data.data.schema || []);
          setSampleData(
            Array.isArray(data.data.sampleData) ? data.data.sampleData : []
          );
          toast.success('Connection successful');
        } else {
          toast.error(data.data.error || 'Connection failed');
        }
      } else {
        toast.error(data.error || 'Test failed');
      }
    } catch {
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  }

  async function handleAnalyze() {
    if (schema.length === 0) {
      toast.error('No schema detected. Test the connection first.');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch('/api/settings/data-sources/_/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMappings(data.data);
        toast.success(`AI suggested ${data.data.length} field mappings`);
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    } catch {
      toast.error('Failed to analyze schema');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateMapping(index: number, field: Partial<FieldMapping>) {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...field } : m))
    );
  }

  function removeMapping(index: number) {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }

  function addManualMapping() {
    setMappings((prev) => [
      ...prev,
      {
        sourceField: '',
        targetField: '',
        dataType: 'string',
        sourceDataType: 'string',
        conversion: 'none',
        confidence: 1.0,
      },
    ]);
  }

  async function handleSave() {
    if (!name.trim() || !apiUrl.trim()) {
      toast.error('Name and API URL are required');
      return;
    }

    // Check required target fields are mapped
    const mappedTargets = new Set(mappings.map((m) => m.targetField));
    const missingRequired = TARGET_FIELDS.filter(
      (f) => f.required && !mappedTargets.has(f.name)
    );
    if (missingRequired.length > 0) {
      toast.error(
        `Required fields not mapped: ${missingRequired.map((f) => f.name).join(', ')}`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        apiUrl: apiUrl.trim(),
        apiHeaders: getHeadersObject(),
        fieldMappings: mappings,
        isActive,
      };

      const url = editId
        ? `/api/settings/data-sources/${editId}`
        : '/api/settings/data-sources';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editId ? 'Data source updated' : 'Data source created');
        router.push('/settings/data-sources');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save data source');
    } finally {
      setSaving(false);
    }
  }

  function getConfidenceBadge(confidence: number) {
    if (confidence >= 0.8) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
          {Math.round(confidence * 100)}%
        </Badge>
      );
    }
    if (confidence >= 0.5) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
          {Math.round(confidence * 100)}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }

  function getPreviewData(): Record<string, unknown>[] {
    if (sampleData.length === 0 || mappings.length === 0) return [];

    const preview: Record<string, unknown>[] = [];
    const records = sampleData.slice(0, 5) as Record<string, unknown>[];

    for (const record of records) {
      const row: Record<string, unknown> = {};
      for (const mapping of mappings) {
        const rawValue = getNestedValue(record, mapping.sourceField);
        row[mapping.targetField] = rawValue;
      }
      preview.push(row);
    }
    return preview;
  }

  function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  const canProceedToStep2 = testResult?.success && schema.length > 0;
  const canProceedToStep3 = mappings.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/settings/data-sources')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">
            {editId ? 'Edit Data Source' : 'Add Data Source'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step === 1 && 'Configure the API connection'}
            {step === 2 && 'Map source fields to inventory fields'}
            {step === 3 && 'Review and save your configuration'}
          </p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-brand-green text-white'
                  : s < step
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                s === step ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              {s === 1 && 'Connection'}
              {s === 2 && 'Field Mapping'}
              {s === 3 && 'Review'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Connection */}
      {step === 1 && (
        <div className="card-base rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Source Name</Label>
            <Input
              id="name"
              placeholder="e.g., Vendor Product Catalog"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiUrl">API Endpoint URL</Label>
            <Input
              id="apiUrl"
              placeholder="https://api.vendor.com/products"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          {/* Headers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Request Headers (optional)</Label>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() =>
                  setHeaders((prev) => [...prev, { key: '', value: '' }])
                }
              >
                <Plus className="h-3 w-3" />
                Add Header
              </Button>
            </div>

            {headers.map((header, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Header name"
                  className="flex-1"
                  value={header.key}
                  onChange={(e) =>
                    setHeaders((prev) =>
                      prev.map((h, idx) =>
                        idx === i ? { ...h, key: e.target.value } : h
                      )
                    )
                  }
                />
                <Input
                  placeholder="Header value"
                  className="flex-1"
                  type="password"
                  value={header.value}
                  onChange={(e) =>
                    setHeaders((prev) =>
                      prev.map((h, idx) =>
                        idx === i ? { ...h, value: e.target.value } : h
                      )
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setHeaders((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Test Button */}
          <Button
            onClick={handleTestConnection}
            disabled={testing || !apiUrl.trim()}
            className="gap-2"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          {/* Test Result */}
          {testResult && (
            <div
              className={`rounded-lg border p-4 ${
                testResult.success
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-emerald-600">
                      Connection successful
                    </span>
                    {testResult.recordCount && (
                      <Badge variant="secondary" className="ml-2">
                        {testResult.recordCount} records found
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-600">
                      Connection failed
                    </span>
                  </>
                )}
              </div>

              {testResult.error && (
                <p className="text-sm text-red-600 mb-3">{testResult.error}</p>
              )}

              {testResult.success && testResult.schema.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Detected {testResult.schema.length} fields:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {testResult.schema.map((field) => (
                      <Badge key={field.name} variant="secondary" className="text-xs font-mono">
                        {field.name}{' '}
                        <span className="text-muted-foreground ml-1">({field.type})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {testResult.sampleData != null && (
                <details className="mt-3">
                  <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    View sample response
                  </summary>
                  <pre className="mt-2 text-xs font-mono bg-background rounded-lg p-3 overflow-auto max-h-64 border">
                    {JSON.stringify(testResult.sampleData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-end pt-2">
            <Button
              disabled={!canProceedToStep2}
              onClick={() => setStep(2)}
              className="gap-2"
            >
              Next: Field Mapping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Field Mapping */}
      {step === 2 && (
        <div className="card-base rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Field Mappings</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Map fields from the API response to your inventory item model.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addManualMapping}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Manual
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                {analyzing ? 'Analyzing...' : 'AI Auto-Map'}
              </Button>
            </div>
          </div>

          {/* Required fields warning */}
          {(() => {
            const mappedTargets = new Set(mappings.map((m) => m.targetField));
            const missing = TARGET_FIELDS.filter(
              (f) => f.required && !mappedTargets.has(f.name)
            );
            if (missing.length === 0) return null;
            return (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700">
                  Required fields not yet mapped:{' '}
                  <span className="font-medium">
                    {missing.map((f) => f.name).join(', ')}
                  </span>
                </p>
              </div>
            );
          })()}

          {/* Mapping Rows */}
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-3">Source Field</div>
              <div className="col-span-3">Target Field</div>
              <div className="col-span-2">Conversion</div>
              <div className="col-span-2">Confidence</div>
              <div className="col-span-1">Type Match</div>
              <div className="col-span-1" />
            </div>

            {mappings.map((mapping, index) => {
              const targetField = TARGET_FIELDS.find(
                (f) => f.name === mapping.targetField
              );
              const typeMismatch =
                targetField &&
                mapping.sourceDataType !== targetField.type &&
                mapping.conversion === 'none';

              return (
                <div
                  key={index}
                  className={`grid grid-cols-12 gap-2 items-center rounded-lg border p-3 ${
                    typeMismatch
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border'
                  }`}
                >
                  {/* Source Field */}
                  <div className="col-span-3">
                    <Select
                      value={mapping.sourceField || undefined}
                      onValueChange={(val) =>
                        updateMapping(index, { sourceField: val || '' })
                      }
                    >
                      <SelectTrigger className="text-xs font-mono h-9">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {schema.map((f) => (
                          <SelectItem
                            key={f.name}
                            value={f.name}
                            className="text-xs font-mono"
                          >
                            {f.name} ({f.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Field */}
                  <div className="col-span-3">
                    <Select
                      value={mapping.targetField || undefined}
                      onValueChange={(val) => {
                        const tf = TARGET_FIELDS.find((f) => f.name === val);
                        updateMapping(index, {
                          targetField: val || '',
                          dataType: (tf?.type as FieldMapping['dataType']) || 'string',
                        });
                      }}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_FIELDS.map((f) => (
                          <SelectItem key={f.name} value={f.name} className="text-xs">
                            {f.name} ({f.type}){f.required ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conversion */}
                  <div className="col-span-2">
                    <Select
                      value={mapping.conversion || undefined}
                      onValueChange={(val) =>
                        updateMapping(index, {
                          conversion: (val || 'none') as FieldMapping['conversion'],
                        })
                      }
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">None</SelectItem>
                        <SelectItem value="toString" className="text-xs">To String</SelectItem>
                        <SelectItem value="toNumber" className="text-xs">To Number</SelectItem>
                        <SelectItem value="toBoolean" className="text-xs">To Boolean</SelectItem>
                        <SelectItem value="parseDate" className="text-xs">Parse Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Confidence */}
                  <div className="col-span-2 flex items-center justify-center">
                    {getConfidenceBadge(mapping.confidence)}
                  </div>

                  {/* Type Match */}
                  <div className="col-span-1 flex items-center justify-center">
                    {typeMismatch ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMapping(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {mappings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No mappings configured yet.</p>
                <p className="text-xs mt-1">
                  Click "AI Auto-Map" to get AI-suggested mappings, or add them manually.
                </p>
              </div>
            )}
          </div>

          {/* Unmapped source fields */}
          {schema.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Unmapped source fields:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {schema
                  .filter(
                    (f) => !mappings.some((m) => m.sourceField === f.name)
                  )
                  .map((f) => (
                    <Badge
                      key={f.name}
                      variant="secondary"
                      className="text-xs font-mono opacity-60"
                    >
                      {f.name}
                    </Badge>
                  ))}
                {schema.filter(
                  (f) => !mappings.some((m) => m.sourceField === f.name)
                ).length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    All source fields are mapped.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              disabled={!canProceedToStep3}
              onClick={() => setStep(3)}
              className="gap-2"
            >
              Next: Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Save */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Summary Card */}
          <div className="card-base rounded-xl p-6 space-y-4">
            <h3 className="font-medium">Configuration Summary</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">URL:</span>
                <span className="ml-2 font-mono text-xs">{apiUrl}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Field Mappings:</span>
                <span className="ml-2 font-medium">{mappings.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Active:</span>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          {/* Mapping Summary */}
          <div className="card-base rounded-xl p-6 space-y-4">
            <h3 className="font-medium">Field Mappings</h3>
            <div className="space-y-2">
              {mappings.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="font-mono text-xs">{m.sourceField}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{m.targetField}</span>
                  {m.conversion !== 'none' && (
                    <Badge variant="secondary" className="text-xs">
                      {m.conversion}
                    </Badge>
                  )}
                  {getConfidenceBadge(m.confidence)}
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          {sampleData.length > 0 && mappings.length > 0 && (
            <div className="card-base rounded-xl p-6 space-y-4">
              <h3 className="font-medium">Data Preview</h3>
              <p className="text-xs text-muted-foreground">
                How your records will look after transformation:
              </p>
              <div className="overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      {mappings.map((m) => (
                        <th
                          key={m.targetField}
                          className="text-left py-2 px-3 font-medium text-muted-foreground"
                        >
                          {m.targetField}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getPreviewData().map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {mappings.map((m) => (
                          <td key={m.targetField} className="py-2 px-3 font-mono">
                            {row[m.targetField] !== undefined && row[m.targetField] !== null
                              ? String(row[m.targetField]).slice(0, 60)
                              : <span className="text-muted-foreground italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : editId ? 'Update Data Source' : 'Save Data Source'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewDataSourcePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DataSourceWizardContent />
    </Suspense>
  );
}
