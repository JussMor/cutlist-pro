/**
 * workers/studio-repo.ts
 * D1 CRUD for Studio redesign documents. Mirrors workers/projects-repo.ts.
 * The full StudioDocument is stored as JSON in the `document` column; title +
 * published_at are denormalized columns for listing without parsing every row.
 */
import type { StudioDocument } from "../lib/studio/document";
import { Env } from "./env";

export interface StudioDocRecord {
  id: string;
  title: string;
  document: StudioDocument;
  publishedAt?: number;
}

export interface StudioDocSummary {
  id: string;
  title: string;
  publishedAt?: number;
  updatedAt: number;
}

export async function getStudioDocs(env: Env): Promise<StudioDocSummary[]> {
  const result = (await env.DB.prepare(
    "SELECT id, title, published_at, updated_at FROM studio_documents ORDER BY updated_at DESC LIMIT 50",
  ).all<{ results?: Record<string, string>[] }>()) ?? { results: [] };

  return (result.results ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    publishedAt: row.published_at ? Number(row.published_at) : undefined,
    updatedAt: Number(row.updated_at),
  }));
}

export async function getStudioDoc(
  env: Env,
  id: string,
): Promise<StudioDocRecord | null> {
  const row = await env.DB.prepare(
    "SELECT id, title, document, published_at FROM studio_documents WHERE id = ?",
  )
    .bind(id)
    .first<Record<string, string>>();
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    document: JSON.parse(row.document) as StudioDocument,
    publishedAt: row.published_at ? Number(row.published_at) : undefined,
  };
}

export async function upsertStudioDoc(
  env: Env,
  record: StudioDocRecord,
): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO studio_documents (id, title, document, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       document = excluded.document,
       published_at = excluded.published_at,
       updated_at = excluded.updated_at`,
  )
    .bind(
      record.id,
      record.title,
      JSON.stringify(record.document),
      record.publishedAt ?? null,
      record.document.createdAt ?? now,
      record.document.updatedAt ?? now,
    )
    .run();
}

export async function deleteStudioDoc(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM studio_documents WHERE id = ?")
    .bind(id)
    .run();
}
