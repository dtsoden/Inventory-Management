'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plug,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DataSource {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
}

interface SchemaField {
  name: string;
  type: string;
  sampleValue: unknown;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: string;
  sourceDataType: string;
  conversion: string;
  confidence: number;
}

interface TestResult {
  success: boolean;
  sampleData: Record<string, unknown>[] | null;
  schema: SchemaField[];
  error?: string;
  recordCount?: number;
}

const TARGET_FIELDS = [
  { name: 'name', type: 'string', required: true, label: 'Name' },
  { name: 'sku', type: 'string', required: false, label: 'SKU' },
  { name: 'description', type: 'string', required: false, label: 'Description' },
  { name: 'unitCost', type: 'number', required: true, label: 'Unit Cost' },
  { name: 'imageUrl', type: 'string', required: false, label: 'Image URL' },
  { name: 'externalId', type: 'string', required: false, label: 'External ID' },
  { name: 'category', type: 'string', required: false, label: 'Category' },
];

const CONVERSION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'toString', label: 'To String' },
  { value: 'toNumber', label: 'To Number' },
  { value: 'toBoolean', label: 'To Boolean' },
  { value: 'parseDate', label: 'Parse Date' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#22c55e';
  if (confidence >= 0.5) return '#eab308';
  return '#ef4444';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

function truncateUrl(url: string, max = 50) {
  return url.length > max ? url.slice(0, max) + '...' : url;
}

function formatSampleValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string')
    return value.length > 40 ? value.slice(0, 40) + '...' : value;
  if (typeof value === 'object')
    return JSON.stringify(value).slice(0, 40) + '...';
  return String(value);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object')
      return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function applyConversion(value: unknown, conversion: string): unknown {
  if (value === null || value === undefined) return null;
  switch (conversion) {
    case 'toString':
      return String(value);
    case 'toNumber': {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
    case 'toBoolean':
      if (typeof value === 'string')
        return ['true', '1', 'yes'].includes(value.toLowerCase());
      return Boolean(value);
    case 'parseDate':
      try {
        const d = new Date(value as string);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch {
        return null;
      }
    default:
      return value;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'ai';

  // AI tab state
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiKeyMasked, setOpenaiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gpt-5.4-nano');
  const [availableModels, setAvailableModels] = useState<{ id: string }[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Data sources state
  const [sources, setSources] = useState<DataSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SMTP tab state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpTesting, setSmtpTesting] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Step 1 state
  const [wizardName, setWizardName] = useState('');
  const [wizardUrl, setWizardUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Step 2 state
  const [analyzing, setAnalyzing] = useState(false);
  const [sourceSchema, setSourceSchema] = useState<SchemaField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  // Step 3 state
  const [savingSource, setSavingSource] = useState(false);

  useEffect(() => {
    fetch('/api/settings/integrations?category=integrations')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setOpenaiKeyMasked(res.data.openaiKeyMasked || '');
          if (res.data.openaiModel) {
            setSelectedModel(res.data.openaiModel);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchSources();

    // Load SMTP settings
    fetch('/api/settings/integrations?category=smtp')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setSmtpHost(res.data.smtp_host || '');
          setSmtpPort(res.data.smtp_port || '587');
          setSmtpUser(res.data.smtp_user || '');
          setSmtpPassword(res.data.smtp_password || '');
          setSmtpFrom(res.data.smtp_from || '');
        }
      })
      .catch(console.error)
      .finally(() => setSmtpLoading(false));
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/data-sources');
      const data = await res.json();
      if (data.success) {
        setSources(data.data || []);
      }
    } catch {
      toast.error('Failed to load data sources');
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  /* ---- AI Tab handlers ---- */

  async function saveOpenAIKey() {
    if (!openaiKey) {
      toast.error('Please enter an API key');
      return;
    }
    setSaving('openai');
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'integrations',
          settings: { openaiApiKey: openaiKey },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('OpenAI API key updated');
        setOpenaiKey('');
        setOpenaiKeyMasked(
          openaiKey.slice(0, 7) + '...' + openaiKey.slice(-4)
        );
      } else {
        toast.error(data.error || 'Failed to save key');
      }
    } catch {
      toast.error('Failed to save key');
    } finally {
      setSaving(null);
    }
  }

  async function fetchModels() {
    setFetchingModels(true);
    try {
      const res = await fetch('/api/settings/ai-models');
      const data = await res.json();
      if (data.success && data.data) {
        setAvailableModels(data.data);
        toast.success(`Found ${data.data.length} available models`);
      } else {
        toast.error(data.error || 'Failed to fetch models');
      }
    } catch {
      toast.error('Failed to fetch models');
    } finally {
      setFetchingModels(false);
    }
  }

  async function saveSelectedModel() {
    setSaving('model');
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'integrations',
          settings: { openaiModel: selectedModel },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Model updated to ${selectedModel}`);
      } else {
        toast.error(data.error || 'Failed to save model');
      }
    } catch {
      toast.error('Failed to save model');
    } finally {
      setSaving(null);
    }
  }

  /* ---- SMTP Tab handlers ---- */

  async function saveSmtpSettings() {
    setSaving('smtp');
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'smtp',
          settings: {
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_user: smtpUser,
            smtp_password: smtpPassword,
            smtp_from: smtpFrom,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('SMTP settings saved');
      } else {
        toast.error(data.error || 'Failed to save SMTP settings');
      }
    } catch {
      toast.error('Failed to save SMTP settings');
    } finally {
      setSaving(null);
    }
  }

  async function testSmtpConnection() {
    if (!smtpHost.trim()) {
      toast.error('Please enter an SMTP host first');
      return;
    }
    setSmtpTesting(true);
    // For now we just validate that settings are present
    setTimeout(() => {
      if (smtpHost && smtpPort) {
        toast.success(
          'SMTP settings look valid. Save them first, then send a test email to verify delivery.'
        );
      } else {
        toast.error('Please fill in at least the SMTP host and port');
      }
      setSmtpTesting(false);
    }, 800);
  }

  /* ---- Catalog API: Source list handlers ---- */

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/settings/data-sources/${id}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        const result = data.data;
        toast.success(
          `Sync complete: ${result.created} created, ${result.updated} updated` +
            (result.errors.length > 0
              ? `, ${result.errors.length} errors`
              : '')
        );
        fetchSources();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete data source "${name}"? This cannot be undone.`))
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/data-sources/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Data source deleted');
        setSources((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusBadge(source: DataSource) {
    if (!source.lastSyncStatus || source.lastSyncStatus === 'NEVER') {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Never Synced
        </Badge>
      );
    }
    if (source.lastSyncStatus === 'SUCCESS') {
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }

  /* ---- Wizard handlers ---- */

  function resetWizard() {
    setWizardOpen(false);
    setWizardStep(1);
    setWizardName('');
    setWizardUrl('');
    setTesting(false);
    setTestResult(null);
    setAnalyzing(false);
    setSourceSchema([]);
    setMappings([]);
    setSavingSource(false);
  }

  function handleLoadSample() {
    setWizardUrl(
      `${window.location.origin}/api/demo/catalog?limit=20&select=title,price,description,category,sku,thumbnail`
    );
    setWizardName('Demo IT Catalog');
    toast.success('Sample API URL loaded');
  }

  async function handleTestConnection() {
    if (!wizardUrl.trim()) {
      toast.error('Please enter an API URL');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/data-sources/_/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: wizardUrl }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTestResult(data.data);
        if (data.data.success) {
          setSourceSchema(data.data.schema || []);
          toast.success(
            `Connection successful. Found ${data.data.recordCount || 0} records.`
          );
        } else {
          toast.error(data.data.error || 'Connection failed');
        }
      } else {
        toast.error(data.error || 'Connection test failed');
      }
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleAnalyze() {
    if (sourceSchema.length === 0) {
      toast.error('No schema to analyze. Test the connection first.');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch('/api/settings/data-sources/_/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: sourceSchema }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMappings(data.data);
        setWizardStep(2);
        toast.success('AI analysis complete');
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    } catch {
      toast.error(
        'AI analysis failed. Check that the OpenAI key is configured in the AI tab.'
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function updateMapping(targetField: string, sourceField: string) {
    setMappings((prev) => {
      const existingIndex = prev.findIndex((m) => m.targetField === targetField);

      if (sourceField === '') {
        // Unmapping: remove the mapping for this target field
        return prev.filter((m) => m.targetField !== targetField);
      }

      const schemaField = sourceSchema.find((s) => s.name === sourceField);
      const targetDef = TARGET_FIELDS.find((t) => t.name === targetField);
      const needsConversion =
        schemaField && targetDef && schemaField.type !== targetDef.type;
      let conversion = 'none';
      if (needsConversion && targetDef) {
        if (targetDef.type === 'number') conversion = 'toNumber';
        else if (targetDef.type === 'string') conversion = 'toString';
      }

      const newMapping: FieldMapping = {
        sourceField,
        targetField,
        dataType: targetDef?.type || 'string',
        sourceDataType: schemaField?.type || 'unknown',
        conversion,
        confidence:
          existingIndex >= 0 ? prev[existingIndex].confidence : 0.5,
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          sourceField,
          sourceDataType: newMapping.sourceDataType,
          conversion,
        };
        return updated;
      }
      return [...prev, newMapping];
    });
  }

  function updateConversion(targetField: string, conversion: string) {
    setMappings((prev) =>
      prev.map((m) =>
        m.targetField === targetField ? { ...m, conversion } : m
      )
    );
  }

  async function handleSave() {
    if (!wizardName.trim()) {
      toast.error('Please enter a name for this connection');
      return;
    }
    setSavingSource(true);
    try {
      const res = await fetch('/api/settings/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardName,
          apiUrl: wizardUrl,
          fieldMappings: mappings,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Catalog API connection saved');
        fetchSources();
        resetWizard();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save connection');
    } finally {
      setSavingSource(false);
    }
  }

  /** Build preview rows by applying mappings to sample data */
  function getPreviewRows(): Record<string, unknown>[] {
    if (!testResult?.sampleData) return [];
    const sampleRecords = (
      testResult.sampleData as Record<string, unknown>[]
    ).slice(0, 5);
    return sampleRecords.map((record) => {
      const row: Record<string, unknown> = {};
      for (const mapping of mappings) {
        const rawValue = getNestedValue(record, mapping.sourceField);
        row[mapping.targetField] = applyConversion(rawValue, mapping.conversion);
      }
      return row;
    });
  }

  /* ---- Active tab styling ---- */

  const tabTriggerBase = 'min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white';

  /* ---- Render ---- */

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
    <>
      {/* Inline style to handle the active tab color reliably across Tailwind v4 */}
      <style>{`
        .integrations-tabs [data-state="active"] {
          background-color: var(--brand-green, #7ed321) !important;
          color: #fff !important;
        }
      `}</style>

      <Tabs defaultValue={defaultTab} className="integrations-tabs space-y-6">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0">
          <TabsTrigger value="ai" className={tabTriggerBase}>
            AI Integration
          </TabsTrigger>
          <TabsTrigger value="catalog-api" className={tabTriggerBase}>
            Catalog API
          </TabsTrigger>
          <TabsTrigger value="smtp" className={tabTriggerBase}>
            Email / SMTP
          </TabsTrigger>
        </TabsList>

        {/* AI Tab */}
        <TabsContent value="ai">
          <div className="card-base rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  OpenAI Integration
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure your OpenAI API key for the AI assistant feature.
                </p>
              </div>
              <Badge variant={openaiKeyMasked ? 'default' : 'secondary'}>
                {openaiKeyMasked ? 'Configured' : 'Not Set'}
              </Badge>
            </div>

            <div className="mt-6 max-w-lg space-y-4">
              {openaiKeyMasked && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Current key:</span>
                  <code className="font-mono">
                    {showKey ? openaiKeyMasked : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              <div>
                <Label htmlFor="openai-key">
                  {openaiKeyMasked ? 'Update API Key' : 'API Key'}
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="openai-key"
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1"
                  />
                  <Button
                    onClick={saveOpenAIKey}
                    disabled={saving === 'openai'}
                    size="sm"
                  >
                    {saving === 'openai' ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <div className="card-base rounded-xl p-6 mt-6">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Model Selection
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose which OpenAI model to use for the AI assistant and packing slip extraction.
            </p>

            <div className="mt-4 max-w-lg space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchModels}
                  disabled={fetchingModels}
                  className="gap-1.5"
                >
                  {fetchingModels ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {fetchingModels ? 'Fetching...' : 'Fetch Models'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Requires a valid API key
                </span>
              </div>

              <div>
                <Label htmlFor="model-select">Model</Label>
                <div className="mt-1.5 flex gap-2">
                  <Select
                    value={selectedModel}
                    onValueChange={(v) => setSelectedModel(v ?? 'gpt-4o-mini')}
                  >
                    <SelectTrigger id="model-select" className="flex-1 w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.length > 0
                        ? availableModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.id}
                            </SelectItem>
                          ))
                        : (
                            <>
                              <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                              <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                              <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                              <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                            </>
                          )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={saveSelectedModel}
                    disabled={saving === 'model'}
                    size="sm"
                  >
                    {saving === 'model' ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Current model: <code className="rounded bg-muted px-1 py-0.5 font-mono">{selectedModel}</code>
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Catalog API Tab */}
        <TabsContent value="catalog-api">
          <div className="space-y-6">
            {wizardOpen ? (
              /* ============ Inline Wizard ============ */
              <div className="card-base rounded-xl p-6">
                {/* Wizard Header with Step Indicators */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetWizard}
                      className="gap-1.5"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to List
                    </Button>
                    <h2 className="section-title">Add Catalog API</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { num: 1, label: 'Connect' },
                      { num: 2, label: 'Map Fields' },
                      { num: 3, label: 'Preview' },
                    ].map((step) => (
                      <div key={step.num} className="flex items-center gap-1.5">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium"
                          style={
                            wizardStep >= step.num
                              ? {
                                  backgroundColor:
                                    'var(--brand-green, #7ed321)',
                                  color: '#fff',
                                }
                              : {
                                  backgroundColor: 'var(--muted, #f1f5f9)',
                                  color: 'var(--muted-foreground, #64748b)',
                                }
                          }
                        >
                          {wizardStep > step.num ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            step.num
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {step.label}
                        </span>
                        {step.num < 3 && (
                          <div className="w-6 h-px bg-border mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ---- Step 1: Enter URL & Test Connection ---- */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div className="max-w-xl space-y-4">
                      <div>
                        <Label htmlFor="wizard-name">Connection Name</Label>
                        <Input
                          id="wizard-name"
                          value={wizardName}
                          onChange={(e) => setWizardName(e.target.value)}
                          placeholder="e.g., Vendor Product Catalog"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="wizard-url">
                            API Endpoint URL
                          </Label>
                          <button
                            onClick={handleLoadSample}
                            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--brand-green, #7ed321)',
                              color: '#fff',
                            }}
                          >
                            Try Sample
                          </button>
                        </div>
                        <Input
                          id="wizard-url"
                          value={wizardUrl}
                          onChange={(e) => {
                            setWizardUrl(e.target.value);
                            setTestResult(null);
                          }}
                          placeholder="https://api.example.com/products"
                          className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Any REST API that returns a JSON array of products.
                          Use &quot;Try Sample&quot; to test with the built-in
                          demo catalog.
                        </p>
                      </div>
                      <Button
                        onClick={handleTestConnection}
                        disabled={testing || !wizardUrl.trim()}
                        className="gap-2"
                      >
                        {testing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {testing ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                      <div className="mt-6">
                        {testResult.success ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                              <span className="text-emerald-700 dark:text-emerald-400">
                                Connection successful.{' '}
                                {testResult.recordCount} records found,{' '}
                                {testResult.schema.length} fields detected.
                              </span>
                            </div>

                            {/* Preview first 3 records */}
                            {testResult.sampleData &&
                              (
                                testResult.sampleData as Record<
                                  string,
                                  unknown
                                >[]
                              ).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">
                                    Sample Records (first 3)
                                  </h4>
                                  <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b bg-muted/50">
                                          {testResult.schema
                                            .slice(0, 8)
                                            .map((field) => (
                                              <th
                                                key={field.name}
                                                className="px-3 py-2 text-left font-medium"
                                              >
                                                {field.name}
                                              </th>
                                            ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(
                                          testResult.sampleData as Record<
                                            string,
                                            unknown
                                          >[]
                                        )
                                          .slice(0, 3)
                                          .map((record, i) => (
                                            <tr
                                              key={i}
                                              className="border-b last:border-b-0"
                                            >
                                              {testResult.schema
                                                .slice(0, 8)
                                                .map((field) => (
                                                  <td
                                                    key={field.name}
                                                    className="px-3 py-2 text-muted-foreground max-w-[200px] truncate"
                                                  >
                                                    {formatSampleValue(
                                                      getNestedValue(
                                                        record,
                                                        field.name
                                                      )
                                                    )}
                                                  </td>
                                                ))}
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                            {/* Next: Analyze with AI */}
                            <div className="flex justify-end">
                              <Button
                                onClick={handleAnalyze}
                                disabled={analyzing || !wizardName.trim()}
                                className="gap-2"
                              >
                                {analyzing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                {analyzing
                                  ? 'Analyzing with AI...'
                                  : 'Next: AI-Assisted Mapping'}
                                {!analyzing && (
                                  <ArrowRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
                            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                            <span className="text-red-700 dark:text-red-400">
                              {testResult.error || 'Connection failed'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ---- Step 2: AI-Assisted Mapping ---- */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>
                        AI has analyzed the API response and suggested field
                        mappings below. Adjust as needed using the dropdowns.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-4 py-3 text-left font-medium w-[180px]">
                              Our Field
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Source Field
                            </th>
                            <th className="px-4 py-3 text-left font-medium w-[100px]">
                              Source Type
                            </th>
                            <th className="px-4 py-3 text-left font-medium w-[140px]">
                              Conversion
                            </th>
                            <th className="px-4 py-3 text-left font-medium w-[90px]">
                              Confidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {TARGET_FIELDS.map((target) => {
                            const mapping = mappings.find(
                              (m) => m.targetField === target.name
                            );
                            const selectedSource = mapping?.sourceField || '';
                            const typeMismatch =
                              mapping &&
                              mapping.sourceDataType !== target.type &&
                              mapping.sourceDataType !== 'unknown';

                            return (
                              <tr
                                key={target.name}
                                className="border-b last:border-b-0"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {target.label}
                                    </span>
                                    {target.required && (
                                      <span className="text-xs text-red-500">
                                        *
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      ({target.type})
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="relative">
                                    <select
                                      value={selectedSource}
                                      onChange={(e) =>
                                        updateMapping(
                                          target.name,
                                          e.target.value
                                        )
                                      }
                                      className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                      <option value="">
                                        -- Not Mapped --
                                      </option>
                                      {sourceSchema.map((field) => (
                                        <option
                                          key={field.name}
                                          value={field.name}
                                        >
                                          {field.name} ({field.type}
                                          {field.sampleValue !== undefined &&
                                          field.sampleValue !== null
                                            ? `, e.g. ${formatSampleValue(field.sampleValue)}`
                                            : ''}
                                          )
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {mapping ? (
                                    <Badge
                                      variant={
                                        typeMismatch
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {mapping.sourceDataType}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {mapping ? (
                                    <div className="relative">
                                      <select
                                        value={mapping.conversion}
                                        onChange={(e) =>
                                          updateConversion(
                                            target.name,
                                            e.target.value
                                          )
                                        }
                                        className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                      >
                                        {CONVERSION_OPTIONS.map((opt) => (
                                          <option
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {mapping ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            getConfidenceColor(
                                              mapping.confidence
                                            ),
                                        }}
                                        title={`${Math.round(mapping.confidence * 100)}% confidence`}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {getConfidenceLabel(
                                          mapping.confidence
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setWizardStep(1)}
                        className="gap-1.5"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={() => setWizardStep(3)}
                        className="gap-1.5"
                      >
                        Next: Preview
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ---- Step 3: Preview & Save ---- */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-1">
                        Connection Summary
                      </h3>
                      <div className="rounded-lg bg-muted/30 p-4 space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Name:</span>{' '}
                          {wizardName}
                        </p>
                        <p>
                          <span className="text-muted-foreground">URL:</span>{' '}
                          <code className="text-xs font-mono">
                            {truncateUrl(wizardUrl, 80)}
                          </code>
                        </p>
                        <p>
                          <span className="text-muted-foreground">
                            Mapped fields:
                          </span>{' '}
                          {mappings.length} of {TARGET_FIELDS.length}
                        </p>
                      </div>
                    </div>

                    {/* Transformed Preview Table */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Transformed Data Preview
                      </h3>
                      {(() => {
                        const previewRows = getPreviewRows();
                        if (previewRows.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              No preview available. Make sure at least one
                              field is mapped.
                            </p>
                          );
                        }
                        const mappedFields = TARGET_FIELDS.filter((t) =>
                          mappings.some((m) => m.targetField === t.name)
                        );
                        return (
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  {mappedFields.map((f) => (
                                    <th
                                      key={f.name}
                                      className="px-3 py-2 text-left font-medium"
                                    >
                                      {f.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {previewRows.map((row, i) => (
                                  <tr
                                    key={i}
                                    className="border-b last:border-b-0"
                                  >
                                    {mappedFields.map((f) => (
                                      <td
                                        key={f.name}
                                        className="px-3 py-2 text-muted-foreground max-w-[200px] truncate"
                                      >
                                        {formatSampleValue(row[f.name])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setWizardStep(2)}
                        className="gap-1.5"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={savingSource}
                        className="gap-1.5"
                      >
                        {savingSource ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {savingSource ? 'Saving...' : 'Save Connection'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ============ Source List View ============ */
              <div className="card-base rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="section-title flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Catalog API Connections
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Connect to external catalog systems for automated item
                      synchronization.
                    </p>
                  </div>
                  <Button
                    onClick={() => setWizardOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Catalog API
                  </Button>
                </div>

                <div className="mt-6">
                  {sourcesLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="animate-pulse rounded-lg border p-4"
                        >
                          <div className="h-5 w-48 bg-muted rounded" />
                          <div className="h-4 w-72 bg-muted rounded mt-3" />
                        </div>
                      ))}
                    </div>
                  ) : sources.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
                      <ExternalLink className="h-10 w-10 mx-auto text-muted-foreground/50" />
                      <h3 className="mt-3 text-sm font-medium">
                        No catalog connections configured
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Add an external API endpoint to start importing
                        inventory items.
                      </p>
                      <Button
                        onClick={() => setWizardOpen(true)}
                        className="mt-4 gap-2"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                        Add Catalog API
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          className="rounded-lg border p-4 flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-sm">
                                {source.name}
                              </h3>
                              {source.isActive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {getStatusBadge(source)}
                            </div>

                            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-mono text-xs truncate">
                                {truncateUrl(source.apiUrl)}
                              </span>
                            </p>

                            {source.lastSyncAt && (
                              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                <Clock className="h-3 w-3 shrink-0" />
                                Last synced:{' '}
                                {new Date(
                                  source.lastSyncAt
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              disabled={syncingId === source.id}
                              onClick={() => handleSync(source.id)}
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${syncingId === source.id ? 'animate-spin' : ''}`}
                              />
                              {syncingId === source.id
                                ? 'Syncing...'
                                : 'Sync'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === source.id}
                              onClick={() =>
                                handleDelete(source.id, source.name)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Email / SMTP Tab */}
        <TabsContent value="smtp">
          <div className="card-base rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Email / SMTP Configuration
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure outbound email settings for notifications and alerts.
                </p>
              </div>
              <Badge variant={smtpHost ? 'default' : 'secondary'}>
                {smtpHost ? 'Configured' : 'Not Set'}
              </Badge>
            </div>

            {smtpLoading ? (
              <div className="mt-6 animate-pulse space-y-4 max-w-lg">
                <div className="h-10 rounded bg-muted" />
                <div className="h-10 rounded bg-muted" />
                <div className="h-10 rounded bg-muted" />
              </div>
            ) : (
              <div className="mt-6 max-w-lg space-y-4">
                <div>
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input
                    id="smtp-user"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-password">SMTP Password</Label>
                  <div className="mt-1.5 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="smtp-password"
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder="Enter password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="smtp-from">From Address</Label>
                  <Input
                    id="smtp-from"
                    type="email"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder="noreply@example.com"
                    className="mt-1.5"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={saveSmtpSettings}
                    disabled={saving === 'smtp'}
                    size="sm"
                  >
                    {saving === 'smtp' ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={testSmtpConnection}
                    disabled={smtpTesting || !smtpHost.trim()}
                    size="sm"
                    className="gap-1.5"
                  >
                    {smtpTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {smtpTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
