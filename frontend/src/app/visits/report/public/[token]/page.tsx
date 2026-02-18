"use client";

import { useEffect, useMemo, useState } from "react";

type VisitMedia = {
  id: number;
  type: "image" | "photo" | "video" | string;
  file: string | null;
};

type Visit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string | null;
  inspector: string;
  visited_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string;
  status?: string;
  visit_report?: {
    comments?: string;
    responsible_name?: string;
  } | null;
  media?: VisitMedia[];
};

const DEFAULT_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, "") ?? "";

const toAbsoluteMediaUrl = (fileUrl: string | null | undefined) => {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("data:")) return fileUrl;

  const runtimeBaseUrl = typeof window !== "undefined" ? window.location.origin : DEFAULT_BACKEND_BASE_URL;
  const fallbackBaseUrl = runtimeBaseUrl || DEFAULT_BACKEND_BASE_URL || "https://trust.supplymax.net";

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    try {
      const parsedUrl = new URL(fileUrl);
      if (["localhost", "127.0.0.1"].includes(parsedUrl.hostname) && runtimeBaseUrl) {
        return `${runtimeBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }
      return fileUrl;
    } catch {
      return fileUrl;
    }
  }

  try {
    return new URL(fileUrl, `${fallbackBaseUrl}/`).toString();
  } catch {
    return `${fallbackBaseUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  }
};

export default function PublicVisitReportPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params
      .then(({ token: resolvedToken }) => setToken(resolvedToken))
      .catch(() => {
        setError("No se pudo leer el enlace público.");
        setIsLoading(false);
      });
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/visits/report/public/${token}/`, { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "No se pudo cargar el informe." }));
          throw new Error(payload.error ?? "No se pudo cargar el informe.");
        }
        const data = await response.json();
        setVisit(data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el informe.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const formattedDate = useMemo(() => {
    if (!visit?.completed_at) return "Sin fecha";
    const date = new Date(visit.completed_at);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [visit?.completed_at]);

  const imageMedia = (visit?.media ?? []).filter((entry) => ["image", "photo"].includes(entry.type) && entry.file);
  const videoMedia = (visit?.media ?? []).filter((entry) => entry.type === "video" && entry.file);

  if (isLoading) {
    return <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 text-sm text-slate-500">Cargando informe...</main>;
  }

  if (error || !visit) {
    return <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 text-sm text-red-500">{error ?? "No se encontró el informe."}</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl space-y-5 md:space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-3xl font-bold leading-none text-yellow-400">trust</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Informe de Visita</h1>
              <p className="text-sm text-slate-500">Generado: {formattedDate}</p>
            </div>
            <span className="inline-flex items-center justify-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 md:min-w-[230px] md:text-2xl">
              Visita #{visit.id} · Finalizada
            </span>
          </div>
        </header>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Cliente" value={visit.client} />
            <Info label="Sucursal" value={visit.branch} />
            <Info label="Área" value={visit.area} />
            <Info label="Dosificador" value={visit.dispenser || "N/A"} />
            <Info label="Inspector" value={visit.inspector || "Sin inspector"} />
            <Info label="Responsable" value={visit.visit_report?.responsible_name || "No registrado"} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-slate-900">Observaciones</h2>
          <p className="mt-2 text-slate-700">{visit.visit_report?.comments || visit.notes || "Sin observaciones."}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-slate-900">Evidencias fotográficas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imageMedia.length > 0 ? (
              imageMedia.map((entry, index) => {
                const imageUrl = toAbsoluteMediaUrl(entry.file);
                return (
                  <div key={entry.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {imageUrl ? (
                      <img alt={`Evidencia ${index + 1}`} className="h-56 w-full object-cover" src={imageUrl} />
                    ) : (
                      <div className="flex h-56 items-center justify-center text-slate-400">Sin imagen</div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No hay evidencias registradas.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-slate-900">Evidencias en video</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {videoMedia.length > 0 ? (
              videoMedia.map((entry, index) => {
                const videoUrl = toAbsoluteMediaUrl(entry.file);
                return (
                  <div key={entry.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {videoUrl ? <video className="h-56 w-full bg-black object-cover" controls src={videoUrl} /> : null}
                    <p className="px-3 py-2 text-sm text-slate-600">Video #{index + 1}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No hay videos registrados.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
