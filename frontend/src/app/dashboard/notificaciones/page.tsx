"use client";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type NotificationItem = {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  tag: string;
  tagStyle: string;
  location?: string;
  locationStyle?: string;
  icon: string;
  iconWrapperStyle: string;
  cardStyle: string;
  actionStyle: string;
};

const notifications: NotificationItem[] = [
  {
    id: "fuga-critica",
    title: "Fuga Crítica Detectada",
    timestamp: "Hace 15 min",
    description:
      "Se ha reportado una fuga importante en el dosificador #D-892 ubicado en la Sucursal Central. Requiere atención inmediata del equipo técnico.",
    tag: "Emergencia",
    tagStyle: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    location: "Sucursal Central",
    locationStyle:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: "warning",
    iconWrapperStyle:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    cardStyle:
      "border-l-4 border-yellow-400 dark:border-yellow-500 hover:bg-yellow-50/10",
    actionStyle: "text-slate-900 bg-primary hover:bg-yellow-400",
  },
  {
    id: "mantenimiento-completado",
    title: "Mantenimiento Completado",
    timestamp: "Hace 2 horas",
    description:
      "El técnico Carlos Ruiz ha finalizado el mantenimiento preventivo programado en Supermercados Metro - Norte #45.",
    tag: "Mantenimiento",
    tagStyle: "bg-green-50 text-green-800 border border-green-100",
    location: "Supermercados Metro",
    locationStyle:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: "build",
    iconWrapperStyle:
      "bg-green-50 dark:bg-green-900/20 text-professional-green",
    cardStyle:
      "border border-slate-100 dark:border-slate-800 hover:border-professional-green/30",
    actionStyle:
      "text-professional-green border border-professional-green hover:bg-green-50",
  },
  {
    id: "nuevo-usuario",
    title: "Nuevo Usuario Registrado",
    timestamp: "Hace 4 horas",
    description:
      "Se ha creado una nueva cuenta de administrador local para la región Norte. Pendiente de aprobación final.",
    tag: "General",
    tagStyle: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: "info",
    iconWrapperStyle: "bg-slate-100 dark:bg-slate-800 text-slate-500",
    cardStyle: "border border-slate-100 dark:border-slate-800 hover:border-slate-300",
    actionStyle:
      "text-slate-500 border border-slate-300 hover:bg-slate-50 hover:text-slate-700",
  },
  {
    id: "nivel-bajo",
    title: "Nivel Bajo de Insumos",
    timestamp: "Ayer, 18:30",
    description:
      "Alerta de stock crítico en el área de cocina del Hotel Fiesta. Los niveles de detergente industrial están por debajo del 10%.",
    tag: "Emergencia",
    tagStyle: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    location: "Hotel Fiesta",
    locationStyle:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: "report_problem",
    iconWrapperStyle:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    cardStyle:
      "border-l-4 border-yellow-400 dark:border-yellow-500 hover:bg-yellow-50/10",
    actionStyle: "text-slate-900 bg-primary hover:bg-yellow-400",
  },
  {
    id: "inspeccion-aprobada",
    title: "Inspección Aprobada",
    timestamp: "23 Oct 2023",
    description:
      "La inspección de seguridad mensual en Gasolineras Primax ha sido aprobada con éxito. Documentación disponible.",
    tag: "Mantenimiento",
    tagStyle: "bg-green-50 text-green-800 border border-green-100",
    location: "Gasolineras Primax",
    locationStyle:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: "verified",
    iconWrapperStyle:
      "bg-green-50 dark:bg-green-900/20 text-professional-green",
    cardStyle: "border border-slate-100 dark:border-slate-800 hover:border-professional-green/30",
    actionStyle:
      "text-professional-green border border-professional-green hover:bg-green-50",
  },
];

export default function NotificationsPage() {
  return (
    <>
      <DashboardHeader
        title="Notificaciones"
        description="Revisa las últimas actualizaciones del sistema."
        searchPlaceholder="Buscar notificaciones..."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Alertas Recientes
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Revisa las últimas actualizaciones del sistema.
              </p>
            </div>
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 bg-white dark:bg-[#161e27] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]">
                done_all
              </span>
              Marcar todas como leídas
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`bg-white dark:bg-[#161e27] rounded-xl shadow-card p-5 ${item.cardStyle} flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-colors`}
              >
                <div
                  className={`shrink-0 p-3 rounded-full ${item.iconWrapperStyle}`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate pr-4">
                      {item.title}
                    </h4>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.tagStyle}`}
                    >
                      {item.tag}
                    </span>
                    {item.location ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.locationStyle}`}
                      >
                        {item.location}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 self-end sm:self-center">
                  <button
                    className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${item.actionStyle}`}
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageTransition>
    </>
  );
}
