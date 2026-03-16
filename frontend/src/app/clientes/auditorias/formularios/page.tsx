"use client";

import { FormEvent, useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { GENERAL_ADMIN_ROLE } from "../../../lib/permissions";
import { getSessionUserEmail } from "../../../lib/session";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

type AuditFormApi = {
  id: number;
  name: string;
  is_active: boolean;
  areas_count: number;
  schema: Record<string, unknown>;
};

const defaultSchema = {
  version: "2.0",
  category: "Seguridad Industrial",
  sections: [
    {
      title: "Seguridad Perimetral",
      questions: [
        { type: "yes_no_na", label: "¿Se encuentran los accesos debidamente señalizados y bloqueados?", required: true, weight: 15 },
        { type: "likert_1_5", label: "Estado de conservación de las vallas de seguridad", required: true, weight: 15 },
        { type: "photo", label: "Adjuntar fotografías de puntos de vulnerabilidad detectados", required: false, weight: 10 },
      ],
    },
  ],
};

export default function FormulariosAuditoriaPage() {
  const { user } = useCurrentUser();
  const canCreate = user?.role === GENERAL_ADMIN_ROLE;

  const [templates, setTemplates] = useState<AuditFormApi[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Seguridad Industrial");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    const response = await fetch("/api/audits/forms/", {
      cache: "no-store",
      headers: { "x-current-user-email": getSessionUserEmail() },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los formularios de auditoría.");
    setTemplates((payload.results ?? []) as AuditFormApi[]);
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        await loadTemplates();
        if (isMounted) setError(null);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los formularios.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/audits/forms/", {
        method: "POST",
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

      setName("");
      setCategory("Seguridad Industrial");
      setIsActive(true);
      await loadTemplates();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la plantilla.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Formularios de Auditoría"
        description="Plantillas reutilizables para ejecutar auditorías por área."
        showSearch={false}
      />

      <PageTransition className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-background-dark/20 p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[18rem_1fr_16rem] gap-6">
          <aside className="bg-white dark:bg-[#161e27] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-5 h-fit">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Elementos de Auditoría</h3>
            {[
              ["rule", "Cuestión Sí/No/NA", "Cumplimiento binario"],
              ["linear_scale", "Escala Likert (1-5)", "Valoración cualitativa"],
              ["notes", "Campo de Texto", "Observaciones y notas"],
              ["add_a_photo", "Evidencia Fotográfica", "Carga de multimedia"],
            ].map(([icon, title, subtitle]) => (
              <button key={title} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-left">
                <span className="material-symbols-outlined text-primary">{icon}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-[10px] text-slate-500">{subtitle}</p>
                </div>
              </button>
            ))}
          </aside>

          <section className="space-y-5">
            <div className="bg-white dark:bg-[#161e27] p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-slate-800 dark:text-slate-200 mb-2">
                Editor de Auditoría Trust
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Configuración de Plantilla Técnica</h1>
              <p className="text-slate-500 text-sm mt-1">Mantiene la UI actual y guarda la plantilla en Django para asignarla a áreas.</p>

              {error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              {canCreate ? (
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" onSubmit={handleSubmit}>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-1 md:col-span-2">
                    Nombre de la Plantilla
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ej: Auditoría de Seguridad Planta A"
                      className="w-full rounded-lg border-slate-200 focus:border-primary focus:ring-primary dark:bg-slate-900 dark:border-slate-700 h-12 px-4 text-base"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-1">
                    Categoría Técnica
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
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      disabled={isSaving}
                      className="flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-slate-900 text-sm font-bold shadow-sm hover:brightness-105 transition-all disabled:opacity-60"
                      type="submit"
                    >
                      {isSaving ? "Guardando..." : "Guardar Plantilla"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-slate-500 mt-4">Solo el administrador general puede crear nuevas plantillas.</p>
              )}
            </div>

            <div className="bg-white dark:bg-[#161e27] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold">Plantillas registradas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-left">Áreas</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!isLoading && templates.map((template) => (
                      <tr key={template.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 font-semibold">{template.name}</td>
                        <td className="px-4 py-3">{String((template.schema?.category as string) || "General")}</td>
                        <td className="px-4 py-3">{template.areas_count}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              template.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {template.is_active ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isLoading && templates.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No hay formularios de auditoría creados.</p>
              ) : null}
            </div>
          </section>

          <aside className="bg-white dark:bg-[#161e27] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 h-fit">
            <h3 className="text-sm font-bold mb-4">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Plantillas:</span><span className="font-semibold">{templates.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Activas:</span><span className="font-semibold">{templates.filter((item) => item.is_active).length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total áreas:</span><span className="font-semibold">{templates.reduce((acc, item) => acc + item.areas_count, 0)}</span></div>
            </div>
          </aside>
        </div>
      </PageTransition>
    </>
  );
}
