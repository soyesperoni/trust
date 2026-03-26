"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string } };

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

  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; photo: string | null }>>([]);
  const [availableNozzles, setAvailableNozzles] = useState<Array<{ id: number; name: string }>>([]);

  const [identifier, setIdentifier] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productNozzleByProductId, setProductNozzleByProductId] = useState<Record<string, string>>({});
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadForm = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [dispenserResponse, clientsResponse, branchesResponse, modelsResponse, areasResponse, productsResponse] = await Promise.all([
          fetch(`/api/dispensers/${dispenserId}/`, { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/clients/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/branches/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/dispenser-models/", { cache: "no-store" }),
          fetch("/api/areas/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/products/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
        ]);

        if (!dispenserResponse.ok || !clientsResponse.ok || !branchesResponse.ok || !modelsResponse.ok || !areasResponse.ok || !productsResponse.ok) {
          throw new Error("No se pudo cargar la información del dosificador.");
        }

        const [dispenserData, clientsData, branchesData, modelsData, areasData, productsData] = (await Promise.all([
          dispenserResponse.json(),
          clientsResponse.json(),
          branchesResponse.json(),
          modelsResponse.json(),
          areasResponse.json(),
          productsResponse.json(),
        ])) as [DispenserDetailResponse, CatalogResponse, CatalogResponse, CatalogResponse, CatalogResponse, CatalogResponse];

        if (!isMounted) return;

        const nextClients = (clientsData.results ?? []) as Client[];
        const nextBranches = (branchesData.results ?? []) as Branch[];
        const nextAreas = (areasData.results ?? []) as Area[];

        setClients(nextClients);
        setBranches(nextBranches);
        setModels((modelsData.results ?? []) as Array<{ id: number; name: string }>);
        setAreas(nextAreas);
        setProducts((productsData.results ?? []).map((product) => ({ id: product.id, name: product.name, photo: product.photo ?? null })));
        setAvailableNozzles(dispenserData.available_nozzles ?? []);

        setIdentifier(dispenserData.identifier ?? "");
        setSelectedModelId(dispenserData.model?.id ? String(dispenserData.model.id) : "");
        setSelectedAreaId(dispenserData.area?.id ? String(dispenserData.area.id) : "");

        const dispenserArea = nextAreas.find((area) => area.id === dispenserData.area?.id);
        if (dispenserArea) {
          const dispenserBranch = nextBranches.find((branch) => branch.id === dispenserArea.branch.id);
          setSelectedBranchId(String(dispenserArea.branch.id));
          setSelectedClientId(dispenserBranch ? String(dispenserBranch.client.id) : "");
        } else {
          setSelectedBranchId("");
          setSelectedClientId("");
        }

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

  const filteredBranches = branches.filter((branch) => String(branch.client.id) === selectedClientId);
  const filteredAreas = areas.filter((area) => String(area.branch.id) === selectedBranchId);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedBranchId("");
    setSelectedAreaId("");
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedAreaId("");
  };

  const selectedProducts = products.filter((product) => selectedProductIds.includes(String(product.id)));
  const normalizeSearchText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const normalizedSearchTerms = normalizeSearchText(productSearchTerm).split(/\s+/).filter(Boolean);
  const filteredProductsForModal = products.filter((product) => {
    if (!normalizedSearchTerms.length) return true;
    const normalizedProductName = normalizeSearchText(product.name);
    return normalizedSearchTerms.every((term) => normalizedProductName.includes(term));
  });

  const openProductModal = () => {
    setPendingProductIds(selectedProductIds);
    setProductSearchTerm("");
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setProductSearchTerm("");
    setPendingProductIds([]);
  };

  const handleAddProducts = () => {
    const removedIds = selectedProductIds.filter((id) => !pendingProductIds.includes(id));
    if (removedIds.length) {
      setProductNozzleByProductId((currentNozzles) => {
        const next = { ...currentNozzles };
        removedIds.forEach((removedId) => {
          delete next[removedId];
        });
        return next;
      });
    }
    setSelectedProductIds(pendingProductIds);
    closeProductModal();
  };

  return (
    <>
      <DashboardHeader
        title="Editar Dosificador"
        description="Edita el dosificador con los mismos campos del admin de Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="w-full bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
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

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="client">
                Cliente
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="client" required value={selectedClientId} onChange={(event) => handleClientChange(event.target.value)}>
                  <option value="">Seleccione un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="branch">
                Sucursal
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" disabled={!selectedClientId} id="branch" required value={selectedBranchId} onChange={(event) => handleBranchChange(event.target.value)}>
                  <option value="">Seleccione una sucursal</option>
                  {filteredBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="area">
                Área
                <select className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" disabled={!selectedBranchId} id="area" required value={selectedAreaId} onChange={(event) => setSelectedAreaId(event.target.value)}>
                  <option value="">Seleccione un área</option>
                  {filteredAreas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">Productos asociados</p>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    type="button"
                    onClick={openProductModal}
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Agregar producto
                  </button>
                </div>

                {selectedProducts.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProducts.map((product) => {
                      const productId = String(product.id);

                      return (
                        <div key={product.id} className="rounded-xl border border-primary bg-primary/5 p-3 shadow-sm space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              {product.photo ? (
                                <img alt={`Foto de ${product.name}`} className="h-full w-full object-cover" src={product.photo} />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400">inventory_2</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{product.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Producto agregado al dosificador</p>
                            </div>
                            <button
                              type="button"
                              className="text-xs text-red-500 hover:text-red-600"
                              onClick={() => {
                                setSelectedProductIds((current) => current.filter((id) => id !== productId));
                                setProductNozzleByProductId((currentNozzles) => {
                                  const next = { ...currentNozzles };
                                  delete next[productId];
                                  return next;
                                });
                              }}
                            >
                              Quitar
                            </button>
                          </div>
                          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
                    Aún no hay productos agregados. Usa el botón <strong>Agregar producto</strong>.
                  </div>
                )}

                {isProductModalOpen ? (
                  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Seleccionar productos</h3>
                        <button type="button" className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white" onClick={closeProductModal}>
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

                      <div className="p-5 space-y-4">
                        <label className="block">
                          <span className="sr-only">Buscar producto</span>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                              type="text"
                              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none text-sm"
                              placeholder="Buscar por nombre de producto"
                              value={productSearchTerm}
                              onChange={(event) => setProductSearchTerm(event.target.value)}
                            />
                          </div>
                        </label>

                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                          {filteredProductsForModal.map((product) => {
                            const productId = String(product.id);
                            const isChecked = pendingProductIds.includes(productId);
                            return (
                              <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  className="h-5 w-5 accent-primary"
                                  onChange={(event) =>
                                    setPendingProductIds((current) =>
                                      event.target.checked ? [...current, productId] : current.filter((id) => id !== productId),
                                    )
                                  }
                                />
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                  {product.photo ? <img alt={`Foto de ${product.name}`} className="h-full w-full object-cover" src={product.photo} /> : <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>}
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-200">{product.name}</p>
                              </label>
                            );
                          })}
                          {!filteredProductsForModal.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron productos con ese nombre.</p> : null}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-end gap-3">
                        <button type="button" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={closeProductModal}>
                          Cancelar
                        </button>
                        <button type="button" className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700" onClick={handleAddProducts}>
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
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
