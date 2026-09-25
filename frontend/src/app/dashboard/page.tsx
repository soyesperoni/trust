"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DashboardHeader from "../components/DashboardHeader";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { ACCOUNT_ADMIN_ROLE, BRANCH_ADMIN_ROLE } from "../lib/permissions";
import PageTransition from "../components/PageTransition";
import { getSessionUserEmail } from "../lib/session";

type DashboardStats = {
  clients: number;
  branches: number;
  areas: number;
  dispensers: number;
  products: number;
  visits: number;
  completed_visits: number;
  incidents: number;
  pending_visits: number;
  overdue_visits: number;
  audits: number;
  completed_audits: number;
  scheduled_audits: number;
  overdue_audits: number;
  compliance_score: number;
  audit_score: number;
};

type DailyAuditScore = {
  date: string;
  score: number;
  audits: number;
};

type ScoreRange = "month" | "week" | "last6days";

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentMonthDateRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const toDateKey = (value: Date) => getLocalDateKey(value);
  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
};

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyComplianceScoreHistory, setDailyComplianceScoreHistory] = useState<DailyAuditScore[]>([]);
  const [scoreRange, setScoreRange] = useState<ScoreRange>("last6days");
  const [barAnimationProgress, setBarAnimationProgress] = useState(0);
  const [scoreChartAnimationKey, setScoreChartAnimationKey] = useState(0);
  const [animatedComplianceScore, setAnimatedComplianceScore] = useState(0);
  const [animatedOverdueVisits, setAnimatedOverdueVisits] = useState(0);
  const [animatedOverdueAudits, setAnimatedOverdueAudits] = useState(0);
  const [animatedPendingVisits, setAnimatedPendingVisits] = useState(0);
  const [animatedScheduledAudits, setAnimatedScheduledAudits] = useState(0);
  const [animatedCompletedVisits, setAnimatedCompletedVisits] = useState(0);
  const [animatedCompletedAudits, setAnimatedCompletedAudits] = useState(0);
  const [animatedIncidents, setAnimatedIncidents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const dashboardResponse = await fetch("/api/dashboard/", {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });
        if (!dashboardResponse.ok) {
          throw new Error("No se pudo cargar el dashboard.");
        }

        const dashboardData = await dashboardResponse.json();

        if (!isMounted) return;

        setStats(dashboardData.stats);
        setDailyComplianceScoreHistory(dashboardData.daily_audit_score_history ?? []);
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

  const cardRoutes = useMemo(
    () => ({
      Clientes: "/clientes",
      Sucursales: "/clientes/sucursales",
      "Áreas": "/clientes/areas",
      Dosificadores: "/clientes/dispensadores",
      Productos: "/clientes/productos",
      Visitas: "/clientes/visitas",
      Auditorías: "/clientes/auditorias",
      Incidencias: "/clientes/incidencias",
    }),
    [],
  );

  const metricCardRoutes = useMemo(
    () => {
      const { startDate, endDate } = getCurrentMonthDateRange();
      const withMonthRange = (path: string, status?: string) => {
        const params = new URLSearchParams({
          desde: startDate,
          hasta: endDate,
        });
        if (status) params.set("estado", status);
        return `${path}?${params.toString()}`;
      };

      return {
        pendingVisits: withMonthRange("/clientes/visitas", "programada"),
        scheduledAudits: withMonthRange("/clientes/auditorias", "pendiente"),
        overdueVisits: withMonthRange("/clientes/visitas", "vencida"),
        overdueAudits: withMonthRange("/clientes/auditorias", "vencida"),
        completedVisits: withMonthRange("/clientes/visitas", "finalizada"),
        completedAudits: withMonthRange("/clientes/auditorias", "finalizada"),
        incidents: withMonthRange("/clientes/incidencias"),
      };
    },
    [],
  );

  const statsCards = useMemo(
    () => {
      const cards = [
        { label: "Sucursales", value: stats?.branches ?? 0, icon: "storefront" },
        { label: "Áreas", value: stats?.areas ?? 0, icon: "map" },
        { label: "Dosificadores", value: stats?.dispensers ?? 0, icon: "water_drop" },
        { label: "Productos", value: stats?.products ?? 0, icon: "inventory_2" },
        { label: "Visitas", value: stats?.visits ?? 0, icon: "history" },
        { label: "Auditorías", value: stats?.audits ?? 0, icon: "assignment_turned_in" },
        { label: "Incidencias", value: stats?.incidents ?? 0, icon: "report_problem" },
      ];

      if (user?.role === ACCOUNT_ADMIN_ROLE) {
        return cards;
      }

      if (user?.role === BRANCH_ADMIN_ROLE) {
        return cards.filter((card) => card.label !== "Sucursales");
      }

      return [{ label: "Clientes", value: stats?.clients ?? 0, icon: "apartment" }, ...cards];
    },
    [stats, user?.role],
  );

  const complianceScore = useMemo(() => Math.round(stats?.compliance_score ?? stats?.audit_score ?? 0), [stats?.audit_score, stats?.compliance_score]);
  const overdueVisitsTotal = useMemo(() => stats?.overdue_visits ?? 0, [stats?.overdue_visits]);
  const overdueAuditsTotal = useMemo(() => stats?.overdue_audits ?? 0, [stats?.overdue_audits]);
  const pendingVisitsTotal = useMemo(() => stats?.pending_visits ?? 0, [stats?.pending_visits]);
  const scheduledAuditsTotal = useMemo(() => stats?.scheduled_audits ?? 0, [stats?.scheduled_audits]);
  const completedVisitsTotal = useMemo(() => stats?.completed_visits ?? 0, [stats?.completed_visits]);
  const completedAuditsTotal = useMemo(() => stats?.completed_audits ?? 0, [stats?.completed_audits]);
  const incidentsTotal = useMemo(() => stats?.incidents ?? 0, [stats?.incidents]);

  const scoreBars = useMemo(() => {
    const sanitized = dailyComplianceScoreHistory
      .map((entry) => {
        const date = new Date(`${entry.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return null;
        const normalizedScore = entry.score <= 1 ? Math.round(entry.score * 100) : Math.round(entry.score);
        return {
          date,
          score: Math.max(0, Math.min(100, normalizedScore)),
        };
      })
      .filter((entry): entry is { date: Date; score: number } => entry !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (scoreRange === "month") {
      const grouped = new Map<string, { sum: number; count: number; date: Date }>();
      sanitized.forEach((entry) => {
        const bucketKey = `${entry.date.getFullYear()}-${entry.date.getMonth() + 1}`;
        const bucketDate = new Date(entry.date.getFullYear(), entry.date.getMonth(), 1);
        const current = grouped.get(bucketKey) ?? { sum: 0, count: 0, date: bucketDate };
        current.sum += entry.score;
        current.count += 1;
        grouped.set(bucketKey, current);
      });

      const today = new Date();
      const monthBuckets = Array.from({ length: 6 }, (_, index) => {
        const offset = 5 - index;
        const bucketDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const bucketKey = `${bucketDate.getFullYear()}-${bucketDate.getMonth() + 1}`;
        const bucket = grouped.get(bucketKey);
        return {
          label: bucketDate.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
          score: bucket?.count ? Math.round(bucket.sum / bucket.count) : 0,
          isPlaceholder: !bucket,
        };
      });

      return monthBuckets;
    }

    if (scoreRange === "week") {
      const grouped = new Map<string, { sum: number; count: number; date: Date }>();
      sanitized.forEach((entry) => {
        const weekStart = new Date(entry.date);
        weekStart.setDate(entry.date.getDate() - entry.date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const bucketKey = getLocalDateKey(weekStart);
        const current = grouped.get(bucketKey) ?? { sum: 0, count: 0, date: weekStart };
        current.sum += entry.score;
        current.count += 1;
        grouped.set(bucketKey, current);
      });

      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      const weekBuckets = Array.from({ length: 6 }, (_, index) => {
        const offset = 5 - index;
        const bucketDate = new Date(currentWeekStart);
        bucketDate.setDate(currentWeekStart.getDate() - offset * 7);
        const bucketKey = getLocalDateKey(bucketDate);
        const bucket = grouped.get(bucketKey);
        return {
          label: bucketDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
          score: bucket?.count ? Math.round(bucket.sum / bucket.count) : 0,
          isPlaceholder: !bucket,
        };
      });

      return weekBuckets;
    }

    const dayCount = 6;
    const byDate = new Map<string, number>();
    sanitized.forEach((entry) => {
      byDate.set(getLocalDateKey(entry.date), entry.score);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (dayCount - 1));

    const seedScore = [...sanitized]
      .reverse()
      .find((entry) => entry.date <= startDate)?.score;

    let currentScore = seedScore ?? 0;
    const values = Array.from({ length: dayCount }, (_, offset) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + offset);

      if (date > today) {
        return {
          label: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
          score: currentScore,
          isPlaceholder: false,
        };
      }

      const key = getLocalDateKey(date);
      const dayScore = byDate.get(key);
      if (dayScore !== undefined) {
        currentScore = dayScore;
      }

      return {
        label: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
        score: currentScore,
        isPlaceholder: false,
      };
    });

    return values;
  }, [dailyComplianceScoreHistory, scoreRange]);

  useEffect(() => {
    setScoreChartAnimationKey((current) => current + 1);
    setBarAnimationProgress(0);
    const timer = window.setTimeout(() => {
      setBarAnimationProgress(1);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [scoreRange, scoreBars]);

  useEffect(() => {
    if (isLoading) return;

    let animationFrame = 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedComplianceScore(Math.round(complianceScore * easedProgress));
      setAnimatedOverdueVisits(Math.round(overdueVisitsTotal * easedProgress));
      setAnimatedOverdueAudits(Math.round(overdueAuditsTotal * easedProgress));
      setAnimatedPendingVisits(Math.round(pendingVisitsTotal * easedProgress));
      setAnimatedScheduledAudits(Math.round(scheduledAuditsTotal * easedProgress));
      setAnimatedCompletedVisits(Math.round(completedVisitsTotal * easedProgress));
      setAnimatedCompletedAudits(Math.round(completedAuditsTotal * easedProgress));
      setAnimatedIncidents(Math.round(incidentsTotal * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    setAnimatedComplianceScore(0);
    setAnimatedOverdueVisits(0);
    setAnimatedOverdueAudits(0);
    setAnimatedPendingVisits(0);
    setAnimatedScheduledAudits(0);
    setAnimatedCompletedVisits(0);
    setAnimatedCompletedAudits(0);
    setAnimatedIncidents(0);
    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [complianceScore, completedAuditsTotal, completedVisitsTotal, incidentsTotal, isLoading, overdueAuditsTotal, overdueVisitsTotal, pendingVisitsTotal, scheduledAuditsTotal]);

  // Circle circumference for 52 radius = 2 * PI * 52 = 326.726
  const gaugeCircumference = 326.73;
  const gaugeOffset = gaugeCircumference - (animatedComplianceScore / 100) * gaugeCircumference;

  return (
    <>
      <DashboardHeader
        title="Panel General"
        description="Resumen operativo de cumplimiento, visitas técnicas y auditorías de calidad."
      />

      <PageTransition className="relative flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {error && !isLoading && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              <span className="material-symbols-outlined text-[20px] text-red-500">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Fila superior: KPIs Principales estilo Google Minimalist */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Visitas Programadas */}
            <Link
              href={metricCardRoutes.pendingVisits}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:border-blue-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#161e27] dark:hover:border-blue-500/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
                  <span className="material-symbols-outlined text-[22px]">calendar_today</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 transition-colors group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400">
                  arrow_forward
                </span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {isLoading ? "..." : animatedPendingVisits}
                </span>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Visitas Programadas
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Pendientes en agenda mensual
                </p>
              </div>
            </Link>

            {/* KPI 2: Visitas Realizadas */}
            <Link
              href={metricCardRoutes.completedVisits}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:border-emerald-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#161e27] dark:hover:border-emerald-500/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50">
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 transition-colors group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-slate-600 dark:group-hover:text-emerald-400">
                  arrow_forward
                </span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {isLoading ? "..." : animatedCompletedVisits}
                </span>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Visitas Realizadas
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Completadas exitosamente
                </p>
              </div>
            </Link>

            {/* KPI 3: Auditorías */}
            <Link
              href={metricCardRoutes.completedAudits}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:border-indigo-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#161e27] dark:hover:border-indigo-500/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:group-hover:bg-indigo-900/50">
                  <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 transition-colors group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-slate-600 dark:group-hover:text-indigo-400">
                  arrow_forward
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    {isLoading ? "..." : animatedCompletedAudits}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    / {isLoading ? "..." : animatedCompletedAudits + animatedScheduledAudits}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Auditorías Realizadas
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {isLoading ? "..." : animatedScheduledAudits} pendientes de evaluación
                </p>
              </div>
            </Link>

            {/* KPI 4: Incidencias y Vencidas */}
            <Link
              href={metricCardRoutes.incidents}
              className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all hover:shadow-xs dark:bg-[#161e27] ${
                animatedIncidents > 0 || animatedOverdueVisits > 0
                  ? "border-rose-200 hover:border-rose-400 dark:border-rose-900/40 dark:hover:border-rose-500/50"
                  : "border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    animatedIncidents > 0 || animatedOverdueVisits > 0
                      ? "bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400"
                      : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">report_problem</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 transition-colors group-hover:translate-x-0.5 group-hover:text-rose-600 dark:text-slate-600 dark:group-hover:text-rose-400">
                  arrow_forward
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    {isLoading ? "..." : animatedIncidents}
                  </span>
                  {animatedOverdueVisits > 0 && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                      +{animatedOverdueVisits} vencidas
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Incidencias Activas
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {animatedOverdueVisits > 0
                    ? `${animatedOverdueVisits} visitas requieren atención`
                    : "Todo en orden operativo"}
                </p>
              </div>
            </Link>
          </section>

          {/* Sección Media: Score de Calidad + Gráfico de Tendencias */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Columna Izquierda: Score de Cumplimiento */}
            <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-[#161e27] lg:col-span-5 xl:col-span-4">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Score de Cumplimiento
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Evaluación integral del periodo
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      complianceScore >= 90
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : complianceScore >= 70
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    }`}
                  >
                    {complianceScore >= 90 ? "Óptimo" : complianceScore >= 70 ? "Adecuado" : "En Seguimiento"}
                  </span>
                </div>

                {/* Donut Gauge SVG Google Style */}
                <div className="my-6 flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        className="stroke-slate-100 dark:stroke-slate-800"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        className="transition-all duration-1000 ease-out"
                        stroke={complianceScore >= 80 ? "#22c55e" : complianceScore >= 60 ? "#3b82f6" : "#f59e0b"}
                        strokeWidth="10"
                        strokeDasharray={gaugeCircumference}
                        strokeDashoffset={isLoading ? gaugeCircumference : gaugeOffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {isLoading ? "..." : animatedComplianceScore}%
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Índice
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    Basado en auditorías realizadas
                  </p>
                </div>
              </div>

              {/* Sub-métricas de riesgo */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/80">
                <Link
                  href={metricCardRoutes.overdueVisits}
                  className="group flex flex-col rounded-xl bg-slate-50/80 p-3 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`material-symbols-outlined text-[16px] ${animatedOverdueVisits > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                      history_toggle_off
                    </span>
                    <span>Visitas Vencidas</span>
                  </div>
                  <span className={`mt-1 text-lg font-bold ${animatedOverdueVisits > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"}`}>
                    {isLoading ? "..." : animatedOverdueVisits}
                  </span>
                </Link>

                <Link
                  href={metricCardRoutes.overdueAudits}
                  className="group flex flex-col rounded-xl bg-slate-50/80 p-3 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`material-symbols-outlined text-[16px] ${animatedOverdueAudits > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                      schedule
                    </span>
                    <span>Auditorías Vencidas</span>
                  </div>
                  <span className={`mt-1 text-lg font-bold ${animatedOverdueAudits > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"}`}>
                    {isLoading ? "..." : animatedOverdueAudits}
                  </span>
                </Link>
              </div>
            </article>

            {/* Columna Derecha: Gráfico de Tendencias */}
            <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-[#161e27] lg:col-span-7 xl:col-span-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Tendencia de Cumplimiento
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Evolución histórica según auditorías
                    </p>
                  </div>
                  {/* Selector estilo Google Segmented Pill */}
                  <div className="inline-flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
                    {[
                      { value: "month", label: "6 meses" },
                      { value: "week", label: "6 semanas" },
                      { value: "last6days", label: "6 días" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setScoreRange(option.value as ScoreRange)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          scoreRange === option.value
                            ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenedor del gráfico minimalista */}
                <div className="relative mt-6 h-56 w-full sm:h-64">
                  {/* Líneas guía de fondo */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[100, 75, 50, 25, 0].map((tick) => (
                      <div key={tick} className="relative flex items-center border-b border-dashed border-slate-100 dark:border-slate-800/80 w-full">
                        <span className="absolute -top-2.5 right-0 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {tick}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Barras de datos */}
                  <div
                    key={scoreChartAnimationKey}
                    className="relative z-10 flex h-full items-end justify-around gap-2 px-6 pb-1"
                  >
                    {scoreBars.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="group relative flex h-full flex-1 flex-col items-center justify-end max-w-[48px]"
                      >
                        <span className="mb-1 text-[11px] font-semibold text-slate-600 transition-opacity dark:text-slate-300">
                          {item.score}%
                        </span>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            item.isPlaceholder
                              ? "bg-slate-200 dark:bg-slate-700"
                              : "bg-gradient-to-t from-primary to-[#4338ca] hover:brightness-110 dark:from-primary dark:to-[#6366f1]"
                          }`}
                          style={{
                            height: `${Math.max(item.score, 3)}%`,
                            opacity: barAnimationProgress,
                            transform: `scaleY(${barAnimationProgress})`,
                            transformOrigin: "bottom",
                            transition: `transform 480ms ease ${index * 40}ms, opacity 360ms ease ${index * 40}ms`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Etiquetas de fechas en eje X */}
                <div className="mt-2 flex justify-around gap-2 px-6">
                  {scoreBars.map((item, index) => (
                    <span
                      key={`${item.label}-${index}`}
                      className="max-w-[48px] flex-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Score alcanzado en auditorías
                </span>
                <Link
                  href="/clientes/auditorias"
                  className="font-medium text-primary hover:underline dark:text-indigo-400"
                >
                  Ver detalle de auditorías →
                </Link>
              </div>
            </article>
          </section>

          {/* Sección Inferior: Módulos y Catálogos Operativos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Módulos y Catálogos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acceso directo a las entidades y registros del sistema
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {statsCards.map((item) => (
                <Link
                  key={item.label}
                  href={cardRoutes[item.label as keyof typeof cardRoutes] ?? "/dashboard"}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-3.5 text-center transition-all hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-[#161e27] dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-primary/20 dark:group-hover:text-primary">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <span className="mt-2 text-base font-bold text-slate-900 group-hover:text-primary dark:text-white dark:group-hover:text-primary">
                    {isLoading ? "..." : item.value}
                  </span>
                  <span className="w-full truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </PageTransition>
    </>
  );
}
