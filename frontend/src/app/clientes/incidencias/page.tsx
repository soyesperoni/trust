"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ACCOUNT_ADMIN_ROLE, GENERAL_ADMIN_ROLE, INSPECTOR_ROLE } from "../../lib/permissions";
import { getSessionUserEmail } from "../../lib/session";

import PageTransition from "../../components/PageTransition";

type IncidentApi = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  description: string;
  created_at: string;
};

type IncidentRow = {
  id: number;
  client: string;
  initials: string;
  initialsClass: string;
  branch: string;
  dispenser: string;
  priority: {
    label: string;
    className: string;
    mobileClassName: string;
  };
  status: {
    key: "open" | "in_progress" | "closed";
    label: string;
    className: string;
    pulse: boolean;
  };
  reportedAt: string;
  action: "schedule" | "view";
};

const initialsClassPool = [
  "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300",
  "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300",
  "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300",
  "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
];

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  return rtf.format(diffDays, "day");
};

const getPriorityFromDescription = (description: string) => {
  const normalized = description.toLowerCase();
  if (normalized.includes("crítico") || normalized.includes("urgente")) {
    return {
      label: "Crítica",
      className:
        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50",
      mobileClassName: "bg-red-100 text-red-900",
    };
  }
  if (normalized.includes("revisar") || normalized.includes("fuga")) {
    return {
      label: "Media",
      className:
        "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/50",
      mobileClassName: "bg-amber-100 text-amber-800",
    };
  }
  return {
    label: "Baja",
    className:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/50",
    mobileClassName: "bg-slate-100 text-slate-600",
  };
};

const getStatusFromDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      key: "in_progress" as const,
      label: "En Proceso",
      className:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      pulse: false,
    };
  }
  const diffHours = Math.abs(Date.now() - date.getTime()) / 3600000;
  if (diffHours <= 24) {
    return {
      key: "open" as const,
      label: "Abierta",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      pulse: true,
    };
  }
  if (diffHours <= 72) {
    return {
      key: "in_progress" as const,
      label: "En Proceso",
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      pulse: false,
    };
  }
  return {
    key: "closed" as const,
    label: "Cerrada",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pulse: false,
  };
};

const mobileFilters = [
  { label: "Todas", value: "all" as const },
  { label: "Abiertas", value: "open" as const },
  { label: "En Proceso", value: "in_progress" as const },
  { label: "Cerradas", value: "closed" as const },
];

export default function IncidenciasPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const isAccountAdmin = user?.role === ACCOUNT_ADMIN_ROLE;
  const isInspector = user?.role === INSPECTOR_ROLE;
  const canCreateIncident = !isInspector;
  const canCreateIncidentsFromHeader = !isLoadingUser && canCreateIncident && !isAccountAdmin;
  const canScheduleFromIncident = user?.role === GENERAL_ADMIN_ROLE;

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof mobileFilters)[number]["value"]>("all");

  useEffect(() => {
    let isMounted = true;

    const loadIncidents = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch("/api/incidents", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } });
        if (!response.ok) {
          throw new Error("No se pudieron cargar las incidencias.");
        }
        const data = await response.json();
        if (!isMounted) return;
        const rows = (data.results ?? []).map(
          (incident: IncidentApi, index: number) => {
            const initials = incident.client
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("");
            const status = getStatusFromDate(incident.created_at);
            return {
              id: incident.id,
              client: incident.client,
              initials: initials || "NA",
              initialsClass:
                initialsClassPool[index % initialsClassPool.length],
              branch: incident.branch,
              dispenser: incident.dispenser,
              priority: getPriorityFromDescription(incident.description),
              status,
              reportedAt: formatRelativeTime(incident.created_at),
              action: status.key === "open" ? "schedule" : "view",
            };
          },
        );
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

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando incidencias...";
    if (error) return error;
    return "No hay incidencias registradas.";
  }, [error, isLoading]);

  const filteredIncidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesFilter = activeFilter === "all" || incident.status.key === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return [
        incident.client,
        incident.branch,
        incident.dispenser,
        incident.priority.label,
        `#${incident.id}`,
      ].some((item) => item.toLowerCase().includes(query));
    });
  }, [activeFilter, incidents, searchTerm]);

  return (
    <>
      <DashboardHeader
        title="Incidencias"
        description="Gestión y seguimiento de reportes técnicos."
        searchPlaceholder="Buscar incidencia..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        action={canCreateIncidentsFromHeader ? (
          <Link
            className="bg-primary text-slate-900 hover:bg-yellow-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            href="/clientes/incidencias/nueva"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Incidencia
          </Link>
        ) : null}
      />

      <div className="md:hidden px-4 pt-3 pb-2 sticky top-16 z-20 bg-white/95 dark:bg-[#161e27]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 shadow-sm">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200 w-full placeholder-slate-500 dark:placeholder-slate-400 text-base"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar incidencias..."
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

      <section className="md:hidden flex-1 px-4 pt-2 pb-32 space-y-4 overflow-y-auto">
        {filteredIncidents.map((incident) => (
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
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${incident.priority.mobileClassName}`}
              >
                {incident.priority.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-2">
              <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">store</span>
              <span>{incident.branch}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
              <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">schedule</span>
              <span>{incident.reportedAt}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {incident.action === "schedule" && !isAccountAdmin && canScheduleFromIncident ? (
                <Link
                  className="text-primary font-semibold text-sm px-4 py-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors"
                  href="/clientes/incidencias/agendar"
                >
                  Agendar visita
                </Link>
              ) : (
                <button className="text-primary font-semibold text-sm px-4 py-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors" type="button">
                  Ver detalles
                </button>
              )}
            </div>
          </article>
        ))}
        {filteredIncidents.length === 0 ? (
          <div className="bg-white dark:bg-[#161e27] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 text-center">
            {emptyMessage}
          </div>
        ) : null}

        {canCreateIncident ? (
          <Link
            aria-label="Crear incidencia"
            className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-slate-900 shadow-lg transition-transform active:scale-95"
            href="/clientes/incidencias/nueva"
          >
            <span className="material-symbols-outlined text-[28px]">add</span>
          </Link>
        ) : null}
      </section>

      <PageTransition className="hidden flex-1 flex-col overflow-y-auto md:flex">
        <div className="hidden min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:block md:p-8">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Incidencia ID</th>
                  <th className="px-6 py-4">Cliente / Sucursal</th>
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Prioridad</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha Reporte</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        #{incident.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${incident.initialsClass}`}
                        >
                          {incident.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {incident.client}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              storefront
                            </span>
                            {incident.branch}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">
                          water_drop
                        </span>
                        <span>{incident.dispenser}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${incident.priority.className}`}
                      >
                        {incident.priority.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${incident.status.className}`}
                      >
                        {incident.status.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        )}
                        {incident.status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {incident.reportedAt}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {incident.action === "schedule" && !isAccountAdmin && canScheduleFromIncident ? (
                          <Link
                            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
                            href="/clientes/incidencias/agendar"
                          >
                            Agendar Visita
                          </Link>
                        ) : (
                          <button className="p-1.5 text-slate-400 hover:text-professional-green hover:bg-yellow-50 rounded-full transition-colors">
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
              <span className="text-sm text-slate-500">
                Mostrando {filteredIncidents.length} de {incidents.length} incidencias
              </span>
              <div className="flex gap-2">
                <button className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Anterior
                </button>
                <button className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
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
