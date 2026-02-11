"use client";

import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "../../../../hooks/useCurrentUser";
import { INSPECTOR_ROLE } from "../../../../lib/permissions";
import { getSessionUserEmail } from "../../../../lib/session";

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement) => {
        setView: (coords: [number, number], zoom: number) => void;
        remove: () => void;
      };
      tileLayer: (urlTemplate: string, options?: Record<string, unknown>) => { addTo: (map: unknown) => void };
      marker: (coords: [number, number]) => {
        addTo: (map: unknown) => {
          bindPopup: (content: string) => { openPopup: () => void };
          setLatLng: (coords: [number, number]) => void;
        };
      };
    };
  }
}

type Visit = {
  id: number;
  client: string;
  branch: string;
  area: string;
  area_id: number;
  visited_at: string;
  status: string;
  visit_report: {
    checklist?: { id: string; label: string; location: string; checked: boolean; photo?: string | null }[];
    comments?: string;
    location_verified?: boolean;
    responsible_name?: string;
    responsible_signature?: string;
    start_location?: { latitude: number | null; longitude: number | null };
    end_location?: { latitude: number | null; longitude: number | null };
  } | null;
};

type ChecklistItem = { id: string; label: string; location: string; checked: boolean; photo: string | null };

type DispenserProduct = {
  id: number;
  name: string;
  photo: string | null;
};

type ChecklistDispenser = {
  id: number;
  identifier: string;
  location: string;
  checked: boolean;
  model: { name: string; photo: string | null };
  products: DispenserProduct[];
};

type Dispenser = {
  id: number;
  identifier: string;
  model: { id: number; name: string; photo: string | null };
  area: { id: number; name: string; branch: string } | null;
  products?: DispenserProduct[];
};

export default function RealizarVisitaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const [visitId, setVisitId] = useState<number | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loadingVisit, setLoadingVisit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [startCoords, setStartCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistDispensers, setChecklistDispensers] = useState<ChecklistDispenser[]>([]);
  const [comments, setComments] = useState("");
  const [locationVerified, setLocationVerified] = useState(false);
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleSignature, setResponsibleSignature] = useState("");
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<{ setView: (coords: [number, number], zoom: number) => void; remove: () => void } | null>(null);
  const locationMarkerRef = useRef<{ setLatLng: (coords: [number, number]) => void } | null>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [leafletError, setLeafletError] = useState<string | null>(null);

  const allDispensersChecked = useMemo(
    () => checklistDispensers.length === 0 || checklistDispensers.every((dispenser) => dispenser.checked),
    [checklistDispensers],
  );

  useEffect(() => {
    params.then((resolved) => setVisitId(Number(resolved.id)));
  }, [params]);

  useEffect(() => {
    if (!visitId) return;
    let isMounted = true;

    const loadVisit = async () => {
      try {
        setLoadingVisit(true);
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch("/api/visits", {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar la visita.");
        }

        const payload = await response.json();
        if (!isMounted) return;
        const found = (payload.results ?? []).find((item: Visit) => item.id === visitId) ?? null;
        if (!found) {
          setError("Visita no encontrada.");
          return;
        }
        setVisit(found);
        const dispensersResponse = await fetch("/api/dispensers", {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });
        if (!dispensersResponse.ok) {
          throw new Error("No se pudo cargar el detalle de dosificadores para esta visita.");
        }

        const dispensersPayload = await dispensersResponse.json();
        const dispensersInArea: Dispenser[] = (dispensersPayload.results ?? []).filter(
          (dispenser: Dispenser) => dispenser.area?.id === found.area_id,
        );
        const checkedById = new Map<string, boolean>(
          (found.visit_report?.checklist ?? []).map(
            (item: { id: string; checked: boolean }): [string, boolean] => [item.id, item.checked],
          ),
        );
        const realChecklist: ChecklistItem[] = dispensersInArea.map((dispenser) => ({
          id: `dispenser-${dispenser.id}`,
          label: `${dispenser.identifier} (${dispenser.model.name})`,
          location: dispenser.area?.name ?? found.area,
          checked: checkedById.get(`dispenser-${dispenser.id}`) ?? false,
          photo: dispenser.model.photo,
        }));

        const dispenserChecklistRows: ChecklistDispenser[] = dispensersInArea.map((dispenser) => ({
          id: dispenser.id,
          identifier: dispenser.identifier,
          location: dispenser.area?.name ?? found.area,
          checked: checkedById.get(`dispenser-${dispenser.id}`) ?? false,
          model: {
            name: dispenser.model.name,
            photo: dispenser.model.photo,
          },
          products: dispenser.products ?? [],
        }));

        setChecklist(realChecklist);
        setChecklistDispensers(dispenserChecklistRows);
        setComments(found.visit_report?.comments ?? "");
        setLocationVerified(Boolean(found.visit_report?.location_verified));
        setResponsibleName(found.visit_report?.responsible_name ?? "");
        setResponsibleSignature(found.visit_report?.responsible_signature ?? "");
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la visita.");
      } finally {
        if (!isMounted) return;
        setLoadingVisit(false);
      }
    };

    loadVisit();
    return () => {
      isMounted = false;
    };
  }, [visitId]);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    context.lineWidth = 2;

    if (!responsibleSignature) return;

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = responsibleSignature;
  }, [responsibleSignature]);

  useEffect(() => {
    if (isLoadingUser) return;
    if (user?.role !== INSPECTOR_ROLE) {
      router.replace("/dashboard");
    }
  }, [isLoadingUser, router, user?.role]);

  const progress = useMemo(() => step * 25, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onLeafletReady = () => setIsLeafletReady(true);
    const onLeafletError = () => setLeafletError("No se pudo cargar el mapa (Leaflet).");

    const existingStyle = document.getElementById("leaflet-css");
    if (!existingStyle) {
      const style = document.createElement("link");
      style.id = "leaflet-css";
      style.rel = "stylesheet";
      style.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      style.crossOrigin = "";
      document.head.appendChild(style);
    }

    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    const existingScript = document.getElementById("leaflet-script");
    if (existingScript) {
      existingScript.addEventListener("load", onLeafletReady);
      existingScript.addEventListener("error", onLeafletError);
      return () => {
        existingScript.removeEventListener("load", onLeafletReady);
        existingScript.removeEventListener("error", onLeafletError);
      };
    }

    const script = document.createElement("script");
    script.id = "leaflet-script";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "";
    script.onload = onLeafletReady;
    script.onerror = onLeafletError;
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", onLeafletReady);
      script.removeEventListener("error", onLeafletError);
    };
  }, []);

  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || !window.L) return;

    const mapContainer = mapContainerRef.current;

    if (leafletMapRef.current && !mapContainer.querySelector(".leaflet-container")) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      locationMarkerRef.current = null;
    }

    if (!leafletMapRef.current) {
      leafletMapRef.current = window.L.map(mapContainer);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(leafletMapRef.current);
      leafletMapRef.current.setView([-12.046374, -77.042793], 14);
    }

    if (startCoords) {
      const point: [number, number] = [startCoords.latitude, startCoords.longitude];
      if (!locationMarkerRef.current) {
        const marker = window.L.marker(point).addTo(leafletMapRef.current);
        marker.bindPopup("Mi ubicación").openPopup();
        locationMarkerRef.current = marker;
      } else {
        locationMarkerRef.current.setLatLng(point);
      }

      leafletMapRef.current.setView(point, 17);
    }
  }, [isLeafletReady, startCoords, step]);

  useEffect(() => {
    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      locationMarkerRef.current = null;
    };
  }, []);

  const validatePhoneLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      throw new Error("Tu dispositivo no permite geolocalización.");
    }

    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          }),
        () => reject(new Error("No pudimos obtener tu ubicación actual.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  };

  const patchFlow = async (payload: Record<string, unknown>, files?: File[]) => {
    if (!visitId) return null;
    const currentUserEmail = getSessionUserEmail();
    const hasFiles = Boolean(files && files.length > 0);
    let response: Response;

    if (hasFiles) {
      const formData = new FormData();
      formData.append("action", String(payload.action ?? ""));
      formData.append("end_latitude", String(payload.end_latitude ?? ""));
      formData.append("end_longitude", String(payload.end_longitude ?? ""));
      formData.append("visit_report", JSON.stringify(payload.visit_report ?? {}));
      files?.forEach((file) => formData.append("evidence_files", file));

      response = await fetch(`/api/visits/${visitId}/mobile-flow`, {
        method: "PATCH",
        headers: {
          "x-current-user-email": currentUserEmail,
        },
        body: formData,
      });
    } else {
      response = await fetch(`/api/visits/${visitId}/mobile-flow`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": currentUserEmail,
        },
        body: JSON.stringify(payload),
      });
    }
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo actualizar la visita.");
    }
    setVisit(body);
    return body;
  };

  const onStartVisit = async () => {
    try {
      const coords = await validatePhoneLocation();
      setStartCoords(coords);
      await patchFlow({ action: "start", start_latitude: coords.latitude, start_longitude: coords.longitude });
      setError(null);
    } catch (flowError) {
      setError(flowError instanceof Error ? flowError.message : "No se pudo iniciar la visita.");
    }
  };

  const onFinishVisit = async () => {
    try {
      if (!responsibleSignature) {
        throw new Error("Debes registrar la firma del responsable para finalizar.");
      }
      if (!responsibleName.trim()) {
        throw new Error("Debes registrar el nombre del responsable para finalizar.");
      }
      if (!locationVerified) {
        throw new Error("Debes confirmar tu ubicación en sitio para finalizar la visita.");
      }
      setIsSubmitting(true);
      const coords = await validatePhoneLocation();
      setEndCoords(coords);
      await patchFlow({
        action: "complete",
        end_latitude: coords.latitude,
        end_longitude: coords.longitude,
        visit_report: {
          checklist,
          comments,
          location_verified: locationVerified,
          responsible_name: responsibleName,
          responsible_signature: responsibleSignature,
        },
      }, evidenceFiles);
      router.push("/clientes/visitas");
    } catch (flowError) {
      setError(flowError instanceof Error ? flowError.message : "No se pudo finalizar la visita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    router.push("/clientes/calendario");
  };

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rectangle = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rectangle.left) / rectangle.width) * canvas.width,
      y: ((event.clientY - rectangle.top) / rectangle.height) * canvas.height,
    };
  };

  const onSignaturePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    if (!point) return;
    lastPointerPosition.current = point;
    setIsDrawingSignature(true);
  };

  const onSignaturePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    const previousPoint = lastPointerPosition.current;
    if (!context || !point || !previousPoint) return;

    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointerPosition.current = point;
  };

  const onSignaturePointerUp = () => {
    if (!isDrawingSignature) return;
    setIsDrawingSignature(false);
    lastPointerPosition.current = null;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    setResponsibleSignature(canvas.toDataURL("image/png"));
  };

  const onClearSignature = () => {
    setResponsibleSignature("");
  };

  if (loadingVisit || isLoadingUser) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">Cargando visita...</div>;
  }

  if (!visit) {
    return <div className="p-6 text-sm text-red-500">{error ?? "No se encontró la visita."}</div>;
  }

  return (
    <section className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden px-4 py-5 md:hidden">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso {step} de 4</span>
          <span className="text-xs font-medium text-slate-500">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex-1 overflow-y-auto pb-4">
        {step === 1 && (
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-slate-900">Iniciar Visita</h1>
            <p className="text-sm text-slate-500">Valida tu ubicación para comenzar la inspección.</p>
          </div>
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hora</span>
              <span className="text-sm font-semibold text-slate-900">
                {new Date(visit.visited_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <dl className="grid grid-cols-[80px_1fr] items-start gap-y-1 text-sm">
              <dt className="text-slate-500">Cliente</dt>
              <dd className="truncate font-semibold text-slate-900">{visit.client}</dd>
              <dt className="text-slate-500">Sucursal</dt>
              <dd className="truncate font-semibold text-slate-900">{visit.branch}</dd>
              <dt className="text-slate-500">Área</dt>
              <dd className="truncate font-semibold text-slate-900">{visit.area}</dd>
            </dl>
          </article>
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-48 w-full bg-slate-100" ref={mapContainerRef}></div>
            <div className="space-y-3 p-3">
              <button
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                onClick={onStartVisit}
                type="button"
              >
                Validar ubicación
              </button>
              {leafletError ? <p className="text-xs text-amber-600">{leafletError}</p> : null}
              {startCoords ? <p className="text-xs text-slate-500">Inicio: {startCoords.latitude}, {startCoords.longitude}</p> : null}
            </div>
          </article>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-slate-900">Revisión de Dosificadores</h1>
            <p className="text-base text-slate-500">Marca cada elemento verificado en el área.</p>
          </div>
          {checklistDispensers.map((dispenser) => (
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={`dispenser-${dispenser.id}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{dispenser.identifier}</p>
                  <p className="text-xs text-slate-500">{dispenser.location}</p>
                </div>
                <button
                  aria-label={dispenser.checked ? "Dosificador verificado" : "Marcar dosificador verificado"}
                  aria-pressed={dispenser.checked}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                    dispenser.checked ? "border-amber-400 bg-amber-400 text-slate-900" : "border-slate-300 bg-white text-transparent"
                  }`}
                  onClick={() => {
                    const checked = !dispenser.checked;
                    setChecklist((prev) => prev.map((item) => (item.id === `dispenser-${dispenser.id}` ? { ...item, checked } : item)));
                    setChecklistDispensers((prev) =>
                      prev.map((item) => (item.id === dispenser.id ? { ...item, checked } : item)),
                    );
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">check</span>
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
                  {dispenser.model.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Foto del modelo ${dispenser.model.name}`}
                      className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                      src={dispenser.model.photo}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                      Sin foto
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500">Modelo del dosificador</p>
                    <p className="text-sm font-semibold text-slate-800">{dispenser.model.name}</p>
                  </div>
                </div>
                {dispenser.products.length > 0 ? (
                  <div className="space-y-2 pl-5">
                    {dispenser.products.map((product) => (
                      <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5" key={product.id}>
                        <span className="pointer-events-none absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-slate-300"></span>
                        {product.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={`Foto del producto ${product.name}`} className="h-12 w-12 rounded-lg border border-slate-200 object-cover" src={product.photo} />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                            Sin foto
                          </div>
                        )}
                        <p className="text-sm font-medium text-slate-800">{product.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pl-5 text-xs text-slate-400">Este dosificador no tiene productos registrados.</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-slate-900">Hallazgos y Evidencias</h1>
            <p className="text-base text-slate-500">Añade comentarios adicionales y fotos de la visita.</p>
          </div>
          <textarea
            className="h-36 w-full rounded-xl border border-slate-300 bg-white p-4"
            onChange={(event) => setComments(event.target.value)}
            placeholder="Describe los hallazgos encontrados..."
            value={comments}
          />
          <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 text-center text-sm text-primary">
            <input
              accept="image/*,video/*"
              className="hidden"
              multiple
              onChange={(event) => setEvidenceFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
            {evidenceFiles.length > 0 ? `${evidenceFiles.length} archivo(s) seleccionados` : "Añadir evidencia (opcional)"}
          </label>
          {isSubmitting && evidenceFiles.length > 0 ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              Subiendo archivos...
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input checked={locationVerified} onChange={(event) => setLocationVerified(event.target.checked)} type="checkbox" />
            Confirmo que me encuentro físicamente en el sitio de la inspección.
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-slate-900">Finalizar Inspección</h1>
            <p className="text-base text-slate-500">Firma del responsable del área.</p>
          </div>
          <div className="space-y-2">
            <canvas
              className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
              height={192}
              onPointerDown={onSignaturePointerDown}
              onPointerMove={onSignaturePointerMove}
              onPointerUp={onSignaturePointerUp}
              onPointerLeave={onSignaturePointerUp}
              ref={signatureCanvasRef}
              width={420}
            />
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={onClearSignature}
              type="button"
            >
              Limpiar firma
            </button>
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            onChange={(event) => setResponsibleName(event.target.value)}
            placeholder="Nombre del responsable"
            type="text"
            value={responsibleName}
          />
          {endCoords ? <p className="text-xs text-slate-500">Fin: {endCoords.latitude}, {endCoords.longitude}</p> : null}
        </div>
      )}
      </div>

      <div className="sticky bottom-0 mt-2 grid grid-cols-2 gap-3 border-t border-slate-200 bg-white/95 py-3 pb-safe backdrop-blur">
        <button
          className="rounded-xl border border-slate-300 bg-white py-3 font-semibold"
          onClick={() => (step === 1 ? onCancel() : setStep((value) => value - 1))}
          type="button"
        >
          {step === 1 ? "Cancelar" : "Atrás"}
        </button>
        {step < 4 ? (
          <button
            className="rounded-xl bg-primary py-3 font-bold text-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            disabled={(step === 1 && !startCoords) || (step === 2 && !allDispensersChecked)}
            onClick={() => setStep((value) => value + 1)}
            type="button"
          >
            Siguiente
          </button>
        ) : (
          <button
            className="rounded-xl bg-primary py-3 font-bold text-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            disabled={isSubmitting}
            onClick={onFinishVisit}
            type="button"
          >
            {isSubmitting ? "Finalizando visita..." : "Finalizar visita"}
          </button>
        )}
      </div>
    </section>
  );
}
