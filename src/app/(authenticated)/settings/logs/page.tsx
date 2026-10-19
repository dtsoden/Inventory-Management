'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollText, Search, Download, RefreshCw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/BaseApiClient';
import { cn } from '@/lib/utils';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
}

interface LogPage {
  entries: LogEntry[];
  total: number;
  sources: string[];
  directory: string;
}

const PAGE_SIZE = 200;

const LEVEL_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All levels' },
  { value: 'error', label: 'Errors only' },
  { value: 'warn,error', label: 'Warnings and errors' },
  { value: 'info,warn,error', label: 'Info and above' },
];

const RANGES: Array<{ value: string; label: string; hours: number | null }> = [
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: 'all', label: 'Everything kept (14 days)', hours: null },
];

const LEVEL_STYLE: Record<LogLevel, string> = {
  error: 'bg-red-500/10 text-red-700 dark:text-red-400',
  warn: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  debug: 'bg-muted text-muted-foreground',
};

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [source, setSource] = useState('all');
  const [range, setRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState<LogPage | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (level !== 'all') params.set('level', level);
    if (source !== 'all') params.set('source', source);
    if (appliedSearch.trim()) params.set('q', appliedSearch.trim());
    const hours = RANGES.find((r) => r.value === range)?.hours;
    if (hours) params.set('from', new Date(Date.now() - hours * 3_600_000).toISOString());
    return params;
  }, [level, source, appliedSearch, range]);

  const load = useCallback(async () => {
    const params = buildParams();
    params.set('limit', String(limit));
    try {
      const res = await apiFetch(`/api/settings/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setPage(data.data);
      } else {
        toast.error(data.error || 'Failed to load logs');
      }
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [buildParams, limit]);

  useEffect(() => {
    setLoading(true);
    setExpanded(new Set());
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  function onSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLimit(PAGE_SIZE);
      setAppliedSearch(value);
    }, 300);
  }

  function exportLogs(format: 'csv' | 'json') {
    const params = buildParams();
    params.set('format', format);
    window.location.href = `/api/settings/logs/export?${params}`;
  }

  function toggle(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const entries = page?.entries ?? [];

  return (
    <div className="card-base rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            System Logs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Server messages and errors, kept for 14 days. The same files are in{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{page?.directory ?? 'data/logs'}</code>{' '}
            on the Docker host.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportLogs('csv')}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportLogs('json')}>
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2 xl:col-span-1">
          <Label htmlFor="log-search">Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="log-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Text in the message"
              className="pl-8"
            />
          </div>
        </div>
        <div>
          <Label>Level</Label>
          <Select value={level} onValueChange={(v) => { setLimit(PAGE_SIZE); setLevel(v ?? 'all'); }}>
            <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVEL_FILTERS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Source</Label>
          <Select value={source} onValueChange={(v) => { setLimit(PAGE_SIZE); setSource(v ?? 'all'); }}>
            <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {(page?.sources ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Time range</Label>
          <Select value={range} onValueChange={(v) => { setLimit(PAGE_SIZE); setRange(v ?? '24h'); }}>
            <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {loading ? 'Loading...' : `${page?.total ?? 0} entries${(page?.total ?? 0) > entries.length ? `, showing newest ${entries.length}` : ''}`}
        </span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            Auto-refresh
          </label>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-6 px-2 py-2" />
              <th className="whitespace-nowrap px-3 py-2">Time</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  No log entries match these filters.
                </td>
              </tr>
            )}
            {entries.map((e, i) => {
              const open = expanded.has(i);
              const multiline = e.message.includes('\n') || e.message.length > 160;
              return (
                <tr
                  key={`${e.ts}-${i}`}
                  className={cn('align-top', multiline && 'cursor-pointer hover:bg-accent/40')}
                  onClick={() => multiline && toggle(i)}
                >
                  <td className="px-2 py-2 text-muted-foreground">
                    {multiline && (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                    {new Date(e.ts).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium uppercase', LEVEL_STYLE[e.level])}>
                      {e.level}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.source}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {open ? (
                      <pre className="whitespace-pre-wrap break-words">{e.message}</pre>
                    ) : (
                      <span className="line-clamp-2 break-words">{e.message.split('\n')[0]}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(page?.total ?? 0) > entries.length && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Show older entries
          </Button>
        </div>
      )}
    </div>
  );
}
