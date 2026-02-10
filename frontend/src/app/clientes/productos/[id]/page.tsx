"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

type ProductApi = {
  id: number;
  name: string;
  description: string;
  dispenser: {
    id: number;
  };
};

type DispenserApi = {
  id: number;
  identifier: string;
  model: {
    name: string;
  };
};

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  const [product, setProduct] = useState<ProductApi | null>(null);
  const [dispensers, setDispensers] = useState<DispenserApi[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [productsResponse, dispensersResponse] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/dispensers", { cache: "no-store" }),
        ]);

        if (!productsResponse.ok || !dispensersResponse.ok) return;

        const [productsPayload, dispensersPayload] = await Promise.all([
          productsResponse.json(),
          dispensersResponse.json(),
        ]);

        if (!isMounted) return;

        const products = (productsPayload.results ?? []) as ProductApi[];
        const dispenserList = (dispensersPayload.results ?? []) as DispenserApi[];

        setProduct(products.find((item) => item.id === productId) ?? null);
        setDispensers(dispenserList);
      } catch {
        // fallback visual
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  return (
    <>
      <DashboardHeader
        title="Editar Producto"
        description="Campos alineados con Django Admin (dosificador, nombre, descripción y foto)."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Datos del producto
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Editando el producto #{params.id}.
            </p>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="dispenser">
                Dosificador
                <select
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  defaultValue={product?.dispenser?.id ? String(product.dispenser.id) : ""}
                  id="dispenser"
                  required
                >
                  <option disabled value="">
                    Seleccionar dosificador...
                  </option>
                  {dispensers.map((dispenser) => (
                    <option key={dispenser.id} value={dispenser.id}>
                      {dispenser.identifier} · {dispenser.model.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="name">
                Nombre del producto
                <input
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  defaultValue={product?.name ?? ""}
                  id="name"
                  required
                  type="text"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300" htmlFor="photo">
                Foto (opcional)
                <input
                  accept="image/*"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200"
                  id="photo"
                  type="file"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2" htmlFor="description">
                Descripción (opcional)
                <textarea
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none min-h-24"
                  defaultValue={product?.description ?? ""}
                  id="description"
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
                className="px-4 py-2 rounded-lg bg-professional-green text-white hover:bg-green-700 flex items-center gap-2"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
