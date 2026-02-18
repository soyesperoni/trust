"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import {
  getUnreadNotificationCount,
  markNotificationsAsRead,
} from "../../lib/notifications";

type Incident = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  description: string;
  created_at: string;
};

type Visit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string | null;
  inspector: string;
  visited_at: string;
  notes: string;
};

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
  createdAt: string;
};

const tagStyles = {
  incidencia: {
    tag: "Incidencia",
    tagStyle: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    icon: "report_problem",
    iconWrapperStyle:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    cardStyle:
      "border-l-4 border-yellow-400 dark:border-yellow-500 hover:bg-yellow-50/10",
    actionStyle: "text-slate-900 bg-primary hover:bg-yellow-400",
  },
  visita: {
    tag: "Visita",
    tagStyle: "bg-yellow-50 text-yellow-800 border border-yellow-100",
    icon: "build",
    iconWrapperStyle:
      "bg-yellow-50 dark:bg-yellow-900/20 text-professional-green",
    cardStyle:
      "border border-slate-100 dark:border-slate-800 hover:border-professional-green/30",
    actionStyle:
      "text-professional-green border border-professional-green hover:bg-yellow-50",
  },
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  return rtf.format(diffDays, "day");
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const [incidentsResponse, visitsResponse] = await Promise.all([
          fetch("/api/incidents/", { cache: "no-store" }),
          fetch("/api/visits/", { cache: "no-store" }),
        ]);
        if (!incidentsResponse.ok || !visitsResponse.ok) {
          throw new Error("No se pudieron cargar las notificaciones.");
        }
        const [incidentsData, visitsData] = await Promise.all([
          incidentsResponse.json(),
          visitsResponse.json(),
        ]);
        if (!isMounted) return;
        const incidentItems = (incidentsData.results ?? []).map(
          (incident: Incident) => ({
            id: `incident-${incident.id}`,
            title: "Incidencia reportada",
            timestamp: formatRelativeTime(incident.created_at),
            description: incident.description,
            location: incident.branch,
            locationStyle:
              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            createdAt: incident.created_at,
            ...tagStyles.incidencia,
          }),
        );
        const visitItems = (visitsData.results ?? []).map((visit: Visit) => ({
          id: `visit-${visit.id}`,
          title: `Visita registrada por ${visit.inspector}`,
          timestamp: formatRelativeTime(visit.visited_at),
          description: visit.notes || `Visita en ${visit.area}.`,
          location: visit.branch,
          locationStyle:
            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
          createdAt: visit.visited_at,
          ...tagStyles.visita,
        }));

        const combined = [...incidentItems, ...visitItems]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          )
          .slice(0, 12);

        setNotifications(combined);
        setUnreadCount(getUnreadNotificationCount(combined.map((item) => item.id)));
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar las notificaciones.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAllAsRead = () => {
    if (notifications.length === 0) return;
    markNotificationsAsRead(notifications.map((item) => item.id));
    setUnreadCount(0);
  };

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando notificaciones...";
    if (error) return error;
    return "No hay notificaciones recientes.";
  }, [error, isLoading]);

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
            <button
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0 || unreadCount === 0}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 bg-white dark:bg-[#161e27] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                done_all
              </span>
              Marcar todas como leídas ({unreadCount})
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {notifications.length === 0 ? (
              <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card p-6 border border-slate-100 dark:border-slate-800 text-center text-slate-500">
                {emptyMessage}
              </div>
            ) : (
              notifications.map((item) => (
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
              ))
            )}
          </div>
        </div>
      </PageTransition>
    </>
  );
}
