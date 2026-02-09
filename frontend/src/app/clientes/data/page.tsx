import DashboardHeader from "../../components/DashboardHeader";
import SidebarUserCard from "../../components/SidebarUserCard";

const clients = [
  {
    id: "CLI-001",
    name: "Supermercados Metro",
    initials: "SM",
    branches: 12,
    dispensers: 48,
    contactName: "Carlos Ruiz",
    contactEmail: "cruiz@metro.com",
    status: "Activo",
    badgeClasses:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-100 dark:border-green-800",
    indicatorClasses: "bg-green-600",
    avatarClasses:
      "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30",
  },
  {
    id: "CLI-002",
    name: "Gasolineras Primax",
    initials: "GP",
    branches: 24,
    dispensers: 96,
    contactName: "Ana Gómez",
    contactEmail: "ana.gomez@primax.pe",
    status: "Activo",
    badgeClasses:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-100 dark:border-green-800",
    indicatorClasses: "bg-green-600",
    avatarClasses:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-100 dark:border-orange-900/30",
  },
  {
    id: "CLI-003",
    name: "Hotel Fiesta",
    initials: "HF",
    branches: 1,
    dispensers: 15,
    contactName: "Luis Torres",
    contactEmail: "ltorres@fiesta.com",
    status: "Inactivo",
    badgeClasses:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    indicatorClasses: "bg-slate-500",
    avatarClasses:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-900/30",
  },
  {
    id: "CLI-004",
    name: "Centro Comercial Plaza",
    initials: "CC",
    branches: 1,
    dispensers: 32,
    contactName: "Jorge Martínez",
    contactEmail: "jmartinez@ccplaza.com",
    status: "Activo",
    badgeClasses:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-100 dark:border-green-800",
    indicatorClasses: "bg-green-600",
    avatarClasses:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-100 dark:border-purple-900/30",
  },
  {
    id: "CLI-005",
    name: "Restaurantes Azul",
    initials: "RA",
    branches: 5,
    dispensers: 18,
    contactName: "Maria Fernandes",
    contactEmail: "m.fernandes@azul.com",
    status: "Activo",
    badgeClasses:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-100 dark:border-green-800",
    indicatorClasses: "bg-green-600",
    avatarClasses:
      "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 border-cyan-100 dark:border-cyan-900/30",
  },
];

export default function ClientesListadoPage() {
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
            <SidebarUserCard />
          </div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          <DashboardHeader
            title="Gestión de Clientes"
            description="Administra la lista de clientes corporativos y su estado."
          />
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-logo">
                  Clientes
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Administra la lista de clientes corporativos y su estado.
                </p>
              </div>
              <a
                className="bg-professional-green text-white hover:bg-green-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                href="/clientes/nuevo"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nuevo Cliente
              </a>
            </div>
            <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                    search
                  </span>
                  <input
                    className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Buscar cliente..."
                    type="text"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                      <option value="">Todos los Estados</option>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <span className="material-symbols-outlined text-[20px]">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <button className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      filter_list
                    </span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 font-logo">
                      <th className="px-6 py-4 w-1/3">Cliente</th>
                      <th className="px-6 py-4 text-center">Sucursales</th>
                      <th className="px-6 py-4 text-center">Dosificadores</th>
                      <th className="px-6 py-4">Contacto Principal</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${client.avatarClasses}`}
                            >
                              {client.initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-base">
                                {client.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: {client.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {client.branches}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {client.dispensers}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-medium">
                              {client.contactName}
                            </span>
                            <span className="text-xs text-slate-500">
                              {client.contactEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${client.badgeClasses}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${client.indicatorClasses}`}
                            ></span>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 text-slate-400 hover:text-professional-green hover:bg-green-50 rounded transition-colors"
                              title="Ver detalles"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                visibility
                              </span>
                            </button>
                            <button
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Mostrando 5 de 48 clientes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    disabled
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      chevron_left
                    </span>
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
