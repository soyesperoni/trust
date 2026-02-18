"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { GENERAL_ADMIN_ROLE, INSPECTOR_ROLE } from "../../../lib/permissions";
import { getSessionUserEmail } from "../../../lib/session";

type Inspector = { id: number; full_name: string; role: string };

type IncidentDetail = {
  id: number;
  client: string;
  client_id: number;
  branch: string;
  branch_id: number;
  area: string;
  area_id: number;
  dispenser: string;
  dispenser_id: number;
  description: string;
};

const now = new Date();
const initialDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const initialTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

function AgendarVisitaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isLoadingUser } = useCurrentUser();

  const incidentId = searchParams.get("incidentId") ?? "";

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [inspectorId, setInspectorId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!incidentId) {
        setError("Debe seleccionar una incidencia para programar la visita.");
        setIsLoading(false);
        return;
      }

      try {
        const currentUserEmail = getSessionUserEmail();
        const [incidentResponse, usersResponse] = await Promise.all([
          fetch(`/api/incidents/${incidentId}/`, {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/users/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        const incidentPayload = await incidentResponse.json().catch(() => null);
        const usersPayload = await usersResponse.json().catch(() => null);

        if (!incidentResponse.ok) {
          throw new Error(incidentPayload?.error ?? "No se pudo cargar la incidencia.");
        }
        if (!usersResponse.ok) {
          throw new Error(usersPayload?.error ?? "No se pudo cargar la lista de inspectores.");
        }

        if (!mounted) return;

        setIncident(incidentPayload as IncidentDetail);
        setInspectors(
          ((usersPayload?.results ?? []) as Inspector[]).filter((candidate) => candidate.role === "inspector"),
        );
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el formulario.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [incidentId]);

  const isInspector = user?.role === INSPECTOR_ROLE;
  const canSubmit = useMemo(() => !!incident && !!date && !!time && !isSubmitting && (isInspector || !!inspectorId), [incident, date, time, isSubmitting, isInspector, inspectorId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!incident) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const currentUserEmail = getSessionUserEmail();
      const visitedAt = new Date(`${date}T${time}:00`).toISOString();
      const response = await fetch(`/api/incidents/${incident.id}/schedule-visit/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": currentUserEmail,
        },
        body: JSON.stringify({
          ...(isInspector ? {} : { inspector_id: Number(inspectorId) }),
          visited_at: visitedAt,
          notes,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo programar la visita.");
      }

      router.push("/clientes/calendario");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo programar la visita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoadingUser && user?.role !== GENERAL_ADMIN_ROLE && user?.role !== INSPECTOR_ROLE) {
    return (
      <PageTransition className="flex-1 p-6 md:p-8">
        <div className="max-w-3xl mx-auto rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Solo el administrador general y el inspector asignado al cliente pueden programar visitas desde incidencias.
        </div>
      </PageTransition>
    );
  }

  return (
    <>
      <DashboardHeader title="Agendar Visita" description="Programa una visita usando los datos reales de la incidencia." />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto rounded-xl border border-slate-100 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27]">
          {isLoading ? <p className="text-slate-500">Cargando incidencia...</p> : null}
          {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p> : null}

          {incident ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-600 dark:text-slate-300">Cliente
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" readOnly value={incident.client} />
                </label>
                <label className="text-sm text-slate-600 dark:text-slate-300">Sucursal
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" readOnly value={incident.branch} />
                </label>
                <label className="text-sm text-slate-600 dark:text-slate-300">Área
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" readOnly value={incident.area} />
                </label>
                <label className="text-sm text-slate-600 dark:text-slate-300">Dosificador
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" readOnly value={incident.dispenser} />
                </label>
              </div>

              {!isInspector ? (
                <label className="block text-sm text-slate-600 dark:text-slate-300">Inspector
                  <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" onChange={(e) => setInspectorId(e.target.value)} required value={inspectorId}>
                    <option value="">Seleccione inspector</option>
                    {inspectors.map((inspector) => (
                      <option key={inspector.id} value={inspector.id}>{inspector.full_name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-600 dark:text-slate-300">Fecha
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" onChange={(e) => setDate(e.target.value)} required type="date" value={date} />
                </label>
                <label className="text-sm text-slate-600 dark:text-slate-300">Hora
                  <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" onChange={(e) => setTime(e.target.value)} required type="time" value={time} />
                </label>
              </div>

              <label className="block text-sm text-slate-600 dark:text-slate-300">Observaciones
                <textarea className="mt-1 h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" onChange={(e) => setNotes(e.target.value)} placeholder="Instrucciones para la visita programada." value={notes} />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" onClick={() => router.push("/clientes/incidencias")} type="button">Cancelar</button>
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60" disabled={!canSubmit} type="submit">
                  {isSubmitting ? "Programando..." : "Programar visita"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </PageTransition>
    </>
  );
}

export default function AgendarVisitaPage() {
  return (
    <Suspense
      fallback={
        <PageTransition className="flex-1 p-6 md:p-8">
          <p className="text-slate-500">Cargando formulario...</p>
        </PageTransition>
      }
    >
      <AgendarVisitaPageContent />
    </Suspense>
  );
}
