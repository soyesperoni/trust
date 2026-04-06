"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  ACCOUNT_ADMIN_ROLE,
  GENERAL_ADMIN_ROLE,
  INSPECTOR_ROLE,
} from "../../lib/permissions";
import { getSessionUserEmail } from "../../lib/session";

type IncidentApi = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  created_at: string;
};

type IncidentRow = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  createdAt: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      date: "Sin fecha",
      time: "--:--",
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
  };
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const isValidDateParam = (value: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

export default function IncidenciasPage() {
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const isAccountAdmin = user?.role === ACCOUNT_ADMIN_ROLE;
  const canScheduleFromIncident = user?.role === GENERAL_ADMIN_ROLE || user?.role === INSPECTOR_ROLE;

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadIncidents = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch("/api/incidents/", {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });
        if (!response.ok) {
          throw new Error("No se pudieron cargar las incidencias.");
        }
        const data = await response.json();
        if (!isMounted) return;
        const rows = (data.results ?? []).map((incident: IncidentApi) => ({
          id: incident.id,
          client: incident.client,
          branch: incident.branch,
          area: incident.area,
          dispenser: incident.dispenser,
          createdAt: incident.created_at,
        }));
        setIncidents(rows);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar las incidencias.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadIncidents();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const startDateFromQuery = searchParams.get("desde");
    const endDateFromQuery = searchParams.get("hasta");
    setStartDate(isValidDateParam(startDateFromQuery) ? startDateFromQuery : "");
    setEndDate(isValidDateParam(endDateFromQuery) ? endDateFromQuery : "");
  }, [searchParams]);

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando incidencias...";
    if (error) return error;
    return "No hay incidencias registradas.";
  }, [error, isLoading]);

  const filteredIncidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesClient = !clientFilter || incident.client === clientFilter;
      const matchesBranch = !branchFilter || incident.branch === branchFilter;
      const matchesArea = !areaFilter || incident.area === areaFilter;
      const incidentDate = new Date(incident.createdAt);
      const isValidIncidentDate = !Number.isNaN(incidentDate.getTime());
      const lowerBound = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const upperBound = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
      const matchesDateRange =
        !isValidIncidentDate ||
        ((!lowerBound || incidentDate >= lowerBound) &&
          (!upperBound || incidentDate <= upperBound));
      if (!matchesClient || !matchesBranch || !matchesArea || !matchesDateRange) return false;
      if (!query) return true;
      return [
        incident.client,
        incident.branch,
        incident.area,
        incident.dispenser,
        `#${incident.id}`,
      ].some((item) => item.toLowerCase().includes(query));
    });
  }, [areaFilter, branchFilter, clientFilter, endDate, incidents, searchTerm, startDate]);

  const uniqueClients = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.client))).sort((a, b) => a.localeCompare(b)),
    [incidents],
  );
  const uniqueBranches = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.branch))).sort((a, b) => a.localeCompare(b)),
    [incidents],
  );
  const uniqueAreas = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.area))).sort((a, b) => a.localeCompare(b)),
    [incidents],
  );

  return (
    <>
      <DashboardHeader
        title="Incidencias"
        description="Gestión y seguimiento de reportes técnicos."
        showSearch={false}
      />

      <div className="md:hidden px-4 pt-3 pb-2 sticky top-16 z-20 bg-white/95 dark:bg-[#161e27]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 shadow-sm">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200 w-full placeholder-slate-500 dark:placeholder-slate-400 text-base"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar incidencia..."
            type="text"
            value={searchTerm}
          />
          <button className="flex items-center justify-center text-slate-600 dark:text-slate-300" type="button">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      <section className="md:hidden flex-1 px-4 pt-2 pb-32 space-y-4 overflow-y-auto">
        {filteredIncidents.map((incident) => {
          const formatted = formatDate(incident.createdAt);
          return (
            <article
              key={incident.id}
              className="bg-white dark:bg-[#161e27] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    ID #INC-{incident.id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                    {incident.client}
                  </h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-red-100 text-red-700">
                  Reportada
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-2">
                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">store</span>
                <span>{incident.branch}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">checklist</span>
                <span>{incident.area}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">schedule</span>
                <span>
                  {formatted.date} · {formatted.time}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-2">
                {canScheduleFromIncident && !isAccountAdmin ? (
                  <Link
                    className="text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 font-semibold text-sm px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                    href={`/clientes/incidencias/agendar?incidentId=${incident.id}`}
                  >
                    Agendar visita
                  </Link>
                ) : null}
                <Link
                  className="text-white bg-slate-900 font-semibold text-sm px-4 py-2 hover:bg-slate-700 rounded-full transition-colors"
                  href={`/clientes/incidencias/${incident.id}/detalle`}
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          );
        })}

        {filteredIncidents.length === 0 ? (
          <div className="bg-white dark:bg-[#161e27] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 text-center">
            {emptyMessage}
          </div>
        ) : null}

      </section>

      <PageTransition className="hidden flex-1 flex-col overflow-y-auto md:flex">
        <div className="hidden shrink-0 px-4 pb-2 pt-6 md:block md:px-8">
          <div className="mt-6 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27]">
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cliente, sucursal o dosificador..."
                  type="text"
                  value={searchTerm}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <select
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
              >
                <option value="">Todos los clientes</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              <select
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {uniqueBranches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              <select
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm"
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
              >
                <option value="">Todas las áreas</option>
                {uniqueAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:block md:px-8">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="list-table min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente / Sucursal</th>
                    <th className="px-6 py-4">Área</th>
                    <th className="px-6 py-4">Dosificador</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {filteredIncidents.map((incident) => {
                    const formatted = formatDate(incident.createdAt);
                    return (
                      <tr
                        key={incident.id}
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
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {getInitials(incident.client)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {incident.client}
                              </div>
                              <div className="text-xs text-slate-500">{incident.branch}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{incident.area}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{incident.dispenser}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-300">
                            Reportada
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            {canScheduleFromIncident && !isAccountAdmin ? (
                              <Link
                                className="list-action-btn hover:text-professional-green"
                                href={`/clientes/incidencias/agendar?incidentId=${incident.id}`}
                                title="Agendar visita"
                              >
                                <span className="material-symbols-outlined text-[20px]">event</span>
                              </Link>
                            ) : null}
                            <Link
                              className="list-action-btn hover:text-slate-600"
                              href={`/clientes/incidencias/${incident.id}/detalle`}
                              title="Ver detalle"
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        {emptyMessage}
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
