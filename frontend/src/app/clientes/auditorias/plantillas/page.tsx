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
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "active" && template.is_active) ||
        (activeFilter === "inactive" && !template.is_active);

      const matchesQuery =
        !query ||
        [template.name, template.schema?.category ?? "", String(template.id)].join(" ").toLowerCase().includes(query);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, searchTerm, templates]);

  return (
    <>
      <DashboardHeader
        title="Plantillas de Auditoría"
        description="Administra plantillas reutilizables por una o más áreas para ejecutar auditorías con el mismo estándar."
        action={
          canManage ? (
            <Link
              className="bg-slate-900 text-white hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
              href="/clientes/auditorias/plantillas/nueva"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Crear plantilla
            </Link>
          ) : undefined
        }
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={String(templates.length)} />
          <StatCard label="Activas" value={String(templates.filter((item) => item.is_active).length)} valueClassName="text-green-600" />
          <StatCard label="Inactivas" value={String(templates.filter((item) => !item.is_active).length)} valueClassName="text-amber-500" />
          <StatCard label="Áreas asignadas" value={String(templates.reduce((acc, item) => acc + item.areas_count, 0))} />
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27] lg:flex-row">
          <div className="flex w-full flex-col gap-4 lg:flex-row">
            <div className="relative w-full lg:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre o categoría..."
                type="text"
                value={searchTerm}
              />
            </div>

            <div className="relative w-full lg:w-48">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">task_alt</span>
              <select
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm text-slate-500 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                onChange={(event) => setActiveFilter(event.target.value as StatusFilter)}
                value={activeFilter}
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">expand_more</span>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
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

function StatCard({ label, value, valueClassName = "" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white dark:bg-[#161e27] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-black text-slate-900 dark:text-white ${valueClassName}`}>{value}</p>
    </div>
  );
}
