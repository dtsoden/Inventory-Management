import { format } from 'util';
import { logStore, type LogLevel } from './LogStore';

const INSTALLED = Symbol.for('inventory.consoleCapture');

/**
 * Tee console output into the LogStore so Settings > Logs shows what the
 * server printed: app messages, OpenAI timings, and Next.js's own errors.
 * Output still goes to stdout/stderr, so `docker logs` keeps working.
 */
export function installConsoleCapture(): void {
  const g = globalThis as unknown as Record<symbol, boolean>;
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;

  const methods: Array<[keyof Console, LogLevel]> = [
    ['debug', 'debug'],
    ['log', 'info'],
    ['info', 'info'],
    ['warn', 'warn'],
    ['error', 'error'],
  ];

  for (const [method, level] of methods) {
    const original = (console[method] as (...args: unknown[]) => void).bind(console);
    (console as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      original(...args);
      try {
        logStore.append(level, format(...args));
      } catch {
        // Never let logging break the caller.
      }
    };
  }

  console.info(`[app] Server started, logging to ${logStore.directory}`);
}
