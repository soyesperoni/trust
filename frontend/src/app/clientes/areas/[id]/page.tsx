"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type ClientApi = {
  id: number;
  name: string;
};

type BranchApi = {
  id: number;
  name: string;
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

export default function EditarAreaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const areaId = params?.id;

  const [clients, setClients] = useState<ClientApi[]>([]);
  const [branches, setBranches] = useState<BranchApi[]>([]);
  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaId) return;
    let mounted = true;

    const loadData = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [clientsResponse, branchesResponse, areaResponse] = await Promise.all([
          fetch("/api/clients/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/branches/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch(`/api/areas/${areaId}/`, {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        const [clientsPayload, branchesPayload, areaPayload] = await Promise.all([
          clientsResponse.json(),
          branchesResponse.json(),
          areaResponse.json(),
        ]);

        if (!clientsResponse.ok) {
          throw new Error(clientsPayload.error || "No se pudieron cargar los clientes.");
        }
        if (!branchesResponse.ok) {
          throw new Error(branchesPayload.error || "No se pudieron cargar las sucursales.");
        }
        if (!areaResponse.ok) {
          throw new Error(areaPayload.error || "No se pudo cargar el área.");
        }

        if (!mounted) return;
        const area = areaPayload as AreaApi;
        const availableBranches = (branchesPayload.results ?? []) as BranchApi[];

        setClients((clientsPayload.results ?? []) as ClientApi[]);
        setBranches(availableBranches);
        setName(area.name);
        setDescription(area.description || "");
        setBranchId(String(area.branch.id));

        const selectedBranch = availableBranches.find((branch) => branch.id === area.branch.id);
        if (selectedBranch) {
          setClientId(String(selectedBranch.client.id));
        }
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la información del área.",
        );
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [areaId]);

  const filteredBranches = useMemo(
    () => branches.filter((branch) => String(branch.client.id) === clientId),
    [branches, clientId],
  );

  const handleClientChange = (value: string) => {
    setClientId(value);
    setBranchId("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!areaId) return;
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/areas/${areaId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          branch_id: Number(branchId),
          name,
          description,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar el área.");
      }

      router.push("/clientes/areas");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el área.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Editar Área"
        description="Actualiza los datos del área en el backend de Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Cliente
              <select
                required
                value={clientId}
                onChange={(event) => handleClientChange(event.target.value)}
                disabled={isLoading || isSaving}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Seleccione un cliente</option>
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
                required
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                disabled={isLoading || isSaving || !clientId}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Seleccione una sucursal</option>
                {filteredBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              Nombre
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              Descripción
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              <Link
                href="/clientes/areas"
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 disabled:opacity-70"
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
