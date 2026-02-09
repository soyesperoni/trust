"use client";

import { useEffect, useState } from "react";

import PageTransition from "../../components/PageTransition";

type Incident = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  description: string;
  created_at: string;
};

export default function IncidenciasPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
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
        setIncidents(data.results ?? []);
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

  return (
    <PageTransition className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Incidencias
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Reportes recientes con detalle por ubicación.
        </p>
      </div>
      <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Sucursal</th>
              <th className="px-6 py-4">Área</th>
              <th className="px-6 py-4">Dosificador</th>
              <th className="px-6 py-4">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {incidents.map((incident) => (
              <tr
                key={incident.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {incident.client}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {incident.branch}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {incident.area}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {incident.dispenser}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {new Date(incident.created_at).toLocaleString("es-PE")}
                </td>
              </tr>
            ))}
            {error && !isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Cargando incidencias...
                </td>
              </tr>
            )}
            {!error && !isLoading && incidents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay incidencias registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageTransition>
  );
}
