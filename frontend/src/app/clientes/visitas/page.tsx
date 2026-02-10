"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { getSessionUserEmail } from "../../lib/session";

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

const mobileFilters = [
  { label: "Todas", value: "all" as const },
  { label: "Finalizadas", value: "finalizada" as const },
  { label: "Canceladas", value: "cancelada" as const },
  { label: "Incidencias", value: "incidencia" as const },
];

export default function VisitasPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof mobileFilters)[number]["value"]>("all");

  useEffect(() => {
    let isMounted = true;

    const loadVisits = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [visitsResponse, usersResponse] = await Promise.all([
          fetch("/api/visits", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/users", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
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
      return {
        date: "Sin fecha",
        time: "--:--",
        fullDate: "Sin fecha",
      };
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
      fullDate: date.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "2-digit",
        month: "long",
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
    if (!notes) return "Finalizada";
    const normalized = notes.toLowerCase();
    if (normalized.includes("cancel")) return "Cancelada";
    if (normalized.includes("incidencia") || normalized.includes("falla")) {
      return "Incidencia";
    }
    return "Finalizada";
  };

  const mapVisitTypeToFilter = (typeLabel: string) => {
    if (typeLabel === "Cancelada") return "cancelada" as const;
    if (typeLabel === "Incidencia") return "incidencia" as const;
    return "finalizada" as const;
  };

  const typeStyles: Record<string, string> = {
    Mantenimiento:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900/50",
    Emergencia:
      "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-900/50",
    Inspección:
      "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-100 dark:border-purple-900/50",
    Finalizada:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-900/60",
    Cancelada:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900/60",
    Incidencia:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-900/60",
  };

  const filteredVisits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return visits.filter((visit) => {
      const typeLabel = visitType(visit.notes);
      const mappedFilter = mapVisitTypeToFilter(typeLabel);
      const matchesFilter = activeFilter === "all" || mappedFilter === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return [
        visit.client,
        visit.branch,
        visit.area,
        visit.inspector,
        typeLabel,
        `#${visit.id}`,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeFilter, searchTerm, visits]);

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando historial...";
    if (error) return error;
    return "No hay visitas registradas.";
  }, [error, isLoading]);

  return (
    <>
      <DashboardHeader
        title="Historial de Visitas"
        description="Registros recientes de inspecciones y mantenimientos."
      />

      <PageTransition className="flex flex-1 flex-col overflow-y-auto">
        <section className="md:hidden flex-1 overflow-y-auto">
          <div className="px-4 pt-3 pb-2 sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100">
            <div className="flex items-center gap-3 bg-slate-100 rounded-full px-4 py-2.5 shadow-sm">
              <span className="material-symbols-outlined text-slate-500">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 w-full placeholder-slate-500 text-base"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar historial..."
                type="text"
                value={searchTerm}
              />
              <button className="flex items-center justify-center text-slate-600" type="button">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
          </div>

          <div className="pl-4 pr-0 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 pr-4">
              {mobileFilters.map((filter) => {
                const isActive = activeFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <main className="flex-1 px-4 pb-32 pt-2">
            <div className="space-y-4">
              {filteredVisits.map((visit) => {
                const typeLabel = visitType(visit.notes);
                const formatted = formatDate(visit.visited_at);
                const mobileStatusStyle =
                  typeLabel === "Cancelada"
                    ? "bg-red-100 text-red-700"
                    : typeLabel === "Incidencia"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700";

                return (
                  <article
                    key={visit.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden active:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          ID #VIS-{visit.id}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
                          {visit.branch}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${mobileStatusStyle}`}
                      >
                        {typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">store</span>
                      <span>{visit.client}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                      <span>{formatted.date} · {formatted.time}</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                      <button className="text-primary font-semibold text-sm px-4 py-2 hover:bg-yellow-50 rounded-full transition-colors" type="button">
                        Ver reporte
                      </button>
                    </div>
                  </article>
                );
              })}

              {filteredVisits.length === 0 ? (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-sm text-slate-500 text-center">
                  {emptyMessage}
                </div>
              ) : null}
            </div>
          </main>
        </section>

        <div className="hidden shrink-0 px-4 pb-2 pt-6 md:block md:px-8">
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27] lg:flex-row">
            <div className="flex w-full flex-col gap-4 lg:flex-row">
              <div className="relative w-full lg:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  search
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  placeholder="Cliente o Sucursal..."
                  type="text"
                />
              </div>
              <div className="relative w-full lg:w-48">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  person_search
                </span>
                <select className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm text-slate-500 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800">
                  <option value="">Todos los Inspectores</option>
                  {inspectors.map((inspector) => (
                    <option key={inspector.id} value={inspector.id}>
                      {inspector.full_name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  expand_more
                </span>
              </div>
            </div>
            <div className="flex w-full gap-2 lg:w-auto">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-professional-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-yellow-700 lg:w-auto"
              >
                <span className="material-symbols-outlined text-[18px]">
                  filter_list
                </span>
                Filtrar
              </button>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:block md:p-8">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <div className="custom-scrollbar flex-1 overflow-x-auto">
              <table className="min-w-[1000px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente / Sucursal</th>
                    <th className="px-6 py-4">Área</th>
                    <th className="px-6 py-4">Dosificador</th>
                    <th className="px-6 py-4">Inspector</th>
                    <th className="px-6 py-4">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {visits.map((visit) => {
                    const formatted = formatDate(visit.visited_at);
                    const typeLabel = visitType(visit.notes);
                    return (
                      <tr
                        key={visit.id}
                        className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {formatted.date}
                          </div>
                          <div className="text-xs text-slate-500">{formatted.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {getInitials(visit.client)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {visit.client}
                              </div>
                              <div className="text-xs text-slate-500">{visit.branch}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{visit.area}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {visit.dispenser ?? "D-—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {visit.inspector}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                              typeStyles[typeLabel] ?? typeStyles.Finalizada
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {error && !isLoading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                        {error}
                      </td>
                    </tr>
                  )}
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Cargando visitas...
                      </td>
                    </tr>
                  )}
                  {!error && !isLoading && visits.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No hay visitas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
