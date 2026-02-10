"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type DispenserStatus = "Operativo" | "Mantenimiento" | "Inactivo";

type DispenserApi = {
  id: number;
  identifier: string;
  installed_at: string | null;
  model: {
    id: number;
    name: string;
  };
  area: {
    id: number;
    name: string;
    branch: string;
  } | null;
};

type ProductApi = {
  id: number;
  name: string;
  description: string;
  dispenser: {
    id: number;
    identifier: string;
    model: string;
  };
};

type DispenserRow = {
  id: number;
  code: string;
  serial: string;
  model: string;
  area: string;
  branch: string;
  branchInitials: string;
  products: number;
  status: DispenserStatus;
};

const statusStyles: Record<DispenserStatus, { badge: string; dot: string }> = {
  Operativo: {
    badge:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    dot: "bg-green-500",
  },
  Mantenimiento: {
    badge:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    dot: "bg-yellow-500",
  },
  Inactivo: {
    badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export default function DispensadoresPage() {
  const [dispensers, setDispensers] = useState<DispenserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDispensers = async () => {
      try {
        const [dispensersResponse, productsResponse] = await Promise.all([
          fetch("/api/dispensers", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
        ]);
        if (!dispensersResponse.ok || !productsResponse.ok) {
          throw new Error("No se pudieron cargar los dosificadores.");
        }
        const [dispensersData, productsData] = await Promise.all([
          dispensersResponse.json(),
          productsResponse.json(),
        ]);
        if (!isMounted) return;
        const products = (productsData.results ?? []) as ProductApi[];
        const productCount = products.reduce<Record<number, number>>(
          (acc, product) => {
            acc[product.dispenser.id] =
              (acc[product.dispenser.id] ?? 0) + 1;
            return acc;
          },
          {},
        );
        const rows = (dispensersData.results ?? []).map(
          (dispenser: DispenserApi) => {
            const branchName = dispenser.area?.branch ?? "Sin sucursal";
            const branchInitials = branchName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("");
            const status: DispenserStatus = dispenser.installed_at
              ? "Operativo"
              : "Inactivo";
            return {
              id: dispenser.id,
              code: dispenser.identifier,
              serial: `#${dispenser.id}`,
              model: dispenser.model.name,
              area: dispenser.area?.name ?? "Sin área",
              branch: branchName,
              branchInitials: branchInitials || "NA",
              products: productCount[dispenser.id] ?? 0,
              status,
            };
          },
        );
        setDispensers(rows);
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

  const totalResults = dispensers.length;
  const displayedResults = dispensers.length;

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando dosificadores...";
    if (error) return error;
    return "No hay dosificadores registrados.";
  }, [error, isLoading]);

  return (
    <>
      <DashboardHeader
        title="Gestión de Dosificadores"
        description="Administra y monitorea los dosificadores instalados por sucursal."
        searchPlaceholder="Buscar dosificador..."
        action={(
          <Link
            className="bg-professional-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            href="/clientes/dispensadores/nuevo"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nuevo Dosificador
          </Link>
        )}
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Modelo</th>
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4 text-center">Productos</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {dispensers.map((dispenser) => {
                  const statusStyle = statusStyles[dispenser.status];

                  return (
                    <tr
                      key={dispenser.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined">
                              water_drop
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {dispenser.code}
                            </div>
                            <div className="text-xs text-slate-500">
                              ID: {dispenser.serial}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {dispenser.model}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {dispenser.area}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {dispenser.branchInitials}
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">
                            {dispenser.branch}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {dispenser.products}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                          ></span>
                          {dispenser.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          className="text-slate-400 hover:text-professional-green transition-colors"
                          href={`/clientes/dispensadores/${dispenser.id}`}
                        >
                          <span className="material-symbols-outlined">
                            edit
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {dispensers.length === 0 && (
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#161e27]">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-medium">{displayedResults}</span>{" "}
              de <span className="font-medium">{totalResults}</span> resultados
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                disabled
              >
                Anterior
              </button>
              <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 hover:bg-slate-50">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
