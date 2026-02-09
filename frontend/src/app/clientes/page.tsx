"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import DashboardSidebar from "../components/DashboardSidebar";
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
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-800 dark:text-slate-200">
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar activePath="/clientes" />
        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          <DashboardHeader
            title="Gestión de Usuarios"
            description="Solo el Administrador General puede ver, crear o editar usuarios."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Usuarios
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Administra los accesos y roles de la plataforma.
                  </p>
                </div>
                <Link
                  className="bg-professional-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  href="/clientes/nuevo"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nuevo Usuario
                </Link>
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Filtrar por:
                  </span>
                </div>
                <div className="relative">
                  <select
                    className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                  >
                    <option value="">Todos los Roles</option>
                    <option value="general_admin">Admin Global</option>
                    <option value="account_admin">Admin de Cuentas</option>
                    <option value="branch_admin">Admin de Sucursal</option>
                    <option value="inspector">Inspector</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </div>
                <div className="relative">
                  <select
                    className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                  >
                    <option value="">Todos los Estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
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
                <span className="text-xs text-slate-500">
                  Mostrando {rows.length} usuarios
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    disabled
                  >
                    Anterior
                  </button>
                  <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
