import Link from "next/link";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

export default function NuevoClientePage() {
  return (
    <>
      <DashboardHeader
        title="Nuevo Cliente"
        description="Complete la información para registrar una nueva empresa cliente en la plataforma."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-logo">
                    Nuevo Cliente
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete la información para registrar una nueva empresa
                    cliente en la plataforma.
                  </p>
                </div>
                <form className="p-6 md:p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                      <label className="form-label">Logo del Cliente</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-lg hover:border-primary transition-colors cursor-pointer bg-slate-50 dark:bg-slate-800/50 group">
                        <div className="space-y-1 text-center">
                          <div className="mx-auto h-12 w-12 text-slate-400 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[48px]">
                              cloud_upload
                            </span>
                          </div>
                          <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                            <label
                              className="relative cursor-pointer rounded-md font-medium text-professional-green hover:text-green-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                              htmlFor="file-upload"
                            >
                              <span>Subir archivo</span>
                              <input
                                className="sr-only"
                                id="file-upload"
                                name="file-upload"
                                type="file"
                              />
                            </label>
                          </div>
                          <p className="text-xs text-slate-500">
                            PNG, JPG hasta 5MB
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                      <div>
                        <label className="form-label" htmlFor="client-name">
                          Nombre del Cliente
                        </label>
                        <input
                          className="form-input"
                          id="client-name"
                          placeholder="Ej. Corporación Apex S.A."
                          type="text"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="form-label" htmlFor="nit">
                            NIT / Identificación Fiscal
                          </label>
                          <input
                            className="form-input"
                            id="nit"
                            placeholder="Ej. 12345678-9"
                            type="text"
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="phone">
                            Teléfono
                          </label>
                          <input
                            className="form-input"
                            id="phone"
                            placeholder="+502 1234 5678"
                            type="tel"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label" htmlFor="email">
                          Correo de Contacto
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">
                              mail
                            </span>
                          </div>
                          <input
                            className="form-input pl-10"
                            id="email"
                            placeholder="contacto@empresa.com"
                            type="email"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="form-label" htmlFor="address">
                        Dirección Fiscal
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-slate-400 text-[20px]">
                            location_on
                          </span>
                        </div>
                        <input
                          className="form-input pl-10"
                          id="address"
                          placeholder="Av. Reforma 10-00, Zona 9, Ciudad de Guatemala"
                          type="text"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label" htmlFor="admin-assign">
                        Administrador de Cuenta Asignado
                      </label>
                      <div className="relative">
                        <select
                          className="form-input appearance-none"
                          id="admin-assign"
                          defaultValue=""
                        >
                          <option disabled value="">
                            Seleccionar un administrador...
                          </option>
                          <option value="1">Carlos Ruiz</option>
                          <option value="2">Ana Gómez</option>
                          <option value="3">Luis Torres</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                          <span className="material-symbols-outlined">
                            expand_more
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Esta persona será el punto de contacto principal para
                        este cliente dentro de Trust.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      href="/clientes/data"
                    >
                      Cancelar
                    </Link>
                    <button
                      className="px-5 py-2.5 rounded-lg bg-professional-green text-white font-medium hover:bg-green-700 shadow-sm transition-colors flex items-center gap-2"
                      type="submit"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        save
                      </span>
                      Guardar Cliente
                    </button>
                  </div>
                </form>
              </div>
            </div>
      </PageTransition>
    </>
  );
}
