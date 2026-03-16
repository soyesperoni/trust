"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

const defaultSchema = {
  version: "2.0",
  category: "Seguridad Industrial",
  sections: [
    {
      title: "Seguridad Perimetral",
      questions: [
        { type: "yes_no_na", label: "¿Se encuentran los accesos debidamente señalizados y bloqueados?", required: true, weight: 15 },
      ],
    },
  ],
};

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Activas", value: "active" },
  { label: "Inactivas", value: "inactive" },
] as const;

type StatusFilter = (typeof statusFilters)[number]["value"];

export default function FormulariosAuditoriaPage() {
  const { user } = useCurrentUser();
  const canManage = user?.role === GENERAL_ADMIN_ROLE;

  const [templates, setTemplates] = useState<AuditFormApi[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Seguridad Industrial");
  const [isActive, setIsActive] = useState(true);

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

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setName("");
    setCategory("Seguridad Industrial");
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (template: AuditFormApi) => {
    setEditingTemplateId(template.id);
    setName(template.name);
    setCategory(String(template.schema?.category || "Seguridad Industrial"));
    setIsActive(template.is_active);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplateId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;

    setIsSaving(true);
    setError(null);

    try {
      const requestUrl = editingTemplateId ? `/api/audits/forms/${editingTemplateId}/` : "/api/audits/forms/";
      const requestMethod = editingTemplateId ? "PATCH" : "POST";

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          name,
          is_active: isActive,
          schema: {
            ...defaultSchema,
            category,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar la plantilla.");

      closeModal();
      await loadTemplates();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la plantilla.");
    } finally {
      setIsSaving(false);
    }
  };

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
            <button
              className="bg-slate-900 text-white hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
              onClick={openCreateModal}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Crear plantilla
            </button>
          ) : undefined
        }
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={String(templates.length)} />
          <StatCard label="Activas" value={String(templates.filter((item) => item.is_active).length)} valueClassName="text-green-600" />
          <StatCard label="Inactivas" value={String(templates.filter((item) => !item.is_active).length)} valueClassName="text-amber-500" />
          <StatCard label="Áreas asignadas" value={String(templates.reduce((acc, item) => acc + item.areas_count, 0))} />
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 mb-6">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Flujo recomendado de auditoría con plantillas</p>
          <ol className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
            <li>Crea o actualiza una plantilla de formulario y asígnala a una o más áreas.</li>
            <li>Cuando se programe la auditoría, se cargará la plantilla configurada para el área seleccionada.</li>
            <li>El inspector completa respuestas, guarda la auditoría y luego se genera el informe PDF con resultados.</li>
          </ol>
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
                        <div className="text-xs text-slate-500">#FORM-{template.id}</div>
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
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => openEditModal(template)}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Editar
                          </button>
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#161e27]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingTemplateId ? "Editar plantilla" : "Crear plantilla"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Configura nombre, categoría y estado de la plantilla.</p>
              </div>
              <button className="text-slate-500 hover:text-slate-700" onClick={closeModal} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <form className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-1 md:col-span-2">
                Nombre de la plantilla
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej: Auditoría de Seguridad Planta A"
                  className="w-full rounded-lg border-slate-200 focus:border-primary focus:ring-primary dark:bg-slate-900 dark:border-slate-700 h-12 px-4 text-base"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-1">
                Categoría técnica
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-lg border-slate-200 focus:border-primary focus:ring-primary dark:bg-slate-900 dark:border-slate-700 h-12 px-4"
                >
                  <option>Seguridad Industrial</option>
                  <option>Calidad Operativa</option>
                  <option>Mantenimiento Preventivo</option>
                  <option>Medio Ambiente</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-1">
                Estado
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={(event) => setIsActive(event.target.value === "active")}
                  className="w-full rounded-lg border-slate-200 focus:border-primary focus:ring-primary dark:bg-slate-900 dark:border-slate-700 h-12 px-4"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  className="rounded-lg h-10 px-5 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={closeModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  disabled={isSaving}
                  className="flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-slate-900 text-sm font-bold shadow-sm hover:brightness-105 transition-all disabled:opacity-60"
                  type="submit"
                >
                  {isSaving ? "Guardando..." : editingTemplateId ? "Guardar cambios" : "Guardar plantilla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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
