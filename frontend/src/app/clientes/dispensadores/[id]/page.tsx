"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type DispenserDetailResponse = {
  id: number;
  identifier: string;
  model: { id: number; name: string };
  area: { id: number; name: string; branch: string } | null;
  products: Array<{ id: number; name: string }>;
  installed_at: string | null;
  is_active: boolean;
  error?: string;
};

type CatalogResponse = {
  results?: Array<{ id: number; name: string; branch?: { name: string } }>;
};

export default function EditarDosificadorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispenserId = params?.id;

  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: number; name: string; branch: { name: string } }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([]);

  const [identifier, setIdentifier] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadForm = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [dispenserResponse, modelsResponse, areasResponse, productsResponse] = await Promise.all([
          fetch(`/api/dispensers/${dispenserId}/`, { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/dispenser-models/", { cache: "no-store" }),
          fetch("/api/areas/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/products/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
        ]);

        if (!dispenserResponse.ok || !modelsResponse.ok || !areasResponse.ok || !productsResponse.ok) {
          throw new Error("No se pudo cargar la información del dosificador.");
        }

        const [dispenserData, modelsData, areasData, productsData] = (await Promise.all([
          dispenserResponse.json(),
          modelsResponse.json(),
          areasResponse.json(),
          productsResponse.json(),
        ])) as [DispenserDetailResponse, CatalogResponse, CatalogResponse, CatalogResponse];

        if (!isMounted) return;

        setModels((modelsData.results ?? []) as Array<{ id: number; name: string }>);
        setAreas((areasData.results ?? []) as Array<{ id: number; name: string; branch: { name: string } }>);
        setProducts((productsData.results ?? []).map((product) => ({ id: product.id, name: product.name })));

        setIdentifier(dispenserData.identifier ?? "");
        setSelectedModelId(dispenserData.model?.id ? String(dispenserData.model.id) : "");
        setSelectedAreaId(dispenserData.area?.id ? String(dispenserData.area.id) : "");
        setInstalledAt(dispenserData.installed_at ?? "");
        setIsActive(Boolean(dispenserData.is_active));
        setSelectedProductIds((dispenserData.products ?? []).map((product) => String(product.id)));
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la información del dosificador.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadForm();
    return () => {
      isMounted = false;
    };
  }, [dispenserId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const currentUserEmail = getSessionUserEmail().trim().toLowerCase();
      if (!currentUserEmail) {
        throw new Error("No se pudo identificar tu sesión. Cierra sesión y vuelve a ingresar.");
      }

      const body = new FormData();
      body.append("identifier", identifier.trim());
      body.append("model_id", selectedModelId);
      body.append("area_id", selectedAreaId);
      body.append("installed_at", installedAt);
      body.append("is_active", isActive ? "true" : "false");
      selectedProductIds.forEach((productId) => body.append("product_ids", productId));

      const response = await fetch(`/api/dispensers/${dispenserId}/`, {
        method: "PUT",
        headers: { "x-current-user-email": currentUserEmail },
        body,
      });

      const payload = (await response.json()) as DispenserDetailResponse;
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "No se pudo actualizar el dosificador.");
      }

      router.push("/clientes/dispensadores");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar el dosificador.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Editar Dosificador"
        description="Edita el dosificador con los mismos campos del admin de Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="identifier" onChange={(event) => setIdentifier(event.target.value)} required type="text" value={identifier} />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="model_id">
                Modelo
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="model_id" required value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
                  <option value="">Seleccione un modelo</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="area" value={selectedAreaId} onChange={(event) => setSelectedAreaId(event.target.value)}>
                  <option value="">Sin área asignada</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name} · {area.branch.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="installed_at">
                Fecha de instalación
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="installed_at" type="date" value={installedAt} onChange={(event) => setInstalledAt(event.target.value)} />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="is_active">
                Estado
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="is_active" value={isActive ? "true" : "false"} onChange={(event) => setIsActive(event.target.value === "true")}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="products">
                Productos asociados
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-32"
                  id="products"
                  multiple
                  value={selectedProductIds}
                  onChange={(event) => {
                    const values = Array.from(event.target.selectedOptions, (option) => option.value);
                    setSelectedProductIds(values);
                  }}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              {error ? <p className="text-sm text-red-500 md:col-span-2">{error}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" href="/clientes/dispensadores">
                Cancelar
              </Link>
              <button className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-70" disabled={isSaving || isLoading} type="submit">
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
