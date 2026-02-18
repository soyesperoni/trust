"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string; client: string } };
type Dispenser = { id: number; identifier: string; area: { id: number; name: string } };

type Priority = "low" | "medium" | "high";

type EvidencePreview = {
  file: File;
  previewUrl: string;
};

const MAX_EVIDENCE_ITEMS = 4;
const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024;

const inputClassName =
  "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
const labelClassName =
  "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

export default function NuevaIncidenciaPage() {
  const router = useRouter();
  const [mobileStep, setMobileStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [dispenserId, setDispenserId] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<EvidencePreview[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [pendingEvidence, setPendingEvidence] = useState<EvidencePreview | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const evidencePreviewsRef = useRef<EvidencePreview[]>([]);

  const progressValue = useMemo(() => {
    if (mobileStep === 1) return 33;
    if (mobileStep === 2) return 66;
    return 100;
  }, [mobileStep]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [clientsResponse, branchesResponse, areasResponse, dispensersResponse] = await Promise.all([
          fetch("/api/clients/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/branches/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/areas/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/dispensers/", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        if (!clientsResponse.ok || !branchesResponse.ok || !areasResponse.ok || !dispensersResponse.ok) {
          throw new Error("No se pudieron cargar los datos de ubicación.");
        }

        const [clientsPayload, branchesPayload, areasPayload, dispensersPayload] = await Promise.all([
          clientsResponse.json(),
          branchesResponse.json(),
          areasResponse.json(),
          dispensersResponse.json(),
        ]);

        if (!isMounted) return;

        setClients(clientsPayload.results ?? []);
        setBranches(branchesPayload.results ?? []);
        setAreas(areasPayload.results ?? []);
        setDispensers(dispensersPayload.results ?? []);
        setLoadError(null);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos de ubicación.",
        );
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBranches = useMemo(
    () => branches.filter((branch) => (clientId ? String(branch.client.id) === clientId : true)),
    [branches, clientId],
  );

  const filteredAreas = useMemo(
    () => areas.filter((area) => (branchId ? String(area.branch.id) === branchId : true)),
    [areas, branchId],
  );

  const filteredDispensers = useMemo(
    () => dispensers.filter((dispenser) => (areaId ? String(dispenser.area.id) === areaId : true)),
    [dispensers, areaId],
  );


  const requestCameraPermission = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Tu dispositivo no permite acceder a la cámara.");
    }

    const permissionStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    permissionStream.getTracks().forEach((track) => track.stop());
  };

  const requestLocationPermission = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      throw new Error("Tu dispositivo no permite geolocalización.");
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      throw new Error("Safari requiere HTTPS para solicitar ubicación. Abre la app en una conexión segura.");
    }

    if ("permissions" in navigator && navigator.permissions?.query) {
      try {
        const permissionState = await navigator.permissions.query({ name: "geolocation" });
        if (permissionState.state === "denied") {
          throw new Error(
            "El permiso de ubicación está bloqueado en Safari. Habilítalo en Ajustes > Safari > Ubicación.",
          );
        }
      } catch {
        // Safari no soporta completamente Permissions API para geolocalización.
      }
    }

    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error("Debes conceder permiso de ubicación para continuar."));
            return;
          }

          if (error.code === error.POSITION_UNAVAILABLE) {
            reject(new Error("No pudimos obtener tu ubicación. Verifica GPS y vuelve a intentarlo."));
            return;
          }

          if (error.code === error.TIMEOUT) {
            reject(new Error("Se agotó el tiempo para obtener la ubicación. Inténtalo nuevamente."));
            return;
          }

          reject(new Error("No pudimos validar tu ubicación en este momento."));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    });
  };

  const ensureStepPermissions = async (targetStep: number) => {
    if (targetStep === 2) {
      await requestLocationPermission();
      return;
    }

    if (targetStep === 3) {
      await requestCameraPermission();
    }
  };

  const canGoNext =
    (mobileStep === 1 && clientId && branchId) ||
    (mobileStep === 2 && areaId && dispenserId && description.trim()) ||
    mobileStep === 3;

  useEffect(() => {
    evidencePreviewsRef.current = evidencePreviews;
  }, [evidencePreviews]);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isCameraModalOpen) {
      stopCameraStream();
      setPendingEvidence(null);
      return;
    }

    const openCamera = async () => {
      try {
        setEvidenceError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play();
        }
      } catch {
        setEvidenceError("No se pudo acceder a la cámara.");
      }
    };

    openCamera();

    return () => {
      stopCameraStream();
    };
  }, [isCameraModalOpen]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      evidencePreviewsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const onOpenCamera = async () => {
    if (evidenceFiles.length >= MAX_EVIDENCE_ITEMS) {
      setEvidenceError("Solo puedes registrar hasta 4 evidencias.");
      return;
    }

    try {
      await requestCameraPermission();
      setEvidenceError(null);
      setPendingEvidence(null);
      setIsCameraModalOpen(true);
    } catch (permissionError) {
      setEvidenceError(
        permissionError instanceof Error
          ? permissionError.message
          : "Debes conceder permisos de cámara para adjuntar evidencias.",
      );
    }
  };

  const onTakePhoto = async () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setEvidenceError("La cámara todavía no está lista.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setEvidenceError("No se pudo generar la imagen.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setEvidenceError("No se pudo capturar la evidencia.");
      return;
    }

    if (blob.size > MAX_EVIDENCE_SIZE_BYTES) {
      setEvidenceError("La imagen no puede superar los 10MB.");
      return;
    }

    const file = new File([blob], `incidencia-${Date.now()}.jpg`, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(file);
    setPendingEvidence({ file, previewUrl });
  };

  const onUseEvidence = () => {
    if (!pendingEvidence) return;
    if (evidenceFiles.length >= MAX_EVIDENCE_ITEMS) {
      setEvidenceError("Solo puedes registrar hasta 4 evidencias.");
      URL.revokeObjectURL(pendingEvidence.previewUrl);
      setPendingEvidence(null);
      return;
    }

    setEvidenceFiles((prev) => [...prev, pendingEvidence.file]);
    setEvidencePreviews((prev) => [...prev, pendingEvidence]);
    setPendingEvidence(null);
    setEvidenceError(null);
    setIsCameraModalOpen(false);
  };

  const onRetakeEvidence = () => {
    if (pendingEvidence) {
      URL.revokeObjectURL(pendingEvidence.previewUrl);
    }
    setPendingEvidence(null);
    setEvidenceError(null);
  };

  const onRemoveEvidence = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setEvidencePreviews((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
    setEvidenceError(null);
  };


  const onNextStep = async () => {
    if (mobileStep < 3) {
      const targetStep = mobileStep + 1;
      try {
        await ensureStepPermissions(targetStep);
        setLoadError(null);
        setMobileStep(targetStep);
      } catch (permissionError) {
        setLoadError(
          permissionError instanceof Error
            ? permissionError.message
            : "No se concedieron los permisos necesarios para continuar.",
        );
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("branch_id", branchId);
      formData.append("area_id", areaId);
      formData.append("dispenser_id", dispenserId);
      formData.append("description", description.trim());
      evidenceFiles.forEach((file) => {
        formData.append("evidence_files", file);
      });

      const currentUserEmail = getSessionUserEmail();
      const response = await fetch("/api/incidents/", {
        method: "POST",
        headers: { "x-current-user-email": currentUserEmail },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "No se pudo registrar la incidencia.");
      }

      router.push("/clientes/incidencias");
    } catch (submitError) {
      setLoadError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar la incidencia.",
      );
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <DashboardHeader
          title="Nueva Incidencia"
          description="Registra un nuevo reporte técnico."
        />
      </div>

      <PageTransition className="flex-1 overflow-y-auto p-0 md:p-8">
        <section className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden px-4 py-5 md:hidden">
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso {mobileStep} de 3</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{progressValue}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progressValue}%` }}></div>
            </div>
          </div>

          {loadError ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {loadError}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto pb-4">
          {mobileStep === 1 && (
            <div className="flex flex-1 flex-col gap-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Seleccionar ubicación</h1>
                <p className="text-base text-slate-500 dark:text-slate-400">Identifica dónde ocurrió el incidente para asignarlo correctamente.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Cliente</label>
                <div className="relative">
                  <select
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-10 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary"
                    onChange={(event) => {
                      setClientId(event.target.value);
                      setBranchId("");
                      setAreaId("");
                      setDispenserId("");
                    }}
                    value={clientId}
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-symbols-outlined">expand_more</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Sucursal</label>
                <div className="relative">
                  <select
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-10 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!clientId}
                    onChange={(event) => {
                      setBranchId(event.target.value);
                      setAreaId("");
                      setDispenserId("");
                    }}
                    value={branchId}
                  >
                    <option value="">Seleccionar sucursal</option>
                    {filteredBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-symbols-outlined">expand_more</span></div>
                </div>
              </div>
            </div>
          )}

          {mobileStep === 2 && (
            <div className="flex flex-1 flex-col gap-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Detalles del reporte</h1>
                <p className="text-base text-slate-500 dark:text-slate-400">Proporciona información específica sobre lo sucedido.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Área</label>
                <div className="relative">
                  <select
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-10 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!branchId}
                    onChange={(event) => {
                      setAreaId(event.target.value);
                      setDispenserId("");
                    }}
                    value={areaId}
                  >
                    <option value="">Seleccionar área</option>
                    {filteredAreas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-symbols-outlined">expand_more</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Dispensador</label>
                <div className="relative">
                  <select
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-10 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!areaId}
                    onChange={(event) => setDispenserId(event.target.value)}
                    value={dispenserId}
                  >
                    <option value="">Seleccionar dispensador</option>
                    {filteredDispensers.map((dispenser) => (
                      <option key={dispenser.id} value={dispenser.id}>{dispenser.identifier}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-symbols-outlined">expand_more</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Hora del reporte</label>
                <div className="relative">
                  <input
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-10 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary"
                    onChange={(event) => setReportTime(event.target.value)}
                    type="time"
                    value={reportTime}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-symbols-outlined">schedule</span></div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Descripción</label>
                <textarea
                  className="block min-h-[140px] w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Escribe los detalles aquí..."
                  value={description}
                ></textarea>
              </div>
            </div>
          )}

          {mobileStep === 3 && (
            <div className="flex flex-1 flex-col gap-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Urgencia y Evidencias</h1>
                <p className="text-base text-slate-500 dark:text-slate-400">Indica la prioridad y adjunta fotos como respaldo.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Urgencia</label>
                <div className="relative">
                  <select
                    className="block w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-10 text-base text-slate-900 dark:text-slate-100 shadow-sm focus:border-primary focus:ring-primary"
                    onChange={(event) => setPriority(event.target.value as Priority)}
                    value={priority}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"><span className="material-symbols-outlined">expand_more</span></div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Evidencias</label>
                <button
                  className="group mt-1 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 pb-8 pt-8 transition-all hover:bg-slate-50 active:border-primary"
                  onClick={onOpenCamera}
                  type="button"
                >
                  <div className="mb-3 rounded-full bg-slate-100 p-3 transition-transform duration-200 group-hover:scale-110"><span className="material-symbols-outlined text-3xl text-slate-500">photo_camera</span></div>
                  <span className="mb-1 text-base font-semibold text-primary">Tomar evidencia con cámara</span>
                  <p className="text-center text-xs text-slate-500">Captura una foto directamente en el flujo<br />(máx. 4 imágenes, 10MB cada una)</p>
                </button>
                {evidencePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {evidencePreviews.map((evidence, index) => (
                      <article className="relative overflow-hidden rounded-xl border border-slate-200" key={`${evidence.previewUrl}-${index}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt={`Evidencia ${index + 1}`} className="h-28 w-full object-cover" src={evidence.previewUrl} />
                        <button
                          aria-label="Eliminar evidencia"
                          className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"
                          onClick={() => onRemoveEvidence(index)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
                {evidenceError ? <p className="text-xs text-red-600">{evidenceError}</p> : null}
              </div>
            </div>
          )}
          </div>

          {isCameraModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Capturar evidencia</h2>
                  <button className="rounded-full p-1 text-slate-600" onClick={() => setIsCameraModalOpen(false)} type="button">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl bg-black">
                  {pendingEvidence ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Vista previa de evidencia" className="h-64 w-full object-cover" src={pendingEvidence.previewUrl} />
                  ) : (
                    <video className="h-64 w-full object-cover" muted playsInline ref={cameraVideoRef} />
                  )}
                </div>

                {!pendingEvidence ? (
                  <div className="mt-4 flex items-center justify-center">
                    <button
                      className="h-16 w-16 rounded-full border-4 border-white bg-red-500 shadow"
                      onClick={onTakePhoto}
                      type="button"
                    ></button>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onRetakeEvidence} type="button">
                      Comenzar de nuevo
                    </button>
                    <button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black" onClick={onUseEvidence} type="button">
                      Utilizar evidencia
                    </button>
                  </div>
                )}
                {evidenceError ? <p className="mt-3 text-xs text-red-600">{evidenceError}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="sticky bottom-0 mt-2 grid grid-cols-2 gap-3 border-t border-slate-200 bg-white/95 py-3 pb-safe backdrop-blur">
            <button
              className="rounded-xl border border-slate-300 bg-white py-3 font-semibold"
              onClick={() => {
                if (mobileStep === 1) {
                  router.push("/clientes/incidencias");
                  return;
                }

                setMobileStep((prev) => (prev > 1 ? prev - 1 : prev));
              }}
              type="button"
            >
              {mobileStep === 1 ? "Cancelar" : "Atrás"}
            </button>

            <button
              className="rounded-xl bg-primary py-3 font-bold text-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              disabled={!canGoNext}
              onClick={onNextStep}
              type="button"
            >
              {mobileStep < 3 ? "Siguiente" : "Finalizar incidencia"}
            </button>
          </div>
        </section>

        <div className="hidden md:block max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Detalles de la Incidencia
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Complete el formulario para reportar un nuevo problema técnico o
                  de mantenimiento.
                </p>
              </div>
              <form className="space-y-6">
                <div>
                  <label className={labelClassName} htmlFor="titulo">
                    Título de Incidencia
                  </label>
                  <input
                    className={inputClassName}
                    id="titulo"
                    placeholder="Ej: Fuga en dosificador principal"
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClassName} htmlFor="cliente">
                      Cliente
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer`}
                        id="cliente"
                        onChange={(event) => {
                          setClientId(event.target.value);
                          setBranchId("");
                          setAreaId("");
                          setDispenserId("");
                        }}
                        value={clientId}
                      >
                        <option value="">Seleccionar Cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="sucursal">
                      Sucursal
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer disabled:opacity-70`}
                        disabled={!clientId}
                        id="sucursal"
                        onChange={(event) => {
                          setBranchId(event.target.value);
                          setAreaId("");
                          setDispenserId("");
                        }}
                        value={branchId}
                      >
                        <option value="">Seleccione Sucursal</option>
                        {filteredBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="area">
                      Área
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer disabled:opacity-70`}
                        disabled={!branchId}
                        id="area"
                        onChange={(event) => {
                          setAreaId(event.target.value);
                          setDispenserId("");
                        }}
                        value={areaId}
                      >
                        <option value="">Seleccione Área</option>
                        {filteredAreas.map((area) => (
                          <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="dispenser">
                      Dispensador
                    </label>
                    <div className="relative">
                      <select
                        className={`${inputClassName} appearance-none cursor-pointer disabled:opacity-70`}
                        disabled={!areaId}
                        id="dispenser"
                        onChange={(event) => setDispenserId(event.target.value)}
                        value={dispenserId}
                      >
                        <option value="">Seleccione Dispensador</option>
                        {filteredDispensers.map((dispenser) => (
                          <option key={dispenser.id} value={dispenser.id}>{dispenser.identifier}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
