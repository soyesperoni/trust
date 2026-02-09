import Link from "next/link";

import BrandLogo from "../../../components/BrandLogo";
import PageTransition from "../../../components/PageTransition";

export default function AgendarVisitaPage() {
  return (
    <>
      <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
        <BrandLogo size="lg" />
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>
      <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-0.5">
            <Link
              className="hover:text-professional-green transition-colors"
              href="/clientes/incidencias"
            >
              Incidencias
            </Link>
            <span className="material-symbols-outlined text-[14px]">
              chevron_right
            </span>
            <span>Detalle</span>
            <span className="material-symbols-outlined text-[14px]">
              chevron_right
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              Agendar Visita
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-logo">
            Agendar Visita para Incidencia #1234
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-professional-green">
                    event_available
                  </span>
                  Detalles de la Visita
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Configure los detalles para la visita técnica.
                </p>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Tipo de Visita
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer relative">
                      <input
                        className="peer sr-only"
                        name="visit_type"
                        type="radio"
                        value="mantenimiento"
                      />
                      <div className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:border-primary peer-checked:bg-yellow-50/50 dark:peer-checked:bg-yellow-900/10 transition-all flex flex-col items-center gap-2 text-center group">
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary peer-checked:text-primary text-3xl">
                          build
                        </span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 peer-checked:text-slate-900 dark:peer-checked:text-white">
                          Mantenimiento
                        </span>
                      </div>
                    </label>
                    <label className="cursor-pointer relative">
                      <input
                        className="peer sr-only"
                        name="visit_type"
                        type="radio"
                        value="emergencia"
                      />
                      <div className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:border-red-500 peer-checked:bg-red-50/50 dark:peer-checked:bg-red-900/10 transition-all flex flex-col items-center gap-2 text-center group">
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-red-500 peer-checked:text-red-500 text-3xl">
                          emergency
                        </span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 peer-checked:text-slate-900 dark:peer-checked:text-white">
                          Emergencia
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                      htmlFor="inspector"
                    >
                      Asignar Inspector
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                        id="inspector"
                      >
                        <option value="">Seleccione un inspector...</option>
                        <option className="text-green-600" value="1">
                          Carlos Ruiz (Disponible)
                        </option>
                        <option className="text-green-600" value="2">
                          Ana Gómez (Disponible)
                        </option>
                        <option className="text-slate-400" disabled value="3">
                          Luis Torres (No Disponible)
                        </option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none material-symbols-outlined text-slate-400">
                        arrow_drop_down
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>2
                      inspectores disponibles en esta zona
                    </p>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                      htmlFor="fecha"
                    >
                      Fecha de Visita
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        id="fecha"
                        type="date"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                      htmlFor="hora"
                    >
                      Hora Estimada
                    </label>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        id="hora"
                        type="time"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                      htmlFor="duracion"
                    >
                      Duración Estimada
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                        defaultValue="60"
                        id="duracion"
                      >
                        <option value="30">30 min</option>
                        <option value="60">1 hora</option>
                        <option value="90">1 hora 30 min</option>
                        <option value="120">2 horas</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none material-symbols-outlined text-slate-400">
                        schedule
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                    htmlFor="instrucciones"
                  >
                    Instrucciones Especiales
                  </label>
                  <textarea
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-32"
                    id="instrucciones"
                    placeholder="Ingrese detalles específicos para el inspector (e.g. contactar con seguridad al llegar)..."
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 pt-4">
              <button className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                Cancelar
              </button>
              <button className="px-6 py-2.5 rounded-lg bg-professional-green hover:bg-green-800 text-white font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                Confirmar Visita
              </button>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden sticky top-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm uppercase tracking-wide text-slate-500 font-bold mb-1">
                  Resumen de Incidencia
                </h4>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-logo">
                  #1234
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-800">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Fuga Reportada
                  </span>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-500">
                      apartment
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Centro Comercial Plaza
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cliente Corporativo
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-500">
                      location_on
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Baños Piso 2 - Zona Norte
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Av. Principal 123, Ciudad
                    </p>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                  <h5 className="text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      info
                    </span>
                    Reporte Original
                  </h5>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "Se detectó una fuga de agua en el dispensador principal. El
                    suelo está mojado y requiere atención inmediata para evitar
                    accidentes."
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                      JD
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Reportado por
                      </span>
                      <span className="text-xs text-slate-500">
                        Juan Diaz (Supervisor de Planta)
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 text-right">
                    Reportado: 24 Oct 2023, 09:15 AM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
