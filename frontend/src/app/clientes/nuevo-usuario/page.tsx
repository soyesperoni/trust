"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { getSessionUserEmail } from "../../lib/session";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string } };

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "inspector",
    is_active: true,
    selectedClientId: "",
    selectedBranchId: "",
    selectedAreaId: "",
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [clientsRes, branchesRes, areasRes] = await Promise.all([
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/branches", { cache: "no-store" }),
          fetch("/api/areas", { cache: "no-store" }),
        ]);

        if (!clientsRes.ok || !branchesRes.ok || !areasRes.ok) {
          throw new Error("No se pudieron cargar permisos y catálogos.");
        }

        const [clientsData, branchesData, areasData] = await Promise.all([
          clientsRes.json(),
          branchesRes.json(),
          areasRes.json(),
        ]);

        if (!isMounted) return;
        setClients(clientsData.results ?? []);
        setBranches(branchesData.results ?? []);
        setAreas(areasData.results ?? []);
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar permisos y catálogos.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoadingData(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

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
    return branches.filter(
      (branch) => branch.client.id === Number(formState.selectedClientId),
    );
  }, [branches, formState.selectedClientId]);

  const availableAreas = useMemo(() => {
    if (!formState.selectedBranchId) return areas;
    return areas.filter(
      (area) => area.branch.id === Number(formState.selectedBranchId),
    );
  }, [areas, formState.selectedBranchId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const currentUserEmail = getSessionUserEmail();

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": currentUserEmail,
        },
        body: JSON.stringify({
          full_name: formState.full_name,
          email: formState.email,
          password: formState.password,
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
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear el usuario.");
      }

      router.replace("/usuarios");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el usuario.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Nuevo Usuario"
        description="Crea usuarios conectados al backend con permisos reales."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del usuario
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información general y el alcance de permisos.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isLoadingData ? (
              <p className="text-sm text-slate-500">Cargando catálogos...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Nombre completo
                  <input
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="full_name"
                    onChange={handleChange}
                    placeholder="Nombre completo"
                    required
                    type="text"
                    value={formState.full_name}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Correo electrónico
                  <input
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="email"
                    onChange={handleChange}
                    placeholder="usuario@trust.com"
                    required
                    type="email"
                    value={formState.email}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Contraseña
                  <input
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="password"
                    onChange={handleChange}
                    placeholder="Contraseña"
                    required
                    type="password"
                    value={formState.password}
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

                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  Cliente
                  <select
                    className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                    name="selectedClientId"
                    onChange={handleChange}
                    value={formState.selectedClientId}
                  >
                    <option value="">Todos los clientes</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>
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
                    onChange={handleChange}
                    value={formState.selectedBranchId}
                  >
                    <option value="">Todas las sucursales</option>
                    {availableBranches.map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
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
                    onChange={handleChange}
                    value={formState.selectedAreaId}
                  >
                    <option value="">Todas las áreas</option>
                    {availableAreas.map((area) => (
                      <option key={area.id} value={String(area.id)}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
                  <input
                    checked={formState.is_active}
                    name="is_active"
                    onChange={handleChange}
                    type="checkbox"
                  />
                  Usuario activo
                </label>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-3">
              <Link
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/usuarios"
              >
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 disabled:opacity-60"
                disabled={isSaving || isLoadingData}
                type="submit"
              >
                {isSaving ? "Guardando..." : "Guardar usuario"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
