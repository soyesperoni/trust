"use client";

import { useEffect, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type Dispenser = {
  id: number;
  identifier: string;
  installed_at: string | null;
  model: { id: number; name: string };
  area: { id: number; name: string; branch: string } | null;
};

export default function DispensadoresPage() {
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDispensers = async () => {
      try {
        const response = await fetch("/api/dispensers", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los dosificadores.");
        }
        const data = await response.json();
        if (!isMounted) return;
        setDispensers(data.results ?? []);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los dosificadores.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadDispensers();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <DashboardHeader
        title="Dosificadores"
        description="Inventario de dosificadores por modelo y ubicación."
        searchPlaceholder="Buscar dosificadores..."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Dosificadores
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Inventario de dosificadores por modelo y ubicación.
        </p>
      </div>
      <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4">Identificador</th>
              <th className="px-6 py-4">Modelo</th>
              <th className="px-6 py-4">Área</th>
              <th className="px-6 py-4">Sucursal</th>
              <th className="px-6 py-4">Instalación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {dispensers.map((dispenser) => (
              <tr
                key={dispenser.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {dispenser.identifier}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {dispenser.model.name}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {dispenser.area?.name || "-"}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {dispenser.area?.branch || "-"}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {dispenser.installed_at || "-"}
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
                  Cargando dosificadores...
                </td>
              </tr>
            )}
            {!error && !isLoading && dispensers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay dosificadores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </PageTransition>
    </>
  );
}
