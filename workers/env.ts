/**
 * workers/env.ts
 * Cloudflare Worker binding types and environment interface.
 * Extracted from workers/api.ts as part of the <500-line refactor.
 */

export type D1Binding = {
  prepare: (query: string) => {
    bind: (...params: unknown[]) => {
      run: <T = unknown>() => Promise<T>;
      all: <T = unknown>() => Promise<T>;
      first: <T = unknown>() => Promise<T | null>;
    };
    run: <T = unknown>() => Promise<T>;
    all: <T = unknown>() => Promise<T>;
    first: <T = unknown>() => Promise<T | null>;
  };
};

export type KVBinding = {
  get: <T = string>(key: string, type?: "json" | "text") => Promise<T | null>;
  put: (
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export interface Env {
  DB: D1Binding;
  KV: KVBinding;
  ODOO_URL?: string;
  ODOO_USER?: string;
  ODOO_PASSWORD?: string;
  ODOO_API_KEY?: string;
  ODOO_DB?: string;
}
