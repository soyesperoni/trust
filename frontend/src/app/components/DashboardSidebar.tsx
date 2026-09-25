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
  { icon: "support_agent", label: "Soporte", href: "/soporte" },
];

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
    <aside
      className={`relative hidden shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-[#161e27] md:flex ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div
        className={`relative z-10 flex h-16 items-center border-b border-slate-100 px-3.5 dark:border-slate-800 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <BrandLogo
          compact={collapsed}
          size={collapsed ? "lg" : "xl"}
          className={collapsed ? "" : "origin-left scale-100"}
        />
        <button
          aria-label={collapsed ? "Expandir menú" : "Minimizar menú"}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
            collapsed ? "hidden" : ""
          }`}
          onClick={toggleCollapsed}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">menu_open</span>
        </button>
      </div>

      {collapsed && (
        <div className="flex justify-center border-b border-slate-100 py-2 dark:border-slate-800">
          <button
            aria-label="Expandir menú"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onClick={toggleCollapsed}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}

      <nav className="relative z-10 flex flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {visibleNavItems.map((item) => {
          const isActive = item.href === activePath;
          if (collapsed) {
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={`mx-auto my-0.5 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`mx-2.5 my-0.5 flex items-center gap-3.5 rounded-full px-3.5 py-2 text-[13px] transition-colors ${
                isActive
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
