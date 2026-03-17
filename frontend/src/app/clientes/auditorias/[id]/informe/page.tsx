"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../../components/DashboardHeader";
import { getSessionUserEmail } from "../../../../lib/session";

type AuditMedia = { id: number; type: string; file: string | null };
type AuditAnswer = { id?: number; label?: string; value?: string; response_type?: string };

type Audit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  inspector: string;
  audited_at: string;
  completed_at?: string | null;
  start_latitude?: number | null;
  start_longitude?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  media?: AuditMedia[];
  audit_report?: {
    comments?: string;
    responsible_name?: string;
    responsible_signature?: string;
    answers?: AuditAnswer[];
    ai_analysis?: {
      score?: number;
      executive_summary?: string;
      recommendations?: string[];
      provider?: string;
      model?: string;
    };
  } | null;
};

const toUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function AuditoriaInformePage({ params }: { params: Promise<{ id: string }> }) {
  const [auditId, setAuditId] = useState<number | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    params
      .then(({ id }) => {
        if (!mounted) return;
        const parsedId = Number(id);
        if (Number.isNaN(parsedId)) {
          setError("Auditoría inválida.");
          setIsLoading(false);
          return;
        }
        setAuditId(parsedId);
      })
      .catch(() => {
        if (!mounted) return;
        setError("No se pudo cargar el informe.");
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (auditId == null) return;

    let mounted = true;
    const loadAudit = async () => {
      try {
        setIsLoading(true);
        const currentUserEmail = getSessionUserEmail();
        const res = await fetch("/api/audits/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } });
        const payload = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          throw new Error(payload.error ?? "No se pudo cargar el informe.");
        }
        const found = (payload.results ?? []).find((item: Audit) => item.id === auditId) ?? null;
        if (!found) {
          throw new Error("No se encontró la auditoría.");
        }
        setAudit(found);
        setError(null);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el informe.");
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };

    loadAudit();

    return () => {
      mounted = false;
    };
  }, [auditId]);

  const photos = (audit?.media ?? []).filter((m) => m.type === "photo");
  const videos = (audit?.media ?? []).filter((m) => m.type === "video");
  const ai = audit?.audit_report?.ai_analysis;
  const answers = audit?.audit_report?.answers ?? [];
  const signature = toUrl(audit?.audit_report?.responsible_signature);

  const mapUrl = useMemo(() => {
    const lat = audit?.end_latitude ?? audit?.start_latitude;
    const lon = audit?.end_longitude ?? audit?.start_longitude;
    if (lat == null || lon == null) return null;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.003}%2C${lat - 0.003}%2C${lon + 0.003}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lon}`;
  }, [audit?.end_latitude, audit?.end_longitude, audit?.start_latitude, audit?.start_longitude]);

  const formattedDate = useMemo(() => {
    if (!audit?.audited_at) return "Sin fecha";
    const date = new Date(audit.audited_at);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  }, [audit?.audited_at]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "No registrado";
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "No registrado";
    return parsedDate.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const downloadAuditReport = async () => {
    if (!auditId) return;

    try {
      const currentUserEmail = getSessionUserEmail();
      const response = await fetch(`/api/audits/${auditId}/report/`, {
        method: "GET",
        headers: { "x-current-user-email": currentUserEmail },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "No se pudo descargar el informe." }));
        throw new Error(payload.error ?? "No se pudo descargar el informe.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `auditoria-${auditId}-informe.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el informe.");
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">Cargando informe...</div>;
  if (error || !audit) return <div className="p-6 text-sm text-red-500">{error ?? "No se encontró la auditoría."}</div>;

  return (
    <>
      <DashboardHeader title="Informe de auditoría" description="Detalle visual y técnico de la auditoría registrada." />

      <section className="mx-auto w-full max-w-[1400px] flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#1a232e] dark:text-slate-200"
            href="/clientes/auditorias"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Regresar a auditorías
          </Link>
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700" onClick={downloadAuditReport} type="button">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar PDF
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Informe de Auditoría</h1>
            <p className="mt-1 text-sm text-slate-500">Generado el {formattedDate}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Auditoría ID</span><p className="mt-1 text-base font-bold text-slate-900 dark:text-white">#{audit.id}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Estado</span><p className="mt-1 text-base font-bold text-green-700 dark:text-green-300">{audit.completed_at ? "Finalizada" : "Programada"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Sucursal</span><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{audit.branch}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Área</span><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{audit.area}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Inspector</span><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{audit.inspector || "Sin inspector"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Cliente</span><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{audit.client || "Sin cliente"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Hora inicio</span><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatDateTime(audit.audited_at)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]"><span className="text-xs font-semibold uppercase text-slate-500">Hora final</span><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatDateTime(audit.completed_at)}</p></div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Responsable del área</h2>
            <p className="mt-2 text-sm text-slate-500">Nombre registrado</p>
            <p className="text-base font-semibold text-slate-900 dark:text-white">{audit.audit_report?.responsible_name ?? "No registrado"}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-300 dark:bg-white">
              {signature ? <img alt="Firma responsable" className="h-36 w-full object-contain" src={signature} /> : <p className="text-sm text-slate-500">No se registró firma del responsable.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Análisis IA</h2>
            <p className="mt-2 text-sm text-slate-500">Motor: {ai?.provider ?? "DeepSeek"} {ai?.model ? `· ${ai.model}` : ""}</p>
            <p className="mt-4 text-4xl font-black text-slate-900 dark:text-white">{typeof ai?.score === "number" ? `${ai.score}%` : "Sin score"}</p>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{ai?.executive_summary ?? "Sin resumen ejecutivo."}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {(ai?.recommendations ?? []).map((item, index) => <li key={index} className="rounded-lg bg-slate-50 p-3 dark:bg-[#0f172a]">• {item}</li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Respuestas</h2>
            <p className="mt-1 text-sm text-slate-500">Total de respuestas: {answers.length}</p>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1 text-sm">
              {answers.map((ans, idx) => (
                <div key={`${ans.id ?? idx}`} className="rounded-lg bg-slate-50 p-3 dark:bg-[#0f172a]">
                  <p className="font-semibold text-slate-900 dark:text-white">{ans.label ?? `Pregunta ${idx + 1}`}</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">{ans.value ?? "Sin respuesta"}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Ubicación de la auditoría</h2>
            <div className="relative min-h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-[#0f172a]">
              {mapUrl ? <iframe className="h-full min-h-64 w-full" loading="lazy" src={mapUrl} title="Mapa de ubicación de auditoría" /> : <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">No hay coordenadas para mostrar el mapa.</div>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Evidencias multimedia</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <img key={photo.id} src={toUrl(photo.file) ?? ""} alt="Evidencia" className="h-28 w-full object-cover rounded-lg border" />
          ))}
            </div>
            <div className="mt-4 space-y-2">
              {videos.map((video) => (
                <video key={video.id} src={toUrl(video.file) ?? ""} controls className="w-full max-w-xl rounded-lg border" />
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
