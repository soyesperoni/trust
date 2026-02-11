"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string; client: string } };

type Priority = "low" | "medium" | "high";

const inputClassName =
  "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
const labelClassName =
  "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

export default function NuevaIncidenciaPage() {
  const [mobileStep, setMobileStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

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
        const [clientsResponse, branchesResponse, areasResponse] = await Promise.all([
          fetch("/api/clients", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/branches", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
          fetch("/api/areas", {
            cache: "no-store",
            headers: { "x-current-user-email": currentUserEmail },
          }),
        ]);

        if (!clientsResponse.ok || !branchesResponse.ok || !areasResponse.ok) {
          throw new Error("No se pudieron cargar los datos de ubicación.");
        }

        const [clientsPayload, branchesPayload, areasPayload] = await Promise.all([
          clientsResponse.json(),
          branchesResponse.json(),
          areasResponse.json(),
        ]);

        if (!isMounted) return;

        setClients(clientsPayload.results ?? []);
        setBranches(branchesPayload.results ?? []);
        setAreas(areasPayload.results ?? []);
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

  const canGoNext =
    (mobileStep === 1 && clientId && branchId) ||
    (mobileStep === 2 && areaId && description.trim()) ||
    mobileStep === 3;

  return (
    <>
      <DashboardHeader
        title="Nueva Incidencia"
        description="Registra un nuevo reporte técnico."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <section className="mx-auto w-full max-w-lg px-2 py-2 md:hidden">
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

          {mobileStep === 1 && (
            <div className="space-y-6">
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
            <div className="space-y-6">
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
                    onChange={(event) => setAreaId(event.target.value)}
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
            <div className="space-y-6">
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
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Evidencias</label>
                <label className="group mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 px-6 pb-8 pt-8 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 active:border-primary">
                  <div className="mb-3 rounded-full bg-slate-100 dark:bg-slate-800 p-3 transition-transform duration-200 group-hover:scale-110"><span className="material-symbols-outlined text-3xl text-slate-500">add_photo_alternate</span></div>
                  <span className="mb-1 text-base font-semibold text-primary">Elegir desde biblioteca</span>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">Selecciona imágenes o videos del dispositivo<br />(JPG, PNG, MP4 máx. 10MB)</p>
                  <input accept="image/*,video/*" className="sr-only" multiple type="file" />
                </label>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4 pb-4">
            <button
              className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-base font-bold text-black shadow-md transition-transform enabled:active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!canGoNext}
              onClick={() => setMobileStep((prev) => (prev < 3 ? prev + 1 : prev))}
              type="button"
            >
              {mobileStep < 3 ? "Siguiente" : "Finalizar y Guardar"}
              <span className="material-symbols-outlined ml-2 text-sm">{mobileStep < 3 ? "arrow_forward" : "check"}</span>
            </button>
            <button className="block w-full py-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400" onClick={() => setMobileStep((prev) => (prev > 1 ? prev - 1 : prev))} type="button">
              {mobileStep === 1 ? "Cancelar" : "Atrás"}
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
                        onChange={(event) => setAreaId(event.target.value)}
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
                </div>
              </form>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
