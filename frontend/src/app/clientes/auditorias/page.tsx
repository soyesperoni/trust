"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { getSessionUserEmail } from "../../lib/session";

type AuditApi = {
  id: number;
  client: string;
  branch: string;
  area: string;
  form_name?: string;
  inspector: string;
  audited_at: string;
  status: string;
  status_label: string;
  audit_report: {
    score?: number;
    summary?: {
      score?: number;
    };
  } | null;
};

type User = {
  id: number;
  full_name: string;
};

const mobileFilters = [
  { label: "Todas", value: "all" as const },
  { label: "Programadas", value: "programada" as const },
  { label: "Finalizadas", value: "finalizada" as const },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      date: "Sin fecha",
      time: "--:--",
    };
  }

  return {
    date: date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const resolveScore = (audit: AuditApi) => {
  const score =
    typeof audit.audit_report?.score === "number"
      ? audit.audit_report.score
      : typeof audit.audit_report?.summary?.score === "number"
        ? audit.audit_report.summary.score
        : null;

  if (score === null) return null;
  if (score <= 1) return Math.round(score * 100);
  return Math.round(score);
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const auditType = (status?: string) => (status === "completed" ? "Finalizada" : "Programada");

const typeStyles: Record<string, string> = {
  Finalizada:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-900/60",
  Programada:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/60",
};

export default function AuditoriasPage() {
  const [audits, setAudits] = useState<AuditApi[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInspector, setSelectedInspector] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof mobileFilters)[number]["value"]>("finalizada");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [auditsResponse, usersResponse] = await Promise.all([
          fetch("/api/audits/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/users/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        if (!auditsResponse.ok || !usersResponse.ok) {
          throw new Error("No se pudieron cargar las auditorías.");
        }

        const [auditsPayload, usersPayload] = await Promise.all([auditsResponse.json(), usersResponse.json()]);

        if (!isMounted) return;

        setAudits((auditsPayload.results ?? []) as AuditApi[]);
        setInspectors((usersPayload.results ?? []) as User[]);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las auditorías.");
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const completed = audits.filter((audit) => audit.status === "completed");
    const scores = completed.map((audit) => resolveScore(audit)).filter((score): score is number => score !== null);
    const average = scores.length ? Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length) : 0;

    return {
      total: audits.length,
      completed: completed.length,
      pending: audits.length - completed.length,
      average,
    };
  }, [audits]);

  const filteredAudits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return audits.filter((audit) => {
      const typeLabel = auditType(audit.status);
      const mappedFilter = typeLabel === "Programada" ? "programada" : "finalizada";
      const matchesFilter = activeFilter === "all" || activeFilter === mappedFilter;
      const matchesInspector = !selectedInspector || audit.inspector === selectedInspector;
      const matchesQuery =
        !query ||
        [
          `#AUD-${audit.id}`,
          audit.client,
          audit.branch,
          audit.area,
          audit.inspector,
          audit.form_name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesInspector && matchesQuery;
    });
  }, [activeFilter, audits, searchTerm, selectedInspector]);

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando auditorías...";
    if (error) return error;
    return "No hay auditorías que coincidan con los filtros aplicados.";
  }, [error, isLoading]);

  return (
    <>
      <DashboardHeader
        title="Historial de Auditorías"
        description="Consulta auditorías realizadas y aplica filtros por inspector, estado o texto."
        action={
          <Link
            href="/clientes/auditorias/plantillas"
            className="bg-slate-900 text-white hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            Plantillas
          </Link>
        }
      />

      <div className="md:hidden px-4 pt-3 pb-2 sticky top-16 z-20 bg-white/95 dark:bg-[#161e27]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 shadow-sm">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200 w-full placeholder-slate-500 dark:placeholder-slate-400 text-base"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar auditorías..."
            type="text"
            value={searchTerm}
          />
        </div>
      </div>

      <div className="md:hidden pl-4 pr-0 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pr-4">
          {mobileFilters.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="md:hidden flex-1 px-4 pb-32 pt-2 space-y-4 overflow-y-auto">
        {filteredAudits.map((audit) => {
          const typeLabel = auditType(audit.status);
          const formatted = formatDate(audit.audited_at);
          const score = resolveScore(audit);

          return (
            <article
              key={audit.id}
              className="bg-white dark:bg-[#161e27] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">ID #AUD-{audit.id}</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{audit.client}</h3>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                    typeLabel === "Programada" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {typeLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-2">
                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">store</span>
                <span>{audit.branch}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-1">
                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">schedule</span>
                <span>{formatted.date} · {formatted.time}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                  <p className="text-slate-500">Inspector</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{audit.inspector}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                  <p className="text-slate-500">Puntaje</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{score == null ? "--" : `${score}%`}</p>
                </div>
              </div>
            </article>
          );
        })}

        {filteredAudits.length === 0 ? (
          <div className="bg-white dark:bg-[#161e27] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 text-center">
            {emptyMessage}
          </div>
        ) : null}
      </section>

      <PageTransition className="hidden flex-1 flex-col overflow-y-auto md:flex">
        <div className="hidden shrink-0 px-4 pb-2 pt-6 md:block md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total" value={String(stats.total)} />
            <StatCard label="Finalizadas" value={String(stats.completed)} valueClassName="text-green-600" />
            <StatCard label="Programadas" value={String(stats.pending)} valueClassName="text-amber-500" />
            <StatCard label="Puntaje promedio" value={`${stats.average}%`} />
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27] lg:flex-row">
            <div className="flex w-full flex-col gap-4 lg:flex-row">
              <div className="relative w-full lg:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cliente, sucursal o área..."
                  type="text"
                  value={searchTerm}
                />
              </div>

              <div className="relative w-full lg:w-48">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">person_search</span>
                <select
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm text-slate-500 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  onChange={(event) => setSelectedInspector(event.target.value)}
                  value={selectedInspector}
                >
                  <option value="">Todos los inspectores</option>
                  {inspectors.map((inspector) => (
                    <option key={inspector.id} value={inspector.full_name}>
                      {inspector.full_name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">expand_more</span>
              </div>

              <div className="relative w-full lg:w-44">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">task_alt</span>
                <select
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm text-slate-500 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  onChange={(event) => setActiveFilter(event.target.value as (typeof mobileFilters)[number]["value"])}
                  value={activeFilter}
                >
                  {mobileFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:block md:p-8">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <div className="custom-scrollbar flex-1 overflow-x-auto">
              <table className="min-w-[1000px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente / Sucursal</th>
                    <th className="px-6 py-4">Área</th>
                    <th className="px-6 py-4">Plantillas</th>
                    <th className="px-6 py-4">Inspector</th>
                    <th className="px-6 py-4">Puntaje</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {filteredAudits.map((audit) => {
                    const formatted = formatDate(audit.audited_at);
                    const typeLabel = auditType(audit.status);
                    const score = resolveScore(audit);

                    return (
                      <tr key={audit.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{formatted.date}</div>
                          <div className="text-xs text-slate-500">{formatted.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {getInitials(audit.client)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{audit.client}</div>
                              <div className="text-xs text-slate-500">{audit.branch}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{audit.area}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{audit.form_name ?? "Sin plantilla"}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{audit.inspector}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                          {score == null ? "--" : `${score}%`}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                              typeStyles[typeLabel] ?? typeStyles.Finalizada
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}

function StatCard({ label, value, valueClassName = "" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white dark:bg-[#161e27] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-black text-slate-900 dark:text-white ${valueClassName}`}>{value}</p>
    </div>
  );
}
