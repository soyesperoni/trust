"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardStats = {
  clients: number;
  branches: number;
  areas: number;
  dispensers: number;
};

type ActivityItem = {
  id: number;
  client: string;
  branch: string;
  type: string;
  inspector: string;
  status: string;
  visited_at: string;
};

const typeStyleMap: Record<string, string> = {
  Visita: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Incidencia: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusDotMap: Record<string, string> = {
  Registrado: "bg-professional-green",
  Pendiente: "bg-yellow-500",
  "Sin asignar": "bg-slate-300",
};

const formatActivityDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
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
        setActivity(data.activity ?? []);
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
        trend: "Total",
        trendStyle: "text-slate-500 bg-slate-100",
        icon: "apartment",
        iconStyle:
          "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      },
      {
        label: "Sucursales",
        value: stats?.branches ?? 0,
        trend: "Total",
        trendStyle: "text-slate-500 bg-slate-100",
        icon: "storefront",
        iconStyle:
          "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
      },
      {
        label: "Áreas",
        value: stats?.areas ?? 0,
        trend: "Total",
        trendStyle: "text-slate-500 bg-slate-100",
        icon: "map",
        iconStyle:
          "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
      },
      {
        label: "Dosificadores",
        value: stats?.dispensers ?? 0,
        trend: "Total",
        trendStyle: "text-slate-500 bg-slate-100",
        icon: "water_drop",
        iconStyle:
          "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
      },
    ],
    [stats],
  );

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-800 dark:text-slate-200">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-white dark:bg-[#161e27] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0">
          <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-primary p-1.5 rounded-md flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-slate-900 text-[24px] font-variation-fill">
                shield
              </span>
            </div>
            <h1 className="font-logo text-3xl font-bold text-primary tracking-tight leading-none lowercase">
              trust
            </h1>
          </div>
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
            {[
              {
                icon: "dashboard",
                label: "Dashboard",
                active: true,
                href: "/dashboard",
              },
              { icon: "group", label: "Usuarios", href: "/clientes" },
              { icon: "apartment", label: "Clientes" },
              { icon: "storefront", label: "Sucursales" },
              { icon: "map", label: "Áreas" },
              { icon: "water_drop", label: "Dosificadores" },
              { icon: "inventory_2", label: "Productos" },
              { icon: "history", label: "Historial de Visitas" },
              { icon: "report_problem", label: "Incidencias" },
            ].map((item) => (
              <a
                key={item.label}
                className={`flex items-center gap-3 px-6 py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ${
                  item.active
                    ? "bg-yellow-50 text-slate-900 border-r-4 border-primary font-semibold"
                    : ""
                }`}
                href={item.href ?? "#"}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
                AR
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Alicia Rivera
                </span>
                <span className="text-xs text-slate-500">alicia@trust.com</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-900 text-[20px] font-variation-fill">
                  shield
                </span>
              </div>
              <span className="font-logo text-xl font-bold text-primary lowercase">
                trust
              </span>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </header>

          <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Panel General
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mostrando información según los accesos asignados al usuario.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary"
                  placeholder="Buscar..."
                  type="text"
                />
              </div>
              <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((item) => (
                <div
                  key={item.label}
                  className="bg-white dark:bg-[#161e27] rounded-xl p-6 shadow-card border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`${item.iconStyle} p-3 rounded-lg group-hover:bg-primary group-hover:text-black transition-colors`}
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${item.trendStyle}`}
                    >
                      {item.trend}
                    </span>
                  </div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                    {item.label}
                  </h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Actividad Reciente
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Últimas visitas y mantenimientos realizados en tus cuentas.
                  </p>
                </div>
                <button className="bg-professional-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  Nueva Incidencia
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4">Cliente / Sucursal</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Inspector</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {activity.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                              {row.client
                                .split(" ")
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {row.client}
                              </div>
                              <div className="text-xs text-slate-500">
                                {row.branch}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              typeStyleMap[row.type] ?? typeStyleMap.Visita
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {row.inspector}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                statusDotMap[row.status] ?? "bg-slate-300"
                              }`}
                            ></span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {row.status}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatActivityDate(row.visited_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-professional-green transition-colors">
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {error && !isLoading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-red-500"
                        >
                          {error}
                        </td>
                      </tr>
                    )}
                    {isLoading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-slate-500"
                        >
                          Cargando actividad...
                        </td>
                      </tr>
                    )}
                    {!error && !isLoading && activity.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-slate-500"
                        >
                          No hay actividad reciente registrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <button className="text-sm font-medium text-professional-green hover:text-green-800 transition-colors">
                  Ver toda la actividad
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
