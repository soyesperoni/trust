"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { GENERAL_ADMIN_ROLE, INSPECTOR_ROLE } from "../../../lib/permissions";
import { getSessionUserEmail } from "../../../lib/session";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string; client: string } };
type User = { id: number; full_name: string; role: string };

const now = new Date();
const initialDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const initialTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

export default function NuevaVisitaPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const canSchedule = user?.role === GENERAL_ADMIN_ROLE || user?.role === INSPECTOR_ROLE;

  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);

  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [activityType, setActivityType] = useState<"visit" | "audit">("visit");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [clientsResponse, branchesResponse, areasResponse, usersResponse] =
          await Promise.all([
            fetch("/api/clients/", { cache: "no-store" }),
            fetch("/api/branches/", { cache: "no-store" }),
            fetch("/api/areas/", { cache: "no-store" }),
            fetch("/api/users/", { cache: "no-store" }),
          ]);

        if (
          !clientsResponse.ok ||
          !branchesResponse.ok ||
          !areasResponse.ok ||
          !usersResponse.ok
        ) {
          throw new Error("No se pudo cargar la información de plantillas para la auditoría.");
        }

        const [clientsPayload, branchesPayload, areasPayload, usersPayload] =
          await Promise.all([
            clientsResponse.json(),
            branchesResponse.json(),
            areasResponse.json(),
            usersResponse.json(),
          ]);

        if (!isMounted) return;

        setClients(clientsPayload.results ?? []);
        setBranches(branchesPayload.results ?? []);
        setAreas(areasPayload.results ?? []);
        setInspectors(
          (usersPayload.results ?? []).filter(
            (user: User) => user.role === "inspector",
          ),
        );
      } catch (error) {
        if (!isMounted) return;
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información de plantillas para la auditoría.",
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!areaId) {
      setStatusMessage("Debe seleccionar un área para registrar la visita.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const visitDateTime = new Date(`${date}T${time}:00`);
      const currentUserEmail = getSessionUserEmail();
      const endpoint = activityType === "audit" ? "/api/audits/" : "/api/visits/";
      const payloadBody = activityType === "audit"
        ? {
            area_id: Number(areaId),
            inspector_id: inspectorId ? Number(inspectorId) : null,
            audited_at: visitDateTime.toISOString(),
            notes: notes.trim(),
          }
        : {
            area_id: Number(areaId),
            inspector_id: inspectorId ? Number(inspectorId) : null,
            visited_at: visitDateTime.toISOString(),
            notes: notes.trim(),
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-current-user-email": currentUserEmail },
        body: JSON.stringify(payloadBody),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo agendar la actividad.");
      }

      if (typeof payload?.id !== "number") {
        throw new Error(
          "No se confirmó la creación de la visita. Intenta nuevamente y verifica en el calendario.",
        );
      }

      setStatusMessage(activityType === "audit" ? "Auditoría registrada correctamente." : "Visita registrada correctamente.");
      router.push("/clientes/calendario");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo agendar la actividad.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Agendar actividad"
        description="Programa una visita o una auditoría por área. Para auditorías, la ejecución seguirá el flujo móvil con formulario, evidencia y firma."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="w-full bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Datos de la actividad</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información base para programar una visita o auditoría. En auditorías se usará la plantilla del área seleccionada.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Solo el administrador general y los inspectores pueden programar actividades desde el calendario.
          </div>


          {!isLoadingUser && !canSchedule && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              No tienes permisos para agendar actividades.
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="activityType">
                  Tipo de actividad
                  <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="activityType" onChange={(e) => setActivityType(e.target.value as "visit" | "audit") } value={activityType}>
                    <option value="visit">Visita</option>
                    <option value="audit">Auditoría</option>
                  </select>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="client">
                  Cliente
                  <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="client" onChange={(e) => {
                      setClientId(e.target.value);
                      setBranchId("");
                      setAreaId("");
                    }} value={clientId}>
                    <option value="">Seleccione un cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="branch">
                  Sucursal
                  <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="branch" onChange={(e) => {
                        setBranchId(e.target.value);
                        setAreaId("");
                      }} value={branchId}>
                    <option value="">Seleccione una sucursal</option>
                    {filteredBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                  Área
                  <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="area" onChange={(e) => {
                        setAreaId(e.target.value);
                      }} value={areaId}>
                    <option value="">Seleccione un área</option>
                    {filteredAreas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="inspector">
                  Inspector asignado
                  <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="inspector" onChange={(e) => setInspectorId(e.target.value)} value={inspectorId}>
                    <option value="">Asignar inspector</option>
                    {inspectors.map((inspector) => (
                      <option key={inspector.id} value={inspector.id}>{inspector.full_name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="date">
                  Fecha
                  <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="date" onChange={(e) => setDate(e.target.value)} type="date" value={date} />
                </label>
              </div>

              <div>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="time">
                  Hora
                  <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="time" onChange={(e) => setTime(e.target.value)} type="time" value={time} />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="notes">
                  Notas adicionales
                  <textarea className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24" id="notes" onChange={(e) => setNotes(e.target.value)} placeholder="Instrucciones especiales para el inspector..." value={notes} />
                </label>
              </div>

              {statusMessage && <p className="text-sm text-slate-500 md:col-span-2">{statusMessage}</p>}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => router.push("/clientes/calendario")} type="button">
                Cancelar
              </button>
              <button className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-60" disabled={isSubmitting || !canSchedule} type="submit">
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSubmitting ? "Guardando..." : "Guardar actividad"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
