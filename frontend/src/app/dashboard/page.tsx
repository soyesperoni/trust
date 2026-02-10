"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar el dashboard.");
        }
        const data = await response.json();
        if (!isMounted) return;
        setStats(data.stats);
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {statsCards.map((item) => (
              <article
                key={item.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-[#161e27]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-professional-green to-cyan-500 opacity-70"></div>
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
