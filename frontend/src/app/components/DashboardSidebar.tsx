"use client";

import Link from "next/link";
import { useState } from "react";

import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  ACCOUNT_ADMIN_ROLE,
  BRANCH_ADMIN_ROLE,
  INSPECTOR_ROLE,
} from "../lib/permissions";
import BrandLogo from "./BrandLogo";

type NavItem = {
  icon: string;
  label: string;
  href: string;
  accountAdminOnly?: boolean;
  branchAdminOnly?: boolean;
  hiddenForInspector?: boolean;
};

type DashboardSidebarProps = {
  activePath: string;
};

const SIDEBAR_COLLAPSED_KEY = "trust_sidebar_collapsed";

const navItems: NavItem[] = [
  { icon: "dashboard", label: "Dashboard", href: "/dashboard", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "group", label: "Usuarios", href: "/usuarios", hiddenForInspector: true },
  { icon: "apartment", label: "Clientes", href: "/clientes/data" },
  { icon: "storefront", label: "Sucursales", href: "/clientes/sucursales", accountAdminOnly: true },
  { icon: "map", label: "Áreas", href: "/clientes/areas", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "water_drop", label: "Dosificadores", href: "/clientes/dispensadores", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "inventory_2", label: "Productos", href: "/clientes/productos", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "calendar_month", label: "Calendario", href: "/clientes/calendario", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "history", label: "Visitas", href: "/clientes/visitas", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "report_problem", label: "Incidencias", href: "/clientes/incidencias", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "assignment_turned_in", label: "Auditorías", href: "/clientes/auditorias", accountAdminOnly: true, branchAdminOnly: true },
  { icon: "fact_check", label: "Plantillas", href: "/clientes/auditorias/plantillas" },
];

const linkClassName = (isActive: boolean, collapsed: boolean) =>
  `flex items-center ${collapsed ? "justify-center" : "gap-2"} px-3 py-2.5 text-[16px] text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ${
    isActive ? "bg-yellow-50 border-r-4 border-primary font-semibold" : ""
  }`;

const activeGradientTextClassName = "bg-gradient-to-t from-primary to-professional-green bg-clip-text text-transparent";

export default function DashboardSidebar({ activePath }: DashboardSidebarProps) {
  const { user } = useCurrentUser();
  const isAccountAdmin = user?.role === ACCOUNT_ADMIN_ROLE;
  const isBranchAdmin = user?.role === BRANCH_ADMIN_ROLE;
  const isInspector = user?.role === INSPECTOR_ROLE;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const nextValue = !previous;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, nextValue ? "1" : "0");
      return nextValue;
    });
  };

  const visibleNavItems = navItems.filter((item) => {
    if (isAccountAdmin) return !!item.accountAdminOnly;
    if (isBranchAdmin) return !!item.branchAdminOnly;
    if (isInspector) return !item.hiddenForInspector;
    return true;
  });

  return (
    <aside className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-[#161e27] md:flex ${collapsed ? "w-16" : "w-48"}`}>
      <div
        className={`relative flex h-16 items-center border-b border-slate-100 px-3 dark:border-slate-800 ${
          collapsed ? "justify-center" : "justify-start"
        }`}
      >
        <BrandLogo compact={collapsed} size={collapsed ? "lg" : "xl"} className={collapsed ? "" : "origin-left scale-110"} />
        <button
          aria-label={collapsed ? "Expandir menú" : "Minimizar menú"}
          className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={toggleCollapsed}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">{collapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-6">
        {visibleNavItems.map((item) => {
          const isActive = item.href === activePath;
          return (
            <Link key={item.label} className={linkClassName(isActive, collapsed)} href={item.href} title={collapsed ? item.label : undefined}>
              <span className={`material-symbols-outlined text-[21px] ${isActive ? activeGradientTextClassName : ""}`}>{item.icon}</span>
              {!collapsed && <span className={isActive ? activeGradientTextClassName : ""}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
