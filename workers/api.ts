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

type D1Binding = {
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

type KVBinding = {
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
  });
}

async function fetchOdooSheets(env: Env): Promise<StockSheet[]> {
  const sheetsCacheKey = "odoo:sheets:v2";
  const cached = await env.KV.get<StockSheet[]>(sheetsCacheKey, "json");
  if (cached?.length) return cached;

  // Sin credenciales → datos mock para desarrollo
  const hasCredentials =
    env.ODOO_URL &&
    env.ODOO_DB &&
    env.ODOO_USER &&
    (env.ODOO_API_KEY || env.ODOO_PASSWORD);

  if (!hasCredentials) {
    const fallback: StockSheet[] = [
      {
        odooId: 1,
        name: "Melamina Blanca 244x122",
        qty: 25,
        pricePerSheet: 45,
        L: 244,
        W: 122,
        material: "Melamina",
      },
      {
        odooId: 2,
        name: "Melamina Roble 244x122",
        qty: 10,
        pricePerSheet: 55,
        L: 244,
        W: 122,
        material: "Melamina",
      },
    ];
    await env.KV.put(sheetsCacheKey, JSON.stringify(fallback), {
      expirationTtl: 300,
    });
    return fallback;
  }

  // ── Paso 1: obtener uid (con cache de 23h para no re-autenticar cada vez) ──
  const credential = env.ODOO_API_KEY ?? env.ODOO_PASSWORD!;
  let uid = await env.KV.get<number>("odoo:uid", "json");

  if (!uid) {
    // Endpoint estándar de Odoo JSON-RPC — funciona en SaaS y self-hosted
    const authRes = await fetch(`${env.ODOO_URL}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        id: 1,
        params: {
          service: "common",
          method: "authenticate",
          args: [env.ODOO_DB, env.ODOO_USER, credential, {}],
        },
      }),
    });

    if (!authRes.ok) {
      throw new Error(`Odoo auth HTTP error: ${authRes.status}`);
    }

    const authJson = (await authRes.json()) as {
      result?: number | false;
      error?: { message?: string };
    };

    if (authJson.error) {
      throw new Error(
        `Odoo auth error: ${authJson.error.message ?? "unknown"}`,
      );
    }
    if (!authJson.result) {
      throw new Error("Odoo: credenciales incorrectas o usuario sin acceso");
    }

    uid = authJson.result;
    // Cachear uid 23 horas (API keys no expiran; sesiones duran ~24h en Odoo Online)
    await env.KV.put("odoo:uid", String(uid), { expirationTtl: 82800 });
  }

  // ── Paso 2: buscar productos en categoría Tableros ──
  // Usamos OR para cubrir dos casos:
  //   - categ_id.name    → nombre directo de la categoría hija ("MELAMINA", "MDF", etc.)
  //   - categ_id.complete_name → ruta completa ("TABLEROS / MELAMINA")
  // Ambos en ilike (case-insensitive) para tolerar mayúsculas/minúsculas.
  const stockRes = await fetch(`${env.ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: 2,
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          env.ODOO_DB,
          uid,
          credential,
          "product.template",
          "search_read",
          [
            [
              "|",
              ["categ_id.complete_name", "ilike", "TABLERO"],
              ["categ_id.name", "ilike", "TABLERO"],
            ],
          ],
          {
            fields: [
              "name",
              "default_code",
              "qty_available",
              "list_price",
              "standard_price",
              "description_sale",
              "categ_id",
            ],
            limit: 200,
            order: "name asc",
          },
        ],
      },
    }),
  });

  if (!stockRes.ok) {
    throw new Error(`Odoo stock HTTP error: ${stockRes.status}`);
  }

  const stockJson = (await stockRes.json()) as {
    result?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };

  if (stockJson.error) {
    // uid expirado o inválido → eliminar cache para forzar re-auth en el próximo request
    await env.KV.delete("odoo:uid");
    throw new Error(
      `Odoo stock error: ${stockJson.error.message ?? "unknown"}`,
    );
  }

  const records = stockJson.result ?? [];

  const sheets: StockSheet[] = records.map((p) => {
    const name = String(p.name ?? "Tablero");
    const categ = Array.isArray(p.categ_id) ? String(p.categ_id[1] ?? "") : "";

    return {
      odooId: Number(p.id ?? 0),
      name,
      qty: Number(p.qty_available ?? 0),
      pricePerSheet: Number(p.list_price ?? p.standard_price ?? 0),
      L: 244,
      W: 122,
      material: categ || String(p.description_sale ?? ""),
    };
  });

  await env.KV.put(sheetsCacheKey, JSON.stringify(sheets), {
    expirationTtl: 300,
  });
  return sheets;
}

function projectWorkspaceKey(projectId: string): string {
  return `project:workspace:${projectId}`;
}

async function getProjectWorkspace(
  env: Env,
  projectId: string,
): Promise<Project["workspace"] | undefined> {
  const workspace = await env.KV.get<Project["workspace"]>(
    projectWorkspaceKey(projectId),
    "json",
  );
  return workspace ?? undefined;
}

async function getProjects(env: Env): Promise<Project[]> {
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

async function upsertProject(env: Env, payload: Project): Promise<void> {
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

async function deleteProject(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
  await env.KV.delete(projectWorkspaceKey(id));
}

async function getAssemblies(env: Env): Promise<Assembly[]> {
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

async function upsertAssembly(env: Env, payload: Assembly): Promise<void> {
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

async function deleteAssembly(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM assemblies WHERE id = ?").bind(id).run();
}

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
          await env.KV.delete("odoo:sheets");
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
