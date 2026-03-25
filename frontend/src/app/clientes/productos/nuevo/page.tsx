"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const body = new FormData();
      body.append("name", name);
      body.append("description", description);
      if (photoFile) body.append("photo", photoFile);

      const response = await fetch("/api/products/", {
        method: "POST",
        headers: {
          "x-current-user-email": getSessionUserEmail(),
        },
        body,
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

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="photo">
                Imagen del producto
                <input
                  accept="image/*"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-professional-green file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-yellow-700 focus:ring-2 focus:ring-primary outline-none"
                  id="photo"
                  name="photo"
                  type="file"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
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
                disabled={isSaving}
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
