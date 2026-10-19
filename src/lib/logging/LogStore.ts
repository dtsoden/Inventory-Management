import { promises as fs } from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  /** ISO timestamp */
  ts: string;
  level: LogLevel;
  /** Tag from a leading "[tag]" in the message, e.g. "openai" or "vault". */
  source: string;
  message: string;
}

export interface LogQuery {
  levels?: LogLevel[];
  search?: string;
  source?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface LogPage {
  entries: LogEntry[];
  total: number;
  sources: string[];
}

const RETENTION_DAYS = 14;
const MAX_MESSAGE_CHARS = 8_000;
const FILE_PREFIX = 'app-';
const FILE_SUFFIX = '.log';

/**
 * Masks values that should never sit in a log file. Covers OpenAI keys,
 * bearer tokens, MailerSend tokens and "password=..." style pairs.
 */
const REDACTIONS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9_-]{12,}/g, 'sk-***'],
  [/\bmssp\.[A-Za-z0-9._-]{8,}/g, 'mssp.***'],
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1***'],
  [/((?:password|passwd|secret|api[_-]?key|token)["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1***'],
];

/**
 * Server log storage: one JSON-lines file per UTC day under data/logs,
 * which is on the Docker volume so it survives rebuilds and can be read
 * from the host. Settings > Logs reads, searches and exports from here.
 */
export class LogStore {
  private writeChain: Promise<void> = Promise.resolve();
  private lastPruneDay = '';

  constructor(private readonly dir: string = path.join(process.cwd(), 'data', 'logs')) {}

  get directory(): string {
    return this.dir;
  }

  append(level: LogLevel, message: string): void {
    const entry = this.toEntry(level, message);
    const line = JSON.stringify(entry) + '\n';
    const day = entry.ts.slice(0, 10);
    // Serialise writes so lines never interleave.
    this.writeChain = this.writeChain
      .then(async () => {
        await fs.mkdir(this.dir, { recursive: true });
        await fs.appendFile(this.fileFor(day), line, 'utf8');
        if (day !== this.lastPruneDay) {
          this.lastPruneDay = day;
          await this.prune();
        }
      })
      .catch(() => {
        // Logging must never take the app down.
      });
  }

  async query(q: LogQuery = {}): Promise<LogPage> {
    const limit = Math.min(Math.max(q.limit ?? 200, 1), 1000);
    const offset = Math.max(q.offset ?? 0, 0);
    const matches = await this.collect(q);
    return {
      entries: matches.slice(offset, offset + limit),
      total: matches.length,
      sources: await this.sources(q),
    };
  }

  /** Every matching entry, newest first, for export. */
  async collect(q: LogQuery = {}): Promise<LogEntry[]> {
    const levels = q.levels?.length ? new Set(q.levels) : null;
    const needle = q.search?.trim().toLowerCase() || null;
    const fromMs = q.from?.getTime() ?? -Infinity;
    const toMs = q.to?.getTime() ?? Infinity;

    const out: LogEntry[] = [];
    for (const day of await this.daysInRange(q.from, q.to)) {
      for (const entry of await this.readDay(day)) {
        const t = Date.parse(entry.ts);
        if (t < fromMs || t > toMs) continue;
        if (levels && !levels.has(entry.level)) continue;
        if (q.source && entry.source !== q.source) continue;
        if (needle && !entry.message.toLowerCase().includes(needle) && !entry.source.includes(needle)) continue;
        out.push(entry);
      }
    }
    return out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  }

  // ----- internals -----

  private toEntry(level: LogLevel, message: string): LogEntry {
    let text = message.length > MAX_MESSAGE_CHARS ? `${message.slice(0, MAX_MESSAGE_CHARS)}... (truncated)` : message;
    for (const [pattern, replacement] of REDACTIONS) text = text.replace(pattern, replacement);
    const tag = /^\[([\w.-]{1,32})\]\s*/.exec(text);
    return {
      ts: new Date().toISOString(),
      level,
      source: tag ? tag[1].toLowerCase() : 'app',
      message: tag ? text.slice(tag[0].length) : text,
    };
  }

  private fileFor(day: string): string {
    return path.join(this.dir, `${FILE_PREFIX}${day}${FILE_SUFFIX}`);
  }

  private async listDays(): Promise<string[]> {
    try {
      const names = await fs.readdir(this.dir);
      return names
        .filter((n) => n.startsWith(FILE_PREFIX) && n.endsWith(FILE_SUFFIX))
        .map((n) => n.slice(FILE_PREFIX.length, -FILE_SUFFIX.length))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  private async daysInRange(from?: Date, to?: Date): Promise<string[]> {
    const fromDay = from ? from.toISOString().slice(0, 10) : '';
    const toDay = to ? to.toISOString().slice(0, 10) : '9999-12-31';
    return (await this.listDays()).filter((d) => d >= fromDay && d <= toDay);
  }

  private async readDay(day: string): Promise<LogEntry[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.fileFor(day), 'utf8');
    } catch {
      return [];
    }
    const entries: LogEntry[] = [];
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        // Skip a partially written line.
      }
    }
    return entries;
  }

  private async sources(q: LogQuery): Promise<string[]> {
    const all = await this.collect({ from: q.from, to: q.to });
    return [...new Set(all.map((e) => e.source))].sort();
  }

  private async prune(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
    for (const day of await this.listDays()) {
      if (day < cutoff) await fs.rm(this.fileFor(day), { force: true });
    }
  }
}

export const logStore = new LogStore();
