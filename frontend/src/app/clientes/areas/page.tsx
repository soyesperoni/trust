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
        searchPlaceholder="Buscar áreas..."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Áreas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra las zonas y espacios monitoreados.
          </p>
        </div>
        <button className="bg-professional-green text-white hover:bg-green-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nueva Área
        </button>
      </div>

      <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {area.dispensers}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${statusStyles[area.status]}`}
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">Mostrando 5 de 342 áreas</span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-50"
              disabled
            >
              Anterior
            </button>
            <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md">
              Siguiente
            </button>
          </div>
        </div>
      </div>
      </PageTransition>
    </>
  );
}
