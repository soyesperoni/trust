"use client";

import BrandLogo from "./BrandLogo";
import SidebarUserCard from "./SidebarUserCard";

type NavItem = {
  icon: string;
  label: string;
  href: string;
};

type DashboardSidebarProps = {
  activePath: string;
};

const navItems: NavItem[] = [
  { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
  { icon: "group", label: "Usuarios", href: "/clientes" },
  { icon: "apartment", label: "Clientes", href: "/clientes/data" },
  { icon: "storefront", label: "Sucursales", href: "/clientes/sucursales" },
  { icon: "map", label: "Áreas", href: "/clientes/areas" },
  { icon: "water_drop", label: "Dosificadores", href: "/clientes/dispensadores" },
  { icon: "inventory_2", label: "Productos", href: "/clientes/productos" },
  { icon: "history", label: "Historial de Visitas", href: "/clientes/visitas" },
  { icon: "report_problem", label: "Incidencias", href: "/clientes/incidencias" },
];

export default function DashboardSidebar({ activePath }: DashboardSidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-[#161e27] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
        <BrandLogo size="xl" />
      </div>
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.href === activePath;
          return (
            <a
              key={item.label}
              className={`flex items-center gap-3 px-6 py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ${
                isActive
                  ? "bg-yellow-50 text-slate-900 border-r-4 border-primary font-semibold"
                  : ""
              }`}
              href={item.href}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="p-6 border-t border-slate-100 dark:border-slate-800">
        <SidebarUserCard />
      </div>
    </aside>
  );
}
