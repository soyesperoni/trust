"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import BrandLogo from "../../../../components/BrandLogo";
import { getSessionUserEmail } from "../../../../lib/session";

type VisitMedia = {
  id: number;
  type: "image" | "video";
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
  notes: string;
  status?: string;
  start_latitude?: number | null;
  start_longitude?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  visit_report?: {
    comments?: string;
    responsible_name?: string;
  } | null;
  media?: VisitMedia[];
};

export default function VisitaInformePage({ params }: { params: Promise<{ id: string }> }) {
  const [visitId, setVisitId] = useState<number | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    params
      .then((resolvedParams) => {
        if (!isMounted) return;
        const parsed = Number(resolvedParams.id);
        if (Number.isNaN(parsed)) {
          setError("Visita inválida.");
          setIsLoading(false);
          return;
        }
        setVisitId(parsed);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No se pudo cargar el informe.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (visitId == null) return;

    let isMounted = true;

    const loadVisit = async () => {
      try {
        setIsLoading(true);
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch("/api/visits", {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el informe.");
        }

        const data = await response.json();
        if (!isMounted) return;

        const foundVisit = (data.results ?? []).find((entry: Visit) => entry.id === visitId) ?? null;
        if (!foundVisit) {
          throw new Error("No se encontró la visita.");
        }

        setVisit(foundVisit);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el informe.");
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadVisit();

    return () => {
      isMounted = false;
    };
  }, [visitId]);

  const formattedDate = useMemo(() => {
    if (!visit?.visited_at) return "Sin fecha";
    const date = new Date(visit.visited_at);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [visit?.visited_at]);

  const reportComments = visit?.visit_report?.comments || visit?.notes || "Sin observaciones.";
  const responsible = visit?.visit_report?.responsible_name || "No registrado";
  const media = visit?.media ?? [];
  const imageMedia = media.filter((entry) => entry.type === "image");
  const videoMedia = media.filter((entry) => entry.type === "video");
  const mapLatitude = visit?.start_latitude ?? visit?.end_latitude;
  const mapLongitude = visit?.start_longitude ?? visit?.end_longitude;
  const mapUrl =
    mapLatitude != null && mapLongitude != null
      ? `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${mapLatitude},${mapLongitude}`
      : null;

  const downloadVisitReport = async () => {
    if (!visitId) return;

    try {
      const currentUserEmail = getSessionUserEmail();
      const response = await fetch(`/api/visits/${visitId}/report`, {
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
      link.download = `visita-${visitId}-informe.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el informe.");
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">Cargando informe...</div>;
  }

  if (error || !visit) {
    return <div className="p-6 text-sm text-red-500">{error ?? "No se encontró la visita."}</div>;
  }

  return (
    <section className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          href="/clientes/visitas"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver al historial
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          onClick={downloadVisitReport}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Descargar PDF
        </button>
      </div>

      <article className="max-h-[calc(100vh-170px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
        <header className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161e27] md:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandLogo size="xl" />
            <span className="text-xl font-bold text-slate-800 dark:text-white">{visit.client}</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Informe de Visita Técnica</h1>
          <p className="text-sm text-slate-500">Generado el {formattedDate}</p>
        </header>

        <div className="grid grid-cols-2 gap-6 border-b border-slate-200 bg-slate-50 p-6 md:grid-cols-4 md:p-8 dark:border-slate-800 dark:bg-[#1a232e]">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Visita ID</span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">#{visit.id}</span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-green-700 dark:border-green-800 dark:bg-green-900/40 dark:text-green-300">
              {visit.status === "completed" ? "Finalizada" : "Programada"}
            </span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sucursal</span>
            <span className="text-base font-medium text-slate-900 dark:text-white">{visit.branch}</span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Área</span>
            <span className="text-base font-medium text-slate-900 dark:text-white">{visit.area}</span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dosificador</span>
            <span className="inline-block rounded bg-slate-200 px-2 py-0.5 font-mono text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-100">
              {visit.dispenser ?? "Sin registro"}
            </span>
          </div>
          <div className="col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</span>
            <span className="text-base font-medium text-slate-900 dark:text-white">{visit.inspector}</span>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Responsable</span>
            <span className="text-base font-medium text-slate-900 dark:text-white">{responsible}</span>
          </div>
        </div>

        <div className="border-b border-slate-200 p-6 md:p-8 dark:border-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-slate-400">pin_drop</span>
            Ubicación de la visita
          </h2>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-52 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-[#0f172a]">
              {mapUrl ? (
                <iframe
                  className="h-full min-h-52 w-full"
                  loading="lazy"
                  src={mapUrl}
                  title="Mapa de ubicación de visita"
                />
              ) : (
                <div className="flex h-full min-h-52 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No hay coordenadas para mostrar el mapa.
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0f172a]">
              <div className="grid gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                <span>
                  Inicio: {visit.start_latitude ?? "--"}, {visit.start_longitude ?? "--"}
                </span>
                <span>
                  Final: {visit.end_latitude ?? "--"}, {visit.end_longitude ?? "--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-b border-slate-200 p-6 lg:grid-cols-2 md:p-8 dark:border-slate-800">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">description</span>
              Observaciones
            </h2>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#1a232e]">
              <p className="text-sm text-slate-700 dark:text-slate-300">{reportComments}</p>
            </div>
          </div>
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">fact_check</span>
              Estado del dosificador
            </h2>
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
              <div>
                <span className="block text-xl font-bold text-slate-900 dark:text-white">{visit.status === "completed" ? "Completada" : "Pendiente"}</span>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Registro técnico</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-6 md:p-8 dark:border-slate-800">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-slate-400">photo_camera</span>
            Evidencias fotográficas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imageMedia.length > 0 ? (
              imageMedia.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="group relative h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700"
                  >
                    {entry.file ? (
                      <img alt={`Evidencia ${index + 1}`} className="h-full w-full object-cover" src={entry.file} />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-sm font-medium text-white">Evidencia #{index + 1}</p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                No hay evidencias registradas.
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-slate-200 p-6 md:p-8 dark:border-slate-800">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-slate-400">videocam</span>
            Evidencias en video
          </h2>
          {videoMedia.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {videoMedia.map((entry, index) => (
                <div
                  key={entry.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                >
                  {entry.file ? (
                    <video className="h-64 w-full bg-black object-cover" controls preload="metadata" src={entry.file} />
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-slate-400">movie</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    Video #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
              No hay videos registrados.
            </div>
          )}
        </div>

        <footer className="bg-slate-50 p-6 text-center text-xs text-slate-400 dark:bg-[#1a232e]">
          Este documento es un reporte técnico oficial generado por la plataforma Trust.
        </footer>
      </article>
    </section>
  );
}
