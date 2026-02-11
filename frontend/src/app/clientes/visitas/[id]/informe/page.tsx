"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../../components/DashboardHeader";
import { getSessionUserEmail } from "../../../../lib/session";

type VisitMedia = {
  id: number;
  type: "image" | "video";
  file: string | null;
};

type VisitChecklistItem = {
  id: string;
  label: string;
  location: string;
  checked: boolean;
  photo?: string | null;
};

type Visit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  area_id?: number;
  dispenser: string | null;
  inspector: string;
  visited_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  notes: string;
  status?: string;
  start_latitude?: number | null;
  start_longitude?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  visit_report?: {
    comments?: string;
    responsible_name?: string;
    responsible_signature?: string;
    checklist?: VisitChecklistItem[];
  } | null;
  media?: VisitMedia[];
};

type DispenserProduct = {
  id: number;
  name: string;
  photo: string | null;
};

type Dispenser = {
  id: number;
  identifier: string;
  area: { id: number; name: string } | null;
  model: { name: string; photo: string | null };
  products: DispenserProduct[];
};

const DEFAULT_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, "") ?? "";

type MapFocus = "start" | "end";

const toAbsoluteMediaUrl = (fileUrl: string | null | undefined) => {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("data:")) {
    return fileUrl;
  }

  const runtimeBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : DEFAULT_BACKEND_BASE_URL;
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

export default function VisitaInformePage({ params }: { params: Promise<{ id: string }> }) {
  const [visitId, setVisitId] = useState<number | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus>("start");

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
        const [visitsResponse, dispensersResponse] = await Promise.all([
          fetch("/api/visits", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/dispensers", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        if (!visitsResponse.ok || !dispensersResponse.ok) {
          throw new Error("No se pudo cargar el informe.");
        }

        const [visitsData, dispensersData] = await Promise.all([visitsResponse.json(), dispensersResponse.json()]);
        if (!isMounted) return;

        const foundVisit = (visitsData.results ?? []).find((entry: Visit) => entry.id === visitId) ?? null;
        if (!foundVisit) {
          throw new Error("No se encontró la visita.");
        }

        setVisit(foundVisit);
        setDispensers(dispensersData.results ?? []);
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

  const formatDateTime = (value?: string | null, dateOnly = false) => {
    if (!value) return "No registrado";
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "No registrado";

    return parsedDate.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(dateOnly
        ? {}
        : {
            hour: "2-digit",
            minute: "2-digit",
          }),
    });
  };

  const reportComments = visit?.visit_report?.comments || visit?.notes || "Sin observaciones.";
  const responsible = visit?.visit_report?.responsible_name || "No registrado";
  const responsibleSignature = toAbsoluteMediaUrl(visit?.visit_report?.responsible_signature);
  const media = visit?.media ?? [];
  const imageMedia = media.filter((entry) => ["image", "photo"].includes(entry.type) && Boolean(entry.file));
  const videoMedia = media.filter((entry) => entry.type === "video" && Boolean(entry.file));

  const mapCoordinates = useMemo(() => {
    const start =
      visit?.start_latitude != null && visit?.start_longitude != null
        ? { latitude: visit.start_latitude, longitude: visit.start_longitude }
        : null;
    const end =
      visit?.end_latitude != null && visit?.end_longitude != null
        ? { latitude: visit.end_latitude, longitude: visit.end_longitude }
        : null;
    const active = mapFocus === "start" ? start ?? end : end ?? start;
    return { start, end, active };
  }, [mapFocus, visit?.end_latitude, visit?.end_longitude, visit?.start_latitude, visit?.start_longitude]);

  const mapUrl = useMemo(() => {
    if (!mapCoordinates.active) return null;
    const { latitude, longitude } = mapCoordinates.active;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.003}%2C${latitude - 0.003}%2C${longitude + 0.003}%2C${latitude + 0.003}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }, [mapCoordinates.active]);

  const checkedDispenserIds = useMemo(
    () =>
      new Set(
        (visit?.visit_report?.checklist ?? [])
          .filter((item) => item.checked)
          .map((item) => Number(item.id.replace("dispenser-", "")))
          .filter((item) => !Number.isNaN(item)),
      ),
    [visit?.visit_report?.checklist],
  );

  const dispenserEvidence = useMemo(() => {
    if (!visit) return [];

    const scopedDispensers = dispensers.filter((item) => item.area?.id === visit.area_id);
    const selection = scopedDispensers.filter((item) => checkedDispenserIds.size === 0 || checkedDispenserIds.has(item.id));
    return selection;
  }, [checkedDispenserIds, dispensers, visit]);

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
    <>
      <DashboardHeader title="Informe de visita" description="Detalle visual y técnico de la visita registrada." />

      <section className="mx-auto w-full max-w-[1400px] flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#1a232e] dark:text-slate-200"
            href="/clientes/visitas"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Regresar al historial
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            onClick={downloadVisitReport}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar PDF
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Informe de Visita Técnica</h1>
            <p className="mt-1 text-sm text-slate-500">Generado el {formattedDate}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Visita ID</span>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">#{visit.id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Estado</span>
                <p className="mt-1 text-base font-bold text-green-700 dark:text-green-300">{visit.status === "completed" ? "Finalizada" : "Programada"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Sucursal</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{visit.branch}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Área</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{visit.area}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Inspector</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{visit.inspector || "Sin inspector"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Cliente</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{visit.client || "Sin cliente"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Día</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatDateTime(visit.visited_at, true)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Hora inicio</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatDateTime(visit.started_at)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0f172a]">
                <span className="text-xs font-semibold uppercase text-slate-500">Hora final</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatDateTime(visit.completed_at)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Responsable del área</h2>
            <p className="mt-2 text-sm text-slate-500">Nombre registrado</p>
            <p className="text-base font-semibold text-slate-900 dark:text-white">{responsible}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#0f172a]">
              {responsibleSignature ? (
                <img alt={`Firma de ${responsible}`} className="h-36 w-full object-contain" src={responsibleSignature} />
              ) : (
                <p className="text-sm text-slate-500">No se registró firma del responsable.</p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-slate-400">pin_drop</span>
                Ubicación de la visita
              </h2>
              <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                <button
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${mapFocus === "start" ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-300"}`}
                  onClick={() => setMapFocus("start")}
                  type="button"
                >
                  Inicio
                </button>
                <button
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${mapFocus === "end" ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-300"}`}
                  onClick={() => setMapFocus("end")}
                  type="button"
                >
                  Final
                </button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-[#0f172a]">
                {mapUrl ? (
                  <iframe className="h-full min-h-64 w-full" loading="lazy" src={mapUrl} title="Mapa de ubicación de visita" />
                ) : (
                  <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    No hay coordenadas para mostrar el mapa.
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0f172a]">
                <div className="grid gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <button className="text-left" onClick={() => setMapFocus("start")} type="button">
                    Inicio: {visit.start_latitude ?? "--"}, {visit.start_longitude ?? "--"}
                  </button>
                  <button className="text-left" onClick={() => setMapFocus("end")} type="button">
                    Final: {visit.end_latitude ?? "--"}, {visit.end_longitude ?? "--"}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">description</span>
              Observaciones
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">{reportComments}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">local_drink</span>
              Estado del dosificador
            </h2>
            {dispenserEvidence.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dispenserEvidence.map((dispenser) => (
                  <div key={dispenser.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0f172a]">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{dispenser.identifier}</p>
                    <p className="text-xs text-slate-500">Modelo: {dispenser.model.name}</p>
                    <div className="mt-3 flex h-48 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      {toAbsoluteMediaUrl(dispenser.model.photo) ? (
                        <img alt={`Modelo ${dispenser.model.name}`} className="h-full w-full object-contain" src={toAbsoluteMediaUrl(dispenser.model.photo) ?? undefined} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {dispenser.products.length > 0 ? (
                        dispenser.products.map((product) => (
                          <div key={product.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                            {toAbsoluteMediaUrl(product.photo) ? (
                              <img alt={product.name} className="h-14 w-14 shrink-0 rounded-md object-cover" src={toAbsoluteMediaUrl(product.photo) ?? undefined} />
                            ) : (
                              <span className="material-symbols-outlined text-2xl text-slate-400">inventory_2</span>
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-200">{product.name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">Sin productos conectados.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                No hay datos de dosificadores registrados para esta visita.
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">photo_camera</span>
              Evidencias fotográficas
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {imageMedia.length > 0 ? (
                imageMedia.map((entry, index) => {
                  const imageUrl = toAbsoluteMediaUrl(entry.file);
                  return (
                    <button
                      key={entry.id}
                      className="group relative h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left dark:border-slate-700"
                      onClick={() => setSelectedImage(imageUrl)}
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
                  No hay evidencias registradas.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] xl:col-span-3">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">videocam</span>
              Evidencias en video
            </h2>
            {videoMedia.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {videoMedia.map((entry, index) => {
                  const videoUrl = toAbsoluteMediaUrl(entry.file);
                  return (
                    <div key={entry.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                      {videoUrl ? (
                        <video className="h-64 w-full bg-black object-cover" controls preload="metadata" src={videoUrl} />
                      ) : (
                        <div className="flex h-64 items-center justify-center">
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
      </section>

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
