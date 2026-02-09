import DashboardHeader from "../../components/DashboardHeader";
import DashboardSidebar from "../../components/DashboardSidebar";
import PageTransition from "../../components/PageTransition";

type Branch = {
  id: string;
  name: string;
  client: string;
  city: string;
  areas: number;
  dispensers: number;
  status: "Activa" | "Inactiva";
};

const branches: Branch[] = [
  {
    id: "SUC-0045",
    name: "Sucursal Norte #45",
    client: "Supermercados Metro",
    city: "Madrid",
    areas: 12,
    dispensers: 48,
    status: "Activa",
  },
  {
    id: "SUC-0012",
    name: "Estación Central",
    client: "Gasolineras Primax",
    city: "Barcelona",
    areas: 4,
    dispensers: 16,
    status: "Activa",
  },
  {
    id: "SUC-0089",
    name: "Área Cocina Principal",
    client: "Hotel Fiesta",
    city: "Valencia",
    areas: 8,
    dispensers: 22,
    status: "Inactiva",
  },
  {
    id: "SUC-0104",
    name: "Plaza Piso 2",
    client: "Centro Comercial Plaza",
    city: "Sevilla",
    areas: 15,
    dispensers: 64,
    status: "Activa",
  },
];

const statusStyles: Record<Branch["status"], string> = {
  Activa:
    "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  Inactiva:
    "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export default function SucursalesPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-800 dark:text-slate-200">
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar activePath="/clientes/sucursales" />
        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          <DashboardHeader title="Sucursales" searchPlaceholder="Buscar sucursal..." />
          <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[18px]">home</span>
                <span className="material-symbols-outlined text-[16px]">
                  chevron_right
                </span>
                <span>Gestión</span>
                <span className="material-symbols-outlined text-[16px]">
                  chevron_right
                </span>
                <span className="text-slate-900 dark:text-white font-medium">
                  Sucursales
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-500">
                  Mostrando{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    156
                  </span>{" "}
                  sucursales en total
                </span>
                <button className="bg-professional-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">
                    add
                  </span>
                  Nueva Sucursal
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Ciudad</th>
                      <th className="px-6 py-4 text-center">Áreas</th>
                      <th className="px-6 py-4 text-center">Dosificadores</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {branches.map((branch) => (
                      <tr
                        key={branch.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined">
                                storefront
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {branch.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                ID: {branch.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {branch.client}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {branch.city}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-xs font-semibold">
                            {branch.areas}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-xs font-semibold">
                            {branch.dispensers}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[branch.status]}`}
                          >
                            {branch.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-slate-400 hover:text-professional-green transition-colors">
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </button>
                            <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-[20px]">
                                visibility
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-500">Página 1 de 12</span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    disabled
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">
                      chevron_left
                    </span>
                  </button>
                  <button className="px-3 py-1 bg-primary text-slate-900 rounded font-bold">
                    1
                  </button>
                  <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                    2
                  </button>
                  <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                    3
                  </button>
                  <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="material-symbols-outlined text-[18px] leading-none">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
