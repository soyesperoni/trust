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
  model: {
    id: number;
    name: string;
  };
  area: {
    id: number;
    name: string;
    branch: string;
  } | null;
};

export default function EditarDosificadorPage() {
  const params = useParams<{ id: string }>();
  const dispenserId = Number(params.id);

  const [identifier, setIdentifier] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [clientName, setClientName] = useState("");
  const [areaName, setAreaName] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadFormData = async () => {
      try {
        const [areasResponse, dispensersResponse] = await Promise.all([
          fetch("/api/areas/", { cache: "no-store" }),
          fetch("/api/dispensers/", { cache: "no-store" }),
        ]);

        if (!areasResponse.ok || !dispensersResponse.ok) return;

        const [areasData, dispensersData] = await Promise.all([
          areasResponse.json(),
          dispensersResponse.json(),
        ]);

        if (!isMounted) return;

        const areaList = (areasData.results ?? []) as AreaApi[];
        const dispensers = (dispensersData.results ?? []) as DispenserApi[];
        const currentDispenser = dispensers.find((item) => item.id === dispenserId);

        if (!currentDispenser) return;

        setIdentifier(currentDispenser.identifier);
        setSelectedModelName(currentDispenser.model.name);
        setAreaName(currentDispenser.area?.name ?? "");

        if (currentDispenser.area?.id) {
          const linkedArea = areaList.find((item) => item.id === currentDispenser.area?.id);
          setClientName(linkedArea?.branch.client ?? "");
          return;
        }

        setClientName("");
      } catch {
        // UI-only fallback sin bloquear render
      }
    };

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, [dispenserId]);

  const displayIdentifier = identifier || `DISP-${params.id}`;

  return (
    <>
      <DashboardHeader
        title="Editar Dosificador"
        description="Actualiza la información del dosificador con la misma UI de edición de cliente."
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
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  value={displayIdentifier}
                  id="identifier"
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="model_id">
                Modelo
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 outline-none"
                  id="model_id"
                  name="model_id"
                  readOnly
                  value={selectedModelName || "Modelo no disponible"}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  El modelo no se puede cambiar después de crear el dosificador.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="client">
                Cliente
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  value={clientName}
                  id="client"
                  onChange={(event) => setClientName(event.target.value)}
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  value={areaName}
                  id="area"
                  onChange={(event) => setAreaName(event.target.value)}
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="notes">
                Notas
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  defaultValue="Observaciones del equipo."
                  id="notes"
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
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2"
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
