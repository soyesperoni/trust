"use client";

import Link from "next/link";

import BrandLogo from "../../components/BrandLogo";
import PageTransition from "../../components/PageTransition";

type ProductFeature = {
  icon: string;
  label: string;
  badgeClasses: string;
};

type ProductCard = {
  id: number;
  name: string;
  sku: string;
  description: string;
  image: string;
  status: string;
  statusClasses: string;
  features: ProductFeature[];
};

const products: ProductCard[] = [
  {
    id: 1,
    name: "Limpiador Multiuso Pro",
    sku: "CL-001",
    description:
      "Solución concentrada para superficies duras. Fórmula biodegradable de alto rendimiento.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8oGkZtIZFG5TF272walp1WHoOeMwxecCFdyxZrRdWL9Q6Dbju8vRx0_7r3RdJPqosfx2AA0X6eG4J-0_gE_pG-9ER02aKNH4pvzyRhWYxW7yDYTFzWyoMdG_MyHkevSnm06ZDhvMbxKjALFEwbqCrfyZQjh1BJpThI882DE7VqHLC3W8OzRm_UkUie355a-5Pnwh5xg5vAGscsKRN37165sZ1OycB75BDE1tr3SA21Rrj-4ZQG2rjU7Xy48mt2TAOPlSsa41FXt3M",
    status: "En Stock",
    statusClasses:
      "bg-green-50 text-green-700 border border-green-100",
    features: [
      {
        icon: "water_drop",
        label: "Líquido",
        badgeClasses: "bg-blue-50 text-blue-600",
      },
      {
        icon: "recycling",
        label: "Eco-friendly",
        badgeClasses: "bg-purple-50 text-purple-600",
      },
    ],
  },
  {
    id: 2,
    name: "Dispensador Touchless",
    sku: "EQ-205",
    description:
      "Dispensador automático con sensor infrarrojo para jabón líquido o gel antibacterial.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCdALEsLxWo6DqtbVNlqhBMl3ttWL3dg20hn-kxVU9Mz_LkJkgCoXIAZOg1y1XExO3C1gbmnwVZbZP3u6Zbm2qMczaA40FnH1cBMdV-iJ5fsLB7et05ZDv1sHmeX05XkCDoM2M_IxJpuEq56DZxJOJB5548jzmnEQBMnWJqKhQY-bucot-XKM3yNcgyVnnPZeCblo_P3fCV-Dg6m_VYsdtXw4ZHK8EmeUgUPm6pchjnjUZHKi0LqV5wJcUWi4DizTSIEinhRHJ4X7FQ",
    status: "En Stock",
    statusClasses:
      "bg-green-50 text-green-700 border border-green-100",
    features: [
      {
        icon: "bolt",
        label: "Eléctrico",
        badgeClasses: "bg-orange-50 text-orange-600",
      },
      {
        icon: "settings",
        label: "Instalación",
        badgeClasses: "bg-slate-100 text-slate-600",
      },
    ],
  },
  {
    id: 3,
    name: "Sanitizante Industrial 5L",
    sku: "CH-050",
    description:
      "Bidón de 5 litros de sanitizante de alto espectro para uso hospitalario y comercial.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD44mplGEz7H9jNRIyUGkqLsrlbHx9PTcfr5hRbofqlUHFwNqZJ-OQxvUmh1x85YNQOVqp1QUfqblxkP7TdMWluyfs_r9pOO3EEtzx8n8oLAZaGIyOVoZbdUCD5B8-Y6KiV5Ht0XRs17VBXhw5J9vLMxHepqXxQd0mYwjW3tyKQdKY4e40-H_qkDq9JyhUVvpcw_9Xqh28nKUgx0ZjGwYkI6HqmuQ4RH2dUmGCPAZ75aQzFxdQ-BEWQdNz2xv05GfsRWpkbIDI8iA05",
    status: "Bajo Stock",
    statusClasses:
      "bg-yellow-50 text-yellow-700 border border-yellow-100",
    features: [
      {
        icon: "warning",
        label: "Químico",
        badgeClasses: "bg-red-50 text-red-600",
      },
    ],
  },
  {
    id: 4,
    name: "Papel Institucional Jumbo",
    sku: "PA-100",
    description:
      "Rollo de papel higiénico jumbo de doble hoja, ideal para dispensadores de alto tráfico.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCxmLoiYBQjg5Ma6s0HK5eCMv91jrcKQgjSX6tbRpjFA2tmnNy9IYjXMdg2LXtR1b-E1-nUdk9J1HC8M83mGNxv-d7U9xtGSep5WFiPWtOFdwxITDKxwKaYzcOeLtoWkBG3N8MvmZIAhYnCP86Sm8yRg5daE4DJ35icEbIzXIZIsmaqbSHg9fv4EwMeQqdT1YbjFexX7_3sHWGQXqae2QaGRnISBdlQfiTN1OPd9m5DK-pS6MkwI7ThKW-8MIIqw9ZEcQW2b7JRMXGi",
    status: "En Stock",
    statusClasses:
      "bg-green-50 text-green-700 border border-green-100",
    features: [
      {
        icon: "forest",
        label: "Papel",
        badgeClasses: "bg-emerald-50 text-emerald-600",
      },
    ],
  },
  {
    id: 5,
    name: "Cartucho Aromatizante",
    sku: "AR-003",
    description:
      "Repuesto para difusor automático, fragancia Citrus Fresh. Duración de 60 días.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBJZFWcOQh8PJt8ik6ESHBXSQHvqZ7dc7mlqke2li7OuzqqAiheeKDlM2hSFLrxhTeXeSuOmILt4jPaDM5A9ulSr3VcwrbvHxY7YliIP8Od7d7r1lJzW1peUGvCd1EIl8X9qjSFDyexDwNskdDSPwoeXXRyW4EvwA8in5SAtIK3o9X_5t9MGJlmjdGUnF-jl5xHOSEHEWq7GA1KSq-0-8jHQBTzmHXR4xkab57ow9hybhc6oHcVGQeLyrlm_-GFCNlXCapI0jfcp1yH",
    status: "Agotado",
    statusClasses:
      "bg-red-50 text-red-700 border border-red-100",
    features: [
      {
        icon: "air",
        label: "Aerosol",
        badgeClasses: "bg-pink-50 text-pink-600",
      },
    ],
  },
  {
    id: 6,
    name: "Bomba Peristáltica",
    sku: "EQ-301",
    description:
      "Bomba dosificadora de alta precisión para lavandería industrial. Caudal ajustable.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB6nUzgYezCTyVemE_njjI1oGBpAUKBrXfyNfBldvJkaS65sln--cTyK6IEVKoG5F9KZcBnflwfnb9YxKHjDk3_6FeoBt56zs-Lr3KhcdMf7jdDLGpyT3xKNRe9BOPgcltcPS_icaJrQ0vKNUoc2PL0_ezEF3DGcOdpaTunZjjn03jn-4R-WsOH8SNhZ08AXK_1GsisDK4N_lvWgf1U4Xa1xWCP_oDvRrzgCVCX6_XgFWVumzab_DW5Q6y4HwI7l9-z8VVtQErt1oRT",
    status: "En Stock",
    statusClasses:
      "bg-green-50 text-green-700 border border-green-100",
    features: [
      {
        icon: "waves",
        label: "Hidráulico",
        badgeClasses: "bg-blue-50 text-blue-600",
      },
      {
        icon: "settings",
        label: "Técnico",
        badgeClasses: "bg-slate-100 text-slate-600",
      },
    ],
  },
  {
    id: 7,
    name: "Gel Antibacterial 1L",
    sku: "GE-005",
    description:
      "Gel desinfectante con 70% de alcohol y humectantes para el cuidado de manos.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC_EAUqI0y85p1bmFC3xxl39fLRmQwSRc6E0M1x_cM-XcuTGJmy0OYZ0-kaIbGEIUdwAa4EYzTjXsikSBFwxEfQAewQY2DXBLJyE5igvevETG1IVtya0wvV235Pn2bdRBcDLIe2sBd82IMmSgeDUTEmO3l3JZOEO5jafHy6dBlq-hXNPJTOmRby9TOmvf9JSMME7-bUXbLLqyrfLly2MZu77DgwYOICld2m-pxBq1kPQSLUtZr6GJtpbXL1VSWoWO7J877KQ9dX8rZe",
    status: "En Stock",
    statusClasses:
      "bg-green-50 text-green-700 border border-green-100",
    features: [
      {
        icon: "sanitizer",
        label: "Higiene",
        badgeClasses: "bg-teal-50 text-teal-600",
      },
    ],
  },
  {
    id: 8,
    name: "Guantes Nitrilo Caja x100",
    sku: "EPP-12",
    description:
      "Guantes desechables de nitrilo azul, sin polvo. Talla M. Resistencia química.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDRsT2bDz5voTEkwyaK7MqNoNP_uVb6GIt664CjYbtSxbKx233LIT4yBM2HdOpDnw0xJ0YAOgP_LW9Sk-bWF-j4U8MMZbE6P_M3l7eBwdJt_euTKAcXBYDKp5ip41vXzSxWeUQdWEUwA3Ezay5ePzG5nkYRPh_D9ABl6YW9wmTMiyani7H2zrvNmCigaEfJryoiyS11l5fYxVXRHgYVOZJSgBhcpM3H8psBFVxp-_R02vY6FjBgKgMARJGjmGMo-t5w2CBZ2qCBGX9h",
    status: "En Stock",
    statusClasses:
      "bg-green-50 text-green-700 border border-green-100",
    features: [
      {
        icon: "back_hand",
        label: "EPP",
        badgeClasses: "bg-indigo-50 text-indigo-600",
      },
    ],
  },
];

export default function ProductosPage() {
  return (
    <>
      <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
        <BrandLogo size="lg" />
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          Gestión de Productos
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
              search
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary"
              placeholder="Buscar producto, SKU..."
              type="text"
            />
          </div>
          <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

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
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden hover:border-primary/50 transition-all group"
            >
              <div className="relative h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4">
                <img
                  alt={product.name}
                  className="h-full object-contain mix-blend-multiply dark:mix-blend-normal opacity-90 group-hover:scale-105 transition-transform duration-300"
                  src={product.image}
                />
                <span
                  className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-md ${product.statusClasses}`}
                >
                  {product.status}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                    SKU: {product.sku}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 font-logo">
                  {product.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {product.features.map((feature) => (
                      <div
                        key={`${product.id}-${feature.label}`}
                        className="relative group/tooltip"
                      >
                        <div
                          className={`p-1.5 rounded-md ${feature.badgeClasses}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {feature.icon}
                          </span>
                        </div>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-900 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap">
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageTransition>
    </>
  );
}
