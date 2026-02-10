"use client";

import Link from "next/link";

import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  ACCOUNT_ADMIN_ROLE,
  BRANCH_ADMIN_ROLE,
} from "../lib/permissions";
import BrandLogo from "./BrandLogo";
import SidebarUserCard from "./SidebarUserCard";

type NavItem = {
  icon: string;
  label: string;
  href: string;
  accountAdminOnly?: boolean;
  branchAdminOnly?: boolean;
};

type DashboardSidebarProps = {
  activePath: string;
};

const navItems: NavItem[] = [
  { icon: "dashboard", label: "Dashboard", href: "/dashboard", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "group", label: "Usuarios", href: "/clientes" },
  { icon: "apartment", label: "Clientes", href: "/clientes/data" },
  { icon: "storefront", label: "Sucursales", href: "/clientes/sucursales", accountAdminOnly: true },
  { icon: "map", label: "Áreas", href: "/clientes/areas", accountAdminOnly: true , branchAdminOnly: true },
  { icon: "water_drop", label: "Dosificadores", href: "/clientes/dispensadores", accountAdminOnly: true , branchAdminOnly: true },
  { icon: "inventory_2", label: "Productos", href: "/clientes/productos", accountAdminOnly: true , branchAdminOnly: true },
  { icon: "calendar_month", label: "Calendario", href: "/clientes/calendario", accountAdminOnly: true , branchAdminOnly: true },
  { icon: "history", label: "Historial de Visitas", href: "/clientes/visitas", accountAdminOnly: true , branchAdminOnly: true },
  { icon: "report_problem", label: "Incidencias", href: "/clientes/incidencias", accountAdminOnly: true , branchAdminOnly: true },
];

const secondaryItems: NavItem[] = [
  { icon: "settings", label: "Ajustes", href: "/ajustes" },
];

const linkClassName = (isActive: boolean) =>
  `flex items-center gap-3 px-6 py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ${
    isActive ? "bg-yellow-50 text-slate-900 border-r-4 border-primary font-semibold" : ""
  }`;

export default function DashboardSidebar({ activePath }: DashboardSidebarProps) {
  const { user } = useCurrentUser();
  const isAccountAdmin = user?.role === ACCOUNT_ADMIN_ROLE;
  const isBranchAdmin = user?.role === BRANCH_ADMIN_ROLE;

  const visibleNavItems = navItems.filter((item) => {
    if (isAccountAdmin) return !!item.accountAdminOnly;
    if (isBranchAdmin) return !!item.branchAdminOnly;
    return true;
  });

  return (
    <aside className="w-64 bg-white dark:bg-[#161e27] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
        <BrandLogo size="xl" />
      </div>
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        {visibleNavItems.map((item) => {
          const isActive = item.href === activePath;
          return (
            <Link key={item.label} className={linkClassName(isActive)} href={item.href}>
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {!isAccountAdmin && !isBranchAdmin && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            {secondaryItems.map((item) => {
              const isActive = item.href === activePath;
              return (
                <Link key={item.label} className={linkClassName(isActive)} href={item.href}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <div className="p-6 border-t border-slate-100 dark:border-slate-800">
        <SidebarUserCard />
      </div>
    </aside>
  );
}
