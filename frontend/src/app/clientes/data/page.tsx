"use client";

import { useEffect, useState } from "react";

type Client = {
  id: number;
  name: string;
  code: string;
  notes: string;
};

export default function ClientesListadoPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      try {
        const response = await fetch("/api/clients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los clientes.");
        }
        const data = await response.json();
        if (!isMounted) return;
        setClients(data.results ?? []);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los clientes.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadClients();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Clientes
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Detalle de cuentas activas y sus códigos comerciales.
        </p>
      </div>
      <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {clients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {client.name}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {client.code}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {client.notes || "-"}
                </td>
              </tr>
            ))}
            {error && !isLoading && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  Cargando clientes...
                </td>
              </tr>
            )}
            {!error && !isLoading && clients.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  No hay clientes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
