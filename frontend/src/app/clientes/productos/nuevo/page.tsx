"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

type DispenserApi = {
  id: number;
  identifier: string;
  model: {
    name: string;
  };
};

export default function NuevoProductoPage() {
  const [dispensers, setDispensers] = useState<DispenserApi[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDispensers = async () => {
      try {
        const response = await fetch("/api/dispensers", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted) return;
        setDispensers((payload.results ?? []) as DispenserApi[]);
      } catch {
        // fallback visual
      }
    };

    loadDispensers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <DashboardHeader
        title="Nuevo Producto"
        description="Registra un nuevo producto con la misma UI de creación y edición de cliente."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del producto
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información principal para registrar un nuevo producto.
            </p>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="name">
                Nombre del producto
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="name"
                  placeholder="Ej. Detergente Industrial"
                  required
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="sku">
                SKU
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="sku"
                  placeholder="Ej. DET-IND-001"
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="dispenser">
                Dosificador asignado
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="dispenser"
                  placeholder="Ej. DISP-001"
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="description">
                Descripción
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  id="description"
                  placeholder="Descripción técnica o comercial del producto..."
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/clientes/productos"
              >
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-green-700 flex items-center gap-2"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
