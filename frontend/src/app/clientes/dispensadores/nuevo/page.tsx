"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [areas, setAreas] = useState<Array<{ id: number; name: string; branch: { name: string } }>>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [modelsResponse, areasResponse] = await Promise.all([
          fetch("/api/dispenser-models/", { cache: "no-store" }),
          fetch("/api/areas/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
        ]);

        if (!modelsResponse.ok || !areasResponse.ok) {
          throw new Error("No se pudieron cargar los catálogos del formulario.");
        }

        const [modelsData, areasData] = await Promise.all([
          modelsResponse.json(),
          areasResponse.json(),
        ]);

        if (!isMounted) return;
        setModels((modelsData.results ?? []) as Array<{ id: number; name: string }>);
        setAreas((areasData.results ?? []) as Array<{ id: number; name: string; branch: { name: string } }>);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los catálogos del formulario.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const currentUserEmail = getSessionUserEmail().trim().toLowerCase();
      if (!currentUserEmail) {
        throw new Error("No se pudo identificar tu sesión. Cierra sesión y vuelve a ingresar.");
      }

      const body = new FormData();
      body.append("identifier", identifier.trim());
      body.append("model_id", selectedModelId);
      if (selectedAreaId) body.append("area_id", selectedAreaId);
      if (installedAt) body.append("installed_at", installedAt);
      if (photoFile) body.append("photo", photoFile);

      const response = await fetch("/api/dispensers/", {
        method: "POST",
        headers: { "x-current-user-email": currentUserEmail },
        body,
      });

      const payload = (await response.json()) as CreateDispenserResponse;
      if (!response.ok || payload.error || typeof payload.id !== "number") {
        throw new Error(payload.error || "No se confirmó la creación del dosificador. Intenta nuevamente.");
      }

      router.push("/clientes/dispensadores");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el dosificador.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Nuevo Dosificador"
        description="Registra un dosificador con los mismos campos del admin de Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="identifier" onChange={(event) => setIdentifier(event.target.value)} placeholder="Ej. DISP-001" required type="text" value={identifier} />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="model_id">
                Modelo
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="model_id" required value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
                  <option value="">Seleccione un modelo</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="area" value={selectedAreaId} onChange={(event) => setSelectedAreaId(event.target.value)}>
                  <option value="">Sin área asignada</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name} · {area.branch.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="installed_at">
                Fecha de instalación
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="installed_at" type="date" value={installedAt} onChange={(event) => setInstalledAt(event.target.value)} />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="photo">
                Foto del dosificador
                <input accept="image/*" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-professional-green file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-yellow-700 focus:ring-2 focus:ring-primary outline-none" id="photo" name="photo" type="file" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
              </label>
              {error ? <p className="text-sm text-red-500 md:col-span-2">{error}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" href="/clientes/dispensadores">
                Cancelar
              </Link>
              <button className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2" disabled={isSaving || isLoading} type="submit">
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
