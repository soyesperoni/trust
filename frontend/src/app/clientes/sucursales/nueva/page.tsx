"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type ClientApi = {
  id: number;
  name: string;
};

export default function NuevaSucursalPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientApi[]>([]);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadClients = async () => {
      try {
        const response = await fetch("/api/clients/", {
          cache: "no-store",
          headers: { "x-current-user-email": getSessionUserEmail() },
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "No se pudieron cargar los clientes.");
        }
        if (!mounted) return;
        setClients((payload.results ?? []) as ClientApi[]);
      } catch (fetchError) {
        if (!mounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los clientes.",
        );
      } finally {
        if (!mounted) return;
        setIsLoadingClients(false);
      }
    };

    loadClients();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/branches/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          client_id: Number(clientId),
          name,
          address,
          city,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear la sucursal.");
      }
      router.push("/clientes/sucursales");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear la sucursal.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Nueva Sucursal"
        description="Registra una sucursal real en el backend para administrarla desde Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos de la sucursal
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Campos equivalentes al modelo de Sucursal en Django admin.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Cliente
              <select
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={isLoadingClients || isSaving}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              Nombre
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                placeholder="Ej. Sucursal Centro"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              Dirección
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                type="text"
                placeholder="Calle, número y colonia"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
              Ciudad
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                type="text"
                placeholder="Ej. Monterrey"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              <Link
                href="/clientes/sucursales"
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 disabled:opacity-70"
              >
                {isSaving ? "Guardando..." : "Guardar sucursal"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
