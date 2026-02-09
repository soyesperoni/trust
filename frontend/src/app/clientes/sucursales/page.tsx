"use client";

import { useEffect, useState } from "react";

import PageTransition from "../../components/PageTransition";

type Branch = {
  id: number;
  name: string;
  address: string;
  city: string;
  client: { id: number; name: string };
};

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBranches = async () => {
      try {
        const response = await fetch("/api/branches", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudieron cargar las sucursales.");
        }
        const data = await response.json();
        if (!isMounted) return;
        setBranches(data.results ?? []);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar las sucursales.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PageTransition className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Sucursales
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sedes activas con dirección y cliente asignado.
        </p>
      </div>
      <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4">Sucursal</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Dirección</th>
              <th className="px-6 py-4">Ciudad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {branches.map((branch) => (
              <tr
                key={branch.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {branch.name}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {branch.client.name}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {branch.address || "-"}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {branch.city || "-"}
                </td>
              </tr>
            ))}
            {error && !isLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Cargando sucursales...
                </td>
              </tr>
            )}
            {!error && !isLoading && branches.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No hay sucursales registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageTransition>
  );
}
