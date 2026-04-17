/**
 * workers/projects-repo.ts
 * D1 + KV CRUD for projects: list, get workspace, upsert, delete.
 * Extracted from workers/api.ts as part of the <500-line refactor.
 */

import {
  CutResult,
  PricingConfig,
  Project,
  TemplateParams,
} from "../lib/domain/types";
import { Env } from "./env";

export function projectWorkspaceKey(projectId: string): string {
  return `project:workspace:${projectId}`;
}

export async function getProjectWorkspace(
  env: Env,
  projectId: string,
): Promise<Project["workspace"] | undefined> {
  const workspace = await env.KV.get<Project["workspace"]>(
    projectWorkspaceKey(projectId),
    "json",
  );
  return workspace ?? undefined;
}

export async function getProjects(env: Env): Promise<Project[]> {
  const result = (await env.DB.prepare(
    "SELECT id, name, template_key, params, cut_result, pricing, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT 50",
  ).all<{ results?: Record<string, string>[] }>()) ?? { results: [] };

  const rows = result.results ?? [];
  const projects: Project[] = [];

  for (const row of rows) {
    projects.push({
      id: row.id,
      name: row.name,
      templateKey: row.template_key,
      params: JSON.parse(row.params) as TemplateParams,
      cutResult: row.cut_result
        ? (JSON.parse(row.cut_result) as CutResult)
        : undefined,
      pricingConfig: JSON.parse(row.pricing) as PricingConfig,
      workspace: await getProjectWorkspace(env, row.id),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    });
  }

  return projects;
}

export async function upsertProject(env: Env, payload: Project): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO projects (id, name, template_key, params, cut_result, pricing, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       template_key = excluded.template_key,
       params = excluded.params,
       cut_result = excluded.cut_result,
       pricing = excluded.pricing,
       updated_at = excluded.updated_at`,
  )
    .bind(
      payload.id,
      payload.name,
      payload.templateKey,
      JSON.stringify(payload.params),
      payload.cutResult ? JSON.stringify(payload.cutResult) : null,
      JSON.stringify(payload.pricingConfig),
      payload.createdAt,
      payload.updatedAt,
    )
    .run();

  if (payload.workspace) {
    await env.KV.put(
      projectWorkspaceKey(payload.id),
      JSON.stringify(payload.workspace),
    );
  } else {
    await env.KV.delete(projectWorkspaceKey(payload.id));
  }
}

export async function deleteProject(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
  await env.KV.delete(projectWorkspaceKey(id));
}
