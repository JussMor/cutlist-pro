import {
  Assembly,
  CutResult,
  Panel,
  PricingConfig,
  Project,
  StockSheet,
  TemplateCategory,
  TemplateParams,
} from "../lib/domain/types";
import { optimizeGuillotine } from "../lib/optimizer/guillotine";
import { calculateCost } from "../lib/pricing";

import { Env } from "./env";
import { json } from "./http";
import { fetchOdooSheets } from "./odoo";
import {
  getProjects,
  upsertProject,
  deleteProject,
  getProjectWorkspace,
} from "./projects-repo";
import { getAssemblies, upsertAssembly, deleteAssembly } from "./assemblies-repo";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return json({ ok: true });

    const url = new URL(req.url);
    // Normalize trailing slash so /api/sheets/ == /api/sheets
    const path = url.pathname.replace(/\/$/, "") || "/";
    const method = req.method;

    try {
      if (path === "/" || path === "") {
        return json({
          service: "cutlist-pro-api",
          status: "ok",
          note: "Este es el backend del worker. La app corre en http://localhost:3000",
          endpoints: [
            "GET  /api/health",
            "GET  /api/sheets",
            "GET  /api/projects",
            "GET  /api/projects/:id",
            "POST /api/projects",
            "DELETE /api/projects/:id",
            "GET  /api/assemblies",
            "GET  /api/assemblies/:id",
            "POST /api/assemblies",
            "DELETE /api/assemblies/:id",
            "POST /api/optimize",
          ],
        });
      }

      if (path === "/api/health") {
        return json({ ok: true, service: "cutlist-pro-api" });
      }

      if (path === "/api/sheets" && method === "GET") {
        const forceRefresh = url.searchParams.get("refresh") === "1";
        if (forceRefresh) {
          await env.KV.delete("odoo:sheets:v2");
          await env.KV.delete("odoo:uid");
        }
        const sheets = await fetchOdooSheets(env);
        return json({ sheets, cached: !forceRefresh });
      }

      if (path === "/api/projects" && method === "GET") {
        const projects = await getProjects(env);
        return json({ projects });
      }

      if (path === "/api/projects" && method === "POST") {
        const payload = (await req.json()) as Project;
        await upsertProject(env, payload);
        return json({ ok: true }, 201);
      }

      // GET /api/projects/:id
      if (path.startsWith("/api/projects/") && method === "GET") {
        const id = path.split("/").pop();
        if (!id) return json({ error: "Missing project id" }, 400);
        const row = await env.DB.prepare(
          "SELECT id, name, template_key, params, cut_result, pricing, created_at, updated_at FROM projects WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, string>>();
        if (!row) return json({ error: "Project not found" }, 404);
        return json({
          project: {
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
          },
        });
      }

      // DELETE /api/projects/:id
      if (path.startsWith("/api/projects/") && method === "DELETE") {
        const id = path.split("/").pop();
        if (!id) return json({ error: "Missing project id" }, 400);
        await deleteProject(env, id);
        return json({ ok: true });
      }

      // ═══════════════════════════ ASSEMBLIES ENDPOINTS ═══════════════════════════

      if (path === "/api/assemblies" && method === "GET") {
        const assemblies = await getAssemblies(env);
        return json({ assemblies });
      }

      if (path === "/api/assemblies" && method === "POST") {
        const payload = (await req.json()) as Assembly;
        await upsertAssembly(env, payload);
        return json({ ok: true }, 201);
      }

      // GET /api/assemblies/:id
      if (path.startsWith("/api/assemblies/") && method === "GET") {
        const id = path.split("/").pop();
        if (!id) return json({ error: "Missing assembly id" }, 400);
        const row = await env.DB.prepare(
          "SELECT id, name, description, panels, is_custom, category, created_at, updated_at FROM assemblies WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, string>>();
        if (!row) return json({ error: "Assembly not found" }, 404);
        return json({
          assembly: {
            id: row.id,
            name: row.name,
            description: row.description,
            panels: JSON.parse(row.panels) as Panel[],
            isCustom: Boolean(row.is_custom),
            category: row.category as TemplateCategory | undefined,
            createdAt: Number(row.created_at),
            updatedAt: Number(row.updated_at),
          },
        });
      }

      // DELETE /api/assemblies/:id
      if (path.startsWith("/api/assemblies/") && method === "DELETE") {
        const id = path.split("/").pop();
        if (!id) return json({ error: "Missing assembly id" }, 400);
        await deleteAssembly(env, id);
        return json({ ok: true });
      }

      if (path === "/api/optimize" && method === "POST") {
        const body = (await req.json()) as {
          panels: Panel[];
          sheets: StockSheet[];
          pricingConfig: PricingConfig;
        };

        const cut = optimizeGuillotine(
          body.panels,
          body.sheets,
          body.pricingConfig.kerfCm,
        );
        const totalCost = calculateCost(cut, body.pricingConfig);
        return json({ result: { ...cut, totalCost } });
      }

      return json({ error: "Not found", path, method }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json({ error: message, path, method }, 500);
    }
  },
};
