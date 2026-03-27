"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../../components/DashboardHeader";
import { getSessionUserEmail } from "../../../../lib/session";

type IncidentMedia = { id: number; type: string; file: string | null };
type IncidentDetail = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  description: string;
  created_at: string;
  media: IncidentMedia[];
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
      const isLocalBackendHost = ["localhost", "127.0.0.1"].includes(parsedUrl.hostname);

      if (isLocalBackendHost && runtimeBaseUrl) {
        return `${runtimeBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }

      if (typeof window !== "undefined" && window.location.protocol === "https:" && parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "https:";
        return parsedUrl.toString();
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

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch(`/api/incidents/${params.id}/`, {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "No se pudo cargar la incidencia.");
        if (!isMounted) return;
        setIncident(data);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar la incidencia.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (params.id) load();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const photos = useMemo(() => (incident?.media ?? []).filter((m) => ["photo", "image"].includes(m.type) && m.file), [incident]);
  const videos = useMemo(() => (incident?.media ?? []).filter((m) => m.type === "video" && m.file), [incident]);

  const createdAt = useMemo(() => {
    if (!incident?.created_at) return "No registrado";
    const parsedDate = new Date(incident.created_at);
    if (Number.isNaN(parsedDate.getTime())) return "No registrado";
    return parsedDate.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [incident?.created_at]);

  return (
    <>
      <DashboardHeader title="Detalle de la incidencia" description="Información general y evidencias adjuntas." />

      <main className="relative w-full flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
        <div className="dashboard-lights-motion pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.42)_0%,rgba(146,185,59,0.33)_34%,rgba(255,255,255,0)_68%)] dark:bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.36)_0%,rgba(146,185,59,0.2)_38%,rgba(10,15,20,0)_68%)]" />
        <div className="relative z-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#1a232e] dark:text-slate-200"
            href="/clientes/incidencias"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Regresar a incidencias
          </Link>
        </div>

        {isLoading ? <p className="text-sm text-slate-500">Cargando detalle...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {incident ? (
          <>
            <article className="apple-card-enter mb-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-card dark:border-slate-700 dark:from-[#18222d] dark:via-[#121b25] dark:to-[#0f172a]">
              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Trust • Incidencias</p>
                  <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">Incidencia #{incident.id}</h1>
                  <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                    Resumen con datos de la incidencia y toda la evidencia multimedia registrada.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="apple-card-enter rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70" style={{ animationDelay: "80ms" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{createdAt}</p>
                  </div>
                  <div className="apple-card-enter rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70" style={{ animationDelay: "140ms" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fotos</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{photos.length}</p>
                  </div>
                  <div className="apple-card-enter rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70" style={{ animationDelay: "200ms" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Videos</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{videos.length}</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-6 xl:grid-cols-3">
              <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3" style={{ animationDelay: "120ms" }}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Información general</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                    <span className="text-xs font-semibold uppercase text-slate-500">Cliente</span>
                    <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{incident.client}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                    <span className="text-xs font-semibold uppercase text-slate-500">Sucursal</span>
                    <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{incident.branch}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                    <span className="text-xs font-semibold uppercase text-slate-500">Área</span>
                    <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{incident.area}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                    <span className="text-xs font-semibold uppercase text-slate-500">Dosificador</span>
                    <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{incident.dispenser || "Sin dosificador"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                    <span className="text-xs font-semibold uppercase text-slate-500">Fecha de creación</span>
                    <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{createdAt}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0f172a]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{incident.description || "Sin descripción"}</p>
                </div>
              </article>

              <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3" style={{ animationDelay: "200ms" }}>
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-slate-400">photo_camera</span>
                  Evidencias fotográficas
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {photos.length > 0 ? (
                    photos.map((entry, index) => {
                      const imageUrl = toAbsoluteMediaUrl(entry.file);
                      return (
                        <button
                          key={entry.id}
                          className="apple-card-enter group relative aspect-[9/16] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left dark:border-slate-700"
                          onClick={() => setSelectedImage(imageUrl)}
                          style={{ animationDelay: `${240 + index * 50}ms` }}
                          type="button"
                        >
                          {imageUrl ? (
                            <img alt={`Evidencia ${index + 1}`} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" src={imageUrl} />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-sm font-medium text-white">Evidencia #{index + 1}</p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                      No hay fotos registradas.
                    </div>
                  )}
                </div>
              </article>

              <article className="apple-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3" style={{ animationDelay: "280ms" }}>
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-slate-400">videocam</span>
                  Evidencias en video
                </h2>
                {videos.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {videos.map((entry, index) => {
                      const videoUrl = toAbsoluteMediaUrl(entry.file);
                      return (
                        <div key={entry.id} className="apple-card-enter overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900" style={{ animationDelay: `${320 + index * 60}ms` }}>
                          {videoUrl ? (
                            <video className="aspect-[9/16] w-full bg-black object-contain" controls preload="metadata" src={videoUrl} />
                          ) : (
                            <div className="flex aspect-[9/16] items-center justify-center">
                              <span className="material-symbols-outlined text-4xl text-slate-400">movie</span>
                            </div>
                          )}
                          <div className="border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                            Video #{index + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                    No hay videos registrados.
                  </div>
                )}
              </article>
            </div>
          </>
        ) : null}
        </div>
      </main>

      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog">
          <button
            aria-label="Cerrar vista completa"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setSelectedImage(null)}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <img alt="Evidencia en pantalla completa" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" src={selectedImage} />
        </div>
      ) : null}
    </>
  );
}
