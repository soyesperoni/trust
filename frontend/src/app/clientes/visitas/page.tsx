"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { useCurrentUser } from "../../hooks/useCurrentUser";
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

const mobileFilters = ["Todo", "Finalizadas", "Canceladas", "Incidencias"];

export default function VisitasPage() {
  const { user } = useCurrentUser();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!notes) return "Mantenimiento";
    const normalized = notes.toLowerCase();
    if (normalized.includes("cancel")) return "Cancelada";
    if (normalized.includes("incidencia") || normalized.includes("falla")) {
      return "Incidencia";
    }
    if (normalized.includes("emergencia")) return "Emergencia";
    if (
      normalized.includes("inspeccion") ||
      normalized.includes("inspección") ||
      normalized.includes("finalizada")
    ) {
      return "Finalizada";
    }
    return "Finalizada";
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

  const mobileUserInitials = useMemo(() => {
    if (!user?.full_name) return "US";
    return getInitials(user.full_name) || "US";
  }, [user?.full_name]);

  return (
    <>
      <div className="hidden md:block">
        <DashboardHeader
          title="Historial de Visitas"
          description="Registros recientes de inspecciones y mantenimientos."
        />
      </div>

      <PageTransition className="flex flex-1 flex-col overflow-y-auto">
        <section className="md:hidden">
          <header className="sticky top-0 z-30 bg-white/95 px-4 py-3 backdrop-blur-md dark:bg-[#0f1720]/95">
            <div className="flex items-center gap-3">
              <div className="flex h-12 flex-1 items-center rounded-full bg-slate-100 px-4 dark:bg-slate-800">
                <span className="material-symbols-outlined mr-3 text-slate-500">
                  search
                </span>
                <input
                  className="w-full border-none bg-transparent p-0 text-base text-slate-800 placeholder:text-slate-500 focus:ring-0 dark:text-slate-200"
                  placeholder="Buscar historial..."
                  type="text"
                />
              </div>
              <button
                type="button"
                className="relative flex h-12 w-12 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-yellow-100 text-sm font-bold text-amber-900">
                {mobileUserInitials}
              </div>
            </div>

            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
              {mobileFilters.map((filter, index) => (
                <button
                  key={filter}
                  type="button"
                  className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium ${
                    index === 0
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 pb-32 pt-2">
            <div className="space-y-4">
              {visits.map((visit) => {
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
                    className="group relative overflow-hidden rounded-[20px] border border-slate-100 bg-slate-50/80 p-0 shadow-card transition-colors hover:bg-slate-100/70"
                  >
                    <div className="px-5 pb-1 pt-4">
                      <p className="mb-2 text-sm font-medium capitalize text-slate-500">
                        {formatted.fullDate}
                      </p>
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="leading-tight text-lg font-bold text-slate-900">
                          {visit.branch}
                        </h4>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${mobileStatusStyle}`}
                        >
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                    <div className="px-5 pb-3">
                      <div className="mt-2 flex items-center text-sm text-slate-600">
                        <span className="material-symbols-outlined mr-2 text-[18px] text-slate-400">
                          location_on
                        </span>
                        {visit.client}
                      </div>
                    </div>
                    <div className="px-3 pb-3 pt-1">
                      <button
                        type="button"
                        className="w-full rounded-xl py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Ver reporte
                      </button>
                    </div>
                  </article>
                );
              })}

              {error && !isLoading && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {isLoading && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  Cargando historial...
                </div>
              )}

              {!error && !isLoading && visits.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  No hay visitas registradas.
                </div>
              )}
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
