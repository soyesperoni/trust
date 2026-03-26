"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type ProductDetailResponse = {
  id: number;
  name: string;
  description: string;
  photo: string | null;
  error?: string;
};

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params?.id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/`, {
          cache: "no-store",
          headers: {
            "x-current-user-email": getSessionUserEmail(),
          },
        });

        const payload = (await response.json()) as ProductDetailResponse;

        if (!response.ok || payload.error) {
          throw new Error(payload.error || "No se pudo cargar el producto.");
        }

        if (!isMounted) return;

        setName(payload.name ?? "");
        setDescription(payload.description ?? "");
        setCurrentPhotoUrl(payload.photo ?? null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el producto.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : currentPhotoUrl),
    [currentPhotoUrl, photoFile],
  );

  useEffect(
    () => () => {
      if (photoFile) {
        URL.revokeObjectURL(previewUrl ?? "");
      }
    },
    [photoFile, previewUrl],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const body = new FormData();
      body.append("name", name.trim());
      body.append("description", description.trim());
      if (photoFile) body.append("photo", photoFile);

      const response = await fetch(`/api/products/${productId}/`, {
        method: "PUT",
        headers: {
          "x-current-user-email": getSessionUserEmail(),
        },
        body,
      });

      const payload = (await response.json()) as ProductDetailResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "No se pudo actualizar el producto.");
      }

      router.push("/clientes/productos");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo actualizar el producto.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Editar Producto"
        description="Actualiza la información del producto y su imagen."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="w-full bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
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
                  required
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="description">
                Descripción
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="photo">
                Imagen del producto
                <input
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-professional-green file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-yellow-700 focus:ring-2 focus:ring-primary outline-none"
                  id="photo"
                  name="photo"
                  type="file"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  disabled={isLoading || isSaving}
                />
              </label>

              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Vista previa</p>
                <div className="h-40 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  {previewUrl ? (
                    <img alt="Vista previa del producto" className="h-full w-full object-cover" src={previewUrl} />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400">image</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" href="/clientes/productos">
                Cancelar
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-70"
                type="submit"
                disabled={isLoading || isSaving}
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
