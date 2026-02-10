"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";

type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  role_label: string;
  is_active: boolean;
};

const statusStyles: Record<string, string> = {
  active: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20",
  inactive:
    "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800",
};

export default function ClientesPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los usuarios.");
        }
        const data = await response.json();
        if (!isMounted) return;
        setUsers(data.results ?? []);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los usuarios.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (isLoading || error) return [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (selectedRole && user.role !== selectedRole) return false;
      if (selectedStatus) {
        const statusValue = user.is_active ? "activo" : "inactivo";
        if (statusValue !== selectedStatus) return false;
      }
      if (normalizedSearch) {
        const haystack = `${user.full_name} ${user.email} ${user.role_label}`
          .toLowerCase()
          .trim();
        return haystack.includes(normalizedSearch);
      }
      return true;
    });
  }, [error, isLoading, searchTerm, selectedRole, selectedStatus, users]);

  return (
    <>
      <DashboardHeader
        title="Gestión de Usuarios"
        description="Solo el Administrador General puede ver, crear o editar usuarios."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-logo">
              Usuarios
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Administra los accesos y roles de la plataforma.
            </p>
          </div>
          <Link
            className="bg-professional-green text-white hover:bg-green-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            href="/clientes/nuevo-usuario"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nuevo Usuario
          </Link>
        </div>
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Buscar usuario..."
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                >
                  <option value="">Todos los Roles</option>
                  <option value="general_admin">Admin Global</option>
                  <option value="account_admin">Admin de Cuentas</option>
                  <option value="branch_admin">Admin de Sucursal</option>
                  <option value="inspector">Inspector</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="relative">
                <select
                  className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                >
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
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {rows.map((user) => (
                  <tr
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    key={user.id}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                          {user.full_name
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {user.full_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {user.email || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {user.role_label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                          user.is_active
                            ? statusStyles.active
                            : statusStyles.inactive
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.is_active
                              ? "bg-green-600 dark:bg-green-400"
                              : "bg-slate-400"
                          }`}
                        ></span>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          href={`/clientes/${user.id}`}
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
                {error && !isLoading && (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-red-500"
                      colSpan={5}
                    >
                      {error}
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-slate-500"
                      colSpan={5}
                    >
                      Cargando usuarios...
                    </td>
                  </tr>
                )}
                {!error && !isLoading && rows.length === 0 && (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-slate-500"
                      colSpan={5}
                    >
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {rows.length} usuarios
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
