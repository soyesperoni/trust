export default function NuevoClientePage() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-800 dark:text-slate-200">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-white dark:bg-[#161e27] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0">
          <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-black dark:bg-zinc-800 p-1.5 rounded-md flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary text-[24px] font-variation-fill">
                shield
              </span>
            </div>
            <h1 className="font-logo text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none lowercase">
              trust
            </h1>
          </div>
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
            <a className="sidebar-link" href="/dashboard">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </a>
            <a className="sidebar-link" href="/clientes">
              <span className="material-symbols-outlined">group</span>
              Usuarios
            </a>
            <a className="sidebar-link active" href="/clientes/data">
              <span className="material-symbols-outlined">apartment</span>
              Clientes
            </a>
            <a className="sidebar-link" href="/clientes/sucursales">
              <span className="material-symbols-outlined">storefront</span>
              Sucursales
            </a>
            <a className="sidebar-link" href="/clientes/areas">
              <span className="material-symbols-outlined">map</span>
              Áreas
            </a>
            <a className="sidebar-link" href="/clientes/dispensadores">
              <span className="material-symbols-outlined">water_drop</span>
              Dosificadores
            </a>
            <a className="sidebar-link" href="/clientes/productos">
              <span className="material-symbols-outlined">inventory_2</span>
              Productos
            </a>
            <a className="sidebar-link" href="/clientes/visitas">
              <span className="material-symbols-outlined">history</span>
              Historial de Visitas
            </a>
            <a className="sidebar-link" href="/clientes/incidencias">
              <span className="material-symbols-outlined">report_problem</span>
              Incidencias
            </a>
          </nav>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img
                alt="Admin"
                className="w-10 h-10 rounded-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEahRnyQv02GBHzX-gLrPgyOL0URmQOgHSe_azclMK3UtDyLVqoIsR_xlLa3cg0STfViWFzqU_drEoeTRH-ZcKEXQZmoV-RKc-wm_um98nGOvRAIImVpPpHEQ-po3TOR5j8edOjKDaxDXZ_6Nb9tcmZduDHiHj8fFw7KSL_iONWZfitw23XdkkGtW1dKq-EubBA88kX6oFbT0OabwdIqBlHCs4jO4SQsf3Vlckf0l1UESnFcEXidpY1AcVqZV7puBOxayylnDD62kI"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Admin Global
                </span>
                <span className="text-xs text-slate-500">admin@trust.com</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
            <div className="flex items-center gap-2">
              <div className="bg-black dark:bg-zinc-800 p-1 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px] font-variation-fill">
                  shield
                </span>
              </div>
              <span className="font-logo text-xl font-bold text-slate-900 dark:text-white lowercase">
                trust
              </span>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </header>
          <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <a className="text-slate-400 hover:text-slate-600 transition-colors" href="/clientes/data">
                <span className="material-symbols-outlined">arrow_back</span>
              </a>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Gestión de Clientes
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
                    <a
                      className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      href="/clientes/data"
                    >
                      Cancelar
                    </a>
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
          </div>
        </main>
      </div>
    </div>
  );
}
