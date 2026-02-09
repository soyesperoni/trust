import Link from "next/link";

import DashboardHeader from "../../../components/DashboardHeader";
import PageTransition from "../../../components/PageTransition";

export default function NuevoProductoPage() {
  return (
    <>
      <DashboardHeader
        title="Nuevo Producto"
        description="Completa la información para agregar un nuevo producto."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <form className="space-y-8">
            <div className="md:hidden flex items-center gap-2 mb-6">
              <Link className="text-slate-500" href="/clientes/productos">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Nuevo Producto
              </h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 sticky top-8">
                  <label className="form-label mb-4">
                    Imagen del Producto
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-6 py-10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group relative overflow-hidden">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-slate-300 text-6xl mb-4 group-hover:text-slate-400 transition-colors">
                        image
                      </span>
                      <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400 justify-center">
                        <label
                          className="relative cursor-pointer rounded-md font-semibold text-professional-green focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-green-700"
                          htmlFor="file-upload"
                        >
                          <span>Subir imagen</span>
                          <input
                            className="sr-only"
                            id="file-upload"
                            name="file-upload"
                            type="file"
                          />
                        </label>
                        <p className="pl-1">o arrastrar aquí</p>
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        PNG, JPG, GIF hasta 10MB
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 hidden">
                    <div className="w-12 h-12 bg-slate-200 rounded-md overflow-hidden flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        producto-v1.jpg
                      </p>
                      <p className="text-xs text-slate-500">2.4 MB</p>
                    </div>
                    <button className="text-slate-400 hover:text-red-500" type="button">
                      <span className="material-symbols-outlined text-[20px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-professional-green">
                      info
                    </span>
                    Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="col-span-2">
                      <label className="form-label" htmlFor="product-name">
                        Nombre del Producto
                      </label>
                      <input
                        className="form-input"
                        id="product-name"
                        name="product-name"
                        placeholder="Ej. Limpiador Multiusos 5L"
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="sku">
                        SKU / Referencia
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-slate-500 sm:text-sm">#</span>
                        </div>
                        <input
                          className="form-input pl-7"
                          id="sku"
                          name="sku"
                          placeholder="PROD-001"
                          type="text"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="category">
                        Categoría
                      </label>
                      <select className="form-input" id="category" name="category">
                        <option>Seleccionar categoría...</option>
                        <option>Limpieza General</option>
                        <option>Desinfección</option>
                        <option>Lavandería</option>
                        <option>Papel y Desechables</option>
                        <option>Equipamiento</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="form-label" htmlFor="description">
                        Descripción
                      </label>
                      <textarea
                        className="form-input"
                        id="description"
                        name="description"
                        placeholder="Detalles técnicos, modo de uso, y especificaciones..."
                        rows={4}
                      ></textarea>
                      <p className="mt-2 text-xs text-slate-500">
                        Breve descripción que aparecerá en el catálogo.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 p-6 md:p-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-professional-green">
                      water_drop
                    </span>
                    Compatibilidad
                  </h3>
                  <div>
                    <label className="form-label" htmlFor="dosifiers">
                      Dosificadores Compatibles
                    </label>
                    <div className="relative mt-2">
                      <input
                        className="form-input"
                        placeholder="Buscar dosificadores..."
                        type="text"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400 text-lg">
                          search
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-800/20">
                      <div className="flex items-center p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <input
                          className="h-4 w-4 rounded border-slate-300 text-professional-green focus:ring-primary"
                          id="dosifier-1"
                          name="dosifiers[]"
                          type="checkbox"
                        />
                        <label
                          className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer w-full"
                          htmlFor="dosifier-1"
                        >
                          Dosificador Automático D-200
                        </label>
                      </div>
                      <div className="flex items-center p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <input
                          className="h-4 w-4 rounded border-slate-300 text-professional-green focus:ring-primary"
                          id="dosifier-2"
                          name="dosifiers[]"
                          type="checkbox"
                        />
                        <label
                          className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer w-full"
                          htmlFor="dosifier-2"
                        >
                          Dispensador Manual S-50
                        </label>
                      </div>
                      <div className="flex items-center p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <input
                          className="h-4 w-4 rounded border-slate-300 text-professional-green focus:ring-primary"
                          id="dosifier-3"
                          name="dosifiers[]"
                          type="checkbox"
                        />
                        <label
                          className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer w-full"
                          htmlFor="dosifier-3"
                        >
                          Sistema de Dilución Pro
                        </label>
                      </div>
                      <div className="flex items-center p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <input
                          className="h-4 w-4 rounded border-slate-300 text-professional-green focus:ring-primary"
                          id="dosifier-4"
                          name="dosifiers[]"
                          type="checkbox"
                        />
                        <label
                          className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer w-full"
                          htmlFor="dosifier-4"
                        >
                          Rociador Industrial T-10
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors dark:bg-transparent dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-6 py-2.5 rounded-lg bg-professional-green text-white hover:bg-green-700 font-medium text-sm shadow-sm transition-colors flex items-center gap-2"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    Guardar Producto
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </PageTransition>
    </>
  );
}
