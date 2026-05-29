"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteStudioDoc, fetchStudioDocs } from "@/lib/api/client";
import type { StudioDocSummary } from "@/lib/api/client";

function formatDate(value: number) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function StudioProjectsPage() {
  const [projects, setProjects] = useState<StudioDocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
      setProjects(await fetchStudioDocs());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando proyectos");
    } finally {
      setLoading(false);
    }
  }

  async function removeProject(id: string) {
    try {
      await deleteStudioDoc(id);
      setProjects((current) => current.filter((project) => project.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando proyecto");
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  return (
    <main className="min-h-screen bg-[#07090d] px-6 py-6 text-[#d7dde9]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2330] pb-4">
          <div>
            <h1 className="text-xl font-semibold">Proyectos Studio</h1>
            <p className="mt-1 text-sm text-[#7d879a]">
              Abre, crea o elimina proyectos guardados.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadProjects()}
              className="template-btn"
              disabled={loading}
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
            <Link href="/studio" className="template-btn active">
              <Plus size={14} />
              Nuevo proyecto
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-[#6b3d2d] bg-[#21130f] px-3 py-2 text-sm text-[#f2a987]">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-[#1c2330] bg-[#0b1019]">
          {loading ? (
            <div className="p-5 text-sm text-[#7d879a]">Cargando...</div>
          ) : projects.length === 0 ? (
            <div className="p-5 text-sm text-[#7d879a]">
              No hay proyectos guardados.
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[#7d879a]">
                  <th className="px-4 py-3 font-medium">Proyecto</th>
                  <th className="px-4 py-3 font-medium">Actualizado</th>
                  <th className="px-4 py-3 font-medium">Publicado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t border-[#1c2330]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/studio/${project.id}`}
                        className="font-semibold text-[#d7dde9] hover:text-[#f4b450]"
                      >
                        {project.title || "untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#9aa4b6]">
                      {formatDate(project.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-[#9aa4b6]">
                      {project.publishedAt
                        ? formatDate(project.publishedAt)
                        : "No publicado"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void removeProject(project.id)}
                        className="table-row-action"
                        aria-label={`Eliminar ${project.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
