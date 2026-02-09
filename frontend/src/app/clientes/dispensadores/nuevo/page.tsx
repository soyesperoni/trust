import Link from "next/link";

import BrandLogo from "../../../components/BrandLogo";
import PageTransition from "../../../components/PageTransition";

export default function NuevoDosificadorPage() {
  return (
    <>
      <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
        <BrandLogo size="lg" />
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>
      <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Link
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            href="/clientes/dispensadores"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Nuevo Dosificador
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dosificadores</span>
          <span className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-200">
            Nuevo
          </span>
        </div>
      </header>
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-logo">
                  Información del Equipo
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ingrese los detalles técnicos y ubicación del dosificador.
                </p>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <form className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-4 space-y-4">
                  <label className="form-label">Foto del Dosificador</label>
                  <div className="relative w-full aspect-square bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-4 hover:border-primary transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-3xl">
                        add_a_photo
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
                      Subir imagen
                    </p>
                    <p className="text-xs text-slate-400 text-center mt-1">
                      PNG, JPG hasta 5MB
                    </p>
                    <input
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      type="file"
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Asegúrese de que el equipo sea claramente visible y esté bien
                    iluminado.
                  </p>
                </div>
                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="form-label" htmlFor="nombre">
                      Nombre del Dosificador
                    </label>
                    <input
                      className="form-input"
                      id="nombre"
                      placeholder="Ej: Dosificador Lavandería Principal #1"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="modelo">
                      Modelo
                    </label>
                    <div className="relative">
                      <select
                        className="form-input appearance-none"
                        defaultValue=""
                        id="modelo"
                      >
                        <option disabled value="">
                          Seleccionar modelo...
                        </option>
                        <option value="eco-pro">EcoPro 2000</option>
                        <option value="max-flow">MaxFlow v3</option>
                        <option value="smart-dose">SmartDose Mini</option>
                        <option value="industrial-x">Industrial X-Series</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <span className="material-symbols-outlined text-sm">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="cliente">
                      Cliente
                    </label>
                    <div className="relative">
                      <select
                        className="form-input appearance-none"
                        defaultValue=""
                        id="cliente"
                      >
                        <option disabled value="">
                          Seleccionar cliente...
                        </option>
                        <option value="hotel-fiesta">Hotel Fiesta</option>
                        <option value="super-metro">Supermercados Metro</option>
                        <option value="gas-primax">Gasolineras Primax</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <span className="material-symbols-outlined text-sm">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="sucursal">
                      Sucursal
                    </label>
                    <div className="relative">
                      <select
                        className="form-input appearance-none disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400"
                        defaultValue=""
                        disabled
                        id="sucursal"
                      >
                        <option disabled value="">
                          Seleccione cliente primero...
                        </option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <span className="material-symbols-outlined text-sm">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="area">
                      Área
                    </label>
                    <div className="relative">
                      <select
                        className="form-input appearance-none disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400"
                        defaultValue=""
                        disabled
                        id="area"
                      >
                        <option disabled value="">
                          Seleccione sucursal primero...
                        </option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <span className="material-symbols-outlined text-sm">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label" htmlFor="notas">
                      Notas Técnicas
                    </label>
                    <textarea
                      className="form-input resize-none"
                      id="notas"
                      placeholder="Especificaciones adicionales, condiciones de instalación, etc."
                      rows={3}
                    ></textarea>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-logo">
                  Productos Asignados
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Químicos que utilizará este equipo.
                </p>
              </div>
              <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Asignar Producto
              </button>
            </div>
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl">
                  science
                </span>
              </div>
              <h4 className="text-slate-900 dark:text-white font-medium mb-1">
                No hay productos asignados
              </h4>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Agregue los productos químicos que serán dosificados por este
                equipo para llevar un control de consumo.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 py-4">
            <Link
              className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              href="/clientes/dispensadores"
            >
              Cancelar
            </Link>
            <button className="px-6 py-2.5 rounded-lg bg-professional-green text-white font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                save
              </span>
              Guardar Dosificador
            </button>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
