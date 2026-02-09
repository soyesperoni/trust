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

export default function ProductosPage() {
  const [products, setProducts] = useState<ProductApi[]>([]);
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
        setProducts(data.results ?? []);
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

  return (
    <>
      <DashboardHeader
        title="Gestión de Productos"
        description="Administra el catálogo de productos disponibles."
        searchPlaceholder="Buscar producto, SKU..."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-logo">
              Productos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Administra el catálogo de productos disponibles.
            </p>
          </div>
          <Link
            className="bg-professional-green hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
            href="/clientes/productos/nuevo"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nuevo Producto
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 text-center text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            products.map((product) => {
              const statusLabel = product.dispenser?.id
                ? "Asignado"
                : "Sin asignar";
              const statusClasses = product.dispenser?.id
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-slate-100 text-slate-600 border border-slate-200";

              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden hover:border-primary/50 transition-all group"
                >
                  <div className="relative h-48 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-4 text-center">
                    <span className="material-symbols-outlined text-[48px] text-slate-400 mb-2">
                      inventory_2
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Producto registrado
                    </span>
                    <span
                      className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-md ${statusClasses}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                        ID: {product.id}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 font-logo">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {product.description || "Sin descripción registrada."}
                    </p>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">
                          water_drop
                        </span>
                        <span>
                          {product.dispenser?.identifier
                            ? `Dosificador ${product.dispenser.identifier}`
                            : "Sin dosificador asignado"}
                        </span>
                      </div>
                      {product.dispenser?.model ? (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            settings
                          </span>
                          <span>Modelo {product.dispenser.model}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PageTransition>
    </>
  );
}
