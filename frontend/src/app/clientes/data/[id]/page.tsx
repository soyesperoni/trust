"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

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

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id;
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setError("No se encontró el cliente solicitado.");
      setIsLoading(false);
      return;
    }
    let isMounted = true;

    const loadClient = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "No se pudo cargar el cliente.");
        }
        if (!isMounted) return;
        setFormState({
          name: payload.name ?? "",
          code: payload.code ?? "",
          notes: payload.notes ?? "",
        });
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el cliente.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadClient();

    return () => {
      isMounted = false;
    };
  }, [clientId]);

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
      if (!clientId) {
        throw new Error("No se encontró el cliente solicitado.");
      }

      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo actualizar el cliente.");
      }
      router.push("/clientes/data");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar el cliente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Editar Cliente"
        description="Actualiza la información real del cliente en backend."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <form
            className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden"
            onSubmit={handleSubmit}
          >
            <div className="p-6 md:p-8 space-y-6">
              {isLoading ? (
                <p className="text-sm text-slate-500">Cargando cliente...</p>
              ) : (
                <>
                  <div>
                    <label className="form-label" htmlFor="name">
                      Nombre del cliente
                    </label>
                    <input
                      className="form-input"
                      id="name"
                      name="name"
                      onChange={handleChange}
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
                      value={formState.notes}
                    />
                  </div>
                </>
              )}
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
                disabled={isSaving || isLoading}
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
