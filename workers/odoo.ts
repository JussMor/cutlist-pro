/**
 * workers/odoo.ts
 * Odoo stock-sheet integration: KV cache, mock fallback, JSON-RPC auth + search_read.
 * Extracted from workers/api.ts as part of the <500-line refactor.
 */

import { StockSheet } from "../lib/domain/types";
import { Env } from "./env";

export async function fetchOdooSheets(env: Env): Promise<StockSheet[]> {
  const sheetsCacheKey = "odoo:sheets:v2";
  const cached = await env.KV.get<StockSheet[]>(sheetsCacheKey, "json");
  if (cached?.length) return cached;

  // Validar que todas las credenciales de Odoo estén configuradas
  const hasCredentials =
    env.ODOO_URL &&
    env.ODOO_DB &&
    env.ODOO_USER &&
    (env.ODOO_API_KEY || env.ODOO_PASSWORD);

  if (!hasCredentials) {
    throw new Error(
      "Odoo credentials not configured: ODOO_URL, ODOO_DB, ODOO_USER, and (ODOO_API_KEY or ODOO_PASSWORD) are required",
    );
  }

  // Obtener tasa de impuesto (por defecto 0.15 = 15% IVA)
  const taxRate = Number(env.ODOO_TAX_RATE ?? "0.15");

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
              "taxes_id",
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
    const basePrice = Number(p.list_price ?? p.standard_price ?? 0);
    const priceWithTax = basePrice * (1 + taxRate);

    return {
      odooId: Number(p.id ?? 0),
      name,
      qty: Number(p.qty_available ?? 0),
      pricePerSheet: priceWithTax,
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
