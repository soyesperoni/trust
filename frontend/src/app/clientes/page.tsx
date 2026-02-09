"use client";

import { useEffect, useMemo, useState } from "react";

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
        <aside className="w-64 bg-white dark:bg-[#161e27] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0">
          <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-primary p-1.5 rounded-md flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-slate-900 text-[24px] font-variation-fill">
                shield
              </span>
            </div>
            <h1 className="font-logo text-3xl font-bold text-primary tracking-tight leading-none lowercase">
              trust
            </h1>
          </div>
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
            <a className="sidebar-link" href="/dashboard">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </a>
            <a className="sidebar-link active" href="/clientes">
              <span className="material-symbols-outlined">group</span>
              Usuarios
            </a>
            <a className="sidebar-link" href="/clientes/data">
              <span className="material-symbols-outlined">apartment</span>
              Clientes
            </a>
            <a className="sidebar-link" href="/clientes/sucursales">
              <span className="material-symbols-outlined">storefront</span>
              Sucursales
            </a>
            <a className="sidebar-link" href="/clientes/areas">
              <span className="material-symbols-outlined">map</span>
              Áreas
            </a>
            <a className="sidebar-link" href="/clientes/dispensadores">
              <span className="material-symbols-outlined">water_drop</span>
              Dosificadores
            </a>
            <a className="sidebar-link" href="/clientes/productos">
              <span className="material-symbols-outlined">inventory_2</span>
              Productos
            </a>
            <a className="sidebar-link" href="/clientes/visitas">
              <span className="material-symbols-outlined">history</span>
              Historial de Visitas
            </a>
            <a className="sidebar-link" href="/clientes/incidencias">
              <span className="material-symbols-outlined">report_problem</span>
              Incidencias
            </a>
          </nav>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img
                alt="Admin"
                className="w-10 h-10 rounded-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEahRnyQv02GBHzX-gLrPgyOL0URmQOgHSe_azclMK3UtDyLVqoIsR_xlLa3cg0STfViWFzqU_drEoeTRH-ZcKEXQZmoV-RKc-wm_um98nGOvRAIImVpPpHEQ-po3TOR5j8edOjKDaxDXZ_6Nb9tcmZduDHiHj8fFw7KSL_iONWZfitw23XdkkGtW1dKq-EubBA88kX6oFbT0OabwdIqBlHCs4jO4SQsf3Vlckf0l1UESnFcEXidpY1AcVqZV7puBOxayylnDD62kI"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Admin Global
                </span>
                <span className="text-xs text-slate-500">admin@trust.com</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-900 text-[20px] font-variation-fill">
                  shield
                </span>
              </div>
              <span className="font-logo text-xl font-bold text-primary lowercase">
                trust
              </span>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </header>
          <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Gestión de Usuarios
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Solo el Administrador General puede ver, crear o editar usuarios.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary"
                  placeholder="Buscar..."
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
                <a
                  className="bg-professional-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  href="/clientes/nuevo"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nuevo Usuario
                </a>
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
                            <a
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                              href={`/clientes/${user.id}`}
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </a>
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
          </div>
        </main>
      </div>
    </div>
  );
}
