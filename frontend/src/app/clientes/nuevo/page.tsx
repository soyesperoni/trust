"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type FormState = {
  name: string;
  code: string;
  notes: string;
};

const initialState: FormState = {
  name: "",
  code: "",
  notes: "",
};

export default function NuevoClientePage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear el cliente.");
      }

      router.push("/clientes/data");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el cliente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Nuevo Cliente"
        description="Registra un cliente real en el backend para administrarlo desde Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del cliente
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completa la información base para registrar un nuevo cliente.
            </p>
          </div>
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="name">
                  Nombre del cliente
                  <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="name"
                  name="name"
                  onChange={handleChange}
                  placeholder="Ej. Corporación Apex S.A."
                  required
                  type="text"
                  value={formState.name}
                />
                </label>
              </div>
              <div>
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="code">
                  Código único
                  <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  id="code"
                  name="code"
                  onChange={handleChange}
                  placeholder="Ej. APEX-001"
                  required
                  type="text"
                  value={formState.code}
                />
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="notes">
                  Notas
                  <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  id="notes"
                  name="notes"
                  onChange={handleChange}
                  placeholder="Información interna del cliente..."
                  value={formState.notes}
                />
                </label>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/clientes/data"
              >
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSaving ? "Guardando..." : "Guardar Cliente"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
