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
  products: Array<{ id: number; name: string; nozzle?: { id: number; name: string } | null }>;
  available_nozzles?: Array<{ id: number; name: string }>;
  installed_at: string | null;
  is_active: boolean;
  error?: string;
};

type CatalogResponse = {
  results?: Array<{ id: number; name: string; photo?: string | null; branch?: { name: string } }>;
};

export default function EditarDosificadorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispenserId = params?.id;

  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: number; name: string; branch: { name: string } }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; photo: string | null }>>([]);
  const [availableNozzles, setAvailableNozzles] = useState<Array<{ id: number; name: string }>>([]);

  const [identifier, setIdentifier] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productNozzleByProductId, setProductNozzleByProductId] = useState<Record<string, string>>({});

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
        setProducts((productsData.results ?? []).map((product) => ({ id: product.id, name: product.name, photo: product.photo ?? null })));
        setAvailableNozzles(dispenserData.available_nozzles ?? []);

        setIdentifier(dispenserData.identifier ?? "");
        setSelectedModelId(dispenserData.model?.id ? String(dispenserData.model.id) : "");
        setSelectedAreaId(dispenserData.area?.id ? String(dispenserData.area.id) : "");
        setInstalledAt(dispenserData.installed_at ?? "");
        setIsActive(Boolean(dispenserData.is_active));
        setSelectedProductIds((dispenserData.products ?? []).map((product) => String(product.id)));
        setProductNozzleByProductId(
          (dispenserData.products ?? []).reduce<Record<string, string>>((accumulator, product) => {
            if (product.nozzle?.id) {
              accumulator[String(product.id)] = String(product.nozzle.id);
            }
            return accumulator;
          }, {}),
        );
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
      body.append(
        "product_assignments",
        JSON.stringify(
          selectedProductIds.map((productId) => ({
            product_id: Number(productId),
            nozzle_id: productNozzleByProductId[productId] ? Number(productNozzleByProductId[productId]) : null,
          })),
        ),
      );

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

              <div className="md:col-span-2 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">Productos asociados</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((product) => {
                    const productId = String(product.id);
                    const isSelected = selectedProductIds.includes(productId);

                    return (
                      <div
                        key={product.id}
                        className={`rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40"
                        }`}
                      >
                        <label className="flex cursor-pointer items-center gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {product.photo ? (
                              <img alt={`Foto de ${product.name}`} className="h-full w-full object-cover" src={product.photo} />
                            ) : (
                              <span className="material-symbols-outlined text-slate-400">inventory_2</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{product.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona para asignarlo al dosificador</p>
                          </div>
                          <input
                            checked={isSelected}
                            className="h-5 w-5 accent-primary"
                            type="checkbox"
                            onChange={(event) => {
                              setSelectedProductIds((current) => {
                                if (event.target.checked) return [...current, productId];
                                const updated = current.filter((id) => id !== productId);
                                setProductNozzleByProductId((currentNozzles) => {
                                  const next = { ...currentNozzles };
                                  delete next[productId];
                                  return next;
                                });
                                return updated;
                              });
                            }}
                          />
                        </label>
                        {isSelected ? (
                          <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                            Boquilla
                            <select
                              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none text-sm text-slate-700 dark:text-slate-200"
                              value={productNozzleByProductId[productId] ?? ""}
                              onChange={(event) =>
                                setProductNozzleByProductId((current) => ({
                                  ...current,
                                  [productId]: event.target.value,
                                }))
                              }
                            >
                              <option value="">Sin boquilla</option>
                              {availableNozzles.map((nozzle) => (
                                <option key={nozzle.id} value={nozzle.id}>
                                  {nozzle.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

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
