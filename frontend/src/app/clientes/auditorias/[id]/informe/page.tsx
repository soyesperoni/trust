"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../../components/DashboardHeader";
import { getSessionUserEmail } from "../../../../lib/session";

type AuditMedia = { id: number; type: string; file: string | null };
type MediaModal = { type: "image" | "video"; url: string } | null;
type ExecutiveSection = {
  title: string;
  icon: string;
  content: string[];
};
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
    ai_analysis?: {
      score?: number;
      executive_summary?: string;
      recommendations?: string[];
      next_steps?: string[];
      strengths?: string[];
      risks?: string[];
      business_impact?: string;
      context_notes?: string;
      question_insights?: Array<{
        question?: string;
        answer?: string;
        contextual_response?: string;
      }>;
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
  const [selectedMedia, setSelectedMedia] = useState<MediaModal>(null);

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
  const signature = toUrl(audit?.audit_report?.responsible_signature);

  const score = typeof ai?.score === "number" ? Math.max(0, Math.min(100, ai.score)) : null;
  const scoreColor = score == null ? "#94a3b8" : score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score == null ? "Sin score" : score >= 80 ? "Salud operativa alta" : score >= 60 ? "Atención prioritaria" : "Riesgo crítico";
  const confidenceLevel = score == null ? "N/D" : score >= 80 ? "Alta" : score >= 60 ? "Media" : "Baja";
  const nextSteps = ai?.next_steps?.length ? ai.next_steps : (ai?.recommendations ?? []).slice(0, 3);
  const strengths = (ai?.strengths ?? []).filter((item) => item.trim());
  const risks = (ai?.risks ?? []).filter((item) => item.trim());
  const recommendations = (ai?.recommendations ?? []).filter((item) => item.trim());

  const executiveSections = useMemo<ExecutiveSection[]>(() => {
    const summary = ai?.executive_summary?.trim();
    if (!summary) return [];

    const lines = summary
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const sectionRegex = /^([^\p{L}\p{N}\s-]{1,3})\s+([\p{L}\p{N}][\p{L}\p{N}\s]+)$/u;
    const sections: ExecutiveSection[] = [];
    let currentSection: ExecutiveSection | null = null;

    for (const line of lines) {
      const parsedSection = line.match(sectionRegex);
      if (parsedSection?.[1] && parsedSection[2]) {
        currentSection = {
          title: parsedSection[2].trim(),
          icon: parsedSection[1],
          content: [],
        };
        sections.push(currentSection);
        continue;
      }

      const cleanedLine = line.replace(/^[-•]\s*/, "").trim();
      if (!cleanedLine) continue;

      if (!currentSection) {
        currentSection = { title: "Resumen", icon: "📝", content: [] };
        sections.push(currentSection);
      }
      currentSection.content.push(cleanedLine);
    }

    return sections;
  }, [ai?.executive_summary]);

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
      const response = await fetch(`/api/audits/${auditId}/report`, {
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

      <section className="relative w-full flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
        <div className="dashboard-lights-motion pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.42)_0%,rgba(146,185,59,0.33)_34%,rgba(255,255,255,0)_68%)] dark:bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.36)_0%,rgba(146,185,59,0.2)_38%,rgba(10,15,20,0)_68%)]" />
        <div className="relative z-10">
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

        <article className="apple-card-enter mb-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-card dark:border-slate-700 dark:from-[#18222d] dark:via-[#121b25] dark:to-[#0f172a]">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Trust • Informe corporativo</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">Informe de Auditoría #{audit.id}</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Vista ejecutiva con indicadores, riesgos y plan de acción en diseño de tarjetas, alineado al estilo del dashboard.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="apple-card-enter rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70" style={{ animationDelay: "80ms" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formattedDate}</p>
              </div>
              <div className="apple-card-enter rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70" style={{ animationDelay: "140ms" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Riesgo</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: scoreColor }}>{scoreLabel}</p>
              </div>
              <div className="apple-card-enter rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70" style={{ animationDelay: "200ms" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Evidencias</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{photos.length + videos.length}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Cumplimiento general</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><span className="block h-full rounded-full transition-all" style={{ width: `${score ?? 0}%`, backgroundColor: scoreColor }} /></div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Avance de plan de acción</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><span className="block h-full rounded-full bg-professional-green transition-all" style={{ width: `${Math.min(100, Math.max(10, nextSteps.length * 20))}%` }} /></div>
            </div>
          </div>
        </article>

        <div className="grid gap-6 xl:grid-cols-3">
          <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2" style={{ animationDelay: "120ms" }}>
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

          <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27]" style={{ animationDelay: "180ms" }}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Responsable del área</h2>
            <p className="mt-2 text-sm text-slate-500">Nombre registrado</p>
            <p className="text-base font-semibold text-slate-900 dark:text-white">{audit.audit_report?.responsible_name ?? "No registrado"}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-300 dark:bg-white">
              {signature ? <img alt="Firma responsable" className="h-36 w-full object-contain" src={signature} /> : <p className="text-sm text-slate-500">No se registró firma del responsable.</p>}
            </div>
          </article>

          <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3" style={{ animationDelay: "240ms" }}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Análisis Trust AI</h2>
            <p className="mt-2 text-sm text-slate-500">Este análisis y puntuación son generados por Trust AI para interpretar el contexto de preguntas, respuestas e impacto en el negocio.</p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-slate-700 dark:from-[#0b1220] dark:to-[#111827]">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Score</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{score == null ? "Sin score" : `${score}%`}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado operativo</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: scoreColor }}>{scoreLabel}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confianza del modelo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{confidenceLevel}</p>
                </div>
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full transition-all" style={{ width: `${score ?? 0}%`, backgroundColor: scoreColor }} />
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Informe ejecutivo</p>
              {executiveSections.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {executiveSections.map((section, index) => (
                    <article key={`${section.title}-${index}`} className="rounded-lg border border-blue-100 bg-white/90 p-3 dark:border-blue-900/50 dark:bg-slate-900/60">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{section.icon} {section.title}</p>
                      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {section.content.map((line, lineIndex) => (
                          <p key={`${lineIndex}-${line}`}>{line}</p>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{ai?.executive_summary ?? "Sin informe ejecutivo."}</p>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p className="font-semibold">Fortalezas detectadas</p>
                <ul className="mt-2 space-y-1">{strengths.length > 0 ? strengths.map((item, index) => <li key={index}>• {item}</li>) : <li>• Sin fortalezas específicas detectadas.</li>}</ul>
              </div>
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                <p className="font-semibold">Riesgos / brechas</p>
                <ul className="mt-2 space-y-1">{risks.length > 0 ? risks.map((item, index) => <li key={index}>• {item}</li>) : <li>• Sin riesgos específicos detectados.</li>}</ul>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-[#0f172a] dark:text-slate-300"><span className="font-semibold">Impacto al negocio:</span> {ai?.business_impact ?? "Sin evaluación de impacto."}</p>
            <p className="mt-2 text-xs text-slate-500">{ai?.context_notes ?? "Trust AI considera el contexto entre preguntas y respuestas para priorizar hallazgos."}</p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0f172a]">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Recomendaciones</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {recommendations.length > 0 ? recommendations.map((item, index) => <li key={index} className="rounded-lg bg-white p-3 dark:bg-slate-900/60">• {item}</li>) : <li className="rounded-lg bg-white p-3 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">Sin recomendaciones específicas.</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Siguientes pasos</p>
                <ol className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  {nextSteps.length > 0 ? (
                    nextSteps.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-3 rounded-lg bg-white p-3 dark:bg-slate-900/60">
                        <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">{index + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg bg-white p-3 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">Sin siguientes pasos específicos.</li>
                  )}
                </ol>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0f172a]">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Respuestas por pregunta (con contexto)</p>
              <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {(ai?.question_insights ?? []).length > 0 ? (
                  (ai?.question_insights ?? []).map((item, index) => (
                    <article key={`${item.question ?? 'q'}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
                      <p className="font-semibold text-slate-900 dark:text-white">{item.question ?? `Pregunta ${index + 1}`}</p>
                      <p className="mt-1"><span className="font-semibold">Respuesta:</span> {item.answer ?? "Sin respuesta"}</p>
                      <p className="mt-1"><span className="font-semibold">Contexto de la respuesta:</span> {item.contextual_response ?? "Sin análisis contextual"}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg bg-white p-3 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">No hay interpretación detallada por pregunta en esta auditoría.</p>
                )}
              </div>
            </div>
          </article>

          <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2" style={{ animationDelay: "320ms" }}>
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Ubicación de la auditoría</h2>
            <div className="relative min-h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-[#0f172a]">
              {mapUrl ? <iframe className="h-full min-h-64 w-full" loading="lazy" src={mapUrl} title="Mapa de ubicación de auditoría" /> : <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">No hay coordenadas para mostrar el mapa.</div>}
            </div>
          </article>

          <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3" style={{ animationDelay: "380ms" }}>
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Evidencias multimedia</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
              {photos.map((photo, index) => {
                const photoUrl = toUrl(photo.file);
                if (!photoUrl) return null;
                return (
                  <button key={photo.id} className="apple-card-enter group relative aspect-[9/16] overflow-hidden rounded-lg border" onClick={() => setSelectedMedia({ type: "image", url: photoUrl })} style={{ animationDelay: `${440 + index * 50}ms` }} type="button">
                    <img src={photoUrl} alt="Evidencia" className="h-full w-full object-contain bg-slate-100 dark:bg-slate-800" />
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">Ver</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((video, index) => {
                const videoUrl = toUrl(video.file);
                if (!videoUrl) return null;
                return (
                  <button key={video.id} className="apple-card-enter relative aspect-[9/16] overflow-hidden rounded-lg border bg-black" onClick={() => setSelectedMedia({ type: "video", url: videoUrl })} style={{ animationDelay: `${500 + index * 60}ms` }} type="button">
                    <video src={videoUrl} className="h-full w-full object-contain" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">▶</span>
                  </button>
                );
              })}
            </div>
          </article>
        </div>
        </div>
      </section>

      {selectedMedia ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <button className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900" onClick={() => setSelectedMedia(null)} type="button">Cerrar</button>
          {selectedMedia.type === "image" ? (
            <img alt="Evidencia en pantalla completa" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" src={selectedMedia.url} />
          ) : (
            <video className="max-h-[90vh] max-w-[90vw] rounded-xl" controls autoPlay src={selectedMedia.url} />
          )}
        </div>
      ) : null}
    </>
  );
}
