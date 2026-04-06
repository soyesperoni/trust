"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { GENERAL_ADMIN_ROLE, INSPECTOR_ROLE } from "../../lib/permissions";
import { getSessionUserEmail } from "../../lib/session";

type Visit = {
  id: number;
  client: string;
  branch: string;
  branch_id: number;
  area: string;
  area_id: number;
  dispenser: string | null;
  inspector: string;
  inspector_id: number | null;
  visited_at: string;
  notes: string;
  status: string;
};

type Audit = {
  id: number;
  client: string;
  branch: string;
  branch_id: number;
  area: string;
  area_id: number;
  inspector: string;
  inspector_id: number | null;
  audited_at: string;
  notes: string;
  status: string;
};

type CalendarActivity = {
  id: number;
  type: "visit" | "audit";
  client: string;
  branch: string;
  area: string;
  inspector: string;
  notes: string;
  status: string;
  scheduledAt: string;
};

type CalendarCell = {
  date: Date | null;
  activities: CalendarActivity[];
  muted?: boolean;
};

const weekHeaders = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const mobileWeekHeaders = ["L", "M", "M", "J", "V", "S", "D"];

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatMonthTitle = (date: Date) =>
  date.toLocaleDateString("es-PE", { month: "long", year: "numeric" });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

const toDateInputValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const eventStylesByType: Record<CalendarActivity["type"], string> = {
  visit:
    "bg-professional-green/10 border-l-2 border-professional-green text-professional-green hover:bg-professional-green/20",
  audit: "bg-primary/15 border-l-2 border-primary text-primary hover:bg-primary/25",
};

const activityTypeBadgeStyles: Record<CalendarActivity["type"], string> = {
  visit: "bg-professional-green/15 text-professional-green dark:bg-professional-green/25 dark:text-green-200",
  audit: "bg-primary/15 text-primary dark:bg-primary/25 dark:text-yellow-200",
};

const activityTypeLabel = (type: CalendarActivity["type"]) => (type === "audit" ? "Auditoría" : "Visita");

export default function CalendarioPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const canScheduleVisits = user?.role === GENERAL_ADMIN_ROLE || user?.role === INSPECTOR_ROLE;
  const canScheduleVisitsFromHeader = !isLoadingUser && canScheduleVisits;

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    let isMounted = true;

    const loadVisits = async () => {
      setIsLoading(true);
      try {
        const currentUserEmail = getSessionUserEmail();
        const [visitsResponse, auditsResponse] = await Promise.all([
          fetch(`/api/visits?month=${monthKey(currentMonth)}`, {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch(`/api/audits?month=${monthKey(currentMonth)}`, {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        if (!visitsResponse.ok || !auditsResponse.ok) {
          throw new Error("No se pudieron cargar las actividades del calendario.");
        }

        const [visitsPayload, auditsPayload] = await Promise.all([
          visitsResponse.json(),
          auditsResponse.json(),
        ]);
        if (!isMounted) return;

        const mappedVisits = (visitsPayload.results ?? []).map((visit: Visit): CalendarActivity => ({
          id: visit.id,
          type: "visit",
          client: visit.client,
          branch: visit.branch,
          area: visit.area,
          inspector: visit.inspector,
          notes: visit.notes,
          status: visit.status,
          scheduledAt: visit.visited_at,
        }));

        const mappedAudits = (auditsPayload.results ?? []).map((audit: Audit): CalendarActivity => ({
          id: audit.id,
          type: "audit",
          client: audit.client,
          branch: audit.branch,
          area: audit.area,
          inspector: audit.inspector,
          notes: audit.notes,
          status: audit.status,
          scheduledAt: audit.audited_at,
        }));

        setActivities([...mappedVisits, ...mappedAudits]);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar las actividades del calendario.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadVisits();

    return () => {
      isMounted = false;
    };
  }, [currentMonth]);

  const cells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const mapByDay = new Map<number, CalendarActivity[]>();
    activities.forEach((activity) => {
      const date = new Date(activity.scheduledAt);
      const day = date.getDate();
      const current = mapByDay.get(day) ?? [];
      current.push(activity);
      mapByDay.set(day, current);
    });

    return Array.from({ length: totalCells }, (_, index): CalendarCell => {
      const day = index - startOffset + 1;
      if (day < 1 || day > daysInMonth) {
        return { date: null, activities: [], muted: true };
      }
      return {
        date: new Date(year, month, day),
        activities: mapByDay.get(day) ?? [],
      };
    });
  }, [activities, currentMonth]);

  const mobileCells = useMemo(() => {
    const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, weekIndex) =>
      cells.slice(weekIndex * 7, weekIndex * 7 + 7),
    );

    return weeks.flatMap((week) => {
      if (week.length < 7) return week;
      return [...week.slice(1), week[0]];
    });
  }, [cells]);

  const selectedDayVisits = useMemo(() => {
    return activities
      .filter((activity) => {
        const date = new Date(activity.scheduledAt);
        return (
          date.getFullYear() === selectedDate.getFullYear() &&
          date.getMonth() === selectedDate.getMonth() &&
          date.getDate() === selectedDate.getDate()
        );
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [activities, selectedDate]);

  const stats = useMemo(() => {
    const now = new Date();
    const completed = activities.filter((activity) => new Date(activity.scheduledAt) <= now).length;
    return {
      completed,
      pending: activities.length - completed,
    };
  }, [activities]);

  const today = new Date();

  return (
    <>
      <DashboardHeader
        title="Calendario de Actividades"
        action={
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
              <button
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                onClick={() =>
                  setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                type="button"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <p className="min-w-[140px] text-center text-sm font-semibold text-slate-900 dark:text-white capitalize px-1">
                {formatMonthTitle(currentMonth)}
              </p>
              <button
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                onClick={() =>
                  setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                type="button"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            <button
              className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              type="button"
            >
              Mes
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium bg-transparent border border-transparent rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              type="button"
            >
              Hoy
            </button>

            {canScheduleVisitsFromHeader && (
              <Link
                href="/clientes/calendario/nueva"
                className="bg-professional-green hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Agendar actividad
              </Link>
            )}
          </div>
        }
      />

      <PageTransition className="flex-1 flex overflow-hidden">
        <div className="md:hidden flex-1 overflow-y-auto px-4 py-3 pb-28 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <button
                className="h-8 w-8 rounded-full text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() =>
                  setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <h2 className="text-base font-semibold capitalize text-slate-900 dark:text-white">
                {formatMonthTitle(currentMonth)}
              </h2>
              <button
                className="h-8 w-8 rounded-full text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() =>
                  setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {mobileWeekHeaders.map((header, index) => (
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  key={`${header}-${index}`}
                >
                  {header}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 place-items-center">
              {mobileCells.map((cell, index) => {
                  const isToday =
                    !!cell.date &&
                    cell.date.getFullYear() === today.getFullYear() &&
                    cell.date.getMonth() === today.getMonth() &&
                    cell.date.getDate() === today.getDate();
                  const isSelected =
                    !!cell.date &&
                    cell.date.getFullYear() === selectedDate.getFullYear() &&
                    cell.date.getMonth() === selectedDate.getMonth() &&
                    cell.date.getDate() === selectedDate.getDate();

                  return (
                    <button
                      className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                        cell.date
                          ? "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                          : "text-slate-300 dark:text-slate-600"
                      } ${isSelected ? "bg-primary text-white font-bold shadow-sm" : ""} ${
                        isToday && !isSelected ? "ring-1 ring-primary/70" : ""
                      }`}
                      disabled={!cell.date}
                      key={cell.date ? toDateInputValue(cell.date) : `m-empty-${index}`}
                      onClick={() => cell.date && setSelectedDate(cell.date)}
                      type="button"
                    >
                      {cell.date?.getDate() ?? ""}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Actividades del día {selectedDate.getDate()}
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {selectedDayVisits.length} Eventos
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-professional-green/15 px-2.5 py-1 font-semibold text-professional-green dark:bg-professional-green/25 dark:text-green-200">
              Visita
            </span>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary dark:bg-primary/25 dark:text-yellow-200">
              Auditoría
            </span>
          </div>

          <div className="space-y-3">
            {selectedDayVisits.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                No hay actividades para la fecha seleccionada.
              </div>
            ) : (
              selectedDayVisits.map((visit) => {
                return (
                  <article
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-card dark:border-slate-800 dark:bg-slate-900/50"
                    key={`mobile-${visit.type}-${visit.id}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`self-start rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${activityTypeBadgeStyles[visit.type]}`}
                        >
                          {activityTypeLabel(visit.type)}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{visit.client}</h4>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{visit.branch}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {formatTime(visit.scheduledAt)}
                        </span>
                        {visit.type === "visit" && user?.role === INSPECTOR_ROLE && visit.status === "scheduled" && (
                          <Link
                            aria-label={`Iniciar actividad ${visit.id}`}
                            href={`/clientes/visitas/${visit.id}/realizar`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-yellow-400 text-white shadow-sm transition-transform hover:scale-105"
                          >
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </Link>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Área: {visit.area}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Inspector: {visit.inspector}</p>
                  </article>
                );
              })
            )}
          </div>

          {canScheduleVisitsFromHeader && (
            <Link
              href="/clientes/calendario/nueva"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-professional-green px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Agendar actividad
            </Link>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {isLoading && <p className="text-sm text-slate-500">Cargando actividades...</p>}
        </div>

        <div className="hidden md:flex flex-1 flex-col p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
              {weekHeaders.map((header) => (
                <div
                  key={header}
                  className="text-xs font-semibold text-slate-400 uppercase text-center py-2 border-b border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                >
                  {header}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-50 dark:bg-slate-900">
              {cells.map((cell, index) => {
                const isToday =
                  !!cell.date &&
                  cell.date.getFullYear() === today.getFullYear() &&
                  cell.date.getMonth() === today.getMonth() &&
                  cell.date.getDate() === today.getDate();
                const isSelected =
                  !!cell.date &&
                  cell.date.getFullYear() === selectedDate.getFullYear() &&
                  cell.date.getMonth() === selectedDate.getMonth() &&
                  cell.date.getDate() === selectedDate.getDate();

                return (
                  <button
                    key={cell.date ? toDateInputValue(cell.date) : `empty-${index}`}
                    className={`min-h-[100px] border p-2 relative transition-colors text-left ${
                      cell.muted
                        ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                        : "bg-white dark:bg-[#161e27] border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                    } ${isToday ? "ring-2 ring-inset ring-primary/50" : ""} ${isSelected ? "outline outline-2 outline-professional-green/40" : ""}`}
                    disabled={!cell.date}
                    onClick={() => cell.date && setSelectedDate(cell.date)}
                    type="button"
                  >
                    {cell.date &&
                      (isToday ? (
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white text-sm font-bold ml-0.5 mt-0.5">
                          {cell.date.getDate()}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                          {cell.date.getDate()}
                        </span>
                      ))}

                    {cell.activities.slice(0, 2).map((visit) => {
                      return (
                        <div
                          key={`${visit.type}-${visit.id}`}
                          className={`mt-1 p-1 rounded text-[10px] font-medium truncate cursor-pointer ${eventStylesByType[visit.type]}`}
                        >
                          {formatTime(visit.scheduledAt)} - {activityTypeLabel(visit.type)} · {visit.branch}
                        </div>
                      );
                    })}
                    {cell.activities.length > 2 && (
                      <div className="text-[10px] text-slate-400 mt-1">+{cell.activities.length - 2} más</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          {isLoading && <p className="text-sm text-slate-500 mt-3">Cargando actividades...</p>}
        </div>

        <aside className="w-80 bg-white dark:bg-[#161e27] border-l border-slate-200 dark:border-slate-800 flex-col shrink-0 hidden xl:flex">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Resumen del Día</h3>
            <p className="text-sm text-slate-500 mt-1">
              {selectedDate.toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {selectedDayVisits.length === 0 && (
              <div className="text-sm text-slate-500">No hay actividades para la fecha seleccionada.</div>
            )}
            {selectedDayVisits.map((visit) => {
              return (
                <div
                  className={`p-4 rounded-xl shadow-sm ${
                    visit.type === "audit"
                      ? "border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10"
                      : "border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50"
                  }`}
                  key={`${visit.type}-${visit.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${activityTypeBadgeStyles[visit.type]}`}
                    >
                      {activityTypeLabel(visit.type)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{formatTime(visit.scheduledAt)}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {visit.client || "Sin cliente"}
                  </p>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{visit.branch}</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-3">{visit.area}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {visit.inspector
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((v) => v[0]?.toUpperCase())
                        .join("")}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{visit.inspector}</span>
                  </div>
                  {visit.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{visit.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visit.type === "visit" && (
                      <Link
                        href={`/clientes/visitas/${visit.id}/informe`}
                        className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Ver informe
                      </Link>
                    )}
                    {visit.type === "visit" && user?.role === INSPECTOR_ROLE && visit.status === "scheduled" && (
                      <Link
                        href={`/clientes/visitas/${visit.id}/realizar`}
                        className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Iniciar visita
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161e27]">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Estadísticas del mes
            </span>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-2xl font-bold text-professional-green">{stats.completed}</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium">Completadas</div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.pending}</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium">Pendientes</div>
              </div>
            </div>
          </div>
        </aside>
      </PageTransition>
    </>
  );
}
