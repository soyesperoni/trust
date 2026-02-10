"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  role_label: string;
  is_active: boolean;
  client_ids?: number[];
  branch_ids?: number[];
  area_ids?: number[];
};

type Client = {
  id: number;
  name: string;
};

type Branch = {
  id: number;
  name: string;
  client: { id: number; name: string };
};

type Area = {
  id: number;
  name: string;
  branch: { id: number; name: string; client: string };
};

export default function EditarUsuarioPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    role: "",
    is_active: true,
    selectedClientId: "",
    selectedBranchId: "",
    selectedAreaId: "",
    readOnlyAccess: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("No se encontró el usuario solicitado.");
      setLoadError("No se encontró el usuario solicitado.");
      setIsLoading(false);
      setIsLoadingData(false);
      return;
    }
    let isMounted = true;

    const loadData = async () => {
      try {
        const [userRes, clientsRes, branchesRes, areasRes] =
          await Promise.all([
            fetch(`/api/users/${userId}`, { cache: "no-store" }),
            fetch("/api/clients", { cache: "no-store" }),
            fetch("/api/branches", { cache: "no-store" }),
            fetch("/api/areas", { cache: "no-store" }),
          ]);

        if (!userRes.ok) {
          throw new Error("No se pudo cargar el usuario.");
        }
        if (!clientsRes.ok || !branchesRes.ok || !areasRes.ok) {
          throw new Error("No se pudo cargar la información de permisos.");
        }

        const [userData, clientsData, branchesData, areasData] =
          await Promise.all([
            userRes.json(),
            clientsRes.json(),
            branchesRes.json(),
            areasRes.json(),
          ]);

        if (!isMounted) return;
        const resolvedUser = userData as UserRecord;
        setFormState({
          full_name: resolvedUser.full_name,
          email: resolvedUser.email,
          role: resolvedUser.role,
          is_active: resolvedUser.is_active,
          selectedClientId: resolvedUser.client_ids?.[0]
            ? String(resolvedUser.client_ids[0])
            : "",
          selectedBranchId: resolvedUser.branch_ids?.[0]
            ? String(resolvedUser.branch_ids[0])
            : "",
          selectedAreaId: resolvedUser.area_ids?.[0]
            ? String(resolvedUser.area_ids[0])
            : "",
          readOnlyAccess: false,
        });
        setClients(clientsData.results ?? []);
        setBranches(branchesData.results ?? []);
        setAreas(areasData.results ?? []);
        setError(null);
        setLoadError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudo cargar la información.";
        setError(message);
        setLoadError(message);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
        setIsLoadingData(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return clients;
    return clients.filter((client) =>
      client.name.toLowerCase().includes(normalizedSearch),
    );
  }, [clients, searchTerm]);

  const availableBranches = useMemo(() => {
    if (!formState.selectedClientId) return branches;
    const selectedId = Number(formState.selectedClientId);
    return branches.filter((branch) => branch.client.id === selectedId);
  }, [branches, formState.selectedClientId]);

  const availableAreas = useMemo(() => {
    if (!formState.selectedBranchId) return areas;
    const selectedId = Number(formState.selectedBranchId);
    return areas.filter((area) => area.branch.id === selectedId);
  }, [areas, formState.selectedBranchId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!userId) {
        throw new Error("No se encontró el usuario solicitado.");
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formState.full_name,
          email: formState.email,
          role: formState.role,
          is_active: formState.is_active,
          client_ids: formState.selectedClientId
            ? [Number(formState.selectedClientId)]
            : [],
          branch_ids: formState.selectedBranchId
            ? [Number(formState.selectedBranchId)]
            : [],
          area_ids: formState.selectedAreaId
            ? [Number(formState.selectedAreaId)]
            : [],
          notes: formState.readOnlyAccess ? "Acceso solo lectura" : "",
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
    <>
      <DashboardHeader
        title="Editar Usuario"
        description="Actualiza los datos de acceso y permisos."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
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
                <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/20">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="bg-green-100 dark:bg-green-900/30 text-professional-green dark:text-green-400 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">
                        security
                      </span>
                    </span>
                    Asignación de Permisos
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 ml-10">
                    Configure el alcance jerárquico para este usuario.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ml-0 md:ml-10 p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#161e27] shadow-sm">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Cliente
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">
                            search
                          </span>
                        </div>
                        <input
                          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Buscar cliente..."
                          type="text"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                        />
                      </div>
                      <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-md">
                        {isLoadingData ? (
                          <div className="p-3 text-sm text-slate-500">
                            Cargando clientes...
                          </div>
                        ) : loadError ? (
                          <div className="p-3 text-sm text-red-500">
                            {loadError}
                          </div>
                        ) : filteredClients.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500">
                            No hay clientes disponibles.
                          </div>
                        ) : (
                          filteredClients.map((client) => (
                            <label
                              className={`flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                                formState.selectedClientId === String(client.id)
                                  ? "bg-slate-50 dark:bg-slate-800/50"
                                  : ""
                              }`}
                              key={client.id}
                            >
                              <input
                                className="text-primary focus:ring-primary border-slate-300 rounded-full"
                                name="selectedClientId"
                                type="radio"
                                value={client.id}
                                checked={
                                  formState.selectedClientId === String(client.id)
                                }
                                onChange={handleChange}
                              />
                              <span
                                className={`text-sm ${
                                  formState.selectedClientId === String(client.id)
                                    ? "text-slate-900 font-medium dark:text-white"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {client.name}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sucursal
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                          name="selectedBranchId"
                          value={formState.selectedBranchId}
                          onChange={handleChange}
                          disabled={isLoadingData || !!loadError}
                        >
                          <option value="">Todas las sucursales</option>
                          {availableBranches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px]">
                          expand_more
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-md border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">
                            info
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {formState.selectedBranchId
                              ? "La sucursal seleccionada limitará el alcance del usuario."
                              : "Selecciona una sucursal para restringir el alcance del usuario."}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 opacity-100 transition-opacity">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Área (Opcional)
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                          name="selectedAreaId"
                          value={formState.selectedAreaId}
                          onChange={handleChange}
                          disabled={isLoadingData || !!loadError}
                        >
                          <option value="">Todas las áreas</option>
                          {availableAreas.map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.name}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px]">
                          expand_more
                        </span>
                      </div>
                      <div className="mt-2">
                        <label className="inline-flex items-center">
                          <input
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                            name="readOnlyAccess"
                            checked={formState.readOnlyAccess}
                            onChange={handleChange}
                            type="checkbox"
                          />
                          <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                            Acceso solo lectura
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 md:px-8 py-5 bg-slate-50 dark:bg-[#131b23] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <Link
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
                    href="/clientes"
                  >
                    Cancelar
                  </Link>
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
      </PageTransition>
    </>
  );
}
