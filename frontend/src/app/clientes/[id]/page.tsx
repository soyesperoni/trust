"use client";

import { useEffect, useState } from "react";

type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  role_label: string;
  is_active: boolean;
};

export default function EditarUsuarioPage({
  params,
}: {
  params: { id: string };
}) {
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    role: "",
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar el usuario.");
        }
        const data: UserRecord = await response.json();
        if (!isMounted) return;
        setFormState({
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          is_active: data.is_active,
        });
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudo cargar el usuario.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formState.full_name,
          email: formState.email,
          role: formState.role,
          is_active: formState.is_active,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "No se pudo guardar el usuario.");
      }

      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el usuario.",
      );
    } finally {
      setIsSaving(false);
    }
  };

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
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">apartment</span>
              Clientes
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">storefront</span>
              Sucursales
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">map</span>
              Áreas
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">water_drop</span>
              Dosificadores
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">inventory_2</span>
              Productos
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">history</span>
              Historial de Visitas
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">report_problem</span>
              Incidencias
            </a>
          </nav>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
                AR
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Alicia Rivera
                </span>
                <span className="text-xs text-slate-500">alicia@trust.com</span>
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
            <div className="flex items-center gap-3">
              <a
                className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                href="/clientes"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </a>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Editar Usuario
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Actualiza los datos de acceso y permisos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <form
                className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden"
                onSubmit={handleSubmit}
              >
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">
                        badge
                      </span>
                    </span>
                    Información General
                  </h3>
                  {isLoading ? (
                    <p className="text-sm text-slate-500">
                      Cargando usuario...
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                          htmlFor="fullname"
                        >
                          Nombre Completo
                        </label>
                        <input
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                          id="fullname"
                          name="full_name"
                          onChange={handleChange}
                          placeholder="Ej. Juan Pérez"
                          type="text"
                          value={formState.full_name}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                          htmlFor="email"
                        >
                          Correo Electrónico
                        </label>
                        <input
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                          id="email"
                          name="email"
                          onChange={handleChange}
                          placeholder="usuario@trust.com"
                          type="email"
                          value={formState.email}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                          htmlFor="role"
                        >
                          Rol
                        </label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white pr-10 cursor-pointer"
                            id="role"
                            name="role"
                            onChange={handleChange}
                            value={formState.role}
                          >
                            <option value="general_admin">Admin Global</option>
                            <option value="account_admin">Admin de Cuentas</option>
                            <option value="branch_admin">Admin de Sucursal</option>
                            <option value="inspector">Inspector</option>
                          </select>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[20px]">
                            expand_more
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Estado
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            checked={formState.is_active}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                            name="is_active"
                            onChange={handleChange}
                            type="checkbox"
                          />
                          Usuario activo
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-6 md:px-8 py-5 bg-slate-50 dark:bg-[#131b23] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <a
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
                    href="/clientes"
                  >
                    Cancelar
                  </a>
                  <button
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-professional-green hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSaving || isLoading}
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
                {(error || success) && (
                  <div className="px-6 md:px-8 py-4 border-t border-slate-100 dark:border-slate-800">
                    {error && (
                      <p className="text-sm text-red-500">{error}</p>
                    )}
                    {success && (
                      <p className="text-sm text-green-600">
                        Usuario actualizado correctamente.
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
