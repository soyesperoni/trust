"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type DispenserApi = {
  id: number;
  identifier: string;
  model: {
    name: string;
  };
};

export default function NuevoProductoPage() {
  const router = useRouter();
  const [dispensers, setDispensers] = useState<DispenserApi[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dispenserId, setDispenserId] = useState("");
  const [isLoadingDispensers, setIsLoadingDispensers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDispensers = async () => {
      try {
        const response = await fetch("/api/dispensers", {
          cache: "no-store",
          headers: { "x-current-user-email": getSessionUserEmail() },
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "No se pudieron cargar los dosificadores.");
        }
        if (!isMounted) return;
        setDispensers((payload.results ?? []) as DispenserApi[]);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los dosificadores.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoadingDispensers(false);
      }
    };

    loadDispensers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          name,
          description,
          dispenser_id: Number(dispenserId),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear el producto.");
      }

      router.push("/clientes/productos");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el producto.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Nuevo Producto"
        description="Registra un nuevo producto en el backend para administrarlo desde el dashboard."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del producto
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información principal para registrar un nuevo producto.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="name">
                Nombre del producto
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="name"
                  placeholder="Ej. Detergente Industrial"
                  required
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSaving}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="dispenser">
                Dosificador asignado
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="dispenser"
                  name="dispenser"
                  required
                  value={dispenserId}
                  onChange={(event) => setDispenserId(event.target.value)}
                  disabled={isLoadingDispensers || isSaving}
                >
                  <option value="" disabled>
                    Selecciona un dosificador
                  </option>
                  {dispensers.map((dispenser) => (
                    <option key={dispenser.id} value={dispenser.id}>
                      {dispenser.identifier} · {dispenser.model.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="description">
                Descripción
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  id="description"
                  placeholder="Descripción técnica o comercial del producto..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSaving}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/clientes/productos"
              >
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-70"
                type="submit"
                disabled={isSaving || isLoadingDispensers}
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSaving ? "Guardando..." : "Guardar Producto"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
