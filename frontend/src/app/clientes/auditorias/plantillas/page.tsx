"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { GENERAL_ADMIN_ROLE } from "../../../lib/permissions";
import { getSessionUserEmail } from "../../../lib/session";

type AuditFormApi = {
  id: number;
  name: string;
  is_active: boolean;
  areas_count: number;
  schema: {
    category?: string;
  } & Record<string, unknown>;
};

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Activas", value: "active" },
  { label: "Inactivas", value: "inactive" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["value"];

export default function PlantillasAuditoriaPage() {
  const { user } = useCurrentUser();
  const canManage = user?.role === GENERAL_ADMIN_ROLE;

  const [templates, setTemplates] = useState<AuditFormApi[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);


  const loadTemplates = async () => {
    const response = await fetch("/api/audits/forms/", {
      cache: "no-store",
      headers: { "x-current-user-email": getSessionUserEmail() },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las plantillas de auditoría.");
    setTemplates((payload.results ?? []) as AuditFormApi[]);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        await loadTemplates();
        if (isMounted) setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las plantillas.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return templates.filter((template) => {
      const templateCategory = String(template.schema?.category || "General");
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "active" && template.is_active) ||
        (activeFilter === "inactive" && !template.is_active);
      const matchesCategory = !categoryFilter || templateCategory === categoryFilter;

      const matchesQuery =
        !query ||
        [template.name, templateCategory, String(template.id)].join(" ").toLowerCase().includes(query);

      return matchesFilter && matchesQuery && matchesCategory;
    });
  }, [activeFilter, categoryFilter, searchTerm, templates]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(templates.map((template) => String(template.schema?.category || "General"))),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [templates],
  );

  return (
    <>
      <DashboardHeader
        title="Plantillas de Auditoría"
        description="Administra plantillas reutilizables por una o más áreas para ejecutar auditorías con el mismo estándar."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            {canManage ? (
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                <Link
                  className="bg-professional-green text-white hover:bg-lime-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2 md:w-auto w-full justify-center md:justify-start"
                  href="/clientes/auditorias/plantillas/nueva"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Crear plantilla
                </Link>
              </div>
            ) : null}
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                <input
                  className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nombre o categoría..."
                  type="text"
                  value={searchTerm}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <select
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="">Todas las categorías</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                onChange={(event) => setActiveFilter(event.target.value as StatusFilter)}
                value={activeFilter}
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 px-1">
                Mostrando {filteredTemplates.length} de {templates.length} plantillas
              </div>
            </div>
          </div>
          <div className="custom-scrollbar overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Uso por áreas</th>
                  <th className="px-6 py-4">Estado</th>
                  {canManage ? <th className="px-6 py-4 text-right">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!isLoading &&
                  filteredTemplates.map((template) => (
                    <tr key={template.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{template.name}</div>
                        <div className="text-xs text-slate-500">#TPL-{template.id}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{String(template.schema?.category || "General")}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {template.areas_count > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-200">
                            {template.areas_count} área{template.areas_count === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Sin áreas asignadas</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            template.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-900/60"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {template.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="px-6 py-4 text-right">
                          <Link
                            className="list-action-btn hover:text-professional-green"
                            href={`/clientes/auditorias/plantillas/${template.id}/editar`}
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                {!isLoading && filteredTemplates.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={canManage ? 5 : 4}>
                      No hay plantillas que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : null}
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={canManage ? 5 : 4}>
                      Cargando plantillas...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
