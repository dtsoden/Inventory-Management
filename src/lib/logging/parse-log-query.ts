import type { LogLevel, LogQuery } from './LogStore';

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

/** Shared by the logs list and export routes so both filter identically. */
export function parseLogQuery(params: URLSearchParams): LogQuery {
  const date = (key: string) => {
    const v = params.get(key);
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : undefined;
  };
  const levels = (params.get('level') ?? '')
    .split(',')
    .map((l) => l.trim().toLowerCase())
    .filter((l): l is LogLevel => (LEVELS as string[]).includes(l));
  return {
    levels,
    search: params.get('q') ?? undefined,
    source: params.get('source') || undefined,
    from: date('from'),
    to: date('to'),
    limit: Number(params.get('limit')) || undefined,
    offset: Number(params.get('offset')) || undefined,
  };
}
