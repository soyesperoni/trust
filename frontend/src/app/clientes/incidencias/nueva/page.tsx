"use client";

import { useMemo, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

const inputClassName =
  "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
const labelClassName =
  "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

export default function NuevaIncidenciaPage() {
  const [mobileStep, setMobileStep] = useState(1);
  const progressValue = useMemo(() => {
    if (mobileStep === 1) return 33;
    if (mobileStep === 2) return 66;
    return 100;
  }, [mobileStep]);

  return (
    <>
      <DashboardHeader
        title="Nueva Incidencia"
        description="Registra un nuevo reporte técnico."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <section className="mx-auto w-full max-w-lg px-2 py-2 md:hidden">
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso {mobileStep} de 3</span>
              <span className="text-xs font-medium text-slate-500">{progressValue}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progressValue}%` }}></div>
            </div>
          </div>

          {mobileStep === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900">Seleccionar ubicación</h1>
                <p className="text-base text-slate-500">Identifica dónde ocurrió el incidente para asignarlo correctamente.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Cliente</label>
                <div className="relative">
                  <select className="block w-full appearance-none rounded-xl border border-slate-300 bg-white py-3.5 pl-4 pr-10 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-primary">
                    <option>Seleccionar cliente</option>
                    <option>Cliente Corporativo A</option>
                    <option>Retail Group B</option>
                    <option>Logística C</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-icons">expand_more</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Sucursal</label>
                <div className="relative">
                  <select className="block w-full appearance-none rounded-xl border border-slate-300 bg-white py-3.5 pl-4 pr-10 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-primary">
                    <option>Seleccionar sucursal</option>
                    <option>Sucursal Norte</option>
                    <option>Sucursal Centro</option>
                    <option>Bodega Principal</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-icons">expand_more</span></div>
                </div>
              </div>
            </div>
          )}

          {mobileStep === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900">Detalles del reporte</h1>
                <p className="text-base text-slate-500">Proporciona información específica sobre lo sucedido.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Área</label>
                <div className="relative">
                  <select className="block w-full appearance-none rounded-xl border border-slate-300 bg-white py-3.5 pl-4 pr-10 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-primary">
                    <option>Seleccionar área</option><option>Recepción</option><option>Pasillos</option><option>Estacionamiento</option><option>Baños</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-icons">expand_more</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Hora del reporte</label>
                <div className="relative">
                  <input className="block w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-4 pr-10 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-primary" type="time" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-icons">schedule</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Descripción</label>
                <textarea className="block min-h-[140px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-primary" placeholder="Escribe los detalles aquí..."></textarea>
              </div>
            </div>
          )}

          {mobileStep === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900">Urgencia y Evidencias</h1>
                <p className="text-base text-slate-500">Indica la prioridad y adjunta fotos como respaldo.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Urgencia</label>
                <div className="relative">
                  <select className="block w-full appearance-none rounded-xl border border-slate-300 bg-white py-3.5 pl-4 pr-10 text-base text-slate-900 shadow-sm focus:border-primary focus:ring-primary">
                    <option>Seleccionar urgencia</option><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-icons">expand_more</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Evidencias</label>
                <div className="group mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 pb-8 pt-8 transition-all hover:bg-slate-50 active:border-primary">
                  <div className="mb-3 rounded-full bg-slate-100 p-3 transition-transform duration-200 group-hover:scale-110"><span className="material-icons text-3xl text-slate-500">add_a_photo</span></div>
                  <span className="mb-1 text-base font-semibold text-primary">Elegir archivos</span>
                  <p className="text-center text-xs text-slate-500">Toma una foto o selecciona de la galería<br />(JPG, PNG máx. 10MB)</p>
                  <input className="sr-only" type="file" />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4 pb-4">
            <button className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-bold text-black shadow-md transition-transform active:scale-[0.98]" onClick={() => setMobileStep((prev) => (prev < 3 ? prev + 1 : prev))} type="button">
              {mobileStep < 3 ? "Siguiente" : "Finalizar y Guardar"}
              <span className="material-icons ml-2 text-sm">{mobileStep < 3 ? "arrow_forward" : "check"}</span>
            </button>
            <button className="block w-full py-2 text-center text-sm font-medium text-slate-500" onClick={() => setMobileStep((prev) => (prev > 1 ? prev - 1 : prev))} type="button">
              {mobileStep === 1 ? "Cancelar" : "Atrás"}
            </button>
          </div>
        </section>

        <div className="hidden md:block max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Detalles de la Incidencia
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Complete el formulario para reportar un nuevo problema técnico o
                  de mantenimiento.
                </p>
              </div>
              <form className="space-y-6">
                <div>
                  <label className={labelClassName} htmlFor="titulo">
                    Título de Incidencia
                  </label>
                  <input
                    className={inputClassName}
                    id="titulo"
                    placeholder="Ej: Fuga en dosificador principal"
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClassName} htmlFor="cliente">
                      Cliente
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer`}
                        id="cliente"
                      >
                        <option value="">Seleccionar Cliente</option>
                        <option value="1">Supermercados Metro</option>
                        <option value="2">Gasolineras Primax</option>
                        <option value="3">Hotel Fiesta</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="sucursal">
                      Sucursal
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer opacity-70`}
                        disabled
                        id="sucursal"
                      >
                        <option value="">Seleccione Cliente primero</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="area">
                      Área
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer opacity-70`}
                        disabled
                        id="area"
                      >
                        <option value="">Seleccione Sucursal primero</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="dosificador">
                      Dosificador (Opcional)
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer opacity-70`}
                        disabled
                        id="dosificador"
                      >
                        <option value="">Seleccione Área primero</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>Prioridad</label>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        name="prioridad"
                        type="radio"
                        value="low"
                      />
                      <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-yellow-50 peer-checked:border-yellow-500 peer-checked:text-yellow-700 dark:peer-checked:bg-yellow-900/20 dark:peer-checked:text-yellow-400 transition-all">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                        <span className="font-medium text-sm">Baja</span>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        name="prioridad"
                        type="radio"
                        value="medium"
                      />
                      <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-yellow-50 peer-checked:border-yellow-500 peer-checked:text-yellow-700 dark:peer-checked:bg-yellow-900/20 dark:peer-checked:text-yellow-400 transition-all">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                        <span className="font-medium text-sm">Media</span>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input
                        className="peer sr-only"
                        name="prioridad"
                        type="radio"
                        value="high"
                      />
                      <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-red-50 peer-checked:border-red-500 peer-checked:text-red-700 dark:peer-checked:bg-red-900/20 dark:peer-checked:text-red-400 transition-all">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        <span className="font-medium text-sm">Alta</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className={labelClassName} htmlFor="descripcion">
                    Descripción del Problema
                  </label>
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    id="descripcion"
                    placeholder="Describa detalladamente el problema observado..."
                  ></textarea>
                </div>
                <div>
                  <label className={labelClassName}>Evidencia (Foto o Video)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <div className="space-y-1 text-center">
                      <div className="mx-auto h-12 w-12 text-slate-400 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[48px]">
                          cloud_upload
                        </span>
                      </div>
                      <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                        <label
                          className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-yellow-600 focus-within:outline-none"
                          htmlFor="file-upload"
                        >
                          <span>Subir un archivo</span>
                          <input
                            className="sr-only"
                            id="file-upload"
                            name="file-upload"
                            type="file"
                          />
                        </label>
                        <p className="pl-1">o arrastrar y soltar</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        PNG, JPG, MP4 hasta 10MB
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-lg bg-professional-green hover:bg-yellow-700 text-white font-medium shadow-sm transition-colors flex items-center gap-2"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      send
                    </span>
                    Reportar Incidencia
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
