"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";
import { GENERAL_ADMIN_ROLE } from "../../lib/permissions";
import { getSessionUserEmail } from "../../lib/session";
import { useCurrentUser } from "../../hooks/useCurrentUser";

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

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const resolveStatusClass = (status: string) => {
  if (status === "completed") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (status === "scheduled") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
};

export default function AuditoriasPage() {
  const { user } = useCurrentUser();
  const canCreate = user?.role === GENERAL_ADMIN_ROLE;

  const [audits, setAudits] = useState<AuditApi[]>([]);
  const [areas, setAreas] = useState<Array<{ id: number; name: string; branch: { id: number; name: string; client: { id: number; name: string } } }>>([]);
  const [forms, setForms] = useState<Array<{ id: number; name: string; is_active: boolean }>>([]);
  const [inspectors, setInspectors] = useState<Array<{ id: number; full_name: string; role: string }>>([]);
  const [areaId, setAreaId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [auditedAt, setAuditedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const currentUserEmail = getSessionUserEmail();
    const [auditsResponse, areasResponse, usersResponse, formsResponse] = await Promise.all([
      fetch("/api/audits/", {
        cache: "no-store",
        headers: { "x-current-user-email": currentUserEmail },
      }),
      fetch("/api/areas/", {
        cache: "no-store",
        headers: { "x-current-user-email": currentUserEmail },
      }),
      fetch("/api/users/", {
        cache: "no-store",
        headers: { "x-current-user-email": currentUserEmail },
      }),
      fetch("/api/audits/forms/", {
        cache: "no-store",
        headers: { "x-current-user-email": currentUserEmail },
      }),
    ]);

    const [auditsPayload, areasPayload, usersPayload, formsPayload] = await Promise.all([
      auditsResponse.json(),
      areasResponse.json(),
      usersResponse.json(),
      formsResponse.json(),
    ]);

    if (!auditsResponse.ok) throw new Error(auditsPayload.error || "No se pudieron cargar las auditorías.");
    if (!areasResponse.ok) throw new Error(areasPayload.error || "No se pudieron cargar las áreas.");
    if (!usersResponse.ok) throw new Error(usersPayload.error || "No se pudieron cargar los usuarios.");
    if (!formsResponse.ok) throw new Error(formsPayload.error || "No se pudieron cargar los formularios.");

    setAudits((auditsPayload.results ?? []) as AuditApi[]);
    setAreas((areasPayload.results ?? []) as Array<{ id: number; name: string; branch: { id: number; name: string; client: { id: number; name: string } } }>);
    setForms((formsPayload.results ?? []) as Array<{ id: number; name: string; is_active: boolean }>);
    setInspectors(
      ((usersPayload.results ?? []) as Array<{ id: number; full_name: string; role: string }>).filter(
        (candidate) => candidate.role === "inspector",
      ),
    );
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        await loadData();
        if (!isMounted) return;
        setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las auditorías.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const completed = audits.filter((audit) => audit.status === "completed");
    const pending = audits.filter((audit) => audit.status !== "completed").length;
    const scores = completed
      .map((audit) => resolveScore(audit))
      .filter((score): score is number => score !== null);
    const average = scores.length ? Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length) : 0;
    const failed = completed.filter((audit) => {
      const score = resolveScore(audit);
      return score !== null && score < 70;
    }).length;

    return {
      total: audits.length,
      average,
      pending,
      failed,
    };
  }, [audits]);

  const filteredAudits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return audits.filter((audit) => {
      if (!query) return true;
      return [
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
    });
  }, [audits, search]);

  const handleCreateAudit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!areaId) return;

    setError(null);
    setIsCreating(true);
    try {
      const response = await fetch("/api/audits/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          area_id: Number(areaId),
          inspector_id: inspectorId ? Number(inspectorId) : null,
          audited_at: auditedAt ? new Date(auditedAt).toISOString() : undefined,
          notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo crear la auditoría.");

      setAreaId("");
      setInspectorId("");
      setAuditedAt("");
      setNotes("");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la auditoría.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Gestión de Auditorías"
        description="Revisa, filtra y agenda auditorías conectadas al backend de Django por alcance de usuario."
        searchPlaceholder="Buscar auditorías, clientes o áreas..."
        searchValue={search}
        onSearchChange={setSearch}
        action={
          <Link
            href="/clientes/auditorias/formularios"
            className="bg-slate-900 text-white hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            Formularios
          </Link>
        }
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Auditorías" value={String(stats.total)} />
          <StatCard label="Puntaje Promedio" value={`${stats.average}%`} valueClassName="text-green-600" />
          <StatCard label="Pendientes" value={String(stats.pending)} valueClassName="text-amber-500" />
          <StatCard label="Fallidas" value={String(stats.failed)} valueClassName="text-red-500" />
        </div>

        {canCreate ? (
          <form
            onSubmit={handleCreateAudit}
            className="bg-white dark:bg-[#161e27] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <label className="text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-1">
              Área
              <select
                required
                value={areaId}
                onChange={(event) => setAreaId(event.target.value)}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="">Selecciona un área</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} · {area.branch.name} · {area.branch.client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-1">
              Inspector
              <select
                value={inspectorId}
                onChange={(event) => setInspectorId(event.target.value)}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="">Sin asignar</option>
                {inspectors.map((inspector) => (
                  <option key={inspector.id} value={inspector.id}>
                    {inspector.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-1">
              Fecha y hora
              <input
                value={auditedAt}
                onChange={(event) => setAuditedAt(event.target.value)}
                type="datetime-local"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-1 md:col-span-4">
              Notas
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                type="text"
                placeholder="Instrucciones para el inspector"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </label>

            <div className="md:col-span-4 flex justify-end">
              <button
                disabled={isCreating}
                className="bg-green-600 text-white hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                {isCreating ? "Agendando..." : "Nueva Auditoría desde Plantilla"}
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="bg-white dark:bg-[#161e27] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Cliente / Sucursal</th>
                  <th className="px-4 py-3 font-semibold">Área</th>
                  <th className="px-4 py-3 font-semibold">Formulario</th>
                  <th className="px-4 py-3 font-semibold">Auditor</th>
                  <th className="px-4 py-3 font-semibold">Resultado</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && filteredAudits.map((audit) => {
                  const score = resolveScore(audit);
                  return (
                    <tr key={audit.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-semibold">#AUD-{audit.id}</td>
                      <td className="px-4 py-3">{formatDate(audit.audited_at)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{audit.client}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{audit.branch}</div>
                      </td>
                      <td className="px-4 py-3">{audit.area}</td>
                      <td className="px-4 py-3">{audit.form_name ?? "Sin plantilla"}</td>
                      <td className="px-4 py-3">{audit.inspector}</td>
                      <td className="px-4 py-3 font-semibold">{score === null ? "--" : `${score}%`}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${resolveStatusClass(audit.status)}`}>
                          {audit.status_label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isLoading && filteredAudits.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay auditorías para mostrar con los filtros actuales.
            </div>
          ) : null}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Visualizas únicamente auditorías del alcance permitido por área, sucursal o cliente según tu usuario en Django.
          Plantillas activas disponibles: {forms.filter((form) => form.is_active).length}.
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
