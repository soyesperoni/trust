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
        <div className="max-w-3xl mx-auto">
          <form
            className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden"
            onSubmit={handleSubmit}
          >
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <label className="form-label" htmlFor="name">
                  Nombre del cliente
                </label>
                <input
                  className="form-input"
                  id="name"
                  name="name"
                  onChange={handleChange}
                  placeholder="Ej. Corporación Apex S.A."
                  required
                  type="text"
                  value={formState.name}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="code">
                  Código único
                </label>
                <input
                  className="form-input"
                  id="code"
                  name="code"
                  onChange={handleChange}
                  placeholder="Ej. APEX-001"
                  required
                  type="text"
                  value={formState.code}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="notes">
                  Notas
                </label>
                <textarea
                  className="form-input min-h-24"
                  id="notes"
                  name="notes"
                  onChange={handleChange}
                  placeholder="Información interna del cliente..."
                  value={formState.notes}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
              <Link
                className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                href="/clientes/data"
              >
                Cancelar
              </Link>
              <button
                className="px-5 py-2.5 rounded-lg bg-professional-green text-white font-medium hover:bg-green-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
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
