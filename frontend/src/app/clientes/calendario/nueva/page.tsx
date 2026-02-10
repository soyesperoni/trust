import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

export default function NuevaVisitaPage() {
  return (
    <>
      <DashboardHeader title="Agendar Nueva Visita" />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-logo">
                    Detalles de la Visita
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete el formulario para programar una nueva visita técnica.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <form className="space-y-8" method="post">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Tipo de Visita
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="relative">
                      <input
                        defaultChecked
                        className="peer hidden"
                        id="type_maintenance"
                        name="visit_type"
                        type="radio"
                        value="mantenimiento"
                      />
                      <span className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:border-primary peer-checked:bg-yellow-50 dark:peer-checked:bg-yellow-900/10 transition-all">
                        <span className="material-symbols-outlined text-3xl mb-2 text-slate-400 peer-checked:text-yellow-600 dark:peer-checked:text-yellow-400">
                          build_circle
                        </span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 peer-checked:text-slate-900 dark:peer-checked:text-white">
                          Mantenimiento
                        </span>
                      </span>
                    </label>
                    <label className="relative">
                      <input
                        className="peer hidden"
                        id="type_emergency"
                        name="visit_type"
                        type="radio"
                        value="emergencia"
                      />
                      <span className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-900/10 transition-all">
                        <span className="material-symbols-outlined text-3xl mb-2 text-slate-400 peer-checked:text-red-600 dark:peer-checked:text-red-400">
                          warning
                        </span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 peer-checked:text-slate-900 dark:peer-checked:text-white">
                          Emergencia
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="client">
                      Cliente
                    </label>
                    <select
                      className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                      defaultValue=""
                      id="client"
                      name="client"
                    >
                      <option disabled value="">
                        Seleccione un cliente
                      </option>
                      <option value="metro">Supermercados Metro</option>
                      <option value="primax">Gasolineras Primax</option>
                      <option value="hotel_fiesta">Hotel Fiesta</option>
                      <option value="plaza">Centro Comercial Plaza</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="branch">
                      Sucursal
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                        storefront
                      </span>
                      <select
                        className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                        defaultValue=""
                        id="branch"
                        name="branch"
                      >
                        <option disabled value="">
                          Seleccione sucursal
                        </option>
                        <option value="norte">Sucursal Norte #45</option>
                        <option value="sur">Sucursal Sur #12</option>
                        <option value="centro">Estación Central</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="area">
                      Área
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                        map
                      </span>
                      <select
                        className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                        defaultValue=""
                        id="area"
                        name="area"
                      >
                        <option disabled value="">
                          Seleccione área
                        </option>
                        <option value="kitchen">Cocina Principal</option>
                        <option value="bathrooms">Baños Públicos</option>
                        <option value="laundry">Lavandería</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="doser">
                      Dosificador
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                        water_drop
                      </span>
                      <select
                        className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                        defaultValue=""
                        id="doser"
                        name="doser"
                      >
                        <option disabled value="">
                          Seleccione equipo dosificador
                        </option>
                        <option value="eco_plus">EcoMix Plus - #8842</option>
                        <option value="pro_clean">ProClean 2000 - #1293</option>
                        <option value="basic">Basic Dispenser - #9921</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="inspector">
                      Inspector Asignado
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                        person
                      </span>
                      <select
                        className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                        defaultValue=""
                        id="inspector"
                        name="inspector"
                      >
                        <option disabled value="">
                          Asignar inspector
                        </option>
                        <option value="carlos">Carlos Ruiz</option>
                        <option value="ana">Ana Gómez</option>
                        <option value="luis">Luis Torres</option>
                        <option value="jorge">Jorge Martínez</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="date">
                      Fecha
                    </label>
                    <input
                      className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                      id="date"
                      name="date"
                      type="date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="time">
                      Hora
                    </label>
                    <input
                      className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow"
                      id="time"
                      name="time"
                      type="time"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="notes">
                    Notas Adicionales
                  </label>
                  <textarea
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow placeholder-slate-400"
                    id="notes"
                    name="notes"
                    placeholder="Instrucciones especiales para el inspector..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-professional-green text-white font-medium hover:bg-green-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    Confirmar Visita
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
