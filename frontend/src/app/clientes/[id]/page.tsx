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
  username: string;
  role: string;
  role_label: string;
  is_active: boolean;
  client_ids?: number[];
  branch_ids?: number[];
  area_ids?: number[];
  profile_photo?: string | null;
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
    username: "",
    role: "",
    is_active: true,
    selectedClientId: "",
    selectedBranchId: "",
    selectedAreaId: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
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
            fetch(`/api/users/${userId}/`, { cache: "no-store" }),
            fetch("/api/clients/", { cache: "no-store" }),
            fetch("/api/branches/", { cache: "no-store" }),
            fetch("/api/areas/", { cache: "no-store" }),
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
          username: resolvedUser.username,
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
        });
        setPhotoFile(null);
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

      const body = new FormData();
      body.append("full_name", formState.full_name);
      body.append("email", formState.email);
      body.append("username", formState.username);
      body.append("role", formState.role);
      body.append("is_active", String(formState.is_active));
      if (formState.selectedClientId) body.append("client_ids", formState.selectedClientId);
      if (formState.selectedBranchId) body.append("branch_ids", formState.selectedBranchId);
      if (formState.selectedAreaId) body.append("area_ids", formState.selectedAreaId);
      if (photoFile) body.append("profile_photo", photoFile);

      const sessionUserRaw = window.localStorage.getItem("trust.currentUser");
      const sessionEmail = sessionUserRaw ? (JSON.parse(sessionUserRaw) as { email?: string }).email ?? "" : "";

      const response = await fetch(`/api/users/${userId}/`, {
        method: "PUT",
        headers: { "x-current-user-email": sessionEmail },
        body,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar el usuario.");
      }

      setSuccess(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
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
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del usuario
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ajusta la información general y el alcance de permisos del usuario.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Cargando usuario...</p>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Nombre completo
                  <input
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="full_name"
                    onChange={handleChange}
                    placeholder="Ej. Juan Pérez"
                    type="text"
                    value={formState.full_name}
                  />
                </label>


                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Usuario
                  <input
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="username"
                    onChange={handleChange}
                    placeholder="usuario"
                    type="text"
                    value={formState.username}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Correo electrónico
                  <input
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="email"
                    onChange={handleChange}
                    placeholder="usuario@trust.com"
                    type="email"
                    value={formState.email}
                  />
                </label>


                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
                  Foto de perfil
                  <input
                    accept="image/*"
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Rol
                  <select
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="role"
                    onChange={handleChange}
                    value={formState.role}
                  >
                    <option value="general_admin">Admin Global</option>
                    <option value="account_admin">Admin de Cuentas</option>
                    <option value="branch_admin">Admin de Sucursal</option>
                    <option value="inspector">Inspector</option>
                  </select>
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

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Cliente
                  <select
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="selectedClientId"
                    value={formState.selectedClientId}
                    onChange={handleChange}
                    disabled={isLoadingData || !!loadError}
                  >
                    <option value="">Todos los clientes</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Sucursal
                  <select
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
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
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Área
                  <select
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
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
                </label>
              </div>

              {(error || success) && (
                <div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {success && (
                    <p className="text-sm text-yellow-600">
                      Usuario actualizado correctamente.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <Link
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  href="/usuarios"
                >
                  Cancelar
                </Link>
                <button
                  className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 disabled:opacity-60"
                  disabled={isSaving || isLoading}
                  type="submit"
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </div>
      </PageTransition>
    </>
  );
}
