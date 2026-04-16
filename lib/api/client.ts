import {
  Assembly,
  CutResult,
  Panel,
  PricingConfig,
  Project,
  StockSheet,
} from "@/lib/domain/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787";

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchSheets(forceRefresh = false): Promise<StockSheet[]> {
  const url = forceRefresh
    ? `${API_BASE}/api/sheets?refresh=1`
    : `${API_BASE}/api/sheets`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await parse<{ sheets: StockSheet[] }>(res);
  return data.sheets;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`, { cache: "no-store" });
  const data = await parse<{ projects: Project[] }>(res);
  return data.projects;
}

export async function saveProject(project: Project): Promise<void> {
  await parse(
    await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    }),
  );
}

export async function deleteProject(id: string): Promise<void> {
  await parse(
    await fetch(`${API_BASE}/api/projects/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export async function optimize(
  panels: Panel[],
  sheets: StockSheet[],
  pricingConfig: PricingConfig,
): Promise<CutResult> {
  const res = await fetch(`${API_BASE}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ panels, sheets, pricingConfig }),
  });
  const data = await parse<{ result: CutResult }>(res);
  return data.result;
}

// ════════════════════════ ASSEMBLIES ════════════════════════

export async function fetchAssemblies(): Promise<Assembly[]> {
  const res = await fetch(`${API_BASE}/api/assemblies`, { cache: "no-store" });
  const data = await parse<{ assemblies: Assembly[] }>(res);
  return data.assemblies;
}

export async function saveAssembly(assembly: Assembly): Promise<void> {
  await parse(
    await fetch(`${API_BASE}/api/assemblies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assembly),
    }),
  );
}

export async function deleteAssembly(id: string): Promise<void> {
  await parse(
    await fetch(`${API_BASE}/api/assemblies/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }),
  );
}
