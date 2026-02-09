"use client";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type AreaStatus = "Activo" | "Mantenimiento" | "Inactivo";

type AreaRow = {
  id: string;
  name: string;
  branch: string;
  client: string;
  dispensers: number;
  status: AreaStatus;
};

const areasData: AreaRow[] = [
  {
    id: "AR-1024",
    name: "Baños Piso 1",
    branch: "Sucursal Norte #45",
    client: "Supermercados Metro",
    dispensers: 3,
    status: "Activo",
  },
  {
    id: "AR-1028",
    name: "Cocina Principal",
    branch: "Hotel Fiesta Central",
    client: "Hotel Fiesta",
    dispensers: 5,
    status: "Activo",
  },
  {
    id: "AR-1033",
    name: "Almacén de Residuos",
    branch: "Planta Industrial Sur",
    client: "Industrias Unidas",
    dispensers: 2,
    status: "Mantenimiento",
  },
  {
    id: "AR-1045",
    name: "Baños Públicos",
    branch: "CC Plaza Real",
    client: "Grupo Real",
    dispensers: 8,
    status: "Inactivo",
  },
  {
    id: "AR-1050",
    name: "Laboratorio de Calidad",
    branch: "Fábrica Central",
    client: "PharmaCorp",
    dispensers: 4,
    status: "Activo",
  },
];

const statusStyles: Record<AreaStatus, string> = {
  Activo:
    "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-100 dark:border-green-800",
  Mantenimiento:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-800",
  Inactivo:
    "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-800",
};

const statusDot: Record<AreaStatus, string> = {
  Activo: "bg-green-500",
  Mantenimiento: "bg-amber-500",
  Inactivo: "bg-red-500",
};

export default function AreasPage() {
  return (
    <>
      <DashboardHeader
        title="Gestión de Áreas"
        description="Administra las zonas y espacios monitoreados."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-logo">
              Áreas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Administra las zonas y espacios monitoreados.
            </p>
          </div>
          <button className="bg-professional-green text-white hover:bg-green-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Área
          </button>
        </div>

        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Buscar área..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                  <option value="">Todos los Estados</option>
                  <option value="activo">Activo</option>
                  <option value="mantenimiento">Mantenimiento</option>
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
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4 text-center">Dosificadores</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {areasData.map((area) => (
                  <tr
                    key={area.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <span className="material-symbols-outlined text-[20px]">
                            map
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {area.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {area.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">
                          storefront
                        </span>
                        {area.branch}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">
                          apartment
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {area.client}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                        {area.dispensers}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[area.status]}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusDot[area.status]}`}
                        ></span>
                        {area.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            edit
                          </span>
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            delete
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
              Mostrando 5 de 342 áreas
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
      </PageTransition>
    </>
  );
}
