/**
 * Centralized fetch wrapper for client-side code.
 *
 * Every fetch() call from React components SHOULD go through one of
 * the methods on this class. The point is to enforce consistent:
 *  - URL prefixing (/api)
 *  - Same-origin credential mode (so the NextAuth cookie travels)
 *  - Content-Type header on JSON bodies
 *  - JSON envelope unwrapping (data field)
 *  - Error normalization (throws ApiError with status + code + message)
 *  - Future hooks: retry policy, request id, telemetry
 *
 * Migration is incremental: this class lives alongside existing raw
 * fetch() calls and call sites can be migrated one by one without
 * breaking anything.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
  code?: string;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
}

export class BaseApiClient {
  private readonly baseUrl: string;

  constructor(options: ApiClientOptions = {}) {
    // Default to same-origin /api so server components and client
    // components both work. Override for tests or external bases.
    this.baseUrl = options.baseUrl ?? '/api';
  }

  protected url(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/api')) return path;
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: HeadersInit,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }

    let res: Response;
    try {
      res = await fetch(this.url(path), {
        method,
        credentials: 'same-origin',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      throw new ApiError(
        networkError instanceof Error ? networkError.message : 'Network error',
        0,
      );
    }

    // Try to parse JSON, but tolerate empty bodies (e.g. 204 No Content).
    let json: ApiEnvelope<T> | null = null;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text) as ApiEnvelope<T>;
      } catch {
        // Non-JSON response. Treat as failure if status was bad.
        if (!res.ok) {
          throw new ApiError(`HTTP ${res.status}: ${text.slice(0, 200)}`, res.status);
        }
        return undefined as T;
      }
    }

    if (!res.ok) {
      const message =
        (json && 'error' in json && json.error) ||
        `HTTP ${res.status}`;
      const code =
        json && 'code' in json && json.code ? json.code : undefined;
      throw new ApiError(message, res.status, code);
    }

    if (json && 'success' in json) {
      if (!json.success) {
        throw new ApiError(
          (json as ApiFailure).error,
          res.status,
          (json as ApiFailure).code,
        );
      }
      return (json as ApiSuccess<T>).data;
    }

    // Non-enveloped success (rare, but handle it).
    return (json as unknown as T) ?? (undefined as T);
  }

  get<T>(path: string, extraHeaders?: HeadersInit): Promise<T> {
    return this.request<T>('GET', path, undefined, extraHeaders);
  }

  post<T>(path: string, body?: unknown, extraHeaders?: HeadersInit): Promise<T> {
    return this.request<T>('POST', path, body, extraHeaders);
  }

  put<T>(path: string, body?: unknown, extraHeaders?: HeadersInit): Promise<T> {
    return this.request<T>('PUT', path, body, extraHeaders);
  }

  patch<T>(path: string, body?: unknown, extraHeaders?: HeadersInit): Promise<T> {
    return this.request<T>('PATCH', path, body, extraHeaders);
  }

  delete<T = void>(path: string, extraHeaders?: HeadersInit): Promise<T> {
    return this.request<T>('DELETE', path, undefined, extraHeaders);
  }

  /**
   * Escape hatch for the rare case where a caller needs the raw Response
   * object (e.g. file downloads, streaming). Goes through the same fetch
   * pipeline but skips JSON parsing and envelope unwrapping.
   */
  async raw(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(this.url(path), {
      method,
      credentials: 'same-origin',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Drop-in replacement for the global fetch function. Same signature
   * (path, init) so existing call sites can be migrated by changing the
   * import alone. The single point of difference: same-origin credentials
   * are forced on so the NextAuth cookie always travels.
   *
   * This is the migration target for the 120 raw fetch() calls scattered
   * across React components. Eventually those call sites should adopt the
   * typed get/post/put helpers above, but apiFetch is the safe first
   * step that routes every client request through this class without
   * changing the response-handling logic at the call site.
   */
  async fetchRaw(path: string, init?: RequestInit): Promise<Response> {
    return fetch(this.url(path), {
      credentials: 'same-origin',
      ...init,
    });
  }
}

/**
 * Default singleton instance for app-wide use. Components can do:
 *   import { apiClient } from '@/lib/client/BaseApiClient';
 *   const vendors = await apiClient.get<Vendor[]>('/vendors');
 */
export const apiClient = new BaseApiClient();

/**
 * Drop-in replacement for the global fetch function. The migration
 * target for components that still use raw fetch.
 *
 *   import { apiFetch } from '@/lib/client/BaseApiClient';
 *   const res = await apiFetch('/api/vendors');
 *   const json = await res.json();
 */
export function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return apiClient.fetchRaw(path, init);
}
