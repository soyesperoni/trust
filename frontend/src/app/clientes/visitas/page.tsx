"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  status?: string;
  start_latitude?: number | null;
  start_longitude?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
};

type User = {
  id: number;
  full_name: string;
};

const mobileFilters = [
  { label: "Todas", value: "all" as const },
  { label: "Programadas", value: "programada" as const },
  { label: "Finalizadas", value: "finalizada" as const },
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

  const visitType = (status?: string) => (status === "completed" ? "Finalizada" : "Programada");

  const mapVisitTypeToFilter = (typeLabel: string) => (typeLabel === "Programada" ? "programada" as const : "finalizada" as const);

  const buildOpenStreetMapLink = (visit: Visit) => {
    const latitude = visit.end_latitude ?? visit.start_latitude;
    const longitude = visit.end_longitude ?? visit.start_longitude;
    if (latitude == null || longitude == null) return null;
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
  };


  const downloadVisitReport = async (visitId: number) => {
    try {
      const currentUserEmail = getSessionUserEmail();
      const response = await fetch(`/api/visits/${visitId}/report`, {
        method: "GET",
        headers: { "x-current-user-email": currentUserEmail },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "No se pudo descargar el informe." }));
        throw new Error(payload.error ?? "No se pudo descargar el informe.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `visita-${visitId}-informe.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el informe.");
    }
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
    Programada:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/60",
  };

  const filteredVisits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return visits.filter((visit) => {
      const typeLabel = visitType(visit.status);
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

      <div className="md:hidden px-4 pt-3 pb-2 sticky top-16 z-20 bg-white/95 dark:bg-[#161e27]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 shadow-sm">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200 w-full placeholder-slate-500 dark:placeholder-slate-400 text-base"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar historial..."
            type="text"
            value={searchTerm}
          />
          <button className="flex items-center justify-center text-slate-600 dark:text-slate-300" type="button">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      <div className="md:hidden pl-4 pr-0 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pr-4">
          {mobileFilters.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
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

      <section className="md:hidden flex-1 px-4 pb-32 pt-2 space-y-4 overflow-y-auto">
        {filteredVisits.map((visit) => {
                const typeLabel = visitType(visit.status);
                const formatted = formatDate(visit.visited_at);
                const mobileStatusStyle =
                  typeLabel === "Programada"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700";

                return (
                  <article
                    key={visit.id}
                    className="bg-white dark:bg-[#161e27] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          ID #VIS-{visit.id}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                          {visit.client}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${mobileStatusStyle}`}
                      >
                        {typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">store</span>
                      <span>{visit.branch}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
                      <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">schedule</span>
                      <span>{formatted.date} · {formatted.time}</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                      {typeLabel === "Finalizada" ? (
                        <Link
                          className="text-slate-700 bg-slate-100 font-semibold text-sm px-4 py-2 hover:bg-slate-200 rounded-full transition-colors"
                          href={`/clientes/visitas/${visit.id}/informe`}
                        >
                          Ver informe
                        </Link>
                      ) : null}
                      {typeLabel === "Finalizada" ? (
                        <button
                          className="text-white bg-slate-900 font-semibold text-sm px-4 py-2 hover:bg-slate-700 rounded-full transition-colors"
                          onClick={() => downloadVisitReport(visit.id)}
                          type="button"
                        >
                          Descargar PDF
                        </button>
                      ) : null}
                      {buildOpenStreetMapLink(visit) ? (
                        <a
                          className="text-primary font-semibold text-sm px-4 py-2 hover:bg-yellow-50 rounded-full transition-colors"
                          href={buildOpenStreetMapLink(visit) ?? "#"}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ver ubicación
                        </a>
                      ) : (
                        <button className="text-slate-400 font-semibold text-sm px-4 py-2" disabled type="button">
                          Sin ubicación
                        </button>
                      )}
                    </div>
                  </article>
                );
        })}

        {filteredVisits.length === 0 ? (
          <div className="bg-white dark:bg-[#161e27] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 text-center">
            {emptyMessage}
          </div>
        ) : null}
      </section>

      <PageTransition className="hidden flex-1 flex-col overflow-y-auto md:flex">

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
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4">Informe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {visits.map((visit) => {
                    const formatted = formatDate(visit.visited_at);
                    const typeLabel = visitType(visit.status);
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
                        <td className="whitespace-nowrap px-6 py-4">
                          {buildOpenStreetMapLink(visit) ? (
                            <a
                              className="text-primary font-semibold hover:underline"
                              href={buildOpenStreetMapLink(visit) ?? "#"}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Ver mapa OSM
                            </a>
                          ) : (
                            <span className="text-slate-400">Sin ubicación</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {typeLabel === "Finalizada" ? (
                            <div className="flex items-center gap-2">
                              <Link
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                href={`/clientes/visitas/${visit.id}/informe`}
                              >
                                Ver informe
                              </Link>
                              <button
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                                onClick={() => downloadVisitReport(visit.id)}
                                type="button"
                              >
                                Descargar PDF
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">No disponible</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {error && !isLoading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-red-500">
                        {error}
                      </td>
                    </tr>
                  )}
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        Cargando visitas...
                      </td>
                    </tr>
                  )}
                  {!error && !isLoading && visits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
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
