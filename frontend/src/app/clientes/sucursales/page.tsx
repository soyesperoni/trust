"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type BranchApi = {
  id: number;
  name: string;
  address: string;
  city: string;
  client: {
    id: number;
    name: string;
  };
};

type AreaApi = {
  id: number;
  name: string;
  description: string;
  branch: {
    id: number;
    name: string;
    client: string;
  };
};

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

type Branch = {
  id: number;
  name: string;
  client: string;
  city: string;
  areas: number;
  dispensers: number;
  status: "Activa" | "Inactiva";
};

const statusStyles: Record<Branch["status"], string> = {
  Activa:
    "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  Inactiva:
    "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBranches = async () => {
      try {
        const [branchesResponse, areasResponse, dispensersResponse] =
          await Promise.all([
            fetch("/api/branches", { cache: "no-store" }),
            fetch("/api/areas", { cache: "no-store" }),
            fetch("/api/dispensers", { cache: "no-store" }),
          ]);
        if (
          !branchesResponse.ok ||
          !areasResponse.ok ||
          !dispensersResponse.ok
        ) {
          throw new Error("No se pudieron cargar las sucursales.");
        }
        const [branchesData, areasData, dispensersData] = await Promise.all([
          branchesResponse.json(),
          areasResponse.json(),
          dispensersResponse.json(),
        ]);
        if (!isMounted) return;
        const areas = (areasData.results ?? []) as AreaApi[];
        const areaCount = areas.reduce<Record<number, number>>((acc, area) => {
          acc[area.branch.id] = (acc[area.branch.id] ?? 0) + 1;
          return acc;
        }, {});
        const areaById = areas.reduce<Record<number, number>>((acc, area) => {
          acc[area.id] = area.branch.id;
          return acc;
        }, {});
        const dispensers = (dispensersData.results ?? []) as DispenserApi[];
        const dispenserCount = dispensers.reduce<Record<number, number>>(
          (acc, dispenser) => {
            if (dispenser.area?.id) {
              const branchId = areaById[dispenser.area.id];
              if (branchId) {
                acc[branchId] = (acc[branchId] ?? 0) + 1;
              }
            }
            return acc;
          },
          {},
        );
        const rows = (branchesData.results ?? []).map((branch: BranchApi) => {
          const areasTotal = areaCount[branch.id] ?? 0;
          const dispensersTotal = dispenserCount[branch.id] ?? 0;
          return {
            id: branch.id,
            name: branch.name,
            client: branch.client.name,
            city: branch.city || "Sin ciudad",
            areas: areasTotal,
            dispensers: dispensersTotal,
            status: areasTotal > 0 || dispensersTotal > 0 ? "Activa" : "Inactiva",
          };
        });
        setBranches(rows);
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

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando sucursales...";
    if (error) return error;
    return "No hay sucursales registradas.";
  }, [error, isLoading]);

  return (
    <>
      <DashboardHeader title="Sucursales" searchPlaceholder="Buscar sucursal..." />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-logo">
              Sucursales
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Administra las sucursales activas y su cobertura.
            </p>
          </div>
          <button className="bg-professional-green text-white hover:bg-green-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Sucursal
          </button>
        </div>

        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Buscar sucursal..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                  <option value="">Todos los Estados</option>
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>
              <button className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">
                  filter_list
                </span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 font-logo">
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Ciudad</th>
                  <th className="px-6 py-4 text-center">Áreas</th>
                  <th className="px-6 py-4 text-center">Dosificadores</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {branches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">
                            storefront
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {branch.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {branch.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {branch.client}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {branch.city}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                        {branch.areas}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                        {branch.dispensers}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[branch.status]}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            branch.status === "Activa"
                              ? "bg-green-600"
                              : "bg-slate-400"
                          }`}
                        ></span>
                        {branch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-slate-400 hover:text-professional-green hover:bg-green-50 rounded transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            edit
                          </span>
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Ver detalles"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            visibility
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && (
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {branches.length} de {branches.length} sucursales
            </span>
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                disabled
              >
                <span className="material-symbols-outlined text-[20px]">
                  chevron_left
                </span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
