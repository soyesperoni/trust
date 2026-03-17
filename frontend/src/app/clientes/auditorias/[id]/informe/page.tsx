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
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    params.then(async ({ id }) => {
      const auditId = Number(id);
      if (Number.isNaN(auditId)) {
        setError("Auditoría inválida.");
        return;
      }
      const currentUserEmail = getSessionUserEmail();
      const res = await fetch("/api/audits/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } });
      const payload = await res.json();
      if (!mounted) return;
      if (!res.ok) {
        setError(payload.error ?? "No se pudo cargar el informe.");
        return;
      }
      const found = (payload.results ?? []).find((item: Audit) => item.id === auditId) ?? null;
      if (!found) {
        setError("No se encontró la auditoría.");
        return;
      }
      setAudit(found);
    }).catch(() => setError("No se pudo cargar el informe."));

    return () => {
      mounted = false;
    };
  }, [params]);

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

  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!audit) return <div className="p-6 text-slate-500">Cargando informe...</div>;

  return (
    <>
      <DashboardHeader title="Informe de auditoría" description="Resultado completo con evidencias y análisis IA." />
      <section className="p-4 md:p-8 space-y-4 overflow-y-auto">
        <Link href="/clientes/auditorias" className="text-sm font-semibold text-primary">← Regresar</Link>
        <div className="rounded-xl border p-4 bg-white dark:bg-[#161e27]">
          <p className="font-bold">#{audit.id} · {audit.client} / {audit.branch} / {audit.area}</p>
          <p className="text-sm text-slate-500">Inspector: {audit.inspector}</p>
          <p className="text-sm text-slate-500">Responsable área: {audit.audit_report?.responsible_name ?? "No registrado"}</p>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-[#161e27]">
          <p className="font-semibold mb-2">Análisis IA (DeepSeek)</p>
          <p className="text-2xl font-black">{typeof ai?.score === "number" ? `${ai.score}%` : "Sin score"}</p>
          <p className="text-sm mt-2">{ai?.executive_summary ?? "Sin resumen ejecutivo."}</p>
          <ul className="list-disc ml-5 mt-2 text-sm">
            {(ai?.recommendations ?? []).map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-[#161e27]">
          <p className="font-semibold mb-2">Respuestas de auditoría</p>
          <div className="space-y-2 text-sm">
            {answers.map((ans, idx) => (
              <div key={`${ans.id ?? idx}`} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                <p className="font-semibold">{ans.label ?? `Pregunta ${idx + 1}`}</p>
                <p>{ans.value ?? "Sin respuesta"}</p>
              </div>
            ))}
          </div>
        </div>

        {mapUrl ? <iframe src={mapUrl} className="w-full h-64 rounded-xl border" /> : null}

        {signature ? <img src={signature} alt="Firma responsable" className="h-24 rounded border bg-white p-2" /> : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <img key={photo.id} src={toUrl(photo.file) ?? ""} alt="Evidencia" className="h-28 w-full object-cover rounded-lg border" />
          ))}
        </div>

        <div className="space-y-2">
          {videos.map((video) => (
            <video key={video.id} src={toUrl(video.file) ?? ""} controls className="w-full max-w-xl rounded-lg border" />
          ))}
        </div>
      </section>
    </>
  );
}
