"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import { ACCOUNT_ADMIN_ROLE, BRANCH_ADMIN_ROLE, INSPECTOR_ROLE } from "../../lib/permissions";
import PageTransition from "../../components/PageTransition";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type ClientApi = {
  id: number;
  name: string;
  code: string;
  notes: string;
};

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

type UserApi = {
  id: number;
  full_name: string;
  email: string;
  client_ids: number[];
};

type ClientRow = {
  id: number;
  name: string;
  initials: string;
  branches: number;
  dispensers: number;
  contactName: string;
  contactEmail: string;
  status: "Activo" | "Inactivo";
  badgeClasses: string;
  indicatorClasses: string;
  avatarClasses: string;
};

const avatarClassPool = [
  "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30",
  "bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-100 dark:border-orange-900/30",
  "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 border-yellow-100 dark:border-yellow-900/30",
  "bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-100 dark:border-purple-900/30",
  "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 border-yellow-100 dark:border-yellow-900/30",
  "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 border-yellow-100 dark:border-yellow-900/30",
];

export default function ClientesListadoPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const canCreateClients =
    !isLoadingUser &&
    ![ACCOUNT_ADMIN_ROLE, BRANCH_ADMIN_ROLE, INSPECTOR_ROLE].includes(
      user?.role ?? "",
    );

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      try {
        const [
          clientsResponse,
          branchesResponse,
          areasResponse,
          dispensersResponse,
          usersResponse,
        ] = await Promise.all([
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/branches", { cache: "no-store" }),
          fetch("/api/areas", { cache: "no-store" }),
          fetch("/api/dispensers", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
        ]);
        if (
          !clientsResponse.ok ||
          !branchesResponse.ok ||
          !areasResponse.ok ||
          !dispensersResponse.ok ||
          !usersResponse.ok
        ) {
          throw new Error("No se pudieron cargar los clientes.");
        }
        const [
          clientsData,
          branchesData,
          areasData,
          dispensersData,
          usersData,
        ] = await Promise.all([
          clientsResponse.json(),
          branchesResponse.json(),
          areasResponse.json(),
          dispensersResponse.json(),
          usersResponse.json(),
        ]);
        if (!isMounted) return;
        const clients = (clientsData.results ?? []) as ClientApi[];
        const branches = (branchesData.results ?? []) as BranchApi[];
        const areas = (areasData.results ?? []) as AreaApi[];
        const dispensers = (dispensersData.results ?? []) as DispenserApi[];
        const users = (usersData.results ?? []) as UserApi[];

        const branchCount = branches.reduce<Record<number, number>>(
          (acc, branch) => {
            acc[branch.client.id] = (acc[branch.client.id] ?? 0) + 1;
            return acc;
          },
          {},
        );
        const areaToClient = areas.reduce<Record<number, string>>(
          (acc, area) => {
            acc[area.id] = area.branch.client;
            return acc;
          },
          {},
        );
        const clientByName = clients.reduce<Record<string, number>>(
          (acc, client) => {
            acc[client.name] = client.id;
            return acc;
          },
          {},
        );
        const dispenserCount = dispensers.reduce<Record<number, number>>(
          (acc, dispenser) => {
            if (dispenser.area?.id) {
              const clientName = areaToClient[dispenser.area.id];
              const clientId = clientByName[clientName];
              if (clientId) {
                acc[clientId] = (acc[clientId] ?? 0) + 1;
              }
            }
            return acc;
          },
          {},
        );
        const contactByClient = users.reduce<Record<number, UserApi>>(
          (acc, user) => {
            user.client_ids.forEach((clientId) => {
              if (!acc[clientId]) {
                acc[clientId] = user;
              }
            });
            return acc;
          },
          {},
        );

        const rows: ClientRow[] = clients.map((client: ClientApi, index: number) => {
          const initials = client.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("");
          const branchesTotal = branchCount[client.id] ?? 0;
          const dispensersTotal = dispenserCount[client.id] ?? 0;
          const contact = contactByClient[client.id];
          const status: ClientRow["status"] =
            branchesTotal > 0 || dispensersTotal > 0 ? "Activo" : "Inactivo";
          const badgeClasses =
            status === "Activo"
              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
          const indicatorClasses =
            status === "Activo" ? "bg-yellow-600" : "bg-slate-500";

          return {
            id: client.id,
            name: client.name,
            initials: initials || "NA",
            branches: branchesTotal,
            dispensers: dispensersTotal,
            contactName: contact?.full_name || "Sin asignar",
            contactEmail: contact?.email || "Sin correo",
            status,
            badgeClasses,
            indicatorClasses,
            avatarClasses: avatarClassPool[index % avatarClassPool.length],
          };
        });

        setClients(rows);
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

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando clientes...";
    if (error) return error;
    return "No hay clientes registrados.";
  }, [error, isLoading]);

  return (
    <>
      <DashboardHeader
        title="Gestión de Clientes"
        description="Administra la lista de clientes corporativos y su estado."
        showSearch={false}
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                  {canCreateClients ? (
                    <Link
                      className="bg-professional-green text-white hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-sm"
                      href="/clientes/nuevo"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                      Nuevo Cliente
                    </Link>
                  ) : null}
                  <div className="relative w-full md:w-96">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                      search
                    </span>
                    <input
                      className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="Buscar cliente..."
                      type="text"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                      <option value="">Todos los Estados</option>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
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
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 font-logo">
                      <th className="px-6 py-4 w-1/3">Cliente</th>
                      <th className="px-6 py-4 text-center">Sucursales</th>
                      <th className="px-6 py-4 text-center">Dosificadores</th>
                      <th className="px-6 py-4">Contacto Principal</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${client.avatarClasses}`}
                            >
                              {client.initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-base">
                                {client.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: {client.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {client.branches}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {client.dispensers}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-medium">
                              {client.contactName}
                            </span>
                            <span className="text-xs text-slate-500">
                              {client.contactEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${client.badgeClasses}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${client.indicatorClasses}`}
                            ></span>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              className="p-1.5 text-slate-400 hover:text-professional-green hover:bg-yellow-50 rounded-full transition-colors"
                              href={`/clientes/data/${client.id}`}
                              title="Ver detalles"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                visibility
                              </span>
                            </Link>
                            <Link
                              className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                              href={`/clientes/data/${client.id}`}
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
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
                  Mostrando {clients.length} de {clients.length} clientes
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
