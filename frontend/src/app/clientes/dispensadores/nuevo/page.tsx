"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type CreateDispenserResponse = {
  id?: number;
  error?: string;
};

export default function NuevoDosificadorPage() {
  const router = useRouter();
  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [branches, setBranches] = useState<
    Array<{ id: number; name: string; client: { id: number; name: string } }>
  >([]);
  const [areas, setAreas] = useState<
    Array<{ id: number; name: string; branch: { id: number; name: string } }>
  >([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const [modelsResponse, clientsResponse, branchesResponse, areasResponse] = await Promise.all([
          fetch("/api/dispenser-models", { cache: "no-store" }),
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/branches", { cache: "no-store" }),
          fetch("/api/areas", { cache: "no-store" }),
        ]);

        if (!modelsResponse.ok || !clientsResponse.ok || !branchesResponse.ok || !areasResponse.ok) {
          return;
        }

        const [modelsData, clientsData, branchesData, areasData] = await Promise.all([
          modelsResponse.json(),
          clientsResponse.json(),
          branchesResponse.json(),
          areasResponse.json(),
        ]);

        if (!isMounted) return;

        setModels((modelsData.results ?? []) as Array<{ id: number; name: string }>);
        setClients((clientsData.results ?? []) as Array<{ id: number; name: string }>);
        setBranches(
          (branchesData.results ?? []) as Array<{
            id: number;
            name: string;
            client: { id: number; name: string };
          }>,
        );
        setAreas(
          (areasData.results ?? []) as Array<{
            id: number;
            name: string;
            branch: { id: number; name: string };
          }>,
        );
      } catch {
        // UI-only fallback sin bloquear render
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasModelOptions = useMemo(() => models.length > 0, [models.length]);

  const filteredBranches = useMemo(
    () => branches.filter((branch) => (selectedClientId ? String(branch.client.id) === selectedClientId : true)),
    [branches, selectedClientId],
  );

  const filteredAreas = useMemo(
    () => areas.filter((area) => (selectedBranchId ? String(area.branch.id) === selectedBranchId : true)),
    [areas, selectedBranchId],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const currentUserEmail = getSessionUserEmail().trim().toLowerCase();
      if (!currentUserEmail) {
        throw new Error("No se pudo identificar tu sesión. Cierra sesión y vuelve a ingresar.");
      }

      const response = await fetch("/api/dispensers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": currentUserEmail,
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          model_id: Number(selectedModelId),
          area_id: selectedAreaId ? Number(selectedAreaId) : null,
          notes: notes.trim(),
        }),
      });

      const payload = (await response.json()) as CreateDispenserResponse;
      if (!response.ok || payload.error || typeof payload.id !== "number") {
        throw new Error(
          payload.error || "No se confirmó la creación del dosificador. Intenta nuevamente.",
        );
      }

      router.push("/clientes/dispensadores");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el dosificador.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Nuevo Dosificador"
        description="Registra un nuevo dosificador con la misma experiencia visual de clientes."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del dosificador
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información base para registrar un nuevo equipo.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="identifier"
                  name="identifier"
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Ej. DISP-001"
                  required
                  type="text"
                  value={identifier}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="model_id">
                Modelo
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="model_id"
                  name="model_id"
                  required
                  value={selectedModelId}
                  onChange={(event) => setSelectedModelId(event.target.value)}
                >
                  <option value="">Seleccione un modelo</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                {!hasModelOptions ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    No hay modelos disponibles todavía.
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="client">
                Cliente
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="client"
                  value={selectedClientId}
                  onChange={(event) => {
                    setSelectedClientId(event.target.value);
                    setSelectedBranchId("");
                    setSelectedAreaId("");
                  }}
                >
                  <option value="">Seleccione un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="branch">
                Sucursal
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedClientId}
                  id="branch"
                  value={selectedBranchId}
                  onChange={(event) => {
                    setSelectedBranchId(event.target.value);
                    setSelectedAreaId("");
                  }}
                >
                  <option value="">Seleccione una sucursal</option>
                  {filteredBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedBranchId}
                  id="area"
                  value={selectedAreaId}
                  onChange={(event) => setSelectedAreaId(event.target.value)}
                >
                  <option value="">Seleccione un área</option>
                  {filteredAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="notes">
                Notas
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  id="notes"
                  name="notes"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observaciones técnicas del equipo..."
                  value={notes}
                />
              </label>
              {error ? <p className="text-sm text-red-500 md:col-span-2">{error}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/clientes/dispensadores"
              >
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2"
                disabled={isSaving}
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSaving ? "Guardando..." : "Guardar Dosificador"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
