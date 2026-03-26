"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { INSPECTOR_ROLE } from "../lib/permissions";
import { getSessionUserEmail } from "../lib/session";

type TrustAIExpress = {
  summary: string;
  provider: string;
  model: string;
};

type DashboardStats = {
  clients: number;
  branches: number;
  areas: number;
  dispensers: number;
  products: number;
  visits: number;
  incidents: number;
  pending_visits: number;
  audits: number;
  completed_audits: number;
  scheduled_audits: number;
};

type Visit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  visited_at: string;
  inspector: string;
  notes: string;
  status?: string;
};


export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [trustAIExpress, setTrustAIExpress] = useState<TrustAIExpress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [dashboardResponse, visitsResponse] = await Promise.all([
          fetch("/api/dashboard/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/visits/", {
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
        setTrustAIExpress(dashboardData.trust_ai_express ?? null);
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
      { label: "Clientes", value: stats?.clients ?? 0, icon: "apartment", iconStyle: "bg-primary/20 text-primary" },
      { label: "Sucursales", value: stats?.branches ?? 0, icon: "storefront", iconStyle: "bg-professional-green/15 text-professional-green" },
      { label: "Áreas", value: stats?.areas ?? 0, icon: "map", iconStyle: "bg-primary/15 text-professional-green" },
      { label: "Dosificadores", value: stats?.dispensers ?? 0, icon: "water_drop", iconStyle: "bg-professional-green/10 text-professional-green" },
      { label: "Productos", value: stats?.products ?? 0, icon: "inventory_2", iconStyle: "bg-primary/15 text-primary" },
      { label: "Visitas", value: stats?.visits ?? 0, icon: "history", iconStyle: "bg-professional-green/10 text-professional-green" },
      { label: "Auditorías", value: stats?.audits ?? 0, icon: "assignment_turned_in", iconStyle: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" },
      { label: "Incidencias", value: stats?.incidents ?? 0, icon: "report_problem", iconStyle: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300" },
    ],
    [stats],
  );

  const auditTopics = useMemo(
    () => [
      "Cumplimiento de checklist",
      "Evidencias fotográficas",
      "Cierre de hallazgos",
      "Tendencia de score por auditoría",
    ],
    [],
  );

  const todayScheduledVisits = useMemo(() => {
    const today = new Date();
    const isSameDate = (value: string) => {
      const date = new Date(value);
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    };

    return todayVisits
      .filter((visit) => {
        if (!isSameDate(visit.visited_at)) return false;
        if (user?.role !== INSPECTOR_ROLE || !user.full_name) return true;
        return visit.inspector.trim().toLowerCase() === user.full_name.trim().toLowerCase();
      })
      .sort((a, b) => a.visited_at.localeCompare(b.visited_at));
  }, [todayVisits, user?.full_name, user?.role]);

  const overviewBars = useMemo(() => {
    const items = [
      { label: "Visitas", value: stats?.visits ?? 0, color: "from-primary to-indigo-400" },
      { label: "Incidencias", value: stats?.incidents ?? 0, color: "from-red-500 to-rose-300" },
      { label: "Auditorías", value: stats?.audits ?? 0, color: "from-professional-green to-lime-300" },
      { label: "Auditorías finalizadas", value: stats?.completed_audits ?? 0, color: "from-emerald-500 to-green-300" },
    ];
    const maxValue = Math.max(...items.map((item) => item.value), 1);
    return items.map((item) => ({ ...item, width: Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 4) }));
  }, [stats]);

  const completionRate = useMemo(() => {
    const totalVisits = stats?.visits ?? 0;
    const pendingVisits = stats?.pending_visits ?? 0;
    const completedVisits = Math.max(totalVisits - pendingVisits, 0);
    if (!totalVisits) return 0;
    return Math.round((completedVisits / totalVisits) * 100);
  }, [stats]);

  return (
    <>
      <DashboardHeader
        title="Panel General"
        description="Vista ejecutiva sin saltos visuales, con foco en visitas, incidencias y auditorías."
      />

      <PageTransition className="relative flex-1 overflow-y-auto p-4 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.42)_0%,rgba(146,185,59,0.33)_34%,rgba(255,255,255,0)_68%)] dark:bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.36)_0%,rgba(146,185,59,0.2)_38%,rgba(10,15,20,0)_68%)]" />
        <section className="relative z-10 w-full space-y-5">
          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-12 gap-5">
            <article className="col-span-12 lg:col-span-5 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-primary/90 via-[#4146b8]/88 to-[#6970e7]/85 p-6 text-white shadow-[0_24px_60px_-30px_rgba(46,49,146,0.78)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100/90">Score Operativo</p>
              {isLoading ? (
                <div className="mt-4 h-20 w-52 animate-pulse rounded-2xl bg-white/20" />
              ) : (
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-6xl font-black leading-none">{completionRate}%</span>
                  <span className="pb-2 text-sm font-medium text-indigo-100">cumplimiento</span>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {overviewBars.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-100">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/20">
                      <div className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700`} style={{ width: `${item.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="col-span-12 lg:col-span-7 rounded-3xl border border-white/65 bg-white/80 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Trust AI Express</h3>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold uppercase text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">DeepSeek</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {isLoading
                  ? "Analizando estado del negocio..."
                  : trustAIExpress?.summary || "Resumen no disponible por ahora."
                }
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {auditTopics.map((topic) => (
                  <span key={topic} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {topic}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statsCards.map((item, index) => (
              <article
                key={item.label}
                className="apple-card-enter group relative overflow-hidden rounded-2xl border border-white/65 bg-white/72 p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-8 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                ) : (
                  <>
                    <div className={`mb-6 inline-flex rounded-xl p-2.5 ${item.iconStyle}`}>
                      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</h3>
                    <p className="mt-1 text-3xl font-bold leading-none text-slate-900 dark:text-white">{item.value}</p>
                  </>
                )}
              </article>
            ))}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Visitas de hoy</h3>
              <Link href="/clientes/calendario" className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-yellow-500/20 dark:text-yellow-200">Ver todas</Link>
            </div>

            <div className="space-y-3">
              {todayScheduledVisits.map((visit) => {
                const date = new Date(visit.visited_at);
                const statusLabel = visit.status === "completed" ? "Finalizada" : "Programada";
                return (
                  <article key={visit.id} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.38)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{visit.client}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{visit.branch} · {visit.area}</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{statusLabel}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">{date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · {visit.inspector}</div>
                  </article>
                );
              })}

              {!isLoading && !error && todayScheduledVisits.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/70 bg-white/70 p-4 text-sm text-slate-500 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.38)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-300">
                  No hay visitas programadas para hoy.
                </div>
              )}
            </div>
          </div>
        </section>
      </PageTransition>
    </>
  );
}
