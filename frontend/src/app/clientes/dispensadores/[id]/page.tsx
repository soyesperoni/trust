"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

export default function EditarDosificadorPage() {
  const params = useParams<{ id: string }>();

  return (
    <>
      <DashboardHeader
        title="Editar Dosificador"
        description="Edita el dosificador con los mismos campos del admin de Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" defaultValue={`DISP-${params.id}`} id="identifier" required type="text" />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="model_id">
                Modelo
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" defaultValue="Modelo base" id="model_id" type="text" />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" defaultValue="Área principal" id="area" type="text" />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="installed_at">
                Fecha de instalación
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" defaultValue="" id="installed_at" type="date" />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="photo">
                Foto del dosificador
                <input accept="image/*" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-professional-green file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-yellow-700 focus:ring-2 focus:ring-primary outline-none" id="photo" name="photo" type="file" />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" href="/clientes/dispensadores">
                Cancelar
              </Link>
              <button className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2" type="submit">
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
