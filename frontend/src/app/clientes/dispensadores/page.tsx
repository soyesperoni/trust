"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";

import DashboardHeader from "../../components/DashboardHeader";
import { getSessionUserEmail } from "../../lib/session";
import {
  ACCOUNT_ADMIN_ROLE,
  BRANCH_ADMIN_ROLE,
  GENERAL_ADMIN_ROLE,
  INSPECTOR_ROLE,
} from "../../lib/permissions";

import PageTransition from "../../components/PageTransition";

type DispenserStatus = "Activo" | "Inactivo";

type DispenserApi = {
  id: number;
  identifier: string;
  installed_at: string | null;
  model: {
    id: number;
    name: string;
    photo: string | null;
  };
  area: {
    id: number;
    name: string;
    branch: string;
  } | null;
  products: { id: number }[];
  is_active: boolean;
};

type AreaApi = {
  id: number;
  branch: {
    id: number;
  };
};

type BranchApi = {
  id: number;
  client: {
    name: string;
  };
};

type DispenserRow = {
  id: number;
  code: string;
  serial: string;
  model: string;
  modelPhoto: string | null;
  area: string;
  branch: string;
  client: string;
  branchInitials: string;
  products: number;
  status: DispenserStatus;
};

const statusStyles: Record<DispenserStatus, { badge: string; dot: string }> = {
  Activo: {
    badge: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    dot: "bg-green-500",
  },
  Inactivo: {
    badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export default function DispensadoresPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const userRole = user?.role ?? "";
  const isRestrictedRole = [ACCOUNT_ADMIN_ROLE, BRANCH_ADMIN_ROLE, INSPECTOR_ROLE].includes(userRole);
  const canViewDetailsOnly = [ACCOUNT_ADMIN_ROLE, BRANCH_ADMIN_ROLE].includes(userRole);
  const canManageDispensers = !isLoadingUser && !isRestrictedRole;
  const canDeleteDispensers = !isLoadingUser && user?.role === GENERAL_ADMIN_ROLE;
  const [dispensers, setDispensers] = useState<DispenserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | DispenserStatus>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDispenserId, setDeletingDispenserId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDispensers = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [dispensersResponse, areasResponse, branchesResponse] = await Promise.all([
          fetch("/api/dispensers/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/areas/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/branches/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
        ]);
        if (!dispensersResponse.ok || !areasResponse.ok || !branchesResponse.ok) {
          throw new Error("No se pudieron cargar los dosificadores.");
        }

        const [dispensersData, areasData, branchesData] = await Promise.all([
          dispensersResponse.json(),
          areasResponse.json(),
          branchesResponse.json(),
        ]);

        if (!isMounted) return;

        const areas = (areasData.results ?? []) as AreaApi[];
        const branches = (branchesData.results ?? []) as BranchApi[];

        const areaToBranch = areas.reduce<Record<number, number>>((acc, area) => {
          acc[area.id] = area.branch.id;
          return acc;
        }, {});

        const branchToClient = branches.reduce<Record<number, string>>((acc, branch) => {
          acc[branch.id] = branch.client.name;
          return acc;
        }, {});

        const rows = (dispensersData.results ?? []).map(
          (dispenser: DispenserApi) => {
            const branchName = dispenser.area?.branch ?? "Sin sucursal";
            const branchInitials = branchName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("");
            const status: DispenserStatus = dispenser.is_active ? "Activo" : "Inactivo";
            const branchId = dispenser.area?.id ? areaToBranch[dispenser.area.id] : undefined;
            const clientName = branchId ? (branchToClient[branchId] ?? "Sin cliente") : "Sin cliente";

            return {
              id: dispenser.id,
              code: dispenser.identifier,
              serial: `#${dispenser.id}`,
              model: dispenser.model.name,
              modelPhoto: dispenser.model.photo,
              area: dispenser.area?.name ?? "Sin área",
              branch: branchName,
              client: clientName,
              branchInitials: branchInitials || "NA",
              products: dispenser.products.length,
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


  const handleDeleteDispenser = async (dispenserId: number) => {
    const confirmed = window.confirm("¿Deseas eliminar este dosificador?");
    if (!confirmed) return;

    setDeletingDispenserId(dispenserId);
    setError(null);

    try {
      const response = await fetch(`/api/dispensers/${dispenserId}/`, {
        method: "DELETE",
        headers: { "x-current-user-email": getSessionUserEmail() },
      });

      if (response.status !== 204) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "No se pudo eliminar el dosificador.");
      }

      setDispensers((current) => current.filter((dispenser) => dispenser.id !== dispenserId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el dosificador.",
      );
    } finally {
      setDeletingDispenserId(null);
    }
  };

  const uniqueClients = useMemo(
    () => Array.from(new Set(dispensers.map((dispenser) => dispenser.client))).sort((a, b) => a.localeCompare(b)),
    [dispensers],
  );
  const uniqueModels = useMemo(
    () => Array.from(new Set(dispensers.map((dispenser) => dispenser.model))).sort((a, b) => a.localeCompare(b)),
    [dispensers],
  );
  const uniqueAreas = useMemo(
    () => Array.from(new Set(dispensers.map((dispenser) => dispenser.area))).sort((a, b) => a.localeCompare(b)),
    [dispensers],
  );
  const uniqueBranches = useMemo(
    () => Array.from(new Set(dispensers.map((dispenser) => dispenser.branch))).sort((a, b) => a.localeCompare(b)),
    [dispensers],
  );

  const filteredDispensers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return dispensers.filter((dispenser) => {
      const matchesQuery =
        !query ||
        [
          dispenser.code,
          dispenser.serial,
          dispenser.client,
          dispenser.model,
          dispenser.area,
          dispenser.branch,
          dispenser.status,
        ].some((value) => value.toLowerCase().includes(query));

      const matchesClient = !clientFilter || dispenser.client === clientFilter;
      const matchesModel = !modelFilter || dispenser.model === modelFilter;
      const matchesArea = !areaFilter || dispenser.area === areaFilter;
      const matchesBranch = !branchFilter || dispenser.branch === branchFilter;
      const matchesStatus = !statusFilter || dispenser.status === statusFilter;

      return matchesQuery && matchesClient && matchesModel && matchesArea && matchesBranch && matchesStatus;
    });
  }, [areaFilter, branchFilter, clientFilter, dispensers, modelFilter, searchTerm, statusFilter]);

  const totalResults = dispensers.length;
  const displayedResults = filteredDispensers.length;

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando dosificadores...";
    if (error) return error;
    if (dispensers.length > 0) return "No hay dosificadores que coincidan con la búsqueda.";
    return "No hay dosificadores registrados.";
  }, [dispensers.length, error, isLoading]);

  return (
    <>
      <DashboardHeader
        title="Gestión de Dosificadores"
        description="Administra y monitorea los dosificadores instalados por sucursal."
        showSearch={false}
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              {canManageDispensers ? (
                <Link
                  className="bg-professional-green text-white hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                  href="/clientes/dispensadores/nuevo"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Nuevo Dosificador
                </Link>
              ) : null}
              <div className="relative w-full md:w-96">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Buscar dosificador..."
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                value={modelFilter}
                onChange={(event) => setModelFilter(event.target.value)}
              >
                <option value="">Todos los modelos</option>
                {uniqueModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
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
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | DispenserStatus)}
              >
                <option value="">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="list-table">
              <thead>
                <tr className="list-table-head-row">
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Modelo</th>
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4 text-center">Productos</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredDispensers.map((dispenser) => {
                  const statusStyle = statusStyles[dispenser.status];

                  return (
                    <tr
                      key={dispenser.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                            {dispenser.modelPhoto ? (
                              <img
                                alt={`Modelo ${dispenser.model}`}
                                className="h-full w-full rounded-lg object-cover"
                                src={dispenser.modelPhoto}
                              />
                            ) : (
                              <span className="material-symbols-outlined">
                                water_drop
                              </span>
                            )}
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
                        {dispenser.client}
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
                        <div className="flex items-center justify-end gap-2">
                          {canManageDispensers && <Link
                            className="list-action-btn hover:text-professional-green"
                            href={`/clientes/dispensadores/${dispenser.id}`}
                            title="Editar"
                          >
                            <span className="material-symbols-outlined">
                              edit
                            </span>
                          </Link>}
                          {canViewDetailsOnly && (
                            <Link
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-professional-green hover:text-professional-green dark:border-slate-700 dark:text-slate-300"
                              href={`/clientes/dispensadores/${dispenser.id}`}
                              title="Ver"
                            >
                              Ver
                            </Link>
                          )}
                          {canDeleteDispensers && (
                            <button
                              type="button"
                              className="list-action-btn hover:text-red-600 disabled:opacity-50"
                              onClick={() => void handleDeleteDispenser(dispenser.id)}
                              disabled={deletingDispenserId === dispenser.id}
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDispensers.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
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
