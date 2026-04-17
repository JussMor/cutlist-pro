/**
 * workers/assemblies-repo.ts
 * D1 CRUD for assemblies: list, upsert, delete.
 * Extracted from workers/api.ts as part of the <500-line refactor.
 */

import { Assembly, Panel, TemplateCategory } from "../lib/domain/types";
import { Env } from "./env";

export async function getAssemblies(env: Env): Promise<Assembly[]> {
  const result = (await env.DB.prepare(
    "SELECT id, name, description, panels, is_custom, category, created_at, updated_at FROM assemblies ORDER BY updated_at DESC LIMIT 200",
  ).all<{ results?: Record<string, string>[] }>()) ?? { results: [] };

  const rows = result.results ?? [];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    panels: JSON.parse(row.panels) as Panel[],
    isCustom: Boolean(row.is_custom),
    category: row.category as TemplateCategory | undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

export async function upsertAssembly(
  env: Env,
  payload: Assembly,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO assemblies (id, name, description, panels, is_custom, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       panels = excluded.panels,
       is_custom = excluded.is_custom,
       category = excluded.category,
       updated_at = excluded.updated_at`,
  )
    .bind(
      payload.id,
      payload.name,
      payload.description || null,
      JSON.stringify(payload.panels),
      payload.isCustom ? 1 : 0,
      payload.category || null,
      payload.createdAt,
      payload.updatedAt,
    )
    .run();
}

export async function deleteAssembly(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM assemblies WHERE id = ?").bind(id).run();
}
