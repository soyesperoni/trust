"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";
import { getSessionUserEmail } from "../../../lib/session";

type Client = { id: number; name: string };
type Branch = { id: number; name: string; client: { id: number; name: string } };
type Area = { id: number; name: string; branch: { id: number; name: string } };

type CreateDispenserResponse = {
  id?: number;
  error?: string;
};

export default function NuevoDosificadorPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string }>>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const [clientsResponse, branchesResponse, modelsResponse, areasResponse, productsResponse] = await Promise.all([
          fetch("/api/clients/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/branches/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/dispenser-models/", { cache: "no-store" }),
          fetch("/api/areas/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
          fetch("/api/products/", { cache: "no-store", headers: { "x-current-user-email": currentUserEmail } }),
        ]);

        if (!clientsResponse.ok || !branchesResponse.ok || !modelsResponse.ok || !areasResponse.ok || !productsResponse.ok) {
          throw new Error("No se pudieron cargar los catálogos del formulario.");
        }

        const [clientsData, branchesData, modelsData, areasData, productsData] = await Promise.all([
          clientsResponse.json(),
          branchesResponse.json(),
          modelsResponse.json(),
          areasResponse.json(),
          productsResponse.json(),
        ]);

        if (!isMounted) return;
        setClients((clientsData.results ?? []) as Client[]);
        setBranches((branchesData.results ?? []) as Branch[]);
        setModels((modelsData.results ?? []) as Array<{ id: number; name: string }>);
        setAreas((areasData.results ?? []) as Area[]);
        setProducts((productsData.results ?? []).map((product: { id: number; name: string }) => ({ id: product.id, name: product.name })));
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los catálogos del formulario.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

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
      if (installedAt) body.append("installed_at", installedAt);
      body.append("is_active", isActive ? "true" : "false");
      if (photoFile) body.append("photo", photoFile);
      selectedProductIds.forEach((productId) => body.append("product_ids", productId));

      const response = await fetch("/api/dispensers/", {
        method: "POST",
        headers: { "x-current-user-email": currentUserEmail },
        body,
      });

      const payload = (await response.json()) as CreateDispenserResponse;
      if (!response.ok || payload.error || typeof payload.id !== "number") {
        throw new Error(payload.error || "No se confirmó la creación del dosificador. Intenta nuevamente.");
      }

      router.push("/clientes/dispensadores");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el dosificador.");
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

  return (
    <>
      <DashboardHeader
        title="Nuevo Dosificador"
        description="Registra un dosificador con los mismos campos del admin de Django."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="identifier">
                Identificador
                <input className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none" id="identifier" onChange={(event) => setIdentifier(event.target.value)} placeholder="Ej. DISP-001" required type="text" value={identifier} />
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

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="photo">
                Foto del dosificador
                <input accept="image/*" className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-professional-green file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-yellow-700 focus:ring-2 focus:ring-primary outline-none" id="photo" name="photo" type="file" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
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
              <button className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-yellow-700 flex items-center gap-2" disabled={isSaving || isLoading} type="submit">
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSaving ? "Guardando..." : "Guardar Dosificador"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
