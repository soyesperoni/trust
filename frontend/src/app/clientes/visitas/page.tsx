"use client";

import { useEffect, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type Visit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string | null;
  inspector: string;
  visited_at: string;
  notes: string;
};

type User = {
  id: number;
  full_name: string;
};

export default function VisitasPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadVisits = async () => {
      try {
        const [visitsResponse, usersResponse] = await Promise.all([
          fetch("/api/visits", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
        ]);
        if (!visitsResponse.ok || !usersResponse.ok) {
          throw new Error("No se pudieron cargar las visitas.");
        }
        const [visitsData, usersData] = await Promise.all([
          visitsResponse.json(),
          usersResponse.json(),
        ]);
        if (!isMounted) return;
        setVisits(visitsData.results ?? []);
        setInspectors(usersData.results ?? []);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar las visitas.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadVisits();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return { date: "Sin fecha", time: "--:--" };
    }
    return {
      date: date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getInitials = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const visitType = (notes: string) => {
    if (!notes) return "Mantenimiento";
    const normalized = notes.toLowerCase();
    if (normalized.includes("emergencia")) return "Emergencia";
    if (normalized.includes("inspeccion") || normalized.includes("inspección")) {
      return "Inspección";
    }
    return "Mantenimiento";
  };

  const typeStyles: Record<string, string> = {
    Mantenimiento:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900/50",
    Emergencia:
      "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-900/50",
    Inspección:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-100 dark:border-purple-900/50",
  };

  return (
    <>
      <DashboardHeader
        title="Historial de Visitas"
        description="Registros recientes de inspecciones y mantenimientos."
      />
      <PageTransition className="flex flex-col flex-1 overflow-y-auto">
        <div className="px-4 md:px-8 py-6 pb-2 shrink-0">
          <div className="mt-6 bg-white dark:bg-[#161e27] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col lg:flex-row gap-4 w-full">
              <div className="relative w-full lg:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Cliente o Sucursal..."
                  type="text"
                />
              </div>
              <div className="relative w-full lg:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  calendar_today
                </span>
                <input
                  className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent text-slate-500"
                  placeholder="Rango de Fechas"
                  type="text"
                />
              </div>
              <div className="relative w-full lg:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  person_search
                </span>
                <select className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-slate-500">
                  <option value="">Todos los Inspectores</option>
                  {inspectors.map((inspector) => (
                    <option key={inspector.id} value={inspector.id}>
                      {inspector.full_name}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px] pointer-events-none">
                  expand_more
                </span>
              </div>
              <div className="relative w-full lg:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  category
                </span>
                <select className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-slate-500">
                  <option value="">Todos los Tipos</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="emergencia">Emergencia</option>
                  <option value="inspeccion">Inspección</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <button
                type="button"
                className="w-full lg:w-auto px-4 py-2 bg-professional-green hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  filter_list
                </span>
                Filtrar
              </button>
              <button
                type="button"
                className="w-full lg:w-auto px-4 py-2 bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
                Exportar
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 pt-4">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Cliente / Sucursal</th>
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Inspector</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {visits.map((visit) => {
                  const formatted = formatDate(visit.visited_at);
                  const typeLabel = visitType(visit.notes);
                  return (
                    <tr
                      key={visit.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-900 dark:text-white font-medium">
                          {formatted.date}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatted.time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                            {getInitials(visit.client)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {visit.client}
                            </div>
                            <div className="text-xs text-slate-500">
                              {visit.branch}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {visit.area}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-yellow-500">
                            water_drop
                          </span>
                          <span>{visit.dispenser ?? "D-—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {getInitials(visit.inspector)}
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">
                            {visit.inspector}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeStyles[typeLabel]}`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-professional-green hover:bg-yellow-50 rounded-full transition-colors"
                          title="Ver Reporte"
                        >
                          <span className="material-symbols-outlined">
                            description
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {error && !isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-red-500"
                    >
                      {error}
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Cargando visitas...
                    </td>
                  </tr>
                )}
                {!error && !isLoading && visits.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No hay visitas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                1-5
              </span>{" "}
              de{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                128
              </span>{" "}
              resultados
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                disabled
              >
                Anterior
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
      </PageTransition>
    </>
  );
}
