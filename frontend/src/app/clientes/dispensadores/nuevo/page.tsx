"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

type DispenserApi = {
  id: number;
  model: {
    id: number;
    name: string;
  };
};

export default function NuevoDosificadorPage() {
  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedModelId, setSelectedModelId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const dispensersResponse = await fetch("/api/dispensers", { cache: "no-store" });

        if (!dispensersResponse.ok) return;

        const dispensersData = await dispensersResponse.json();

        if (!isMounted) return;

        const dispensers = (dispensersData.results ?? []) as DispenserApi[];

        const uniqueModels = Array.from(
          new Map(dispensers.map((item) => [item.model.id, item.model])).values(),
        );

        setModels(uniqueModels);
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

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="identifier"
                  placeholder="Ej. DISP-001"
                  required
                  type="text"
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
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="client"
                  placeholder="Cliente asociado"
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="area"
                  placeholder="Área de instalación"
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="notes">
                Notas
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  id="notes"
                  placeholder="Observaciones técnicas del equipo..."
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
                Guardar Dosificador
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
