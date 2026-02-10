"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string; client: string } };
type Dispenser = { id: number; identifier: string; area: { id: number; name: string; branch: string } | null };
type User = { id: number; full_name: string; role: string };

const now = new Date();
const initialDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const initialTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

export default function NuevaVisitaPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);

  const [visitType, setVisitType] = useState("mantenimiento");
  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [dispenserId, setDispenserId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [clientsResponse, branchesResponse, areasResponse, dispensersResponse, usersResponse] =
          await Promise.all([
            fetch("/api/clients", { cache: "no-store" }),
            fetch("/api/branches", { cache: "no-store" }),
            fetch("/api/areas", { cache: "no-store" }),
            fetch("/api/dispensers", { cache: "no-store" }),
            fetch("/api/users", { cache: "no-store" }),
          ]);

        if (
          !clientsResponse.ok ||
          !branchesResponse.ok ||
          !areasResponse.ok ||
          !dispensersResponse.ok ||
          !usersResponse.ok
        ) {
          throw new Error("No se pudo cargar la información del formulario.");
        }

        const [clientsPayload, branchesPayload, areasPayload, dispensersPayload, usersPayload] =
          await Promise.all([
            clientsResponse.json(),
            branchesResponse.json(),
            areasResponse.json(),
            dispensersResponse.json(),
            usersResponse.json(),
          ]);

        if (!isMounted) return;

        setClients(clientsPayload.results ?? []);
        setBranches(branchesPayload.results ?? []);
        setAreas(areasPayload.results ?? []);
        setDispensers(dispensersPayload.results ?? []);
        setInspectors(
          (usersPayload.results ?? []).filter(
            (user: User) => user.role === "inspector" || user.role === "branch_admin",
          ),
        );
      } catch (error) {
        if (!isMounted) return;
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información del formulario.",
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
    () => dispensers.filter((disp) => (areaId ? String(disp.area?.id) === areaId : true)),
    [dispensers, areaId],
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
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area_id: Number(areaId),
          dispenser_id: dispenserId ? Number(dispenserId) : null,
          inspector_id: inspectorId ? Number(inspectorId) : null,
          visited_at: visitDateTime.toISOString(),
          notes: `${visitType === "emergencia" ? "[EMERGENCIA] " : ""}${notes}`.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo agendar la visita.");
      }

      setStatusMessage("Visita registrada correctamente.");
      router.push("/clientes/calendario");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo agendar la visita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Agendar Nueva Visita" />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-logo">Detalles de la Visita</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete el formulario para programar una nueva visita técnica.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tipo de Visita</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="relative">
                      <input checked={visitType === "mantenimiento"} className="peer hidden" name="visit_type" onChange={() => setVisitType("mantenimiento")} type="radio" value="mantenimiento" />
                      <span className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:border-primary peer-checked:bg-yellow-50 dark:peer-checked:bg-yellow-900/10 transition-all">
                        <span className="material-symbols-outlined text-3xl mb-2 text-slate-400 peer-checked:text-yellow-600 dark:peer-checked:text-yellow-400">build_circle</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 peer-checked:text-slate-900 dark:peer-checked:text-white">Mantenimiento</span>
                      </span>
                    </label>
                    <label className="relative">
                      <input checked={visitType === "emergencia"} className="peer hidden" name="visit_type" onChange={() => setVisitType("emergencia")} type="radio" value="emergencia" />
                      <span className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-900/10 transition-all">
                        <span className="material-symbols-outlined text-3xl mb-2 text-slate-400 peer-checked:text-red-600 dark:peer-checked:text-red-400">warning</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 peer-checked:text-slate-900 dark:peer-checked:text-white">Emergencia</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="client">Cliente</label>
                    <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="client" onChange={(e) => {
                      setClientId(e.target.value);
                      setBranchId("");
                      setAreaId("");
                      setDispenserId("");
                    }} value={clientId}>
                      <option value="">Seleccione un cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="branch">Sucursal</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">storefront</span>
                      <select className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="branch" onChange={(e) => {
                        setBranchId(e.target.value);
                        setAreaId("");
                        setDispenserId("");
                      }} value={branchId}>
                        <option value="">Seleccione una sucursal</option>
                        {filteredBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="area">Área</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">domain</span>
                      <select className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="area" onChange={(e) => {
                        setAreaId(e.target.value);
                        setDispenserId("");
                      }} value={areaId}>
                        <option value="">Seleccione un área</option>
                        {filteredAreas.map((area) => (
                          <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="doser">Dosificador</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">water_drop</span>
                      <select className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="doser" onChange={(e) => setDispenserId(e.target.value)} value={dispenserId}>
                        <option value="">Seleccione equipo dosificador</option>
                        {filteredDispensers.map((dispenser) => (
                          <option key={dispenser.id} value={dispenser.id}>{dispenser.identifier}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="inspector">Inspector Asignado</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">person</span>
                      <select className="pl-10 w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="inspector" onChange={(e) => setInspectorId(e.target.value)} value={inspectorId}>
                        <option value="">Asignar inspector</option>
                        {inspectors.map((inspector) => (
                          <option key={inspector.id} value={inspector.id}>{inspector.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="date">Fecha</label>
                    <input className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="date" onChange={(e) => setDate(e.target.value)} type="date" value={date} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="time">Hora</label>
                    <input className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow" id="time" onChange={(e) => setTime(e.target.value)} type="time" value={time} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="notes">Notas Adicionales</label>
                  <textarea className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring focus:ring-primary/20 transition-shadow placeholder-slate-400" id="notes" onChange={(e) => setNotes(e.target.value)} placeholder="Instrucciones especiales para el inspector..." rows={3} value={notes} />
                </div>

                {statusMessage && <p className="text-sm text-slate-500">{statusMessage}</p>}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => router.push("/clientes/calendario")} type="button">Cancelar</button>
                  <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-professional-green text-white font-medium hover:bg-green-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70" disabled={isSubmitting} type="submit">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    {isSubmitting ? "Guardando..." : "Confirmar Visita"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
