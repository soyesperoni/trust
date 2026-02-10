"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
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
  };
  status: {
    label: string;
    className: string;
    pulse: boolean;
  };
  reportedAt: string;
  action: "schedule" | "view";
};

const initialsClassPool = [
  "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300",
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
      label: "Alta",
      className:
        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50",
    };
  }
  if (normalized.includes("revisar") || normalized.includes("fuga")) {
    return {
      label: "Media",
      className:
        "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/50",
    };
  }
  return {
    label: "Baja",
    className:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-100 dark:border-green-900/50",
  };
};

const getStatusFromDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      label: "Registrada",
      className:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      pulse: false,
    };
  }
  const diffHours = Math.abs(Date.now() - date.getTime()) / 3600000;
  if (diffHours <= 48) {
    return {
      label: "Abierta",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      pulse: true,
    };
  }
  return {
    label: "Registrada",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    pulse: false,
  };
};

export default function IncidenciasPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadIncidents = async () => {
      try {
        const response = await fetch("/api/incidents", { cache: "no-store" });
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
              action: status.label === "Abierta" ? "schedule" : "view",
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

  return (
    <>
      <DashboardHeader
        title="Incidencias"
        description="Gestión y seguimiento de reportes técnicos."
        searchPlaceholder="Buscar incidencia..."
        action={(
          <Link
            className="bg-primary text-slate-900 hover:bg-yellow-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            href="/clientes/incidencias/nueva"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Incidencia
          </Link>
        )}
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
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
                {incidents.map((incident) => (
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
                        {incident.action === "schedule" ? (
                          <Link
                            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
                            href="/clientes/incidencias/agendar"
                          >
                            Agendar Visita
                          </Link>
                        ) : (
                          <button className="p-1.5 text-slate-400 hover:text-professional-green hover:bg-green-50 rounded-full transition-colors">
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando {incidents.length} de {incidents.length} incidencias
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
                Anterior
              </button>
              <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
