import Link from "next/link";

import BrandLogo from "../../components/BrandLogo";
import PageTransition from "../../components/PageTransition";

const incidents = [
  {
    id: "INC-2024-001",
    client: "Supermercados Metro",
    initials: "SM",
    initialsClass:
      "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
    branch: "Sucursal Norte #45",
    dispenser: "EcoMix 500",
    priority: {
      label: "Alta",
      className:
        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50",
    },
    status: {
      label: "Abierta",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      pulse: true,
    },
    reportedAt: "Hace 2 horas",
    action: "schedule",
  },
  {
    id: "INC-2024-002",
    client: "Gasolineras Primax",
    initials: "GP",
    initialsClass:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
    branch: "Estación Central",
    dispenser: "ProClean 200",
    priority: {
      label: "Media",
      className:
        "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/50",
    },
    status: {
      label: "En Proceso",
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      pulse: false,
    },
    reportedAt: "Ayer, 14:30",
    action: "view",
  },
  {
    id: "INC-2024-003",
    client: "Hotel Fiesta",
    initials: "HF",
    initialsClass:
      "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300",
    branch: "Área Cocina",
    dispenser: "HydroDose X1",
    priority: {
      label: "Baja",
      className:
        "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-100 dark:border-green-900/50",
    },
    status: {
      label: "Cerrada",
      className:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      pulse: false,
    },
    reportedAt: "23 Oct 2023",
    action: "view",
  },
  {
    id: "INC-2024-004",
    client: "Centro Comercial Plaza",
    initials: "CC",
    initialsClass:
      "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300",
    branch: "Baños Piso 2",
    dispenser: "SoapDisp M3",
    priority: {
      label: "Alta",
      className:
        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50",
    },
    status: {
      label: "Abierta",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      pulse: true,
    },
    reportedAt: "Hace 5 horas",
    action: "schedule",
  },
];

export default function IncidenciasPage() {
  return (
    <>
      <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
        <BrandLogo size="lg" />
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>
      <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          Incidencias
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
              search
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary placeholder-slate-400"
              placeholder="Buscar incidencia..."
              type="text"
            />
          </div>
          <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-logo">
                Listado de Incidencias
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Gestión y seguimiento de reportes técnicos.
              </p>
            </div>
            <Link
              className="bg-primary text-slate-900 hover:bg-yellow-300 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              href="/clientes/incidencias/nueva"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nueva Incidencia
            </Link>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Incidencia ID</th>
                  <th className="px-6 py-4">Cliente / Sucursal</th>
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Prioridad</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha Reporte</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        #{incident.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${incident.initialsClass}`}
                        >
                          {incident.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {incident.client}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              storefront
                            </span>
                            {incident.branch}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">
                          water_drop
                        </span>
                        <span>{incident.dispenser}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${incident.priority.className}`}
                      >
                        {incident.priority.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${incident.status.className}`}
                      >
                        {incident.status.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        )}
                        {incident.status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {incident.reportedAt}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {incident.action === "schedule" ? (
                          <Link
                            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
                            href="/clientes/incidencias/agendar"
                          >
                            Agendar Visita
                          </Link>
                        ) : (
                          <button className="text-slate-400 hover:text-professional-green transition-colors p-1">
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando 4 de 128 incidencias
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
                Anterior
              </button>
              <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
