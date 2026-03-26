"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";
import { getSessionUserEmail } from "../lib/session";

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
  audit_score: number;
};

type DailyAuditScore = {
  date: string;
  score: number;
  audits: number;
};

type ScheduledDetail = {
  date: string;
  total: number;
  first_time: string | null;
  last_time: string | null;
};

type ScoreRange = "month" | "week" | "fortnight";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyAuditScoreHistory, setDailyAuditScoreHistory] = useState<DailyAuditScore[]>([]);
  const [pendingVisitDetails, setPendingVisitDetails] = useState<ScheduledDetail[]>([]);
  const [scheduledAuditDetails, setScheduledAuditDetails] = useState<ScheduledDetail[]>([]);
  const [scoreRange, setScoreRange] = useState<ScoreRange>("fortnight");
  const [barAnimationProgress, setBarAnimationProgress] = useState(0);
  const [scoreChartAnimationKey, setScoreChartAnimationKey] = useState(0);
  const [animatedAuditScore, setAnimatedAuditScore] = useState(0);
  const [animatedPendingVisits, setAnimatedPendingVisits] = useState(0);
  const [animatedScheduledAudits, setAnimatedScheduledAudits] = useState(0);
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
        setDailyAuditScoreHistory(dashboardData.daily_audit_score_history ?? []);
        setPendingVisitDetails(dashboardData.pending_visit_details ?? []);
        setScheduledAuditDetails(dashboardData.scheduled_audit_details ?? []);
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

  const auditScore = useMemo(() => Math.round(stats?.audit_score ?? 0), [stats?.audit_score]);
  const auditScoreColor = useMemo(() => getScoreColor(auditScore), [auditScore]);
  const pendingVisitsTotal = useMemo(() => stats?.pending_visits ?? 0, [stats?.pending_visits]);
  const scheduledAuditsTotal = useMemo(() => stats?.scheduled_audits ?? 0, [stats?.scheduled_audits]);

  const scoreBars = useMemo(() => {
    const sanitized = dailyAuditScoreHistory
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

    const dayCount = 15;
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
  }, [dailyAuditScoreHistory, scoreRange]);

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
      setAnimatedAuditScore(Math.round(auditScore * easedProgress));
      setAnimatedPendingVisits(Math.round(pendingVisitsTotal * easedProgress));
      setAnimatedScheduledAudits(Math.round(scheduledAuditsTotal * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    setAnimatedAuditScore(0);
    setAnimatedPendingVisits(0);
    setAnimatedScheduledAudits(0);
    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [auditScore, isLoading, pendingVisitsTotal, scheduledAuditsTotal]);

  const formatScheduleDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" });

  const formatTimeRange = (detail: ScheduledDetail) => {
    if (!detail.first_time && !detail.last_time) return "Hora por definir";
    if (detail.first_time === detail.last_time) return detail.first_time;
    return `${detail.first_time ?? "--:--"} - ${detail.last_time ?? "--:--"}`;
  };

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

          <div className="grid grid-cols-12 gap-4">
            <article className="col-span-12 lg:col-span-4 rounded-3xl border border-white/65 bg-white/80 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-6 text-center dark:border-slate-700/70 dark:from-slate-900/55 dark:to-slate-900/35">
                <div className="mt-4 flex items-end gap-1">
                  <span className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-[12.6rem] font-black leading-none text-transparent">
                    {isLoading ? "..." : animatedAuditScore}
                  </span>
                  <span className="bg-gradient-to-t from-primary to-professional-green bg-clip-text pb-5 text-[4.5rem] font-bold text-transparent">%</span>
                </div>
                <p className="mt-6 text-base font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Score actual</p>
              </div>
            </article>

            <article className="col-span-12 lg:col-span-8 rounded-3xl border border-white/65 bg-white/80 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tendencia diaria de score</h3>
                  {!isLoading && (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${auditScoreColor.badge}`}>
                      Score: {auditScore}%
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {[
                    { value: "month", label: "Últimos 6 meses" },
                    { value: "week", label: "Últimas 6 semanas" },
                    { value: "fortnight", label: "15 días" },
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

              <div className="mt-5 bg-gradient-to-b from-white to-slate-50 p-3 dark:from-slate-900/55 dark:to-slate-900/35">
                <div className="relative h-72 w-full">
                  <div className="absolute inset-0">
                    {[100, 75, 50, 25, 0].map((tick) => (
                      <div key={tick} className="absolute inset-x-0" style={{ bottom: `${tick}%` }}>
                        <div className="border-t border-dashed border-slate-300/75 dark:border-slate-700/70" />
                        <span className="absolute -top-3 left-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500">{tick}%</span>
                      </div>
                    ))}
                  </div>

                  <div key={scoreChartAnimationKey} className="relative z-10 flex h-full items-end gap-2 px-6 pb-1">
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
                <div className={`mt-2 grid gap-2 ${scoreRange === "month" || scoreRange === "week" ? "grid-cols-6" : "grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-[repeat(15,minmax(0,1fr))]"}`}>
                  {scoreBars.map((item, index) => (
                    <span key={`${item.label}-${index}`} className="truncate text-center text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {statsCards.map((item, index) => (
              <article
                key={item.label}
                className="apple-card-enter group relative overflow-hidden rounded-xl border border-white/65 bg-white/72 px-3 py-3.5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55"
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-[22px] font-black leading-none text-slate-900 dark:text-white">{item.value}</p>
                        <h3 className="truncate text-left text-sm font-semibold text-slate-500 dark:text-slate-400">{item.label}</h3>
                      </div>
                      <div className={`inline-flex rounded-lg p-2 ${item.iconStyle}`}>
                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="apple-card-enter rounded-2xl border border-white/65 bg-white/78 p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Pendiente</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Visitas programadas</h3>
                </div>
                <div className="text-right">
                  <p className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-4xl font-black leading-none text-transparent">
                    {isLoading ? "..." : animatedPendingVisits}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">visitas</p>
                </div>
              </div>
              <div className="space-y-2">
                {pendingVisitDetails.length ? pendingVisitDetails.map((detail) => (
                  <div key={`${detail.date}-visit`} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/45">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatScheduleDate(detail.date)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeRange(detail)}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary dark:bg-primary/20">{detail.total}</span>
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Sin visitas pendientes programadas.</p>}
              </div>
            </article>

            <article className="apple-card-enter rounded-2xl border border-white/65 bg-white/78 p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Programadas</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Auditorías pendientes</h3>
                </div>
                <div className="text-right">
                  <p className="bg-gradient-to-t from-primary to-professional-green bg-clip-text text-4xl font-black leading-none text-transparent">
                    {isLoading ? "..." : animatedScheduledAudits}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">auditorías</p>
                </div>
              </div>
              <div className="space-y-2">
                {scheduledAuditDetails.length ? scheduledAuditDetails.map((detail) => (
                  <div key={`${detail.date}-audit`} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/45">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatScheduleDate(detail.date)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Horario: {formatTimeRange(detail)}</p>
                    </div>
                    <span className="rounded-full bg-professional-green/15 px-2.5 py-1 text-xs font-bold text-professional-green dark:bg-professional-green/25">{detail.total}</span>
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Sin auditorías programadas pendientes.</p>}
              </div>
            </article>
          </div>
        </section>
      </PageTransition>
    </>
  );
}
