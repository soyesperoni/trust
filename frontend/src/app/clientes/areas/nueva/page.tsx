import Link from "next/link";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

export default function NuevaAreaPage() {
  return (
    <>
      <DashboardHeader
        title="Nueva Área"
        description="Registra una nueva área para gestionar sus dosificadores."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del área
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Define la sucursal, el responsable y la capacidad operativa del área.
            </p>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Nombre del área
              <input
                type="text"
                placeholder="Ej. Producción"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Sucursal
              <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none">
                <option>Selecciona una sucursal</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Responsable
              <input
                type="text"
                placeholder="Nombre del encargado"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Capacidad estimada
              <input
                type="number"
                min={0}
                placeholder="0"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              Descripción
              <textarea
                rows={4}
                placeholder="Descripción del área"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>
          </form>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/clientes/areas"
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </Link>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700"
            >
              Guardar área
            </button>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
