'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditFilters {
  actions: string[];
  entities: string[];
  users: { id: string; name: string }[];
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: AuditFilters;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  UPDATE: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-red-500/10 text-red-700 dark:text-red-400',
  LOGIN: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  LOGOUT: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  VIEW: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  APPROVE: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  REJECT: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  SUBMIT: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  RECEIVE: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    actions: [],
    entities: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter state
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '25');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      if (userFilter) params.set('userId', userFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/audit-log?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.filters) {
          setFilters(json.data.filters);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleClearFilters() {
    setActionFilter('');
    setEntityFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const hasActiveFilters = actionFilter || entityFilter || userFilter || dateFrom || dateTo;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Audit Log
        </h1>
        {data && (
          <Badge variant="outline" className="text-xs">
            {data.total} entries
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="mt-4 card-base rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="w-40">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? ''); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {filters.actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v ?? ''); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Entities</SelectItem>
                {filters.entities.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v ?? ''); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Users</SelectItem>
                {filters.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <User className="mr-1 h-3 w-3 inline" />
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-36"
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-36"
              placeholder="To"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 card-base rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No audit log entries found matching your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Action</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Entity</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Entity ID</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((entry) => (
                    <>
                      <tr
                        key={entry.id}
                        className="border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() =>
                          setExpandedRow(
                            expandedRow === entry.id ? null : entry.id
                          )
                        }
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(entry.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{entry.userName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                              actionColors[entry.action] || 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{entry.entity}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {entry.entityId ? entry.entityId.slice(0, 12) + '...' : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {entry.details && (
                            expandedRow === entry.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )
                          )}
                        </td>
                      </tr>
                      {expandedRow === entry.id && entry.details && (
                        <tr key={`${entry.id}-details`} className="border-b border-border/50">
                          <td colSpan={6} className="px-4 py-3 bg-muted/20">
                            <div className="pl-8">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Details
                              </p>
                              <p className="text-sm">{entry.details}</p>
                              {entry.ipAddress && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  IP: {entry.ipAddress}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1} to{' '}
                {Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm">
                  {data.page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
