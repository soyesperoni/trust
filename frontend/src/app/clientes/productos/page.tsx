"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type ProductApi = {
  id: number;
  name: string;
  description: string;
  dispenser: {
    id: number;
    identifier: string;
    model: string;
  };
};

type ProductStatus = "Asignado" | "Sin asignar";

type ProductRow = {
  id: number;
  name: string;
  sku: string;
  description: string;
  dispenserCode: string;
  dispenserModel: string;
  status: ProductStatus;
};

const statusStyles: Record<ProductStatus, { badge: string; dot: string }> = {
  Asignado: {
    badge:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    dot: "bg-yellow-500",
  },
  "Sin asignar": {
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-500",
  },
};

export default function ProductosPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los productos.");
        }
        const data = await response.json();
        if (!isMounted) return;
        const rows: ProductRow[] = ((data.results ?? []) as ProductApi[]).map((product) => {
          const hasDispenser = Boolean(product.dispenser?.id);
          return {
            id: product.id,
            name: product.name,
            sku: `#${product.id}`,
            description: product.description || "Sin descripción registrada.",
            dispenserCode: hasDispenser
              ? product.dispenser.identifier
              : "Sin dosificador",
            dispenserModel: hasDispenser
              ? product.dispenser.model
              : "Sin modelo",
            status: hasDispenser ? "Asignado" : "Sin asignar",
          };
        });
        setProducts(rows);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los productos.",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Cargando productos...";
    if (error) return error;
    return "No hay productos registrados.";
  }, [error, isLoading]);

  const totalResults = products.length;
  const displayedResults = products.length;

  return (
    <>
      <DashboardHeader
        title="Gestión de Productos"
        description="Administra el catálogo de productos disponibles."
        searchPlaceholder="Buscar producto, SKU..."
        action={(
          <Link
            className="bg-professional-green hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
            href="/clientes/productos/nuevo"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nuevo Producto
          </Link>
        )}
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Modelo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {products.map((product) => {
                  const statusStyle = statusStyles[product.status];

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                            <span className="material-symbols-outlined">
                              inventory_2
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              ID: {product.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-sm">
                        <p className="line-clamp-2">{product.description}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {product.dispenserCode}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {product.dispenserModel}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                          ></span>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          className="text-slate-400 hover:text-professional-green transition-colors"
                          href={`/clientes/productos/${product.id}`}
                        >
                          <span className="material-symbols-outlined">
                            edit
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#161e27]">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-medium">{displayedResults}</span>{" "}
              de <span className="font-medium">{totalResults}</span> resultados
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                disabled
              >
                Anterior
              </button>
              <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 hover:bg-slate-50">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
