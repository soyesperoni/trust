export const metadata = {
  title: "Trust - Nuevo Usuario",
};

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
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </a>
            <a className="sidebar-link active" href="#">
              <span className="material-symbols-outlined">group</span>
              Usuarios
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">apartment</span>
              Clientes
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">storefront</span>
              Sucursales
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">map</span>
              Áreas
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">water_drop</span>
              Dosificadores
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">inventory_2</span>
              Productos
            </a>
            <a className="sidebar-link" href="#">
              <span className="material-symbols-outlined">history</span>
              Historial de Visitas
            </a>
            <a className="sidebar-link" href="#">
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
            <div className="flex items-center gap-3">
              <button className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Nuevo Usuario
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Solo el Administrador General puede crear o editar usuarios.
                </p>
              </div>
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
              <form className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">
                        badge
                      </span>
                    </span>
                    Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="fullname"
                      >
                        Nombre Completo
                      </label>
                      <input
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                        id="fullname"
                        placeholder="Ej. Juan Pérez"
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="email"
                      >
                        Correo Electrónico
                      </label>
                      <input
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                        id="email"
                        placeholder="usuario@trust.com"
                        type="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="password"
                      >
                        Contraseña
                      </label>
                      <input
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                        id="password"
                        placeholder="••••••••"
                        type="password"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="role"
                      >
                        Rol
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white pr-10 cursor-pointer"
                          defaultValue=""
                          id="role"
                        >
                          <option disabled value="">
                            Seleccionar rol...
                          </option>
                          <option value="admin_global">Admin Global</option>
                          <option value="admin_cuentas">Admin de Cuentas</option>
                          <option value="admin_sucursal">Admin de Sucursal</option>
                          <option value="inspector">Inspector</option>
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[20px]">
                          expand_more
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        El rol determina los permisos de acceso dentro de la
                        plataforma.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/20">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="bg-green-100 dark:bg-green-900/30 text-professional-green dark:text-green-400 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">
                        security
                      </span>
                    </span>
                    Asignación de Permisos
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 ml-10">
                    Configure el alcance jerárquico para este usuario.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ml-0 md:ml-10 p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#161e27] shadow-sm">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Cliente
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">
                            search
                          </span>
                        </div>
                        <input
                          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Buscar cliente..."
                          type="text"
                        />
                      </div>
                      <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-md">
                        <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            className="text-primary focus:ring-primary border-slate-300 rounded-full"
                            name="client_perm"
                            type="radio"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Metro
                          </span>
                        </label>
                        <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer bg-slate-50 dark:bg-slate-800/50">
                          <input
                            className="text-primary focus:ring-primary border-slate-300 rounded-full"
                            defaultChecked
                            name="client_perm"
                            type="radio"
                          />
                          <span className="text-sm text-slate-900 font-medium dark:text-white">
                            Primax
                          </span>
                        </label>
                        <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            className="text-primary focus:ring-primary border-slate-300 rounded-full"
                            name="client_perm"
                            type="radio"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Repsol
                          </span>
                        </label>
                        <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                          <input
                            className="text-primary focus:ring-primary border-slate-300 rounded-full"
                            name="client_perm"
                            type="radio"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Shell
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sucursal
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                          defaultValue="Estación Javier Prado"
                        >
                          <option>Todas las sucursales</option>
                          <option>Estación Javier Prado</option>
                          <option>Estación La Marina</option>
                          <option>Estación Benavides</option>
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px]">
                          expand_more
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-md border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">
                            info
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Seleccionando "Estación Javier Prado". El usuario
                            tendrá acceso limitado a esta ubicación.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 opacity-100 transition-opacity">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Área (Opcional)
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                          defaultValue="Todas las áreas"
                        >
                          <option>Todas las áreas</option>
                          <option>Zona de Combustible</option>
                          <option>Tienda de Conveniencia</option>
                          <option>Baños</option>
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px]">
                          expand_more
                        </span>
                      </div>
                      <div className="mt-2">
                        <label className="inline-flex items-center">
                          <input
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                            type="checkbox"
                          />
                          <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                            Acceso solo lectura
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 md:px-8 py-5 bg-slate-50 dark:bg-[#131b23] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-professional-green hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    Guardar Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
