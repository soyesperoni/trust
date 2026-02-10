"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

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
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      router.push("/clientes");
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
        <div className="max-w-4xl mx-auto">
          <form
            className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden"
            onSubmit={handleSubmit}
          >
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Información General
              </h3>
              {isLoadingData ? (
                <p className="text-sm text-slate-500">Cargando catálogos...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input className="form-input" name="full_name" onChange={handleChange} placeholder="Nombre completo" required type="text" value={formState.full_name} />
                  <input className="form-input" name="email" onChange={handleChange} placeholder="usuario@trust.com" required type="email" value={formState.email} />
                  <input className="form-input" name="password" onChange={handleChange} placeholder="Contraseña" required type="password" value={formState.password} />
                  <select className="form-input" name="role" onChange={handleChange} value={formState.role}>
                    <option value="general_admin">Admin Global</option>
                    <option value="account_admin">Admin de Cuentas</option>
                    <option value="branch_admin">Admin de Sucursal</option>
                    <option value="inspector">Inspector</option>
                  </select>
                  <select className="form-input" name="selectedClientId" onChange={handleChange} value={formState.selectedClientId}>
                    <option value="">Todos los clientes</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <select className="form-input" name="selectedBranchId" onChange={handleChange} value={formState.selectedBranchId}>
                    <option value="">Todas las sucursales</option>
                    {availableBranches.map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <select className="form-input" name="selectedAreaId" onChange={handleChange} value={formState.selectedAreaId}>
                    <option value="">Todas las áreas</option>
                    {availableAreas.map((area) => (
                      <option key={area.id} value={String(area.id)}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input checked={formState.is_active} name="is_active" onChange={handleChange} type="checkbox" />
                    Usuario activo
                  </label>
                </div>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="px-6 md:px-8 py-5 bg-slate-50 dark:bg-[#131b23] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <Link className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700" href="/clientes">
                Cancelar
              </Link>
              <button className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-professional-green hover:bg-green-700 disabled:opacity-60" disabled={isSaving || isLoadingData} type="submit">
                {isSaving ? "Guardando..." : "Guardar Usuario"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
