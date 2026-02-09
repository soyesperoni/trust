"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  description: string;
  dispenser: { id: number; identifier: string; model: string };
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Productos
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catálogo de productos asignados por dosificador.
        </p>
      </div>
      <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4">Dosificador</th>
              <th className="px-6 py-4">Modelo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {products.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {product.name}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {product.description || "-"}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {product.dispenser.identifier}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {product.dispenser.model}
                </td>
              </tr>
            ))}
            {error && !isLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Cargando productos...
                </td>
              </tr>
            )}
            {!error && !isLoading && products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No hay productos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
