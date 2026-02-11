"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { INSPECTOR_ROLE } from "../lib/permissions";
import { getSessionUserEmail } from "../lib/session";

import PageTransition from "../components/PageTransition";

type DashboardStats = {
  clients: number;
  branches: number;
  areas: number;
  dispensers: number;
  products: number;
  visits: number;
  incidents: number;
  pending_visits: number;
};

type Visit = {
  id: number;
  branch: string;
  visited_at: string;
  inspector: string;
  notes: string;
};

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [dashboardResponse, visitsResponse] = await Promise.all([
          fetch("/api/dashboard", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/visits", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);
        if (!dashboardResponse.ok || !visitsResponse.ok) {
          throw new Error("No se pudo cargar el dashboard.");
        }

        const [dashboardData, visitsData] = await Promise.all([
          dashboardResponse.json(),
          visitsResponse.json(),
        ]);
        if (!isMounted) return;

        setStats(dashboardData.stats);
        setTodayVisits(visitsData.results ?? []);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudo cargar el dashboard.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const statsCards = useMemo(
    () => [
      {
        label: "Clientes",
        value: stats?.clients ?? 0,
        icon: "apartment",
        iconStyle:
          "bg-primary/20 text-primary dark:bg-primary/15 dark:text-primary",
      },
      {
        label: "Sucursales",
        value: stats?.branches ?? 0,
        icon: "storefront",
        iconStyle:
          "bg-professional-green/15 text-professional-green dark:bg-professional-green/20 dark:text-professional-green",
      },
      {
        label: "Áreas",
        value: stats?.areas ?? 0,
        icon: "map",
        iconStyle:
          "bg-primary/15 text-professional-green dark:bg-primary/10 dark:text-primary",
      },
      {
        label: "Dosificadores",
        value: stats?.dispensers ?? 0,
        icon: "water_drop",
        iconStyle:
          "bg-professional-green/10 text-professional-green dark:bg-professional-green/20 dark:text-professional-green",
      },
      {
        label: "Productos",
        value: stats?.products ?? 0,
        icon: "inventory_2",
        iconStyle:
          "bg-primary/15 text-primary dark:bg-primary/10 dark:text-primary",
      },
      {
        label: "Visitas",
        value: stats?.visits ?? 0,
        icon: "history",
        iconStyle:
          "bg-professional-green/10 text-professional-green dark:bg-professional-green/20 dark:text-professional-green",
      },
      {
        label: "Visitas pendientes",
        value: stats?.pending_visits ?? 0,
        icon: "event_upcoming",
        iconStyle:
          "bg-primary/20 text-professional-green dark:bg-primary/15 dark:text-primary",
      },
      {
        label: "Incidencias",
        value: stats?.incidents ?? 0,
        icon: "report_problem",
        iconStyle:
          "bg-primary/15 text-primary dark:bg-primary/10 dark:text-primary",
      },
    ],
    [stats],
  );

  const mobileCards = useMemo(
    () => [
      {
        label: "Visitas pendientes",
        value: stats?.pending_visits ?? 0,
        icon: "pending_actions",
        iconStyle:
          "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
      },
      {
        label: "Incidencias",
        value: stats?.incidents ?? 0,
        icon: "report_problem",
        iconStyle: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
      },
      {
        label: "Visitas completadas",
        value: Math.max(0, (stats?.visits ?? 0) - (stats?.pending_visits ?? 0)),
        icon: "check_circle",
        iconStyle:
          "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300",
      },
    ],
    [stats],
  );

  const todayScheduledVisits = useMemo(() => {
    const today = new Date();
    const isSameDate = (value: string) => {
      const date = new Date(value);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    };

    const filtered = todayVisits.filter((visit) => {
      if (!isSameDate(visit.visited_at)) return false;
      if (user?.role !== INSPECTOR_ROLE || !user.full_name) return true;
      return visit.inspector.trim().toLowerCase() === user.full_name.trim().toLowerCase();
    });

    return filtered.sort((a, b) => a.visited_at.localeCompare(b.visited_at));
  }, [todayVisits, user?.full_name, user?.role]);

  return (
    <>
      <DashboardHeader
        title="Panel General"
        description="Mostrando información según los accesos asignados al usuario."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <section className="mx-auto w-full max-w-7xl">
          {error && !isLoading && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="md:hidden">
            <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
              {mobileCards.map((item) => (
                <article
                  key={item.label}
                  className="flex min-w-[130px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${item.iconStyle}`}>
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-300">{item.label}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Visitas de hoy</h3>
                <Link
                  href="/clientes/calendario"
                  className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-yellow-500/20 dark:text-yellow-200"
                >
                  Ver todas
                </Link>
              </div>

              <div className="space-y-3">
                {todayScheduledVisits.map((visit) => {
                  const date = new Date(visit.visited_at);
                  const typeLabel = visit.notes?.toLowerCase().includes("emergencia") ? "Emergencia" : "Programada";
                  const tagClassName =
                    typeLabel === "Emergencia"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200";
                  return (
                    <article
                      key={visit.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${tagClassName}`}>
                            {typeLabel}
                          </span>
                          <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{visit.branch}</h4>
                        </div>
                        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Inspector asignado: {visit.inspector}</p>
                    </article>
                  );
                })}

                {!isLoading && !error && todayScheduledVisits.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    No hay visitas programadas para hoy.
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="hidden md:grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {statsCards.map((item) => (
              <article
                key={item.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-[#161e27]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-professional-green to-yellow-500 opacity-70"></div>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div
                    className={`${item.iconStyle} rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-105`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {item.icon}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Total
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {item.label}
                </h3>
                <p className="mt-1 text-3xl font-bold leading-none text-slate-900 dark:text-white sm:text-4xl">
                  {item.value}
                </p>
                {isLoading && (
                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                    Actualizando datos...
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </PageTransition>
    </>
  );
}
