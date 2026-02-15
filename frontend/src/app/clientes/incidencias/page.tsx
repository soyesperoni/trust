"use client";

import Link from "next/link";
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
  reportedAt: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function IncidenciasPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const isAccountAdmin = user?.role === ACCOUNT_ADMIN_ROLE;
  const isInspector = user?.role === INSPECTOR_ROLE;
  const canCreateIncident = !isInspector;
  const canCreateIncidentsFromHeader =
    !isLoadingUser && canCreateIncident && !isAccountAdmin;
  const canScheduleFromIncident = user?.role === GENERAL_ADMIN_ROLE;

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadIncidents = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch("/api/incidents", {
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
          reportedAt: formatDate(incident.created_at),
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

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando incidencias...";
    if (error) return error;
    return "No hay incidencias registradas.";
  }, [error, isLoading]);

  const filteredIncidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return incidents.filter((incident) => {
      if (!query) return true;
      return [
        incident.client,
        incident.branch,
        incident.area,
        incident.dispenser,
        `#${incident.id}`,
      ].some((item) => item.toLowerCase().includes(query));
    });
  }, [incidents, searchTerm]);

  return (
    <>
      <DashboardHeader
        title="Incidencias"
        description="Gestión y seguimiento de reportes técnicos."
        searchPlaceholder="Buscar incidencia..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        action={
          canCreateIncidentsFromHeader ? (
            <Link
              className="bg-primary text-slate-900 hover:bg-yellow-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              href="/clientes/incidencias/nueva"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nueva Incidencia
            </Link>
          ) : null
        }
      />

      <section className="md:hidden flex-1 px-4 pt-2 pb-32 space-y-4 overflow-y-auto">
        {filteredIncidents.map((incident) => (
          <article
            key={incident.id}
            className="bg-white dark:bg-[#161e27] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              ID #INC-{incident.id}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {incident.client}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Sucursal: {incident.branch}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Área: {incident.area}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Dosificador: {incident.dispenser}</p>
            <p className="text-sm text-slate-500 mt-1">Creación: {incident.reportedAt}</p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              {canScheduleFromIncident && !isAccountAdmin ? (
                <Link
                  className="text-primary font-semibold text-sm px-3 py-2 hover:bg-yellow-50 rounded-full transition-colors"
                  href={`/clientes/incidencias/agendar?incidentId=${incident.id}`}
                >
                  Agendar visita
                </Link>
              ) : null}
              <Link
                className="text-primary font-semibold text-sm px-3 py-2 hover:bg-yellow-50 rounded-full transition-colors"
                href={`/clientes/incidencias/${incident.id}/detalle`}
              >
                Ver detalle
              </Link>
            </div>
          </article>
        ))}
        {filteredIncidents.length === 0 ? (
          <div className="bg-white dark:bg-[#161e27] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-sm text-slate-500 text-center">
            {emptyMessage}
          </div>
        ) : null}

        {canCreateIncident ? (
          <Link
            aria-label="Crear incidencia"
            className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-slate-900 shadow-lg"
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
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Sucursal</th>
                    <th className="px-6 py-4">Área</th>
                    <th className="px-6 py-4">Dosificador</th>
                    <th className="px-6 py-4">Fecha de creación</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-600">#{incident.id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{incident.client}</td>
                      <td className="px-6 py-4 text-slate-600">{incident.branch}</td>
                      <td className="px-6 py-4 text-slate-600">{incident.area}</td>
                      <td className="px-6 py-4 text-slate-600">{incident.dispenser}</td>
                      <td className="px-6 py-4 text-slate-500">{incident.reportedAt}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canScheduleFromIncident && !isAccountAdmin ? (
                            <Link
                              className="bg-slate-900 text-white hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium"
                              href={`/clientes/incidencias/agendar?incidentId=${incident.id}`}
                            >
                              Agendar visita
                            </Link>
                          ) : null}
                          <Link
                            className="bg-primary text-slate-900 px-3 py-1.5 rounded text-xs font-semibold"
                            href={`/clientes/incidencias/${incident.id}/detalle`}
                          >
                            Ver detalle
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
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
