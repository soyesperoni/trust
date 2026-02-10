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
          "bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
      },
      {
        label: "Sucursales",
        value: stats?.branches ?? 0,
        icon: "storefront",
        iconStyle:
          "bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
      },
      {
        label: "Áreas",
        value: stats?.areas ?? 0,
        icon: "map",
        iconStyle:
          "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
      },
      {
        label: "Dosificadores",
        value: stats?.dispensers ?? 0,
        icon: "water_drop",
        iconStyle:
          "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
      },
      {
        label: "Productos",
        value: stats?.products ?? 0,
        icon: "inventory_2",
        iconStyle:
          "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
      },
      {
        label: "Visitas",
        value: stats?.visits ?? 0,
        icon: "history",
        iconStyle:
          "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
      },
      {
        label: "Incidencias",
        value: stats?.incidents ?? 0,
        icon: "report_problem",
        iconStyle:
          "bg-rose-500/10 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
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
          <div className="mb-6 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-[#161e27] dark:via-[#161e27] dark:to-slate-900/70 sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
              Resumen del dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Vista rápida de los indicadores principales.
            </p>
          </div>

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
