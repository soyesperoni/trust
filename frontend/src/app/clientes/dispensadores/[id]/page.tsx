"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

type AreaApi = {
  id: number;
  name: string;
  branch: {
    id: number;
    name: string;
    client: string;
  };
};

type DispenserApi = {
  id: number;
  identifier: string;
  installed_at: string | null;
  model: {
    id: number;
    name: string;
  };
  area: {
    id: number;
  } | null;
};

export default function EditarDosificadorPage() {
  const params = useParams<{ id: string }>();
  const dispenserId = Number(params.id);

  const [areas, setAreas] = useState<AreaApi[]>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [data, setData] = useState<DispenserApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [areasResponse, dispensersResponse] = await Promise.all([
          fetch("/api/areas", { cache: "no-store" }),
          fetch("/api/dispensers", { cache: "no-store" }),
        ]);

        if (!areasResponse.ok || !dispensersResponse.ok) return;

        const [areasPayload, dispensersPayload] = await Promise.all([
          areasResponse.json(),
          dispensersResponse.json(),
        ]);

        if (!isMounted) return;

        const areaList = (areasPayload.results ?? []) as AreaApi[];
        const dispensers = (dispensersPayload.results ?? []) as DispenserApi[];

        const uniqueModels = Array.from(
          new Map(dispensers.map((item) => [item.model.id, item.model])).values(),
        );

        setAreas(areaList);
        setModels(uniqueModels);
        setData(dispensers.find((item) => item.id === dispenserId) ?? null);
      } catch {
        // no-op visual fallback
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [dispenserId]);

  return (
    <>
      <DashboardHeader
        title="Editar Dosificador"
        description="Campos alineados con Django Admin (modelo, identificador, área, fecha de instalación y foto)."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del dosificador
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Editando el dosificador #{params.id}.
            </p>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="model">
                Modelo
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  defaultValue={data?.model.id ? String(data.model.id) : ""}
                  id="model"
                  required
                >
                  <option disabled value="">
                    Seleccionar modelo...
                  </option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  defaultValue={data?.identifier ?? ""}
                  id="identifier"
                  required
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área (opcional)
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  defaultValue={data?.area?.id ? String(data.area.id) : ""}
                  id="area"
                >
                  <option value="">Sin área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.branch.client} · {area.branch.name} · {area.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="installedAt">
                Fecha de instalación (opcional)
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  defaultValue={data?.installed_at ?? ""}
                  id="installedAt"
                  type="date"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="photo">
                Foto (opcional)
                <input
                  accept="image/*"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200"
                  id="photo"
                  type="file"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/clientes/dispensadores"
              >
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-green-700 flex items-center gap-2"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
