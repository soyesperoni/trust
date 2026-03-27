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

const getScoreColor = (score: number) => {
  if (score >= 85) return { solid: "#16a34a", light: "#4ade80", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" };
  if (score >= 70) return { solid: "#2563eb", light: "#60a5fa", badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" };
  return { solid: "#6b7280", light: "#d1d5db", badge: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200" };
};

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyComplianceScoreHistory, setDailyComplianceScoreHistory] = useState<DailyAuditScore[]>([]);
  const [scoreRange, setScoreRange] = useState<ScoreRange>("last6days");
  const [barAnimationProgress, setBarAnimationProgress] = useState(0);
  const [scoreChartAnimationKey, setScoreChartAnimationKey] = useState(0);
  const [animatedComplianceScore, setAnimatedComplianceScore] = useState(0);
  const [animatedPendingVisits, setAnimatedPendingVisits] = useState(0);
  const [animatedScheduledAudits, setAnimatedScheduledAudits] = useState(0);
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

  const statsCards = useMemo(
    () => {
      const cards = [
      { label: "Sucursales", value: stats?.branches ?? 0, icon: "storefront", iconStyle: "bg-professional-green/15 text-professional-green" },
      { label: "Áreas", value: stats?.areas ?? 0, icon: "map", iconStyle: "bg-primary/15 text-professional-green" },
      { label: "Dosificadores", value: stats?.dispensers ?? 0, icon: "water_drop", iconStyle: "bg-professional-green/10 text-professional-green" },
      { label: "Productos", value: stats?.products ?? 0, icon: "inventory_2", iconStyle: "bg-primary/15 text-primary" },
      { label: "Visitas", value: stats?.visits ?? 0, icon: "history", iconStyle: "bg-professional-green/10 text-professional-green" },
      { label: "Auditorías", value: stats?.audits ?? 0, icon: "assignment_turned_in", iconStyle: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" },
      { label: "Incidencias", value: stats?.incidents ?? 0, icon: "report_problem", iconStyle: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300" },
      ];

      if (user?.role === ACCOUNT_ADMIN_ROLE) {
        return cards;
      }

      if (user?.role === BRANCH_ADMIN_ROLE) {
        return cards.filter((card) => card.label !== "Sucursales");
      }

      return [
        { label: "Clientes", value: stats?.clients ?? 0, icon: "apartment", iconStyle: "bg-primary/20 text-primary" },
        ...cards,
      ];
    },
    [stats, user?.role],
  );

  const complianceScore = useMemo(() => Math.round(stats?.compliance_score ?? stats?.audit_score ?? 0), [stats?.audit_score, stats?.compliance_score]);
  const complianceScoreColor = useMemo(() => getScoreColor(complianceScore), [complianceScore]);
  const pendingVisitsTotal = useMemo(() => stats?.pending_visits ?? 0, [stats?.pending_visits]);
  const scheduledAuditsTotal = useMemo(() => stats?.scheduled_audits ?? 0, [stats?.scheduled_audits]);
  const incidentsTotal = useMemo(() => stats?.incidents ?? 0, [stats?.incidents]);
  const scoreBreakdown = useMemo(() => {
    const completedVisits = stats?.completed_visits ?? 0;
    const completedAudits = stats?.completed_audits ?? 0;
    const overdueVisits = stats?.overdue_visits ?? 0;
    const overdueAudits = stats?.overdue_audits ?? 0;
    const openIncidents = stats?.incidents ?? 0;

    const compliantTotal = completedVisits + completedAudits;
    const nonCompliantTotal = overdueVisits + overdueAudits + openIncidents;
    const totalEvents = compliantTotal + nonCompliantTotal;
    const gapFromHundred = Math.max(0, Number((100 - complianceScore).toFixed(2)));

    const factors = [
      {
        key: "overdue_visits",
        label: "Visitas vencidas",
        count: overdueVisits,
        condition: "Resta cuando la visita sigue programada y ya pasó su fecha/hora.",
      },
      {
        key: "overdue_audits",
        label: "Auditorías vencidas",
        count: overdueAudits,
        condition: "Resta cuando la auditoría está programada y no se completa en fecha.",
      },
      {
        key: "incidents",
        label: "Incidencias abiertas",
        count: openIncidents,
        condition: "Resta por cada incidencia activa registrada en la operación.",
      },
    ].map((factor) => {
      const impactOnTotal = totalEvents > 0 ? Number(((factor.count / totalEvents) * 100).toFixed(2)) : 0;
      const shareOfGap = nonCompliantTotal > 0 ? Number(((factor.count / nonCompliantTotal) * gapFromHundred).toFixed(2)) : 0;
      return {
        ...factor,
        impactOnTotal,
        shareOfGap,
      };
    });

    return {
      nonCompliantTotal,
      totalEvents,
      gapFromHundred,
      factors,
    };
  }, [
    complianceScore,
    stats?.completed_audits,
    stats?.completed_visits,
    stats?.incidents,
    stats?.overdue_audits,
    stats?.overdue_visits,
  ]);

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
    const duration = 1100;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedComplianceScore(Math.round(complianceScore * easedProgress));
      setAnimatedPendingVisits(Math.round(pendingVisitsTotal * easedProgress));
      setAnimatedScheduledAudits(Math.round(scheduledAuditsTotal * easedProgress));
      setAnimatedIncidents(Math.round(incidentsTotal * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    setAnimatedComplianceScore(0);
    setAnimatedPendingVisits(0);
    setAnimatedScheduledAudits(0);
    setAnimatedIncidents(0);
    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [complianceScore, incidentsTotal, isLoading, pendingVisitsTotal, scheduledAuditsTotal]);

  return (
    <>
      <DashboardHeader
        title="Panel General"
        description="Vista ejecutiva sin saltos visuales, con foco en visitas, incidencias y auditorías."
      />

      <PageTransition className="relative flex-1 overflow-y-auto p-4 md:p-8">
        <div className="dashboard-lights-motion pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.42)_0%,rgba(146,185,59,0.33)_34%,rgba(255,255,255,0)_68%)] dark:bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.36)_0%,rgba(146,185,59,0.2)_38%,rgba(10,15,20,0)_68%)]" />
        <section className="relative z-10 w-full space-y-5">
          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-12 gap-4 xl:gap-5">
            <article className="col-span-12 xl:col-span-5 2xl:col-span-4 rounded-3xl border border-white/65 bg-white/80 p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="flex h-full min-h-[18rem] flex-col rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 text-center sm:min-h-[22rem] sm:p-6 dark:border-slate-700/70 dark:from-slate-900/55 dark:to-slate-900/35">
                <div className="flex flex-1 flex-col items-center justify-center">
                <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 lg:flex-row lg:items-end lg:gap-4">
                  <div className="flex items-end gap-1">
                    <span className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-[5.6rem] font-black leading-none text-transparent min-[420px]:text-[7rem] md:text-[9rem] xl:text-[12.6rem]">
                      {isLoading ? "..." : animatedComplianceScore}
                    </span>
                    <span className="bg-gradient-to-t from-primary to-professional-green bg-clip-text pb-2 text-[2.1rem] font-bold text-transparent min-[420px]:pb-3 min-[420px]:text-[2.8rem] md:pb-4 md:text-[3.4rem] xl:pb-5 xl:text-[4.5rem]">%</span>
                  </div>
                  <div className="w-full rounded-xl border border-slate-200/80 bg-white/65 px-3 py-3 text-left lg:max-w-sm dark:border-slate-700/70 dark:bg-slate-900/45">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                      Detalle del porcentaje actual
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Diferencia contra 100%: <span className="font-semibold">{scoreBreakdown.gapFromHundred.toFixed(2)}%</span> (eventos no conformes:
                      {" "}
                      <span className="font-semibold">{scoreBreakdown.nonCompliantTotal}</span> de
                      {" "}
                      <span className="font-semibold">{scoreBreakdown.totalEvents}</span>).
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:mt-6 sm:text-base sm:tracking-[0.28em] dark:text-slate-300">Score de cumplimiento</p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-white/65 px-3 py-3 text-left dark:border-slate-700/70 dark:bg-slate-900/45">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                    Factores que influyen en el detalle
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {scoreBreakdown.factors.map((factor) => (
                      <li key={factor.key} className="rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1.5 dark:border-slate-700/70 dark:bg-slate-900/35">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          {factor.label}: {factor.count} · impacto {factor.impactOnTotal.toFixed(2)}% · descuento estimado {factor.shareOfGap.toFixed(2)}%
                        </p>
                        <p>{factor.condition}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 min-[500px]:grid-cols-3">
                  <article className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-900/45">
                    <p className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-4xl font-black leading-none text-transparent sm:text-5xl">
                      {isLoading ? "..." : animatedPendingVisits}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Visitas programadas</p>
                  </article>
                  <article className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-900/45">
                    <p className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-4xl font-black leading-none text-transparent sm:text-5xl">
                      {isLoading ? "..." : animatedScheduledAudits}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Auditorías pendientes</p>
                  </article>
                  <article className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-900/45">
                    <p className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-4xl font-black leading-none text-transparent sm:text-5xl">
                      {isLoading ? "..." : animatedIncidents}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Incidencias existentes</p>
                  </article>
                </div>
              </div>
            </article>

            <article className="col-span-12 xl:col-span-7 2xl:col-span-8 rounded-3xl border border-white/65 bg-white/80 p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Tendencia diaria de cumplimiento</h3>
                  {!isLoading && (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${complianceScoreColor.badge}`}>
                      Cumplimiento: {complianceScore}%
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "month", label: "Últimos 6 meses" },
                    { value: "week", label: "Últimas 6 semanas" },
                    { value: "last6days", label: "Últimos 6 días" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScoreRange(option.value as ScoreRange)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${scoreRange === option.value
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl bg-gradient-to-b from-white to-slate-50 p-2 sm:p-3 dark:from-slate-900/55 dark:to-slate-900/35">
                <div className="relative h-64 w-full min-w-[460px] max-w-4xl sm:h-72 sm:min-w-[520px] lg:min-w-0 lg:max-w-3xl xl:max-w-4xl mx-auto">
                  <div className="absolute inset-0">
                    {[100, 75, 50, 25, 0].map((tick) => (
                      <div key={tick} className="absolute inset-x-0" style={{ bottom: `${tick}%` }}>
                        <div className="border-t border-dashed border-slate-300/75 dark:border-slate-700/70" />
                        <span className="absolute -top-3 left-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500">{tick}%</span>
                      </div>
                    ))}
                  </div>

                  <div key={scoreChartAnimationKey} className="relative z-10 flex h-full items-end gap-1.5 px-4 pb-1 sm:gap-2 sm:px-6">
                    {scoreBars.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                        <span className={`mb-1 text-[10px] font-bold ${item.isPlaceholder ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-200"}`}>
                          {item.score}%
                        </span>
                        <div
                          className={`w-full rounded-t-md ${item.isPlaceholder
                            ? "bg-slate-300 dark:bg-slate-700"
                            : "bg-gradient-to-t from-primary to-professional-green shadow-[0_6px_15px_-8px_rgba(22,163,74,0.65)]"
                            }`}
                          style={{
                            height: `${Math.max(item.score, 2)}%`,
                            opacity: barAnimationProgress,
                            transform: `scaleY(${barAnimationProgress})`,
                            transformOrigin: "bottom",
                            transition: `transform 520ms ease ${index * 45}ms, opacity 420ms ease ${index * 45}ms`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 grid min-w-[460px] max-w-4xl grid-cols-6 gap-2 sm:min-w-[520px] lg:min-w-0 lg:max-w-3xl xl:max-w-4xl mx-auto">
                  {scoreBars.map((item, index) => (
                    <span key={`${item.label}-${index}`} className="truncate text-center text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
            {statsCards.map((item, index) => (
              <Link
                key={item.label}
                href={cardRoutes[item.label as keyof typeof cardRoutes] ?? "/dashboard"}
                className="apple-card-enter group relative overflow-hidden rounded-xl border border-white/65 bg-white/72 px-3 py-3.5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-900/55"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-7 w-7 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-6 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-left text-sm font-semibold text-slate-500 dark:text-slate-400">{item.label}</h3>
                        <p className="mt-1 text-[24px] font-black leading-none text-slate-900 dark:text-white">{item.value}</p>
                      </div>
                      <div className={`inline-flex rounded-lg p-2 ${item.iconStyle}`}>
                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                      </div>
                    </div>
                  </>
                )}
              </Link>
            ))}
          </div>

        </section>
      </PageTransition>
    </>
  );
}
