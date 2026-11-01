"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getSessionUserEmail } from "../lib/session";

export type CorrectiveActionStatus = "open" | "in_progress" | "closed";

export type CorrectiveActionRecord = {
  id: number;
  origin_type: "incident" | "audit_finding";
  origin_type_label: string;
  incident_id: number | null;
  audit_id: number | null;
  client_id: number;
  client: string;
  branch_id: number;
  branch: string;
  area_id: number;
  area: string;
  description: string;
  responsible_id: number;
  responsible: string;
  responsible_email: string;
  due_date: string;
  status: CorrectiveActionStatus;
  status_label: string;
  is_overdue: boolean;
  closure_evidence: string | null;
  closure_evidence_url: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type UserOption = {
  id: number;
  full_name: string;
  email: string;
  username: string;
  is_active?: boolean;
};

type OriginOption = {
  value: string;
  label: string;
  kind: "incident" | "audit_finding";
};

type CorrectiveActionPanelProps = {
  fixedOrigin?: {
    type: "incident" | "audit_finding";
    id: number;
    label?: string;
  };
  areaId?: number;
  areaLabel?: string;
  title?: string;
  description?: string;
  className?: string;
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

const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
};

export default function CorrectiveActionPanel({
  fixedOrigin,
  areaId,
  areaLabel,
  title = "Acciones correctivas",
  description = "Planifica, asigna y cierra acciones vinculadas a incidencias o hallazgos.",
  className = "",
}: CorrectiveActionPanelProps) {
  const fixedOriginType = fixedOrigin?.type;
  const fixedOriginId = fixedOrigin?.id;
  const fixedOriginLabel = fixedOrigin?.label;

  const [actions, setActions] = useState<CorrectiveActionRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [originOptions, setOriginOptions] = useState<OriginOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originKey, setOriginKey] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formStatus, setFormStatus] = useState<CorrectiveActionStatus>("open");
  const [formEvidence, setFormEvidence] = useState<File | null>(null);

  const [evidenceActionId, setEvidenceActionId] = useState<number | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [closeOnEvidence, setCloseOnEvidence] = useState(false);

  const editingAction = useMemo(
    () => actions.find((action) => action.id === editingId) ?? null,
    [actions, editingId],
  );

  const loadActions = useCallback(async () => {
    try {
      const currentUserEmail = getSessionUserEmail();
      const query =
        fixedOriginType && fixedOriginId
          ? `?${fixedOriginType === "incident" ? "incident_id" : "audit_id"}=${fixedOriginId}`
          : "";
      const response = await fetch(`/api/corrective-actions/${query}`, {
        cache: "no-store",
        headers: { "x-current-user-email": currentUserEmail },
      });
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudieron cargar las acciones correctivas."),
        );
      }
      const data = await response.json();
      const rows: CorrectiveActionRecord[] = Array.isArray(data?.results)
        ? data.results
        : [];
      setActions(
        !fixedOriginType && areaId
          ? rows.filter((action) => action.area_id === areaId)
          : rows,
      );
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las acciones correctivas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [areaId, fixedOriginId, fixedOriginType]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

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
        // El selector de responsable queda vacío si no se pueden cargar usuarios.
      }
    };
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (fixedOriginType || !areaId) return;
    let isMounted = true;
    const loadOrigins = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const headers = { "x-current-user-email": currentUserEmail };
        const [incidentsResponse, auditsResponse] = await Promise.all([
          fetch("/api/incidents/", { cache: "no-store", headers }),
          fetch("/api/audits/", { cache: "no-store", headers }),
        ]);
        const incidentsData = incidentsResponse.ok
          ? await incidentsResponse.json()
          : { results: [] };
        const auditsData = auditsResponse.ok
          ? await auditsResponse.json()
          : { results: [] };
        if (!isMounted) return;

        const incidentOptions: OriginOption[] = (
          Array.isArray(incidentsData?.results) ? incidentsData.results : []
        )
          .filter((incident: { area_id?: number }) => incident.area_id === areaId)
          .map((incident: { id: number; description?: string }) => ({
            value: `incident:${incident.id}`,
            label: `Incidencia #${incident.id}${
              incident.description ? ` - ${incident.description.slice(0, 60)}` : ""
            }`,
            kind: "incident" as const,
          }));

        const auditOptions: OriginOption[] = (
          Array.isArray(auditsData?.results) ? auditsData.results : []
        )
          .filter((audit: { area_id?: number }) => audit.area_id === areaId)
          .map((audit: { id: number; form_name?: string }) => ({
            value: `audit_finding:${audit.id}`,
            label: `Hallazgo de auditoría #${audit.id}${
              audit.form_name ? ` - ${audit.form_name}` : ""
            }`,
            kind: "audit_finding" as const,
          }));

        setOriginOptions([...incidentOptions, ...auditOptions]);
      } catch {
        if (isMounted) setOriginOptions([]);
      }
    };
    loadOrigins();
    return () => {
      isMounted = false;
    };
  }, [areaId, fixedOriginType]);

  const resetForm = () => {
    setFormMode(null);
    setEditingId(null);
    setOriginKey("");
    setFormDescription("");
    setResponsibleId("");
    setDueDate("");
    setFormStatus("open");
    setFormEvidence(null);
    setFormError(null);
  };

  const startCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setOriginKey(
      fixedOriginType && fixedOriginId
        ? `${fixedOriginType}:${fixedOriginId}`
        : originOptions[0]?.value ?? "",
    );
    setFormDescription("");
    setResponsibleId("");
    setDueDate("");
    setFormStatus("open");
    setFormEvidence(null);
    setFormError(null);
    setNotice(null);
  };

  const startEdit = (action: CorrectiveActionRecord) => {
    setFormMode("edit");
    setEditingId(action.id);
    setOriginKey(
      action.incident_id
        ? `incident:${action.incident_id}`
        : `audit_finding:${action.audit_id}`,
    );
    setFormDescription(action.description);
    setResponsibleId(String(action.responsible_id));
    setDueDate(action.due_date);
    setFormStatus(action.status);
    setFormEvidence(null);
    setFormError(null);
    setNotice(null);
  };

  const validateEvidence = (file: File | null) => {
    if (!file) return "Adjunta la evidencia fotográfica de cierre.";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return "La evidencia debe ser una imagen JPG, PNG o WEBP.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "La evidencia no puede superar los 10 MB.";
    }
    return null;
  };

  const uploadEvidence = async (
    actionId: number,
    file: File,
    closeAction: boolean,
  ) => {
    const formData = new FormData();
    formData.append("closure_evidence", file, file.name);
    if (closeAction) formData.append("status", "closed");

    const response = await fetch(
      `/api/corrective-actions/${actionId}/closure-evidence/`,
      {
        method: "POST",
        headers: { "x-current-user-email": getSessionUserEmail() },
        body: formData,
      },
    );
    if (!response.ok) {
      throw new Error(
        await readError(response, "No se pudo guardar la evidencia de cierre."),
      );
    }
  };

  const saveAction = async () => {
    setFormError(null);
    setNotice(null);

    if (!formDescription.trim()) {
      setFormError("La descripción es obligatoria.");
      return;
    }
    if (!responsibleId) {
      setFormError("Selecciona un responsable.");
      return;
    }
    if (!dueDate) {
      setFormError("Indica la fecha límite.");
      return;
    }
    if (formMode === "create" && !fixedOriginType && !originKey) {
      setFormError("Selecciona la incidencia o el hallazgo de origen.");
      return;
    }

    const hasExistingEvidence = Boolean(editingAction?.closure_evidence);
    if (formStatus === "closed" && !formEvidence && !hasExistingEvidence) {
      setFormError("Adjunta la evidencia fotográfica para cerrar la acción.");
      return;
    }
    if (formEvidence) {
      const evidenceError = validateEvidence(formEvidence);
      if (evidenceError) {
        setFormError(evidenceError);
        return;
      }
    }

    setIsSaving(true);
    try {
      const currentUserEmail = getSessionUserEmail();
      const basePayload = {
        description: formDescription.trim(),
        responsible_id: Number(responsibleId),
        due_date: dueDate,
      };

      if (formMode === "create") {
        const [kind, rawId] = originKey.split(":");
        const createResponse = await fetch("/api/corrective-actions/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-current-user-email": currentUserEmail,
          },
          body: JSON.stringify({
            ...basePayload,
            origin_type: kind,
            incident_id: kind === "incident" ? Number(rawId) : undefined,
            audit_id: kind === "audit_finding" ? Number(rawId) : undefined,
            status: formStatus === "closed" ? "in_progress" : formStatus,
          }),
        });
        if (!createResponse.ok) {
          throw new Error(
            await readError(createResponse, "No se pudo crear la acción correctiva."),
          );
        }
        const created: CorrectiveActionRecord = await createResponse.json();
        if (formStatus === "closed" && formEvidence) {
          await uploadEvidence(created.id, formEvidence, true);
        }
        setNotice("Acción correctiva creada. Se notificó al responsable.");
      } else {
        const closedWithExistingEvidence =
          formStatus === "closed" && !formEvidence && hasExistingEvidence;
        const patchResponse = await fetch(`/api/corrective-actions/${editingId}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-current-user-email": currentUserEmail,
          },
          body: JSON.stringify({
            ...basePayload,
            status:
              formStatus === "closed"
                ? closedWithExistingEvidence
                  ? "closed"
                  : "in_progress"
                : formStatus,
          }),
        });
        if (!patchResponse.ok) {
          throw new Error(
            await readError(patchResponse, "No se pudo actualizar la acción correctiva."),
          );
        }
        if (formStatus === "closed" && formEvidence) {
          await uploadEvidence(editingId as number, formEvidence, true);
        }
        setNotice("Acción correctiva actualizada.");
      }

      resetForm();
      await loadActions();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la acción correctiva.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveEvidence = async (action: CorrectiveActionRecord) => {
    setFormError(null);
    setNotice(null);
    const evidenceError = validateEvidence(evidenceFile);
    if (evidenceError) {
      setFormError(evidenceError);
      return;
    }
    setIsSaving(true);
    try {
      await uploadEvidence(action.id, evidenceFile as File, closeOnEvidence);
      setNotice(
        closeOnEvidence
          ? "Evidencia guardada y acción cerrada."
          : "Evidencia de cierre guardada.",
      );
      setEvidenceActionId(null);
      setEvidenceFile(null);
      setCloseOnEvidence(false);
      await loadActions();
    } catch (uploadError) {
      setFormError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo guardar la evidencia de cierre.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const originLabel = fixedOriginLabel
    ? fixedOriginLabel
    : fixedOriginType === "incident"
      ? `Incidencia #${fixedOriginId}`
      : `Hallazgo de auditoría #${fixedOriginId}`;

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-[#161e27] md:p-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white md:text-xl">
              {title}
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {actions.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
          {fixedOriginType ? (
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="material-symbols-outlined text-[16px]">link</span>
              Origen: {originLabel}
            </p>
          ) : areaLabel ? (
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Área: {areaLabel}. Las acciones se vinculan a una incidencia o
              hallazgo de esta área.
            </p>
          ) : null}
        </div>
        {formMode !== "create" ? (
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
            onClick={startCreate}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            Nueva acción
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          aria-live="polite"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {notice}
        </p>
      ) : null}

      {formMode ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-[#0f172a]/70">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white md:text-base">
              {formMode === "create" ? "Nueva acción correctiva" : `Editar acción #${editingId}`}
            </h3>
            <button
              aria-label="Cancelar formulario"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={resetForm}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {formMode === "create" && !fixedOriginType ? (
              <div className="md:col-span-2">
                <label className={LABEL_CLASS} htmlFor="corrective-origin">
                  Origen
                </label>
                <select
                  className={FIELD_CLASS}
                  id="corrective-origin"
                  onChange={(event) => setOriginKey(event.target.value)}
                  value={originKey}
                >
                  <option value="">Selecciona incidencia o hallazgo</option>
                  {originOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {originOptions.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                    No se encontraron incidencias ni auditorías en esta área.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <label className={LABEL_CLASS} htmlFor="corrective-description">
                Descripción
              </label>
              <textarea
                className={`${FIELD_CLASS} min-h-[88px] resize-y`}
                id="corrective-description"
                onChange={(event) => setFormDescription(event.target.value)}
                placeholder="Describe la acción correctiva y el resultado esperado."
                value={formDescription}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="corrective-responsible">
                Responsable
              </label>
              <select
                className={FIELD_CLASS}
                id="corrective-responsible"
                onChange={(event) => setResponsibleId(event.target.value)}
                value={responsibleId}
              >
                <option value="">Selecciona responsable</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                    {user.email ? ` (${user.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="corrective-due-date">
                Fecha límite
              </label>
              <input
                className={FIELD_CLASS}
                id="corrective-due-date"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="corrective-status">
                Estado
              </label>
              <select
                className={FIELD_CLASS}
                id="corrective-status"
                onChange={(event) =>
                  setFormStatus(event.target.value as CorrectiveActionStatus)
                }
                value={formStatus}
              >
                <option value="open">Abierta</option>
                <option value="in_progress">En curso</option>
                <option value="closed">Cerrada</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="corrective-evidence">
                Evidencia de cierre
              </label>
              <input
                accept="image/jpeg,image/png,image/webp"
                className={`${FIELD_CLASS} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200`}
                id="corrective-evidence"
                onChange={(event) => setFormEvidence(event.target.files?.[0] ?? null)}
                type="file"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                JPG, PNG o WEBP. Obligatoria para cerrar. Máximo 10 MB.
              </p>
            </div>
          </div>

          {formError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {formError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={resetForm}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSaving}
              onClick={saveAction}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isSaving ? "Guardando..." : "Guardar acción"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cargando acciones correctivas...
          </p>
        ) : actions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            No hay acciones correctivas registradas para este origen.
          </div>
        ) : (
          actions.map((action) => {
            const statusMeta =
              STATUS_META[action.status] ?? STATUS_META.open;
            const evidenceUrl = toFileUrl(
              action.closure_evidence_url ?? action.closure_evidence,
            );
            return (
              <article
                className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#0f172a]/60 md:p-4"
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
                    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                      Vencida
                    </span>
                  ) : null}
                  <Link
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    href={
                      action.incident_id
                        ? `/clientes/incidencias/${action.incident_id}/detalle`
                        : `/clientes/auditorias/${action.audit_id}/informe`
                    }
                  >
                    <span className="material-symbols-outlined text-[14px]">link</span>
                    {action.incident_id
                      ? `Incidencia #${action.incident_id}`
                      : `Auditoría #${action.audit_id}`}
                  </Link>
                </div>

                <p className="mt-2 whitespace-pre-line break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                  {action.description}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <span className="block font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Responsable
                    </span>
                    <span className="mt-0.5 block font-semibold text-slate-800 dark:text-slate-100">
                      {action.responsible}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <span className="block font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Fecha límite
                    </span>
                    <span
                      className={`mt-0.5 block font-semibold ${
                        action.is_overdue
                          ? "text-red-700 dark:text-red-300"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {formatDateOnly(action.due_date)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <span className="block font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Evidencia
                    </span>
                    {evidenceUrl ? (
                      <a
                        className="mt-1 inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                        href={evidenceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <img
                          alt="Evidencia de cierre"
                          className="h-8 w-8 rounded object-cover"
                          src={evidenceUrl}
                        />
                        Ver evidencia
                      </a>
                    ) : (
                      <span className="mt-0.5 block font-semibold text-slate-500 dark:text-slate-400">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => startEdit(action)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => {
                      setEvidenceActionId(
                        evidenceActionId === action.id ? null : action.id,
                      );
                      setEvidenceFile(null);
                      setCloseOnEvidence(false);
                      setFormError(null);
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    Evidencia
                  </button>
                  {action.status !== "closed" ? (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                      onClick={() => {
                        setEvidenceActionId(action.id);
                        setEvidenceFile(null);
                        setCloseOnEvidence(true);
                        setFormError(null);
                      }}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      Cerrar
                    </button>
                  ) : null}
                </div>

                {evidenceActionId === action.id ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <label className={LABEL_CLASS} htmlFor={`evidence-${action.id}`}>
                      Evidencia fotográfica de cierre
                    </label>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className={`${FIELD_CLASS} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200`}
                      id={`evidence-${action.id}`}
                      onChange={(event) =>
                        setEvidenceFile(event.target.files?.[0] ?? null)
                      }
                      type="file"
                    />
                    <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <input
                        checked={closeOnEvidence}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        onChange={(event) => setCloseOnEvidence(event.target.checked)}
                        type="checkbox"
                      />
                      Marcar la acción como cerrada al guardar
                    </label>
                    {formError ? (
                      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        {formError}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400 dark:bg-blue-600 dark:hover:bg-blue-700"
                        disabled={isSaving}
                        onClick={() => saveEvidence(action)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        {isSaving ? "Guardando..." : "Guardar evidencia"}
                      </button>
                      <button
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        onClick={() => {
                          setEvidenceActionId(null);
                          setEvidenceFile(null);
                          setCloseOnEvidence(false);
                        }}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
