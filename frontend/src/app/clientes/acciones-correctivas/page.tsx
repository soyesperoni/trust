"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import type {
  CorrectiveActionRecord,
  CorrectiveActionStatus,
} from "../../components/CorrectiveActionPanel";
import { getSessionUserEmail } from "../../lib/session";

type UserOption = {
  id: number;
  full_name: string;
  email: string;
  is_active?: boolean;
};

const STATUS_META: Record<
  CorrectiveActionStatus,
  { label: string; badge: string; dot: string }
> = {
  open: {
    label: "Abierta",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  in_progress: {
    label: "En curso",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  closed: {
    label: "Cerrada",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100";

const LABEL_CLASS =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

const formatDateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "Sin fecha";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toFileUrl = (value: string | null | undefined) => {
  if (!value) return null;
  if (value.startsWith("data:") || /^https?:\/\//i.test(value)) return value;
  if (typeof window === "undefined") return value;
  return `${window.location.origin}${value.startsWith("/") ? "" : "/"}${value}`;
};

const originHref = (action: CorrectiveActionRecord) =>
  action.incident_id
    ? `/clientes/incidencias/${action.incident_id}/detalle`
    : `/clientes/auditorias/${action.audit_id}/informe`;

const originText = (action: CorrectiveActionRecord) =>
  action.incident_id
    ? `Incidencia #${action.incident_id}`
    : `Hallazgo / auditoría #${action.audit_id}`;

export default function AccionesCorrectivasPage() {
  const [actions, setActions] = useState<CorrectiveActionRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users/", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const rows: UserOption[] = Array.isArray(data?.results) ? data.results : [];
        if (isMounted) {
          setUsers(rows.filter((user) => user.is_active !== false));
        }
      } catch {
        // El filtro de responsable queda vacío si no se pueden cargar usuarios.
      }
    };
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadActions = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (responsibleFilter) params.set("responsible_id", responsibleFilter);
        if (dateFrom) params.set("due_date_from", dateFrom);
        if (dateTo) params.set("due_date_to", dateTo);
        const query = params.toString();

        const response = await fetch(
          `/api/corrective-actions/${query ? `?${query}` : ""}`,
          {
            cache: "no-store",
            headers: { "x-current-user-email": getSessionUserEmail() },
            signal: controller.signal,
          },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "No se pudieron cargar las acciones correctivas.",
          );
        }
        if (!isMounted) return;
        setActions(Array.isArray(data?.results) ? data.results : []);
        setError(null);
      } catch (loadError) {
        if (!isMounted || controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las acciones correctivas.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadActions();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [dateFrom, dateTo, responsibleFilter, statusFilter]);

  const filteredActions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return actions;
    return actions.filter((action) =>
      [
        action.description,
        action.responsible,
        action.client,
        action.branch,
        action.area,
        `#${action.incident_id ?? action.audit_id ?? action.id}`,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [actions, searchTerm]);

  const summary = useMemo(
    () => ({
      total: actions.length,
      open: actions.filter((action) => action.status === "open").length,
      inProgress: actions.filter((action) => action.status === "in_progress").length,
      closed: actions.filter((action) => action.status === "closed").length,
      overdue: actions.filter((action) => action.is_overdue).length,
    }),
    [actions],
  );

  const clearFilters = () => {
    setStatusFilter("");
    setResponsibleFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
  };

  const hasFilters = Boolean(
    statusFilter || responsibleFilter || dateFrom || dateTo || searchTerm,
  );

  return (
    <>
      <DashboardHeader
        title="Acciones correctivas"
        description="Seguimiento hasta el cierre de incidencias y hallazgos."
        showSearch={false}
      />

      <PageTransition>
        <section className="w-full flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-[#161e27] dark:text-slate-200">
                Total {summary.total}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                Abiertas {summary.open}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                En curso {summary.inProgress}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                Cerradas {summary.closed}
              </span>
              {summary.overdue > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  Vencidas {summary.overdue}
                </span>
              ) : null}
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#161e27] dark:text-slate-200"
              href="/clientes/incidencias"
            >
              <span className="material-symbols-outlined text-[18px]">report_problem</span>
              Ir a incidencias
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-[#161e27] md:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="filter-status">
                  Estado
                </label>
                <select
                  className={FIELD_CLASS}
                  id="filter-status"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="">Todos los estados</option>
                  <option value="open">Abierta</option>
                  <option value="in_progress">En curso</option>
                  <option value="closed">Cerrada</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="filter-responsible">
                  Responsable
                </label>
                <select
                  className={FIELD_CLASS}
                  id="filter-responsible"
                  onChange={(event) => setResponsibleFilter(event.target.value)}
                  value={responsibleFilter}
                >
                  <option value="">Todos los responsables</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="filter-date-from">
                  Vence desde
                </label>
                <input
                  className={FIELD_CLASS}
                  id="filter-date-from"
                  onChange={(event) => setDateFrom(event.target.value)}
                  type="date"
                  value={dateFrom}
                />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="filter-date-to">
                  Vence hasta
                </label>
                <input
                  className={FIELD_CLASS}
                  id="filter-date-to"
                  onChange={(event) => setDateTo(event.target.value)}
                  type="date"
                  value={dateTo}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  search
                </span>
                <input
                  className={`${FIELD_CLASS} pl-9`}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por descripción, responsable, cliente o área"
                  type="search"
                  value={searchTerm}
                />
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={!hasFilters}
                onClick={clearFilters}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                Limpiar filtros
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Acción</th>
                    <th className="px-4 py-3 font-semibold">Origen</th>
                    <th className="px-4 py-3 font-semibold">Responsable</th>
                    <th className="px-4 py-3 font-semibold">Fecha límite</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Evidencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                        Cargando acciones correctivas...
                      </td>
                    </tr>
                  ) : filteredActions.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                        {hasFilters
                          ? "No hay acciones correctivas que coincidan con los filtros."
                          : "No hay acciones correctivas registradas."}
                      </td>
                    </tr>
                  ) : (
                    filteredActions.map((action) => {
                      const statusMeta = STATUS_META[action.status] ?? STATUS_META.open;
                      const evidenceUrl = toFileUrl(
                        action.closure_evidence_url ?? action.closure_evidence,
                      );
                      return (
                        <tr
                          className="align-top transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          key={action.id}
                        >
                          <td className="max-w-[320px] px-4 py-4">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {action.description}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {action.client} · {action.branch} · {action.area}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                              href={originHref(action)}
                            >
                              <span className="material-symbols-outlined text-[16px]">link</span>
                              {originText(action)}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {action.responsible}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {action.responsible_email || "Sin correo"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p
                              className={`font-semibold ${
                                action.is_overdue
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {formatDateOnly(action.due_date)}
                            </p>
                            {action.is_overdue ? (
                              <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                Vencida
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusMeta.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                              {action.status_label || statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {evidenceUrl ? (
                              <a
                                className="inline-flex items-center gap-2 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                                href={evidenceUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <img
                                  alt="Evidencia de cierre"
                                  className="h-9 w-9 rounded object-cover"
                                  src={evidenceUrl}
                                />
                                Ver
                              </a>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {isLoading ? (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#161e27] dark:text-slate-400">
                Cargando acciones correctivas...
              </p>
            ) : filteredActions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#161e27] dark:text-slate-400">
                {hasFilters
                  ? "No hay acciones correctivas que coincidan con los filtros."
                  : "No hay acciones correctivas registradas."}
              </p>
            ) : (
              filteredActions.map((action) => {
                const statusMeta = STATUS_META[action.status] ?? STATUS_META.open;
                const evidenceUrl = toFileUrl(
                  action.closure_evidence_url ?? action.closure_evidence,
                );
                return (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27]"
                    key={action.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusMeta.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                        {action.status_label || statusMeta.label}
                      </span>
                      {action.is_overdue ? (
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          Vencida
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
                      {action.description}
                    </p>

                    <Link
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300"
                      href={originHref(action)}
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      {originText(action)}
                    </Link>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Responsable
                        </span>
                        <span className="text-right font-semibold text-slate-800 dark:text-slate-100">
                          {action.responsible}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Fecha límite
                        </span>
                        <span
                          className={`text-right font-semibold ${
                            action.is_overdue
                              ? "text-red-700 dark:text-red-300"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {formatDateOnly(action.due_date)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Ubicación
                        </span>
                        <span className="text-right font-medium text-slate-700 dark:text-slate-300">
                          {action.client} · {action.branch} · {action.area}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Evidencia
                        </span>
                        {evidenceUrl ? (
                          <a
                            className="inline-flex items-center gap-1.5 text-right font-semibold text-blue-700 hover:underline dark:text-blue-300"
                            href={evidenceUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <img
                              alt="Evidencia de cierre"
                              className="h-8 w-8 rounded object-cover"
                              src={evidenceUrl}
                            />
                            Ver
                          </a>
                        ) : (
                          <span className="text-right font-medium text-slate-500 dark:text-slate-400">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </PageTransition>
    </>
  );
}
